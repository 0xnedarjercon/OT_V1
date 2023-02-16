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
async function getVariableBorrowRouterFactory() {
  return await ethers.getContractFactory("VariableBorrowRouter");
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

async function getWETHFactory() {
  return await ethers.getContractFactory("WETH9");
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
type WETHFactory = Resolve<ReturnType<typeof getWETHFactory>>;
type WETH = Resolve<ReturnType<WETHFactory["deploy"]>>;
type VariableBorrowRouterFactory = Resolve<ReturnType<typeof getVariableBorrowRouterFactory>>;
type VariableBorrowRouter = Resolve<ReturnType<VariableBorrowRouterFactory["deploy"]>>;


describe("VariableBorrow", function () {
  let VariableBorrow: VariableBorrowFactory;
  let Swap: SwapFactory;
  let ERC20: ERC20Factory;
  let Oracle: OracleFactory;
  let WETH: WETHFactory;
  let VariableBorrowRouter: VariableBorrowRouterFactory

  let owner: SignerWithAddress;
  let alice: SignerWithAddress;
  let bob: SignerWithAddress;
  let addrs: SignerWithAddress[];

  let variableBorrow: VariableBorrow;
  let variableBorrowRouter: VariableBorrowRouter;
  let swap: Swap;
  let oracle: Oracle;
  let wbtc: ERC20;
  let eth: WETH;
  let usdt: ERC20;
  let ot: ERC20;

  async function minBlock(startTime: number, deltaTime: number) {
    await network.provider.send("evm_setNextBlockTimestamp", [startTime + deltaTime]);
    await network.provider.send("hardhat_mine", ["0x1"]);
  }

  before(async function () {
    [owner, alice, bob, ...addrs] = await ethers.getSigners();
    [VariableBorrow, Swap, ERC20, Oracle, WETH, VariableBorrowRouter] = await Promise.all([
      getVariableBorrowFactory(),
      getSwapFactory(),
      getERC20Factory(),
      getOracleFactory(),
      getWETHFactory(),
      getVariableBorrowRouterFactory()
    ]);
  });

  beforeEach(async function () {
    eth = await WETH.deploy()
    await Promise.all([
      (async () => {
        swap = await Swap.deploy();
        oracle = await Oracle.deploy();
        variableBorrow = await VariableBorrow.deploy(swap.address, oracle.address);
        await swap.setBorrow(variableBorrow.address);
        variableBorrowRouter = await VariableBorrowRouter.deploy(eth.address, variableBorrow.address)
        await variableBorrow.setRouter(variableBorrowRouter.address)
      })(),
      (async () => (wbtc = await ERC20.deploy("WBTC", "WBTC", 8)))(),
      (async () => (usdt = await ERC20.deploy("USDT", "USDT", 6)))(),
      (async () => (ot = await ERC20.deploy("OT", "OT", 18)))(),
    ]);

    eth.deposit({ value: e18(2000) })

    await Promise.all([
      (async () => oracle.setPrice(wbtc.address, e8(50000), await wbtc.decimals()))(),
      (async () => oracle.setPrice(eth.address, e8(2000), await eth.decimals()))(),
      (async () => oracle.setPrice(usdt.address, e8(1), await usdt.decimals()))(),
      (async () => oracle.setPrice(ot.address, e6(1), await ot.decimals()))(),
      wbtc.transfer(swap.address, e8(100)),
      eth.transfer(swap.address, e18(100)),
      usdt.transfer(swap.address, e6(100)),
      ot.transfer(swap.address, e6(100)),
    ]);

    await Promise.all([
      variableBorrow.updateAsset(wbtc.address, 0, 6500, 700, 10000, 115, 85, 10),
      variableBorrow.updateAsset(eth.address, 0, 6500, 700, 10000, 115, 85, 10),
      variableBorrow.updateAsset(usdt.address, 0, 9000, 400, 6000, 110, 90, 5),
    ]);


    const startTime = (await getLatestBlockTime()) + 60
    const rewardToken = ot
    const deltaSecondNumber = 10000000000
    await ot.setMinter(variableBorrowRouter.address, true)

    // _rewardToken: string, _asset: string, _minter: string, _rewardPerSecond: BigNumberish, _startTime: BigNumberish, _deltaTime: BigNumberish
    await Promise.all([
      variableBorrowRouter.addMintPool(rewardToken.address, wbtc.address, rewardToken.address, 100000, startTime, deltaSecondNumber),
      variableBorrowRouter.addMintPool(rewardToken.address, eth.address, rewardToken.address, 100000, startTime, deltaSecondNumber),
      variableBorrowRouter.addMintPool(rewardToken.address, usdt.address, rewardToken.address, 100000, startTime, deltaSecondNumber),
    ])

  });

  describe("Borrow", function () {
    it("Should VariableBorrowRouter borrow ok", async function () {
      const startTime = (await getLatestBlockTime()) + 60;
      {
        const position = await variableBorrow.positions(wbtc.address, alice.address);
        expect(position.debt).to.equal(0);
        expect(await eth.balanceOf(alice.address)).to.be.equals(e18(0));
        // expect(position.collaterals)
      }

      await wbtc.transfer(alice.address, e8(10));
      await wbtc.connect(alice).approve(variableBorrowRouter.address, e8(10));
      await wbtc.transfer(bob.address, e8(10));
      await wbtc.connect(bob).approve(variableBorrowRouter.address, e8(10));
      const balance1 = await alice.getBalance()
      await variableBorrowRouter.connect(alice).borrow(
        eth.address,
        e18(2),
        [
          {
            token: wbtc.address,
            amount: e8(2),
          },
          {
            token: eth.address,
            amount: e18(1)
          }
        ],
        alice.address, {
        value: e18(1)
      }
      );
      await minBlock(startTime, 3600)
      await variableBorrowRouter.connect(bob).borrow(
        eth.address,
        e18(1),
        [
          {
            token: wbtc.address,
            amount: e8(2),
          },
          {
            token: eth.address,
            amount: e18(1)
          }
        ],
        bob.address, {
        value: e18(1)
      }
      );
      const balance2 = await alice.getBalance()
      const bDelta = balance2.sub(balance1)
      await expect(bDelta).to.be.lt(e18(1))
      await expect(bDelta).to.be.gt(e(9, 17))
      await minBlock(startTime, 3600 * 2)
    });
  });

  describe("Repay", function () {
    it("Should VariableBorrowRouter ok", async function () {
      await wbtc.transfer(alice.address, e8(10));
      await wbtc.transfer(bob.address, e8(10));
      await wbtc.connect(alice).approve(variableBorrowRouter.address, e8(10));
      await wbtc.connect(bob).approve(variableBorrowRouter.address, e8(10));
      console.log("b1", await alice.getBalance())
      await variableBorrowRouter.connect(alice).borrow(
        eth.address,
        e18(2),
        [
          {
            token: wbtc.address,
            amount: e8(2),
          },
          {
            token: eth.address,
            amount: e18(1)
          }
        ],
        alice.address, {
        value: e18(1)
      }
      );
      console.log("b2", await alice.getBalance())
      await variableBorrowRouter.connect(alice).repay(
        eth.address,
        e18(2),
        [
          {
            token: wbtc.address,
            amount: 0,
          },
          {
            token: eth.address,
            amount: e18(1)
          }
        ],
        alice.address,
        {
          value: e18(2)
        }
      );

      console.log("b3", await alice.getBalance())

    });
  });

  // describe("Liquidate", function () {
  //   it("Should liquidate works", async function () {
  //     await wbtc.transfer(alice.address, e8(10));
  //     await wbtc.connect(alice).approve(variableBorrow.address, e8(10));

  //     // credits
  //     // 6*50000*85 =25500000
  //     // 100*2000*115=23000000
  //     await variableBorrow.connect(alice).borrow(
  //       eth.address,
  //       e18(100),
  //       [
  //         {
  //           token: wbtc.address,
  //           amount: e8(6),
  //         },
  //       ],
  //       alice.address
  //     );
  //     const borrowTime = await getLatestBlockTime();

  //     // FAIL
  //     // debt: 100*2.07**0.1=108
  //     // credit: 108*2000*115=2484000 < 25500000
  //     await network.provider.send("evm_setNextBlockTimestamp", [
  //       365 * 0.1 * 24 * 3600 + borrowTime,
  //     ]);
  //     await expect(
  //       variableBorrow.liquidate(eth.address, alice.address, 1, bob.address)
  //     ).to.be.revertedWith("NOT_LIQUIDATABLE");

  //     // SUCCESS
  //     // debt: 100*2.07**0.2=115.66
  //     // credit: 115.66*2000*115=26601800 >= 25500000
  //     // max: (25500000-x*2000*85*1.1penalty)/(26601800-x*2000*115)=1.1, max=57
  //     // penalty: 57*0.1=0.57
  //     await eth.transfer(bob.address, e18(200));
  //     await eth.connect(bob).approve(swap.address, e18(200));
  //     await network.provider.send("evm_setNextBlockTimestamp", [
  //       365 * 0.2 * 24 * 3600 + borrowTime,
  //     ]);

  //     // await network.provider.send("evm_mine");
  //     // console.log(await variableBorrow.liquidatableAmount(eth.address, alice.address));

  //     await expect(
  //       variableBorrow.liquidate(eth.address, alice.address, e18(58), bob.address)
  //     ).to.be.revertedWith("AMOUNT_EXCEED");
  //     // console.log("getDebt", await variableBorrow.getDebt(eth.address));
  //     await variableBorrow.connect(bob).liquidate(eth.address, alice.address, e18(57), bob.address);

  //     expect(await eth.balanceOf(bob.address)).to.be.equals(e18(143));
  //     // 57*2000/50000*1.1=2.508
  //     expect(await wbtc.balanceOf(bob.address)).to.be.equals("250800000");
  //     // console.log("pendingReward alice", await variableBorrow.getReward(eth.address, alice.address))
  //     // console.log("rewardBalance alice", await ot.balanceOf(alice.address))
  //   });
  // });

});
