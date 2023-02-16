import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
import {
  FastPriceEvent,
  FastPriceFeed,
  Future,
  FuturePriceFeed,
  FutureUtil,
  MyERC20,
} from "../../typechain";
import { expandDecimals, getLatestBlockTime, setNextBlockTimeAndMine } from "../helpers";

describe("Future/FundingRate", async function () {
  let futureUtil: FutureUtil;
  let future: Future;

  let futurePriceFeed: FuturePriceFeed;
  let fastPriceFeed: FastPriceFeed;
  let fastPriceEvent: FastPriceEvent;

  let eth: MyERC20;
  let btc: MyERC20;
  let dai: MyERC20;
  let usdc: MyERC20;

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
    btc = await (await ethers.getContractFactory("MyERC20")).deploy("btc", "btc", 8);
    dai = await (await ethers.getContractFactory("MyERC20")).deploy("dai", "dai", 18);
    usdc = await (await ethers.getContractFactory("MyERC20")).deploy("usdc", "usdc", 6);

    // max leverage: 10x; maxOpenNotional: 3000 * 10
    await future.setMaxLeverage(usdc.address, eth.address, 3000, 10e9);
    // minMaintanenceMarginRatio: 0.5%， maxMaintanenceMarginRatio: 5%
    await future.setMarginRatio(usdc.address, eth.address, 5e6, 5e7);
  });

  it("fundingRate", async function () {
    let blockTime = await getLatestBlockTime();
    // set price
    await fastPriceFeed
      .connect(updater0)
      .setPrices(
        [eth.address, usdc.address],
        [expandDecimals(1500, 30), expandDecimals(1, 30)],
        blockTime
      );

    // 0. list pair
    await future.listPair(usdc.address, eth.address);

    const pairKey = await future.getPairKey(usdc.address, eth.address);

    // 1. add insuranceFund
    let insuranceFund = 1000 * 1e6;
    await usdc.transfer(future.address, insuranceFund);
    await future.increaseInsuranceFund(usdc.address);
    expect(await future.collateralInsuranceFunds(usdc.address)).to.equal(insuranceFund);

    // 2. open long position
    // in the first hour, no funding fees
    // long: 6000 usdc, 4 eth
    await usdc.transfer(future.address, 3000 * 1e6);
    await future
      .connect(user0)
      .increasePosition(usdc.address, eth.address, user0.address, true, 6000 * 1e6);

    blockTime = await getLatestBlockTime();

    expect(await future.lastFundingTimestamps(pairKey)).to.equal(blockTime);
    expect(await future.longFundingRates(pairKey)).to.equal(0);
    expect(await future.shortFundingRates(pairKey)).to.equal(0);
    expect(await future.cumulativeLongFundingRates(pairKey)).to.equal(0);
    expect(await future.cumulativeShortFundingRates(pairKey)).to.equal(0);

    expect(await future.collateralInsuranceFunds(usdc.address)).to.equal(insuranceFund);

    let lastFundingTimestamp = await future.lastFundingTimestamps(pairKey);

    // short: 3000 usdc, 2 eth
    await usdc.transfer(future.address, insuranceFund);
    await future
      .connect(user0)
      .increasePosition(usdc.address, eth.address, user0.address, false, 3000 * 1e6);

    blockTime = await getLatestBlockTime();
    let fundingDuration = blockTime - lastFundingTimestamp.toNumber(); // 2

    expect(await future.longFundingRates(pairKey)).to.equal(1500000);
    expect(await future.shortFundingRates(pairKey)).to.equal(-375000);
    expect(await future.cumulativeLongFundingRates(pairKey)).to.equal(833); // 0 + 1500000 * 2 / 3600
    expect(await future.cumulativeShortFundingRates(pairKey)).to.equal(-208);
    expect(await future.lastFundingTimestamps(pairKey)).to.equal(blockTime);

    let fundingFee = (BigInt(-375000) * BigInt(3000 * 1e6)) / BigInt(1e10);
    insuranceFund += Number(fundingFee);
    expect(await future.collateralInsuranceFunds(usdc.address)).to.equal(insuranceFund);

    // round one hour later

    lastFundingTimestamp = await future.lastFundingTimestamps(pairKey);
    blockTime = lastFundingTimestamp.toNumber() + 3600 + 400;
    await setNextBlockTimeAndMine(blockTime);
    await fastPriceFeed
      .connect(updater0)
      .setPrices(
        [eth.address, usdc.address],
        [expandDecimals(1500, 30), expandDecimals(1, 30)],
        blockTime
      );

    // long: 3000 usdc, 2eth
    await usdc.transfer(future.address, 4000 * 1e6);
    // pay for funding fee

    lastFundingTimestamp = await future.lastFundingTimestamps(pairKey);
    await future
      .connect(user1)
      .increasePosition(usdc.address, eth.address, user1.address, true, 3000 * 1e6);

    blockTime = await getLatestBlockTime();
    fundingDuration = blockTime - lastFundingTimestamp.toNumber(); // 4003
    // long: 9000 usdc, 6 eth
    // short: 3000 usdc, 2eth

    const user1LongPos = await future.getPosition(usdc.address, eth.address, user1.address, true);

    expect(await future.longFundingRates(pairKey)).to.equal(4500506);
    expect(await future.shortFundingRates(pairKey)).to.equal(-500056);
    expect(await future.cumulativeLongFundingRates(pairKey)).to.equal(5005145); // 833 + 4500506 * 4003 / 3600
    expect(await future.cumulativeShortFundingRates(pairKey)).to.equal(-556242); // -208 + -500056 * 4003 / 3600
    expect(await future.lastFundingTimestamps(pairKey)).to.equal(blockTime);

    fundingFee = (BigInt(3000 * 1e6) * BigInt(4500506)) / BigInt((1e10).toString());
    insuranceFund = insuranceFund + Number(fundingFee);

    expect(user1LongPos.margin).to.equal(BigInt(4000 * 1e6) - fundingFee);
    expect(user1LongPos.entryFundingRate).to.equal(5005145);
    expect(await future.collateralInsuranceFunds(usdc.address)).to.equal(insuranceFund); // 1001237651

    await usdc.transfer(future.address, 5000 * 1e6);
    // reward with funding fee
    lastFundingTimestamp = await future.lastFundingTimestamps(pairKey);
    await future
      .connect(user1)
      .increasePosition(usdc.address, eth.address, user1.address, false, 9000 * 1e6);

    blockTime = await getLatestBlockTime();
    fundingDuration = blockTime - lastFundingTimestamp.toNumber(); // 2

    // long: 9000 usdc, 6eth
    // short: 12000 usdc, 8eth
    const user1ShortPos = await future.getPosition(usdc.address, eth.address, user1.address, false);

    fundingFee = (BigInt(9000 * 1e6) * BigInt(998763)) / BigInt((1e10).toString());
    insuranceFund = insuranceFund + Number(fundingFee); // 1002136537

    expect(user1ShortPos.margin).to.equal(BigInt(5000 * 1e6) - fundingFee);
    expect(user1ShortPos.entryFundingRate).to.equal(-555688);
    expect(await future.collateralInsuranceFunds(usdc.address)).to.equal(insuranceFund);
    expect(await future.longFundingRates(pairKey)).to.equal(-561804);
    expect(await future.shortFundingRates(pairKey)).to.equal(998763);
    expect(await future.cumulativeLongFundingRates(pairKey)).to.equal(5004833); // 5005145 + -561804 * 2 / 3600
    expect(await future.cumulativeShortFundingRates(pairKey)).to.equal(-555688); // -556242 + 998763 * 2 / 3600
    expect(await future.lastFundingTimestamps(pairKey)).to.equal(blockTime);

    // round 3 hour later
    await setNextBlockTimeAndMine(blockTime + 10800 + 300);

    await fastPriceFeed
      .connect(updater0)
      .setPrices(
        [eth.address, usdc.address],
        [expandDecimals(1500, 30), expandDecimals(1, 30)],
        await getLatestBlockTime()
      );

    await usdc.transfer(future.address, 4000 * 1e6);
    // long: 13000 usdc, 9 eth
    // short: 12000 usdc, 8 eth
    lastFundingTimestamp = await future.lastFundingTimestamps(pairKey);
    await future
      .connect(user2)
      .increasePosition(usdc.address, eth.address, user2.address, true, 4500 * 1e6);
    blockTime = await getLatestBlockTime();
    fundingDuration = blockTime - lastFundingTimestamp.toNumber(); // 11103
    const user2LongPos = await future.getPosition(usdc.address, eth.address, user2.address, true);

    // 3 hour funding rate =
    // long = 0.0025% * 1 * utilisationRatio * ( 9 / 8)
    // short = -0.0025% * 1 * utilisationRatio * (8 / 9)
    expect(await future.longFundingRates(pairKey)).to.equal(420975);
    expect(await future.shortFundingRates(pairKey)).to.equal(-332622);

    fundingFee = (BigInt(4500 * 1e6) * BigInt(420975)) / BigInt((1e10).toString());
    insuranceFund = insuranceFund + Number(fundingFee);

    expect(await future.cumulativeLongFundingRates(pairKey)).to.equal(6303190); // 5004833 + 420975 * 11103 / 3600
    expect(await future.cumulativeShortFundingRates(pairKey)).to.equal(-1581549); // -555688 + -332622 * 11103 / 3600
    expect(await future.lastFundingTimestamps(pairKey)).to.equal(blockTime);
    expect(user2LongPos.margin).to.equal(BigInt(4000 * 1e6) - fundingFee);
    expect(user2LongPos.entryFundingRate).to.equal(6303190);
    expect(await future.collateralInsuranceFunds(usdc.address)).to.equal(insuranceFund);
  });
});
