import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { e, e6, e8, e18, expandDecimals, getLatestBlockTime } from "../helpers";
import { ethers } from "hardhat";
import { BigNumber } from "ethers";
import {
  FastPriceFeed,
  MockSwap,
  Future,
  FutureUtil,
  FuturePriceFeed,
  FastPriceEvent,
  MyERC20,
  FutureRouter,
  WETH9,
} from "../../typechain";

async function getSwapFactory() {
  return await ethers.getContractFactory("Swap");
}
async function getBorrowFactory() {
  return await ethers.getContractFactory("MockBorrow");
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
type BorrowFactory = Resolve<ReturnType<typeof getBorrowFactory>>;
type Borrow = Resolve<ReturnType<BorrowFactory["deploy"]>>;
type OsdFactory = Resolve<ReturnType<typeof getOsdFactory>>;
type Osd = Resolve<ReturnType<OsdFactory["deploy"]>>;
type ERC20Factory = Resolve<ReturnType<typeof getERC20Factory>>;
type ERC20 = Resolve<ReturnType<ERC20Factory["deploy"]>>;

describe("Future/FutureRouter", async function () {
  let futureUtil: FutureUtil;
  let future: Future;
  let futureRouter: FutureRouter;
  let weth: WETH9;

  let futurePriceFeed: FuturePriceFeed;
  let fastPriceFeed: FastPriceFeed;
  let fastPriceEvent: FastPriceEvent;

  let eth: MyERC20;
  let btc: MyERC20;
  let usdc: MyERC20;
  let dai: MyERC20;

  let owner: SignerWithAddress;
  let user0: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  let updater0: SignerWithAddress;

  const usdcEthState: {
    totalLongSize: BigNumber;
    totalShortSize: BigNumber;
    totalLongOpenNotional: BigNumber;
    totalShortOpenNotional: BigNumber;
    tokenBalance: BigNumber;
    insuranceFund: BigNumber;
    cumulativeLongFundingRate: BigNumber;
    cumulativeShortFundingRate: BigNumber;
  } = {
    totalLongSize: BigNumber.from(0),
    totalShortSize: BigNumber.from(0),
    totalLongOpenNotional: BigNumber.from(0),
    totalShortOpenNotional: BigNumber.from(0),
    tokenBalance: BigNumber.from(0),
    insuranceFund: BigNumber.from(0),
    cumulativeLongFundingRate: BigNumber.from(0),
    cumulativeShortFundingRate: BigNumber.from(0),
  };
  let Swap: SwapFactory;
  let ERC20: ERC20Factory;
  let Osd: OsdFactory;
  let Borrow: BorrowFactory;
  let swap: Swap;
  let borrow: Borrow;
  let osd: Osd;
  before(async function () {
    [owner, user0, user1, user2, updater0] = await ethers.getSigners();
    [Swap, ERC20, Osd, Borrow] = await Promise.all([
      getSwapFactory(),
      getERC20Factory(),
      getOsdFactory(),
      getBorrowFactory(),
    ]);
  });

  this.beforeEach(async function () {
    // deploy price feed
    const minBlockInterval = 0; // blocks, if block not timed out, can't update
    const priceDuration = 30 * 60; // seconds, if price timed out, not used;
    const maxDeviationBasisPoints = 250; // 250 / 10000 = 2.5% , if price in this deviation, price used, otherwise, not used;
    fastPriceEvent = await (await ethers.getContractFactory("FastPriceEvent")).deploy();
    fastPriceFeed = await (
      await ethers.getContractFactory("FastPriceFeed")
    ).deploy(priceDuration, minBlockInterval, maxDeviationBasisPoints, fastPriceEvent.address);
    futurePriceFeed = await (await ethers.getContractFactory("FuturePriceFeed")).deploy();
    await fastPriceFeed.setUpdater(updater0.address, true);
    await fastPriceEvent.setIsPriceFeed(fastPriceFeed.address, true);
    await fastPriceFeed.setMaxTimeDeviation(3600);
    await futurePriceFeed.setFastPriceFeed(fastPriceFeed.address);

    future = await (await ethers.getContractFactory("Future")).deploy();
    futureUtil = await (await ethers.getContractFactory("FutureUtil")).deploy(future.address);

    weth = await (await ethers.getContractFactory("WETH9")).deploy();

    // setting future
    await future.setPriceFeed(futurePriceFeed.address);
    await future.setFutureUtil(futureUtil.address);
    eth = await (await ethers.getContractFactory("MyERC20")).deploy("eth", "eth", 18);
    btc = await (await ethers.getContractFactory("MyERC20")).deploy("btc", "btc", 8);
    usdc = await (await ethers.getContractFactory("MyERC20")).deploy("usdc", "usdc", 6);
    dai = await (await ethers.getContractFactory("MyERC20")).deploy("dai", "dai", 18);
    console.log("hello2");
    const blockTime = await getLatestBlockTime();
    await fastPriceFeed
      .connect(updater0)
      .setPrices(
        [weth.address, usdc.address],
        [expandDecimals(1500, 30), expandDecimals(1, 30)],
        blockTime
      );
    await future.listPair(usdc.address, weth.address);

    // max leverage: 10x; maxOpenNotional: 3000 * 10
    await future.setMaxLeverage(usdc.address, weth.address, 3000, 10e9);
    // minMaintanenceMarginRatio: 0.5%， maxMaintanenceMarginRatio: 5%
    await future.setMarginRatio(usdc.address, weth.address, 5e6, 5e7);
    // feeRate: 0.1%, protocolFeeRate: 50% * 0.1%
    await future.setTradingFeeRate(usdc.address, weth.address, 1e6);

    // handle swap

    osd = await Osd.deploy();
    borrow = await Borrow.deploy();
    swap = await Swap.deploy(osd.address);
    await swap.setBorrow(borrow.address);
    await osd.setMinter(swap.address, true);
    await osd.setMinter(owner.address, true);
    await osd.mint(owner.address, e(999, 50));

    const mockOracle = await (await ethers.getContractFactory("MockOracle")).deploy();
    await swap.setPriceFeed(mockOracle.address);

    async function listToken(
      token: ERC20,
      price: BigNumberish,
      rebalancible = false,
      usePriceFeed = false,
      feeType = 1,
      revenueRate = 0,
      feeRates: [number, number, number]
    ) {
      const AMOUNT = 100;
      const decimals = await token.decimals();
      const tokenAmount = e(AMOUNT, decimals);
      const osdAmount = BigNumber.from(10).pow(18).mul(AMOUNT).mul(price);
      await token.approve(swap.address, tokenAmount);
      await swap.listToken(token.address, tokenAmount, osdAmount, owner.address);
      await swap.updatePool(
        token.address,
        tokenAmount,
        osdAmount,
        rebalancible,
        usePriceFeed,
        feeType,
        revenueRate,
        feeRates
      );
      if (usePriceFeed) {
        await mockOracle.setPrice(token.address, e8(1), decimals);
      }
    }
    await Promise.all([
      listToken(btc, 50000, true, false, 1, 70, [300, 150, 300]),
      listToken(eth, 2000, true, false, 1, 70, [300, 150, 300]),
      listToken(usdc, 1, true, true, 2, 1, [60, 30, 30]),
      listToken(dai, 1, true, true, 2, 1, [60, 30, 30]),
    ]);

    const blockNumBefore = await ethers.provider.getBlockNumber();
    const blockBefore = await ethers.provider.getBlock(blockNumBefore);
    const nextBlockTimestamp = blockBefore.timestamp + 10 * 60;

    await btc.transfer(user1.address, e8(100));
    await btc.connect(user1).approve(swap.address, e8(100));
    await swap.connect(user1).addLiquidity(btc.address, e8(100), user1.address, nextBlockTimestamp);

    await usdc.transfer(user1.address, e18(100));
    await usdc.connect(user1).approve(swap.address, e18(100));
    await swap
      .connect(user1)
      .addLiquidity(usdc.address, e18(100), user1.address, nextBlockTimestamp);

    const pool = await swap.pools(usdc.address);
    const liquidityToken = ERC20.attach(pool.liquidity);
    expect(await liquidityToken.balanceOf(user1.address)).to.equal(e18(100));

    // swap = await (await ethers.getContractFactory("MockSwap")).deploy();

    await futureUtil.setFundingRateMultiplier(usdc.address, weth.address, 250000);
    // await future.setSwapPool(swap.address);

    futureRouter = await (
      await ethers.getContractFactory("FutureRouter")
    ).deploy(future.address, weth.address, swap.address, swap.address, swap.address);
    await future.setSystemRouter(futureRouter.address, true);

    // increase insuranceFund
    const insuranceFund = 1000 * 1e6;
    await usdc.transfer(user0.address, insuranceFund);
    await usdc.connect(user0).approve(futureRouter.address, insuranceFund);
    await futureRouter.connect(user0).increaseInsuranceFund(usdc.address, insuranceFund);
    expect(await future.collateralInsuranceFunds(usdc.address)).to.equal(insuranceFund);
    expect(await future.tokenBalances(usdc.address)).to.equal(1000 * 1e6);
    console.log("init done");

    // {
    //   const posKey = await future.getPositionKey(usdc.address, weth.address, user0.address, true);
    //   await usdc.transfer(user0.address, 1000 * 1e6);
    //   await usdc.connect(user0).approve(futureRouter.address, 1000 * 1e6);

    //   await expect(
    //     futureRouter
    //       .connect(user0)
    //       .increasePosition(
    //         usdc.address,
    //         usdc.address,
    //         weth.address,
    //         true,
    //         1000 * 1e6,
    //         0,
    //         3000 * 1e6,
    //         0,
    //         0
    //       )
    //   ).to.emit(future, "IncreasePosition");
    // }
    // increase short position
    // {
    //   const posKey = await future.getPositionKey(usdc.address, weth.address, user0.address, false);
    //   await usdc.transfer(user0.address, 1000 * 1e6);
    //   await usdc.connect(user0).approve(futureRouter.address, 1000 * 1e6);
    //   await expect(
    //     futureRouter
    //       .connect(user0)
    //       .increasePosition(
    //         usdc.address,
    //         usdc.address,
    //         weth.address,
    //         false,
    //         1000 * 1e6,
    //         0,
    //         4500 * 1e6,
    //         0,
    //         0
    //       )
    //   ).to.emit(future, "IncreasePosition");
    // }
  });

  it("decreasePosition without tradeStakeUpdater", async function () {
    // without tradeStakeUpdater

    await usdc.transfer(user0.address, 1000 * 1e6);
    await usdc.transfer(user0.address, 1000 * 1e6);
    await usdc.connect(user0).approve(futureRouter.address, 1000 * 1e6);
    await futureRouter
      .connect(user0)
      .increasePosition(
        usdc.address,
        usdc.address,
        weth.address,
        false,
        1000 * 1e6,
        0,
        4500 * 1e6,
        0,
        0
      );
    const posKey = await future.getPositionKey(usdc.address, weth.address, user0.address, false);
    let pos = await future.positions(posKey);
    expect(pos.openNotional).eq(4500 * 1e6);
    expect(await osd.balanceOf(user0.address)).eq(0);
    await futureRouter
      .connect(user0)
      .decreasePosition(
        usdc.address,
        weth.address,
        false,
        0,
        1000 * 1e6,
        0,
        0,
        user0.address,
        osd.address
      );
    pos = await future.positions(posKey);
    expect(await osd.balanceOf(user0.address)).gt(0);
    expect(pos.openNotional).eq(3500 * 1e6);

    // expect(
    //   await futureRouter
    //     .connect(user0)
    //     .decreasePosition(
    //       usdc.address,
    //       weth.address,
    //       false,
    //       0,
    //       1000 * 1e6,
    //       0,
    //       0,
    //       user0.address,
    //       dai.address
    //     )
    // ).to.be.revertedWith("INSUFF_TOKEN");

    await dai.transfer(user1.address, e18(100));
    await dai.connect(user1).approve(swap.address, e18(100));
    await swap.connect(user1).addLiquidity(dai.address, e18(100), user1.address, 0);
    const pool = await swap.pools(dai.address);
    console.log(pool);
    await futureRouter
      .connect(user0)
      .decreasePosition(
        usdc.address,
        weth.address,
        false,
        0,
        10 * 1e6,
        0,
        0,
        user0.address,
        dai.address
      );
    pos = await future.positions(posKey);
    console.log(pos, await dai.balanceOf(user0.address)); // (10/3500)*margin
    expect(await dai.balanceOf(user0.address)).gt(0);
    expect(pos.openNotional).eq(3490 * 1e6);
  });
});
