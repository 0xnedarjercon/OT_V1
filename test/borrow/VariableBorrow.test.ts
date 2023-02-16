import { e, e6, e8, e18, getLatestBlockTime } from "../helpers";
import { Block } from "@ethersproject/abstract-provider";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { BigNumber, Signer } from "ethers";
import { ethers, network } from "hardhat";

// TODO DRY
async function getVariableBorrowFactory() {
  return await ethers.getContractFactory("VariableBorrow");
}
async function getSwapFactory() {
  return await ethers.getContractFactory("MockSwap");
}
async function getOracleFactory() {
  return await ethers.getContractFactory("MockOracle");
}
async function getERC20Factory() {
  return await ethers.getContractFactory("MyERC20");
}
type Resolve<T> = T extends Promise<infer R> ? R : T;
type VariableBorrowFactory = Resolve<ReturnType<typeof getVariableBorrowFactory>>;
type VariableBorrow = Resolve<ReturnType<VariableBorrowFactory["deploy"]>>;
type SwapFactory = Resolve<ReturnType<typeof getSwapFactory>>;
type Swap = Resolve<ReturnType<SwapFactory["deploy"]>>;
type OracleFactory = Resolve<ReturnType<typeof getOracleFactory>>;
type Oracle = Resolve<ReturnType<OracleFactory["deploy"]>>;
type ERC20Factory = Resolve<ReturnType<typeof getERC20Factory>>;
type ERC20 = Resolve<ReturnType<ERC20Factory["deploy"]>>;

