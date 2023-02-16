import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers, userConfig } from "hardhat";
import {
  FastPriceEvent,
  FastPriceFeed,
  Future,
  FuturePriceFeed,
  MyERC20,
  FutureUtil,
} from "../../typechain";
import { expandDecimals, getLatestBlockNumber, getLatestBlockTime } from "../helpers";

enum PairStatus {
  unlist, // can not do anything
  list, // can do anything
  stop_open, // can not increasePosition
  stop, // can not increase/decrease position, only can liquidatePosition and settleStopPosition
}

describe("Future/Setting", async function () {
  let futureUtil: FutureUtil;
  let future: Future;

  let futurePriceFeed: FuturePriceFeed;
  let fastPriceFeed: FastPriceFeed;
  let fastPriceEvent: FastPriceEvent;

  let eth: MyERC20;
  let usdc: MyERC20;
  let dai: MyERC20;

  let owner: SignerWithAddress;
  let user0: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  let updater0: SignerWithAddress;

  before(async function () {
    [owner, user0, user1, user2, updater0] = await ethers.getSigners();
  });

  beforeEach(async function () {
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

    // setting future
    await future.setPriceFeed(futurePriceFeed.address);
    await future.setFutureUtil(futureUtil.address);

    eth = await (await ethers.getContractFactory("MyERC20")).deploy("eth", "eth", 18);
    usdc = await (await ethers.getContractFactory("MyERC20")).deploy("usdc", "usdc", 6);
    dai = await (await ethers.getContractFactory("MyERC20")).deploy("dai", "dai", 18);
  });

  it("listPair/unlistPair", async function () {
    await expect(future.connect(user0).listPair(usdc.address, eth.address)).to.be.revertedWith(
      "Ownable: caller is not the owner"
    );
    await expect(future.listPair(usdc.address, eth.address)).to.be.revertedWith("price_expired");

    let blockTime = await getLatestBlockTime();
    await fastPriceFeed
      .connect(updater0)
      .setPrices([eth.address], [expandDecimals(1500, 30)], blockTime);

    await expect(future.listPair(usdc.address, eth.address)).to.be.revertedWith("price_zero");
    await fastPriceFeed
      .connect(updater0)
      .setPrices(
        [eth.address, usdc.address],
        [expandDecimals(1500, 30), expandDecimals(1, 30)],
        blockTime
      );

    const usdcEthPairKey = await future.getPairKey(usdc.address, eth.address);
    let usdcEthPair = await future.pairs(usdcEthPairKey);
    expect(usdcEthPair.collateralToken).to.equal(ethers.constants.AddressZero);
    expect(usdcEthPair.indexToken).to.equal(ethers.constants.AddressZero);
    expect(usdcEthPair.status).to.equal(PairStatus.unlist);

    await expect(future.listPair(usdc.address, eth.address))
      .to.emit(future, "ListPair")
      .withArgs(usdcEthPairKey, usdc.address, eth.address);
    usdcEthPair = await future.pairs(usdcEthPairKey);
    expect(usdcEthPair.collateralToken).to.equal(usdc.address);
    expect(usdcEthPair.indexToken).to.equal(eth.address);
    expect(usdcEthPair.status).to.equal(PairStatus.list);

    // set pair status
    await expect(
      future.connect(user0).setPairStatus(dai.address, eth.address, PairStatus.list)
    ).to.be.revertedWith("Ownable: caller is not the owner");
    // fail: unlist -> stop_open
    await expect(
      future.setPairStatus(dai.address, eth.address, PairStatus.list)
    ).to.be.revertedWith("wrong_old_status");
    // fail: list -> stop
    await expect(
      future.setPairStatus(usdc.address, eth.address, PairStatus.stop)
    ).to.be.revertedWith("wrong_old_status");
    // success: list -> stop_open
    await future.setPairStatus(usdc.address, eth.address, PairStatus.stop_open);
    usdcEthPair = await future.pairs(usdcEthPairKey);
    expect(usdcEthPair.status).to.equal(PairStatus.stop_open);
    // success: stop_open -> list
    await future.setPairStatus(usdc.address, eth.address, PairStatus.list);
    usdcEthPair = await future.pairs(usdcEthPairKey);
    expect(usdcEthPair.status).to.equal(PairStatus.list);
    // success: list -> stop_open -> stop -> list
    await future.setPairStatus(usdc.address, eth.address, PairStatus.stop_open);
    usdcEthPair = await future.pairs(usdcEthPairKey);
    expect(usdcEthPair.status).to.equal(PairStatus.stop_open);
    await future.setPairStatus(usdc.address, eth.address, PairStatus.stop);
    usdcEthPair = await future.pairs(usdcEthPairKey);
    expect(usdcEthPair.status).to.equal(PairStatus.stop);
    await future.setPairStatus(usdc.address, eth.address, PairStatus.list);
    usdcEthPair = await future.pairs(usdcEthPairKey);
    expect(usdcEthPair.status).to.equal(PairStatus.list);

    // list ethUsdPair, coin-based future
    const usdAddress = ethers.constants.AddressZero;
    const ethUsdPairKey = await future.getPairKey(eth.address, usdAddress);
    await expect(future.listPair(eth.address, usdAddress))
      .to.emit(future, "ListPair")
      .withArgs(ethUsdPairKey, eth.address, usdAddress);
    let ethUsdPair = await future.pairs(ethUsdPairKey);
    expect(ethUsdPair.collateralToken).to.equal(eth.address);
    expect(ethUsdPair.indexToken).to.equal(usdAddress);
    expect(ethUsdPair.status).to.equal(PairStatus.list);

    // list usdEthPair, cannot list
    await expect(future.listPair(usdAddress, eth.address)).to.be.revertedWith("invalid_collateral");
  });

  it("setMaxLeverage", async function () {
    const usdcEthPairKey = await future.getPairKey(usdc.address, eth.address);
    await expect(
      future.connect(user0).setMaxLeverage(usdc.address, eth.address, 3000, 1e9 - 1)
    ).to.be.revertedWith("Ownable: caller is not the owner");
    await expect(future.setMaxLeverage(usdc.address, eth.address, 0, 1e9 - 1)).to.be.revertedWith(
      "invalid_leverage"
    );
    await expect(future.setMaxLeverage(usdc.address, eth.address, 0, 10e9)).to.be.revertedWith(
      "invalid_usd_value"
    );
    await expect(future.setMaxLeverage(usdc.address, eth.address, 3000, 10e9))
      .to.emit(future, "UpdateMaxLeverage")
      .withArgs(usdcEthPairKey, usdc.address, eth.address, 3000, 10e9);

    expect(await future.maxPositionUsdWithMaxLeverages(usdcEthPairKey)).to.equal(3000);
    expect(await future.maxLeverages(usdcEthPairKey)).equal(10e9);
  });

  it("setMarginRatio", async function () {
    const usdcEthPairKey = await future.getPairKey(usdc.address, eth.address);
    await expect(
      future.connect(user0).setMarginRatio(usdc.address, eth.address, 0, 0)
    ).to.be.revertedWith("Ownable: caller is not the owner");
    await expect(future.setMarginRatio(usdc.address, eth.address, 0, 0)).to.be.revertedWith(
      "invalid_margin_ratio"
    );
    await expect(future.setMarginRatio(usdc.address, eth.address, 0, 0)).to.be.revertedWith(
      "invalid_margin_ratio"
    );
    await expect(future.setMarginRatio(usdc.address, eth.address, 1e9, 1e8)).to.be.revertedWith(
      "invalid_min_max"
    );
    // min: 0.1x, max: 10x
    await future.setMarginRatio(usdc.address, eth.address, 1e8, 10e9);
    expect(await future.minMaintanenceMarginRatios(usdcEthPairKey)).to.equal(1e8);
    expect(await future.maxMaintanenceMarginRatios(usdcEthPairKey)).to.equal(10e9);
  });

  it("setSwapPool", async function () {
    await expect(future.connect(user0).setSwapPool(usdc.address)).to.be.revertedWith(
      "Ownable: caller is not the owner"
    );
    await future.setSwapPool(usdc.address);
    expect(await future.swapPool()).to.equal(usdc.address);
  });

  it("setUserRouter/setSystemRouter", async function () {
    expect(await future.userRouters(user0.address, usdc.address)).to.equal(false);
    await future.connect(user0).setUserRouter(usdc.address, true);
    expect(await future.userRouters(user0.address, usdc.address)).to.equal(true);

    expect(await future.systemRouters(usdc.address)).to.equal(false);
    await expect(future.connect(user0).setSystemRouter(usdc.address, true)).to.be.revertedWith(
      "Ownable: caller is not the owner"
    );
    await future.setSystemRouter(usdc.address, true);
    expect(await future.systemRouters(usdc.address)).to.equal(true);
  });

  it("setFutureUtil", async function () {
    expect(await future.futureUtil()).to.equal(futureUtil.address);
    await expect(future.connect(user0).setFutureUtil(usdc.address)).to.be.revertedWith(
      "Ownable: caller is not the owner"
    );
    await future.setFutureUtil(usdc.address);
    expect(await future.futureUtil()).to.equal(usdc.address);
  });

  it("setProtocolFeeTo", async function () {
    expect(await future.protocolFeeTo()).to.equal(await futureUtil.owner());
    await expect(future.connect(user0).setProtocolFeeTo(user0.address)).to.be.revertedWith(
      "Ownable: caller is not the owner"
    );
    await future.setProtocolFeeTo(user0.address);
    expect(await future.protocolFeeTo()).to.equal(user0.address);
  });

  it("increaseInsuranceFund/decreaseInsuranceFund", async function () {
    expect(await future.collateralInsuranceFunds(usdc.address)).to.equal(0);
    usdc.transfer(future.address, 10 * 1e6);
    await expect(future.connect(user0).increaseInsuranceFund(usdc.address))
      .to.emit(future, "UpdateInsuranceFund")
      .withArgs(usdc.address, 0, 10 * 1e6);
    await expect(
      future.connect(user0).decreaseInsuranceFund(usdc.address, 4 * 1e6, user0.address)
    ).to.be.revertedWith("Ownable: caller is not the owner");
    await expect(future.decreaseInsuranceFund(usdc.address, 4 * 1e6, user0.address))
      .to.emit(future, "UpdateInsuranceFund")
      .withArgs(usdc.address, 10 * 1e6, 6 * 1e6)
      .to.emit(usdc, "Transfer")
      .withArgs(future.address, user0.address, 4 * 1e6);
    expect(await future.collateralInsuranceFunds(usdc.address)).to.equal(6 * 1e6);
  });

  it("setTradingFeeRate", async function () {
    const usdcEthPairKey = await future.getPairKey(usdc.address, eth.address);
    await expect(
      future.connect(user0).setTradingFeeRate(usdc.address, eth.address, 1e9, 1e9)
    ).to.be.revertedWith("Ownable: caller is not the owner");
    await expect(future.setTradingFeeRate(usdc.address, eth.address, 1e9, 1e9)).to.be.revertedWith(
      "invalid_rate"
    );
    await expect(future.setTradingFeeRate(usdc.address, eth.address, 1e6, 5e8))
      .to.emit(future, "UpdateTradingFeeRate")
      .withArgs(usdcEthPairKey, usdc.address, eth.address, 1e6, 5e8);
    expect(await future.tradingFeeRates(usdcEthPairKey)).to.equal(1e6);
    expect(await future.tradingFeeToProtocolRates(usdcEthPairKey)).to.equal(5e8);
  });

  it("setMaxTotalSize", async function () {
    const usdcEthPairKey = await future.getPairKey(usdc.address, eth.address);

    await expect(
      future.connect(user0).setMaxTotalSize(usdc.address, eth.address, 300, 400)
    ).to.be.revertedWith("Ownable: caller is not the owner");
    await expect(future.setMaxTotalSize(usdc.address, eth.address, 300, 400))
      .to.emit(future, "UpdateMaxTotalSize")
      .withArgs(usdcEthPairKey, usdc.address, eth.address, 300, 400);
    expect(await future.maxTotalLongSizes(usdcEthPairKey)).to.equal(300);
    expect(await future.maxTotalShortSizes(usdcEthPairKey)).to.equal(400);
  });

  it("setCustomSwapPool", async function () {
    const usdcEthPairKey = await future.getPairKey(usdc.address, eth.address);
    expect(await future.customSwapPool(usdcEthPairKey)).to.equal(ethers.constants.AddressZero);
    await expect(
      future.connect(user0).setCustomSwapPool(usdc.address, eth.address, user0.address)
    ).to.be.revertedWith("Ownable: caller is not the owner");
    await future.setCustomSwapPool(usdc.address, eth.address, user0.address);
    expect(await future.customSwapPool(usdcEthPairKey)).to.equal(user0.address);
  });
});
