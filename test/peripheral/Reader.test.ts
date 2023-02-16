import { e, e6, e8, e18 } from "../helpers";
import { Block } from "@ethersproject/abstract-provider";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { BigNumber, BigNumberish, Signer } from "ethers";
import { ethers } from "hardhat";
import { MockOracle, Reader, VariableBorrow } from "../../typechain";

// infer concrete type
// https://github.com/microsoft/TypeScript/issues/26591#issuecomment-414894092
async function getSwapFactory() {
  return await ethers.getContractFactory("Swap");
}
async function getOsdFactory() {
  return await ethers.getContractFactory("Osd");
}
async function getERC20Factory() {
  return await ethers.getContractFactory("MyERC20");
}
type Resolve<T> = T extends Promise<infer R> ? R : T;
type SwapFactory = Resolve<ReturnType<typeof getSwapFactory>>;
type Swap = Resolve<ReturnType<SwapFactory["deploy"]>>;
type OsdFactory = Resolve<ReturnType<typeof getOsdFactory>>;
type Osd = Resolve<ReturnType<OsdFactory["deploy"]>>;
type ERC20Factory = Resolve<ReturnType<typeof getERC20Factory>>;
type ERC20 = Resolve<ReturnType<ERC20Factory["deploy"]>>;

describe("Reader", async function () {
  let Swap: SwapFactory;
  let Osd: OsdFactory;
  let ERC20: ERC20Factory;
  let owner: SignerWithAddress;
  let alice: SignerWithAddress;
  let bob: SignerWithAddress;
  let addrs: SignerWithAddress[];
  let swap: Swap;
  let borrow: VariableBorrow;
  let oracle: MockOracle;
  let osd: Osd;
  let btc: ERC20;
  let eth: ERC20;
  // non-official
  let luna: ERC20;
  let mdc: ERC20;
  let usdt: ERC20;
  let usdc: ERC20;
  let dai: ERC20;
  let blockBefore: Block;
  let nextBlockTimestamp: number;

  let reader: Reader;

  before(async function () {
    [owner, alice, bob, ...addrs] = await ethers.getSigners();
    [Swap, ERC20, Osd] = await Promise.all([getSwapFactory(), getERC20Factory(), getOsdFactory()]);
  });

  beforeEach(async function () {
    await Promise.all([
      (async () => {
        osd = await Osd.deploy();
        swap = await Swap.deploy(osd.address);
        oracle = await (await ethers.getContractFactory("MockOracle")).deploy();
        borrow = await (
          await ethers.getContractFactory("VariableBorrow")
        ).deploy(swap.address, oracle.address);
        reader = await (
          await ethers.getContractFactory("Reader")
        ).deploy(swap.address, borrow.address, oracle.address);
        await swap.setBorrow(borrow.address);
        await osd.setMinter(swap.address, true);
        await osd.setMinter(owner.address, true);
        await osd.mint(owner.address, e(999, 50));
      })(),
      (async () => (btc = await ERC20.deploy("BTC", "BTC", 8)))(),
      (async () => (eth = await ERC20.deploy("ETH", "ETH", 18)))(),
      (async () => (luna = await ERC20.deploy("LUNA", "LUNA", 18)))(),
      (async () => (mdc = await ERC20.deploy("MDC", "MDC", 18)))(),
      (async () => (usdt = await ERC20.deploy("USDT", "USDT", 6)))(),
      (async () => (usdc = await ERC20.deploy("USDC", "USDC", 6)))(),
      (async () => (dai = await ERC20.deploy("DAI", "DAI", 18)))(),
      (async () => {
        const blockNumBefore = await ethers.provider.getBlockNumber();
        blockBefore = await ethers.provider.getBlock(blockNumBefore);
        nextBlockTimestamp = blockBefore.timestamp + 10 * 60; // seconds
      })(),
    ]);

    async function listToken(
      token: ERC20,
      price: BigNumberish,
      rebalancible = false,
      stable = false,
      feeType = 1,
      revenueRate = 0,
      feeRates: [number, number, number]
    ) {
      const AMOUNT = 100;
      const decimals = await token.decimals();
      const tokenAmount = e(AMOUNT, decimals);
      const osdAmount = BigNumber.from(10)
        .pow(18 - decimals)
        .mul(tokenAmount)
        .mul(price);
      await token.approve(swap.address, tokenAmount);
      await swap.listToken(token.address, tokenAmount, osdAmount, owner.address);
      await swap.updatePool(
        token.address,
        tokenAmount,
        osdAmount,
        rebalancible,
        stable,
        feeType,
        revenueRate,
        feeRates
      );
    }
    await Promise.all([
      listToken(btc, 50000, true, false, 1, 70, [300, 150, 300]),
      listToken(eth, 2000, true, false, 1, 70, [300, 150, 300]),
      listToken(luna, 10, false, false, 1, 70, [300, 150, 300]),
      listToken(usdt, 1, true, true, 2, 1, [60, 30, 30]),
      listToken(usdc, 1, true, true, 2, 1, [60, 30, 30]),
      listToken(dai, 1, true, true, 2, 1, [60, 30, 30]),
    ]);
    // TODO fixtures?
  });

  it("reader", async () => {
    // todo test

    const addrList = [btc.address, eth.address];
    // console.log("swapPool", await reader.swap());
    // console.log("addresslist", addrList);
    // const res = await reader.bulkToken(btc.address, addrList);
    // const res2 = await reader.bulkSwapPoolInfo(addrList);
    // console.log("bulkToken, ", res);
    // console.log("bulkSwapPoolInfo, ", res2);

    // const res3 = await reader.bulkBorrowAssetInfo(addrList);
    // console.log("bulkBorrowAssetInfo", res3);

    // const res4 = await reader.bulkAccountBorrowPosition(addrList[0], addrList);
    // console.log("bulkAccountBorrowPosition", res4);

    // const res5 = await reader.bulkBorrowPrice(addrList);
    // console.log("bulkBorrowPrice", res5);

    console.log(addrList, 'addrList')
    const res6 = await reader.bulkBorrowAssetState(addrList);
    console.log("bulkBorrowAssetState", res6);
  });
});