describe("VariableBorrow", function () {
  let VariableBorrow: VariableBorrowFactory;
  let Swap: SwapFactory;
  let ERC20: ERC20Factory;
  let Oracle: OracleFactory;

  let owner: SignerWithAddress;
  let alice: SignerWithAddress;
  let bob: SignerWithAddress;
  let addrs: SignerWithAddress[];

  let variableBorrow: VariableBorrow;
  let swap: Swap;
  let oracle: Oracle;
  let wbtc: ERC20;
  let eth: ERC20;
  let usdt: ERC20;

  before(async function () {
    [owner, alice, bob, ...addrs] = await ethers.getSigners();
    [VariableBorrow, Swap, ERC20, Oracle] = await Promise.all([
      getVariableBorrowFactory(),
      getSwapFactory(),
      getERC20Factory(),
      getOracleFactory(),
    ]);
  });

  beforeEach(async function () {
    await Promise.all([
      (async () => {
        swap = await Swap.deploy();
        oracle = await Oracle.deploy();
        variableBorrow = await VariableBorrow.deploy(swap.address, oracle.address);
        await swap.setBorrow(variableBorrow.address);
      })(),
      (async () => (wbtc = await ERC20.deploy("WBTC", "WBTC", 8)))(),
      (async () => (eth = await ERC20.deploy("ETH", "ETH", 18)))(),
      (async () => (usdt = await ERC20.deploy("USDT", "USDT", 6)))(),
    ]);

    await Promise.all([
      (async () => oracle.setPrice(wbtc.address, e8(50000), await wbtc.decimals()))(),
      (async () => oracle.setPrice(eth.address, e8(2000), await eth.decimals()))(),
      (async () => oracle.setPrice(usdt.address, e8(1), await usdt.decimals()))(),
      wbtc.transfer(swap.address, e8(100)),
      eth.transfer(swap.address, e18(100)),
      usdt.transfer(swap.address, e6(100)),
    ]);

    await Promise.all([
      variableBorrow.updateAsset(wbtc.address, 0, 6500, 700, 10000, 115, 85, 10),
      variableBorrow.updateAsset(eth.address, 0, 6500, 700, 10000, 115, 85, 10),
      variableBorrow.updateAsset(usdt.address, 0, 9000, 400, 6000, 110, 90, 5),
    ]);
  });

  it("Should create new asset", async function () {
    const token = await ERC20.deploy("MyToken", "MyToken", 18);
    await token.transfer(swap.address, e18(100));
    await variableBorrow.updateAsset(token.address, 0, 6500, 700, 10000, 115, 85, 5);

    const asset = await variableBorrow.assets(token.address);
    expect(asset.base).to.be.equals(0);
    expect(asset.optimal).to.be.equals(6500);
    expect(asset.slope1).to.be.equals(700);
    expect(asset.slope2).to.be.equals(10000);
    expect(asset.relativeInterest).to.be.equals(e18(1));
    expect(asset.interestRate).to.be.equals(10000);
    expect(asset.updatedAt).to.be.gt(1);

    expect(asset.borrowCredit).to.be.equals(115);
    expect(asset.collateralCredit).to.be.equals(85);
    expect(asset.penaltyRate).to.be.equals(5);
  });

  describe("Borrow", function () {
    it("Should forbid borrow non-exist asset", async function () {
      const token = await ERC20.deploy("MyToken", "MyToken", 18);

      await expect(
        variableBorrow.connect(alice).borrow(
          token.address,
          e18(1),
          [
            {
              token: wbtc.address,
              amount: e18(1),
            },
          ],
          alice.address
        )
      ).to.be.revertedWith("ASSET_NOT_EXIST");
    });

    it("Should borrow ok", async function () {
      {
        const position = await variableBorrow.positions(wbtc.address, alice.address);
        expect(position.debt).to.equal(0);
        expect(await eth.balanceOf(alice.address)).to.be.equals(e18(0));
        // expect(position.collaterals)
      }

      await wbtc.transfer(alice.address, e8(10));
      await wbtc.connect(alice).approve(variableBorrow.address, e8(10));
      await variableBorrow.connect(alice).borrow(
        eth.address,
        e18(2),
        [
          {
            token: wbtc.address,
            amount: e8(2),
          },
        ],
        alice.address
      );
      const borrowTime = await getLatestBlockTime();

      {
        const position = await variableBorrow.positions(eth.address, alice.address);
        expect(position.debt).to.equal(e18(2));

        const asset = await variableBorrow.assets(eth.address);
        // 7%*2%/65% = 0.0021_53846153846154
        expect(asset.interestRate).to.be.equals(10021);

        expect(await eth.balanceOf(alice.address)).to.be.equals(e18(2));
      }

      await network.provider.send("evm_setNextBlockTimestamp", [
        365 * 1.5 * 24 * 3600 + borrowTime,
      ]);

      // trigger debt update
      await variableBorrow.connect(alice).borrow(eth.address, e18(1), [], alice.address);

      {
        const position = await variableBorrow.positions(eth.address, alice.address);
        // 1+2*1.0021**1.5             3.006303306343285797
        expect(position.debt).to.equal("3006303306343285650");
      }
    });
  });

  describe("Repay", function () {
    it("Should repay ok", async function () {
      await wbtc.transfer(alice.address, e8(10));
      await wbtc.connect(alice).approve(variableBorrow.address, e8(10));

      await variableBorrow.connect(alice).borrow(
        eth.address,
        e18(2),
        [
          {
            token: wbtc.address,
            amount: e8(2),
          },
        ],
        alice.address
      );
      const borrowTime = await getLatestBlockTime();

      // 2*1.0021=2.0042
      await eth.transfer(alice.address, e18(1));
      await eth.connect(alice).approve(swap.address, "2004200000000000000");
      await network.provider.send("evm_setNextBlockTimestamp", [365 * 1 * 24 * 3600 + borrowTime]);

      await variableBorrow.connect(alice).repay(
        eth.address,
        "2004200000000000000",
        [
          {
            token: wbtc.address,
            amount: e8(2),
          },
        ],
        alice.address
      );

      expect(await wbtc.balanceOf(alice.address)).to.be.equals(e8(10));
      expect(await eth.balanceOf(alice.address)).to.be.equals("995800000000000018");
    });
  });

  describe("Liquidate", function () {
    it("Should liquidate works", async function () {
      await wbtc.transfer(alice.address, e8(10));
      await wbtc.connect(alice).approve(variableBorrow.address, e8(10));

      // credits
      // 6*50000*85 =25500000
      // 100*2000*115=23000000
      await variableBorrow.connect(alice).borrow(
        eth.address,
        e18(100),
        [
          {
            token: wbtc.address,
            amount: e8(6),
          },
        ],
        alice.address
      );
      const borrowTime = await getLatestBlockTime();

      // FAIL
      // debt: 100*2.07**0.1=108
      // credit: 108*2000*115=2484000 < 25500000
      await network.provider.send("evm_setNextBlockTimestamp", [
        365 * 0.1 * 24 * 3600 + borrowTime,
      ]);
      await expect(
        variableBorrow.liquidate(eth.address, alice.address, 1, bob.address)
      ).to.be.revertedWith("NOT_LIQUIDATABLE");

      // SUCCESS
      // debt: 100*2.07**0.2=115.66
      // credit: 115.66*2000*115=26601800 >= 25500000
      // max: (25500000-x*2000*85*1.1penalty)/(26601800-x*2000*115)=1.1, max=57
      // penalty: 57*0.1=0.57
      await eth.transfer(bob.address, e18(200));
      await eth.connect(bob).approve(swap.address, e18(200));
      await network.provider.send("evm_setNextBlockTimestamp", [
        365 * 0.2 * 24 * 3600 + borrowTime,
      ]);

      // await network.provider.send("evm_mine");
      // console.log(await variableBorrow.liquidatableAmount(eth.address, alice.address));

      await expect(
        variableBorrow.liquidate(eth.address, alice.address, e18(58), bob.address)
      ).to.be.revertedWith("AMOUNT_EXCEED");

      await variableBorrow.connect(bob).liquidate(eth.address, alice.address, e18(57), bob.address);

      expect(await eth.balanceOf(bob.address)).to.be.equals(e18(143));
      // 57*2000/50000*1.1=2.508
      expect(await wbtc.balanceOf(bob.address)).to.be.equals("250800000");
    });

    it("Should liquidate low CR", async function () {
      await wbtc.transfer(alice.address, e8(10));
      await wbtc.connect(alice).approve(variableBorrow.address, e8(10));

      await variableBorrow.connect(alice).borrow(
        eth.address,
        e18(100),
        [
          {
            token: wbtc.address,
            amount: e8(6),
          },
        ],
        alice.address
      );
      const borrowTime = await getLatestBlockTime();

      // debt: 100*2.07**1=207
      // CR: 150/207=72%
      // penalty: 207*(0.05*1.3529)=14.002514999999998935
      // revenue: 207*0.01=2.07

      // debt: 100*2.07**1=207
      // credit: 207*2000*115=47610000 >= 25500000
      // max: 407
      await eth.transfer(bob.address, e18(300));
      await eth.connect(bob).approve(swap.address, e18(300));
      await network.provider.send("evm_setNextBlockTimestamp", [365 * 1 * 24 * 3600 + borrowTime]);

      // await network.provider.send("evm_mine");
      // console.log(await variableBorrow.liquidatableAmount(eth.address, alice.address));

      // max profit, 136ETH*1.1penalty=150ETH=6BTC
      await variableBorrow
        .connect(bob)
        .liquidate(eth.address, alice.address, "136363636363636345550", bob.address);

      expect(await wbtc.balanceOf(bob.address)).to.be.equals(e8(6));

      // loss
      await variableBorrow
        .connect(bob)
        .liquidate(eth.address, alice.address, "70636363636363660000", bob.address);

      // zero gain
      expect(await wbtc.balanceOf(bob.address)).to.be.equals(e8(6));
    });
  });

  describe("IBorrowForSwap", function () {
    it("Should track asset global debt", async function () {
      await network.provider.send("evm_setAutomine", [false]);
      await wbtc.transfer(alice.address, e8(10));
      await wbtc.connect(alice).approve(variableBorrow.address, e8(10));
      await wbtc.transfer(bob.address, e8(10));
      await wbtc.connect(bob).approve(variableBorrow.address, e8(10));
      await network.provider.send("evm_mine");

      // deposit first
      await variableBorrow.connect(alice).borrow(
        eth.address,
        e18(0),
        [
          {
            token: wbtc.address,
            amount: e8(10),
          },
        ],
        alice.address
      );
      await variableBorrow.connect(bob).borrow(
        eth.address,
        e18(0),
        [
          {
            token: wbtc.address,
            amount: e8(10),
          },
        ],
        bob.address
      );

      // start borrow
      await variableBorrow.connect(alice).borrow(eth.address, e18(2), [], alice.address);
      await network.provider.send("evm_mine");

      const borrowTime = await getLatestBlockTime();
      expect((await variableBorrow.getDebt(eth.address))[0]).to.equal(e18(2));

      await network.provider.send("evm_setNextBlockTimestamp", [365 * 1 * 24 * 3600 + borrowTime]);
      // 2*1.0021=2.0042
      expect((await variableBorrow.assets(eth.address)).interestRate).to.equals(10021);
      await variableBorrow.connect(bob).borrow(eth.address, e18(10), [], bob.address);
      await network.provider.send("evm_mine");
      expect((await variableBorrow.getDebt(eth.address))[0]).to.equal("12004199999999999982");

      await eth.connect(alice).approve(swap.address, e18(2));
      await eth.connect(bob).approve(swap.address, e18(10));

      await network.provider.send("evm_setNextBlockTimestamp", [365 * 2 * 24 * 3600 + borrowTime]);
      // 12.0042*1.0129=12.15905418
      expect((await variableBorrow.assets(eth.address)).interestRate).to.equals(10129);
      await variableBorrow.connect(alice).repay(eth.address, e18(1), [], alice.address);
      await network.provider.send("evm_mine");
      expect((await variableBorrow.getDebt(eth.address))[0]).to.equal("11159054179999999898");

      await network.provider.send("evm_setNextBlockTimestamp", [365 * 3 * 24 * 3600 + borrowTime]);
      // 11.15905418*1.0119=11.291846924742
      expect((await variableBorrow.assets(eth.address)).interestRate).to.equals(10119);
      await variableBorrow.connect(alice).repay(eth.address, e18(1), [], alice.address);
      await variableBorrow.connect(bob).repay(eth.address, e18(10), [], bob.address);
      await network.provider.send("evm_mine");
      expect((await variableBorrow.getDebt(eth.address))[0]).to.equal("291846924741999796");

      // 42311824741999958 + 249535099999999840 = 291846924741999796
      expect((await variableBorrow.positions(eth.address, alice.address)).debt).to.equal(
        "42311824741999958"
      );
      expect((await variableBorrow.positions(eth.address, bob.address)).debt).to.equal(
        "249535099999999840"
      );

      await network.provider.send("evm_setAutomine", [true]);
    });

    it("Should trigger interest rate update on reserve change", async function () {
      expect((await variableBorrow.assets(wbtc.address)).interestRate).to.equals(10000);
      await wbtc.approve(variableBorrow.address, e8(100));
      await variableBorrow.borrow(
        wbtc.address,
        e8(50),
        [
          {
            token: wbtc.address,
            amount: e8(100),
          },
        ],
        owner.address
      );
      // 50/100/0.65*7+100
      expect((await variableBorrow.assets(wbtc.address)).interestRate).to.equals(10538);

      await wbtc.approve(swap.address, e8(100));
      await swap.addReserve(wbtc.address, e8(100));
      // 50/200/0.65*7+100
      expect((await variableBorrow.assets(wbtc.address)).interestRate).to.equals(10269);

      await wbtc.approve(swap.address, e8(30));
      await variableBorrow.repay(wbtc.address, e8(30), [], owner.address);
      // 20/200/0.65*7+100
      expect((await variableBorrow.assets(wbtc.address)).interestRate).to.equals(10107);

      // 20/150/0.65*7+100
      await swap.removeReserve(wbtc.address, e8(50));
      expect((await variableBorrow.assets(wbtc.address)).interestRate).to.equals(10143);
    });
  });

  describe("Viewers", function () {
    it("Should getMaxAmountOfBorrow()", async function () {
      await wbtc.transfer(alice.address, e8(10));
      await wbtc.connect(alice).approve(variableBorrow.address, e8(10));

      expect(
        await variableBorrow.connect(alice).getMaxAmountOfBorrow(
          eth.address,
          [
            {
              token: wbtc.address,
              amount: e8(1),
            },
          ],
          alice.address
        )
      ).to.be.equal("18478260869565217391");

      await variableBorrow.connect(alice).borrow(
        eth.address,
        "18478260869565217390", // should not liquidatable
        [
          {
            token: wbtc.address,
            amount: e8(1),
          },
        ],
        alice.address
      );

      expect(await variableBorrow.liquidatableAmount(eth.address, alice.address)).to.be.equal(0);

      // should include existing collaterals
      expect(
        await variableBorrow.connect(alice).getMaxAmountOfBorrow(
          eth.address,
          [
            {
              token: wbtc.address,
              amount: e8(1),
            },
          ],
          alice.address
        )
      ).to.be.equal("36956521739130434782");
    });

    it("Should getMaxAmountOfRepay()", async function () {
      await wbtc.transfer(alice.address, e8(10))
      await wbtc.connect(alice).approve(variableBorrow.address, e8(10));
      await variableBorrow.connect(alice).borrow(
        eth.address,
        "1",
        [
          {
            token: wbtc.address,
            amount: e8(2),
          },
        ],
        alice.address
      );

      expect(
        await variableBorrow.connect(alice).getMaxAmountOfRepay(eth.address, [
          {
            token: wbtc.address,
            amount: e8(1),
          },
        ])
      ).to.be.equal("18478260869565217391");
    });
  });

  describe("FlashLoan", function () {
    it("Should flash loan", async function () {
      const FlashBorrower = await ethers.getContractFactory("MockFlashBorrower");
      const borrower = await FlashBorrower.deploy(alice.address, swap.address);

      await expect(
        variableBorrow.flashLoan(borrower.address, wbtc.address, e8(101), [0])
      ).to.be.revertedWith("AMOUNT_EXCCED");

      await expect(
        variableBorrow.flashLoan(borrower.address, wbtc.address, e8(50), [0])
      ).to.be.revertedWith("ERC20: transfer amount exceeds balance");

      await wbtc.transfer(borrower.address, e8(50));
      await expect(
        variableBorrow.flashLoan(borrower.address, wbtc.address, e8(50), [0])
      ).to.be.revertedWith("ERC20: transfer amount exceeds balance");

      await wbtc.transfer(borrower.address, e8(50));
      await variableBorrow.flashLoan(borrower.address, wbtc.address, e8(50), [0]);
      // 0.09% fee
      expect(await wbtc.balanceOf(borrower.address)).to.be.equal("4995500000");
      expect(await wbtc.balanceOf(alice.address)).to.be.equal("5000000000");
    });
  });
});
