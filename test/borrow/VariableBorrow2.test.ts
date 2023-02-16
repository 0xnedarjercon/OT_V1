import { e, e6, e8, e18, getLatestBlockTime } from "../helpers";
import { Block } from "@ethersproject/abstract-provider";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { BigNumber, Signer, BigNumberish } from "ethers";
import { ethers, network } from "hardhat";

// TODO DRY
async function getVariableBorrowFactory() {
  return await ethers.getContractFactory("VariableBorrow");
}
async function getOsdFactory() {
  return await ethers.getContractFactory("Osd");
}
async function getSwapFactory() {
  return await ethers.getContractFactory("Swap");
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
type OsdFactory = Resolve<ReturnType<typeof getOsdFactory>>;
type Osd = Resolve<ReturnType<OsdFactory["deploy"]>>;
type OracleFactory = Resolve<ReturnType<typeof getOracleFactory>>;
type Oracle = Resolve<ReturnType<OracleFactory["deploy"]>>;
type ERC20Factory = Resolve<ReturnType<typeof getERC20Factory>>;
type ERC20 = Resolve<ReturnType<ERC20Factory["deploy"]>>;


async function listToken(
  token: any,
  swap: Swap,
  price: BigNumberish,
  rebalancible = false,
  stable: boolean,
  feeType = 1,
  revenueRate = 0,
  ownerAddress: string,
  feeRates: [number, number, number]
) {
  const AMOUNT = 100;
  const decimals = await token.decimals();
  const transferAmount = e(AMOUNT, decimals);
  const virtualOsdAmount = e(BigNumber.from(AMOUNT).mul(price), 18 - decimals);
  await token.approve(swap.address, transferAmount);
  await swap.listToken(token.address, transferAmount, virtualOsdAmount, ownerAddress);
  await swap.updatePool(
    token.address,
    transferAmount,
    virtualOsdAmount,
    rebalancible,
    stable,
    feeType,
    revenueRate,
    feeRates
  );
}


describe("VariableBorrow", function () {
  let VariableBorrow: VariableBorrowFactory;
  let Swap: SwapFactory;
  let ERC20: ERC20Factory;
  let Oracle: OracleFactory;
  let Osd: OsdFactory;

  let owner: SignerWithAddress;
  let alice: SignerWithAddress;
  let bob: SignerWithAddress;
  let addrs: SignerWithAddress[];

  let variableBorrow: VariableBorrow;
  let swap: Swap;
  let osd: Osd;
  let oracle: Oracle;
  let wbtc: ERC20;
  let usdt: ERC20;

  before(async function () {
    [owner, alice, bob, ...addrs] = await ethers.getSigners();
    [VariableBorrow, Swap, ERC20, Oracle, Osd] = await Promise.all([
      getVariableBorrowFactory(),
      getSwapFactory(),
      getERC20Factory(),
      getOracleFactory(),
      getOsdFactory()
    ]);
  });

  beforeEach(async function () {
    await Promise.all([
      (async () => {
        osd = await Osd.deploy();
        swap = await Swap.deploy(osd.address);
        await osd.setMinter(swap.address, true);
        await osd.setMinter(owner.address, true);
        oracle = await Oracle.deploy();
        variableBorrow = await VariableBorrow.deploy(swap.address, oracle.address);
        await swap.setBorrow(variableBorrow.address);
      })(),
      (async () => (wbtc = await ERC20.deploy("WBTC", "WBTC", 8)))(),
      (async () => (usdt = await ERC20.deploy("USDT", "USDT", 6)))(),
    ]);

    await Promise.all([
      (async () => oracle.setPrice(wbtc.address, e8(50000), await wbtc.decimals()))(),
      (async () => oracle.setPrice(usdt.address, e8(1), await usdt.decimals()))(),
      listToken(wbtc, swap, 50000, true, false, 1, 70, owner.address, [300, 150, 300]),
      listToken(usdt, swap, 1, true, true, 2, 1, owner.address, [60, 30, 30])
    ]);

    await variableBorrow.updateProtocolRevenue(bob.address, 50, 50, 9);
    await Promise.all([
      variableBorrow.updateAsset(wbtc.address, 0, 6500, 700, 10000, 115, 85, 10),
      variableBorrow.updateAsset(usdt.address, 0, 9000, 400, 6000, 110, 90, 5),
    ]);
  });

  describe("Borrow", function () {
    it("Should revenue ok", async function () {
      await wbtc.transfer(alice.address, e8(100));
      await usdt.transfer(alice.address, e18(1))
      await wbtc.connect(alice).approve(variableBorrow.address, e8(2));
      await variableBorrow.connect(alice).borrow(
        usdt.address,
        e6(10),
        [
          {
            token: wbtc.address,
            amount: e8(2),
          },
        ],
        alice.address
      );
      await network.provider.send("evm_setNextBlockTimestamp", [
        365 * 1.5 * 24 * 3600 + await getLatestBlockTime(),
      ]);
      await network.provider.send("hardhat_mine", ["0x1"])
      await variableBorrow.connect(alice).borrow(usdt.address, e6(10), [], alice.address);
      await network.provider.send("evm_setNextBlockTimestamp", [
        365 * 1.5 * 24 * 3600 + await getLatestBlockTime(),
      ]);
      await network.provider.send("hardhat_mine", ["0x1"])
      await variableBorrow.extractProtocolRevenue(usdt.address)
      await network.provider.send("evm_setNextBlockTimestamp", [
        365 * 1.5 * 24 * 3600 + await getLatestBlockTime(),
      ]);
      await network.provider.send("hardhat_mine", ["0x1"])
      await network.provider.send("evm_setNextBlockTimestamp", [
        365 * 1.5 * 24 * 3600 + await getLatestBlockTime(),
      ]);
      // await variableBorrow.extractProtocolRevenue(usdt.address)
      await network.provider.send("hardhat_mine", ["0x1"])
      const repayInfo = await variableBorrow.connect(alice).getMaxAmountOfRepay(usdt.address, [])
      await usdt.connect(alice).approve(swap.address, repayInfo)
      await variableBorrow.connect(alice).repay(usdt.address, repayInfo, [], alice.address)
      const debtInfo = await variableBorrow.getDebt(usdt.address)
      const swapBalance = await usdt.balanceOf(swap.address)
      const poolReserve = await swap.getPoolReserve(usdt.address)
      expect(
        poolReserve.reserveToken.add(debtInfo[2])
      ).to.be.equal(
        swapBalance,
        "LagencyBorrow: SwapBalance show equal tokenReserve + unextracted revenue"
      )
    });

    it("Should flash loan revenue ok", async function () {
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
      const debtInfo = await variableBorrow.getDebt(wbtc.address)
      const swapBalance = await wbtc.balanceOf(swap.address)
      const poolReserve = await swap.getPoolReserve(wbtc.address)
      expect(
        poolReserve.reserveToken.add(debtInfo[2])
      ).to.be.equal(
        swapBalance,
        "FlashLoan: SwapBalance show equal tokenReserve + unextracted revenue"
      )
    });

  });
});
