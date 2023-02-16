import {
  FastPriceFeed,
  MockSwap,
  Future,
  FutureUtil,
  FuturePriceFeed,
  FastPriceEvent,
  MyERC20,
} from "../../typechain";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ethers, network } from "hardhat";
import {
  expandDecimals,
  getLatestBlockTime,
  setNextBlockTime,
  setNextBlockTimeAndMine,
} from "../helpers";
import { expect } from "chai";
import { BigNumber } from "ethers";

describe("Future/OperationUsd", async function () {
  let futureUtil: FutureUtil;
  let future: Future;
  let swap: MockSwap;

  let futurePriceFeed: FuturePriceFeed;
  let fastPriceFeed: FastPriceFeed;
  let fastPriceEvent: FastPriceEvent;

  let eth: MyERC20;

  let owner: SignerWithAddress;
  let user0: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  let updater0: SignerWithAddress;

  let usdAddress = ethers.constants.AddressZero;

  let ethUsdState: {
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

    let blockTime = await getLatestBlockTime();
    await fastPriceFeed
      .connect(updater0)
      .setPrices([eth.address], [expandDecimals(1500, 30)], blockTime);
    await future.listPair(eth.address, usdAddress);

    // increase insuranceFund
    let insuranceFund = expandDecimals(1, 18);
    await eth.transfer(future.address, insuranceFund);
    await future.increaseInsuranceFund(eth.address);
    expect(await future.collateralInsuranceFunds(eth.address)).to.equal(insuranceFund);
    expect(await future.tokenBalances(eth.address)).to.equal(expandDecimals(1, 18));

    // max leverage: 10x; maxOpenNotional: 3000 * 10
    await future.setMaxLeverage(eth.address, usdAddress, 3000, 10e9);
    // minMaintanenceMarginRatio: 0.5%， maxMaintanenceMarginRatio: 5%
    await future.setMarginRatio(eth.address, usdAddress, 5e6, 5e7);
    // feeRate: 0.1%, protocolFeeRate: 50% * 0.1%
    await future.setTradingFeeRate(eth.address, usdAddress, 1e6, 5e8);

    // todo change it to collateral based
    swap = await (await ethers.getContractFactory("MockSwap")).deploy();
    await future.setSwapPool(swap.address);

    // increase long position
    {
      let posKey = await future.getPositionKey(eth.address, usdAddress, user0.address, true);
      await eth.transfer(future.address, expandDecimals(1, 18));
      await expect(
        future
          .connect(user0)
          .increasePosition(eth.address, usdAddress, user0.address, true, expandDecimals(2, 18))
      )
        .to.emit(future, "IncreasePosition")
        .withArgs(
          posKey,
          eth.address,
          usdAddress,
          user0.address,
          true, // isLong
          expandDecimals(1, 18), // marginDelta 1 eth
          expandDecimals(2, 18), // notionalDelta 2eth
          expandDecimals(2 * 1500, 18), // sizeDelta 3000 usd
          "5133332000000000", // tradingFee: 2**18/1e3
          0, // fundingFee
          expandDecimals(1500, 30), // collateral price
          expandDecimals(1, 30) // index price
        )
        .to.emit(future, "UpdatePosition")
        .withArgs(
          posKey,
          eth.address,
          usdAddress,
          user0.address,
          true,
          "998000000000000000", // margin: 1e18 - 2e15
          expandDecimals(2, 18), // open notional
          expandDecimals(2 * 1500, 18), // size
          0 // entryFundingRate
        )
        .to.emit(eth, "Transfer")
        .withArgs(future.address, swap.address, expandDecimals(1, 15)); // tradingFee to swap pool

      let pos = await future.getPosition(eth.address, usdAddress, user0.address, true);
      let pairKey = await future.getPairKey(eth.address, usdAddress);

      expect(pos.margin).to.equal("998000000000000000");
      expect(pos.size).to.equal(expandDecimals(2 * 1500, 18));
      expect(pos.openNotional).to.equal(expandDecimals(2, 18));
      expect(pos.entryFundingRate).to.equal(0); // first hour no funding fee
      expect(await future.totalLongSizes(pairKey)).to.equal(expandDecimals(3000, 18));
      expect(await future.totalLongOpenNotionals(pairKey)).to.equal(expandDecimals(2, 18));
      expect(await future.protocolUnrealizedFees(pairKey)).to.equal(expandDecimals(1, 15)); // tradingFee to protocol
      expect(await future.tokenBalances(eth.address)).to.equal("1999000000000000000"); // insuranceFund + margin + protocolFees: 1e18 + 1e18 - 1e15
    }

    // increase short position
    {
      // console.log('increase short position')
      let pairKey = await future.getPairKey(eth.address, usdAddress);
      let posKey = await future.getPositionKey(eth.address, usdAddress, user0.address, false);
      await eth.transfer(future.address, expandDecimals(1, 18));

      let blockTime = (await getLatestBlockTime()) + 1;
      let lastFundingTimestamp = (await future.lastFundingTimestamps(pairKey)).toNumber();
      let duration = blockTime - lastFundingTimestamp; // 2s
      await setNextBlockTime(blockTime);

      await expect(
        future
          .connect(user0)
          .increasePosition(eth.address, usdAddress, user0.address, false, expandDecimals(3, 18))
      )
        .to.emit(future, "IncreasePosition")
        .withArgs(
          posKey,
          eth.address,
          usdAddress,
          user0.address,
          false,
          expandDecimals(1, 18), // margin delta
          expandDecimals(3, 18), // open notional
          expandDecimals(4500, 18), // size
          4500000000000000, // trading fee: 0.001 * 4500e18/3000e18 * 3e18
          "112500000000000", // fundingFee  3e18 * 375000 / 1e10
          expandDecimals(1500, 30),
          expandDecimals(1, 30)
        )
        .to.emit(future, "UpdatePosition")
        .withArgs(
          posKey,
          eth.address,
          usdAddress,
          user0.address,
          false,
          "996887500000000000", // margin: 1e18 - 3e15 - 112500000000000
          expandDecimals(3, 18), // open notional
          expandDecimals(4500, 18), // size
          208 // entryFundingRate
        )
        .to.emit(eth, "Transfer")
        .withArgs(future.address, swap.address, "2250000000000000");

      let pos = await future.getPosition(eth.address, usdAddress, user0.address, false);

      expect(pos.margin).to.equal("995387500000000000");  // 1e18-4500000000000000-112500000000000
      expect(pos.size).to.equal(expandDecimals(4500, 18));
      expect(pos.openNotional).to.equal(expandDecimals(3, 18));
      expect(pos.entryFundingRate).to.equal(208);

      expect(await future.totalShortSizes(pairKey)).to.equal(expandDecimals(4500, 18));
      expect(await future.protocolUnrealizedFees(pairKey)).to.equal("3250000000000000"); // tradingFee to protocol: 1e15+4500000000000000/2
      expect(await future.tokenBalances(eth.address)).to.equal("2996750000000000000"); // prev + margin + protocolFees: 1999000000000000000 + 1e18 - 4500000000000000/2
      expect(await future.longFundingRates(pairKey)).to.equal(-166666);
      expect(await future.shortFundingRates(pairKey)).to.equal(375000);
      expect(await future.cumulativeLongFundingRates(pairKey)).to.equal(-92); // -166666 * 2 / 3600
      expect(await future.cumulativeShortFundingRates(pairKey)).to.equal(208); // 375000 * 2 / 3600
      expect(await future.collateralInsuranceFunds(eth.address)).to.equal("1000112500000000000"); // 1e18 + 112500000000000

      ethUsdState = {
        totalLongSize: await future.totalLongSizes(pairKey), // 2 eth
        totalShortSize: await future.totalShortSizes(pairKey), // 3 eth
        totalLongOpenNotional: await future.totalLongOpenNotionals(pairKey), // 3000 eth
        totalShortOpenNotional: await future.totalShortOpenNotionals(pairKey), // 4500 eth
        tokenBalance: await future.tokenBalances(eth.address),
        insuranceFund: await future.collateralInsuranceFunds(eth.address),
        cumulativeLongFundingRate: await future.cumulativeLongFundingRates(pairKey),
        cumulativeShortFundingRate: await future.cumulativeShortFundingRates(pairKey),
      };
    }
  });

  // todo delete legacy test
  it.skip("increaseMargin, decreaseMargin", async function () {
    // increaseMargin
    {
      const posKey = await future.getPositionKey(eth.address, usdAddress, user0.address, true);
      const pos = await future.positions(posKey);
      const tokenBalance = await future.tokenBalances(eth.address);
      await eth.transfer(future.address, 20 * 1e6);
      await expect(
        future.connect(user0).increaseMargin(eth.address, usdAddress, user0.address, true)
      )
        .to.emit(future, "IncreaseMargin")
        .withArgs(posKey, eth.address, usdAddress, user0.address, true, 20 * 1e6)
        .to.emit(future, "UpdatePosition")
        .withArgs(
          posKey,
          eth.address,
          usdAddress,
          user0.address,
          true,
          pos.margin.add(20 * 1e6),
          pos.openNotional,
          pos.size,
          pos.entryFundingRate
        );

      expect(await future.tokenBalances(eth.address)).to.equal(tokenBalance.add(20 * 1e6));
    }

    // decreaseMargin
    {
      const posKey = await future.getPositionKey(eth.address, usdAddress, user0.address, false);
      const pos = await future.positions(posKey);
      const tokenBalance = await future.tokenBalances(eth.address);
      await expect(
        future
          .connect(user0)
          .decreaseMargin(eth.address, usdAddress, user0.address, false, 20 * 1e6, user0.address)
      )
        .to.emit(future, "DecreaseMargin")
        .withArgs(posKey, eth.address, usdAddress, user0.address, false, 20 * 1e6)
        .to.emit(future, "UpdatePosition")
        .withArgs(
          posKey,
          eth.address,
          usdAddress,
          user0.address,
          false,
          pos.margin.sub(20 * 1e6),
          pos.openNotional,
          pos.size,
          pos.entryFundingRate
        );

      expect(await future.tokenBalances(eth.address)).to.equal(tokenBalance.sub(20 * 1e6));
    }
  });
  // todo new decraseMargin test

  it("increaseLongPosiiton", async function () {
    let posKey = await future.getPositionKey(eth.address, usdAddress, user0.address, true);
    let pairKey = await future.getPairKey(eth.address, usdAddress);

    let lastFundingTimestamp = await (await future.lastFundingTimestamps(pairKey)).toNumber();
    let blockTime = lastFundingTimestamp + 7201;
    await setNextBlockTimeAndMine(blockTime);

    await fastPriceFeed
      .connect(updater0)
      .setPrices([eth.address], [expandDecimals(1600, 30)], blockTime);

    let pos = await future.getPosition(eth.address, usdAddress, user0.address, true);
    // increase 2 eth
    await eth.transfer(future.address, expandDecimals(1, 18));

    blockTime = (await getLatestBlockTime()) + 1;
    lastFundingTimestamp = (await future.lastFundingTimestamps(pairKey)).toNumber();
    let fundingDuration = blockTime - lastFundingTimestamp; // 7204
    let posMargin =
      pos.margin.toBigInt() +
      expandDecimals(1, 18).toBigInt() - // margin
      BigInt("2755554000000000") - // trading fee
      BigInt("219621400000000"); // funding fee


    await expect(
      future
        .connect(user0)
        .increasePosition(eth.address, usdAddress, user0.address, true, expandDecimals(2, 18))
    )
      .to.emit(future, "UpdateFundingRate")
      .withArgs(
        pairKey,
        eth.address,
        usdAddress,
        365931, // longFundingRates
        -192770, // shortFundingRates
        732176, // cumulativeLongFundingRates
        -385546, // cumulativeShortFundingRates
        blockTime // timestamp
      )
      .to.emit(future, "IncreasePosition")
      .withArgs(
        posKey,
        eth.address,
        usdAddress,
        user0.address,
        true,
        expandDecimals(1, 18), // margin delta
        expandDecimals(2, 18), // open notional delta
        expandDecimals(3200, 18), // size delta
        "2755554000000000", // trading fee,: 0.001 * 1e9 * 6200e18/4500e18 * 2e18 / 1e9
        "219621400000000", // 2e18 * (732176 - 0) / 1e10 + 2e18 * 365931 / 1e10
        expandDecimals(1600, 30),
        expandDecimals(1, 30)
      )
      .to.emit(future, "UpdatePosition")
      .withArgs(
        posKey,
        eth.address,
        usdAddress,
        user0.address,
        true,
        posMargin, // margin
        expandDecimals(4, 18), // open notional
        expandDecimals(6200, 18), // size
        732176 // entryFundingRate
      );

    expect(await future.totalLongOpenNotionals(pairKey)).to.equal(
      ethUsdState.totalLongOpenNotional.add(expandDecimals(2, 18).toBigInt())
    );
    expect(await future.totalLongSizes(pairKey)).to.equal(
      ethUsdState.totalLongSize.add(expandDecimals(3200, 18).toBigInt())
    );
    expect(await future.longFundingRates(pairKey)).to.equal(365931);
    expect(await future.shortFundingRates(pairKey)).to.equal(-192770);
    expect(await future.cumulativeLongFundingRates(pairKey)).to.equal(732176); // -92 + 365931 * 7204 / 3600
    expect(await future.cumulativeShortFundingRates(pairKey)).to.equal(-385546); // 208 + -192770 * 7204 / 3600
    expect(await future.lastFundingTimestamps(pairKey)).to.equal(blockTime);

    expect(await future.collateralInsuranceFunds(eth.address)).to.equal(
      ethUsdState.insuranceFund.add("219621400000000")
    );
    expect(await future.tokenBalances(eth.address)).to.equal(
      ethUsdState.tokenBalance.add(
        expandDecimals(1, 18).toBigInt() - BigInt("2755554000000000") / BigInt(2)
      )
    );

    pos = await future.getPosition(eth.address, usdAddress, user0.address, true);
    expect(pos.margin).to.equal(posMargin);
    expect(pos.openNotional).to.equal(expandDecimals(4, 18));
    expect(pos.size).to.equal(expandDecimals(6200, 18));
    expect(pos.entryFundingRate).to.equal(732176);
  });

  it("increaseShortPosiiton", async function () {
    let posKey = await future.getPositionKey(eth.address, usdAddress, user0.address, false);
    let pairKey = await future.getPairKey(eth.address, usdAddress);

    let lastFundingTimestamp = await future.lastFundingTimestamps(pairKey);
    let blockTime = lastFundingTimestamp.toNumber() + 7201;
    await setNextBlockTimeAndMine(blockTime);

    await fastPriceFeed
      .connect(updater0)
      .setPrices([eth.address], [expandDecimals(1600, 30)], blockTime);

    let pos = await future.getPosition(eth.address, usdAddress, user0.address, false);

    // pre margin + increase margin - trading fee - funding fee
    let posMargin =
      pos.margin.toBigInt() +
      BigInt(1e18) - // margin delta
      BigInt("5133332000000000") - // trading fee
      BigInt("1508374600000000"); // funding fee
    // increase 2 eth
    await eth.transfer(future.address, expandDecimals(1, 18));
    blockTime = (await getLatestBlockTime()) + 1;
    lastFundingTimestamp = await future.lastFundingTimestamps(pairKey);
    let fundingDuration = blockTime - lastFundingTimestamp.toNumber(); // 7204
    await expect(
      future
        .connect(user0)
        .increasePosition(eth.address, usdAddress, user0.address, false, expandDecimals(2, 18))
    )
      .to.emit(future, "UpdateFundingRate")
      .withArgs(
        pairKey,
        eth.address,
        usdAddress,
        -286087, // longFundingRates
        1884683, // shortFundingRates
        -572583, // cumulativeLongFundingRates
        3771668, // cumulativeShortFundingRates
        blockTime
      )
      .to.emit(future, "IncreasePosition")
      .withArgs(
        posKey,
        eth.address,
        usdAddress,
        user0.address,
        false,
        expandDecimals(1, 18), // margin delta
        expandDecimals(2, 18), // open notional delta
        expandDecimals(3200, 18), // size delta
        "5133332000000000", // trading fee: 0.001 * 1e9 * 7700e18/3000e18 * 2e18/1e9
        "1508374600000000", // fundingFee: 3e18 * (3771668 - 208) / 1e10 + 2e18 * 1884683 / 1e10
        expandDecimals(1600, 30),
        expandDecimals(1, 30)
      )
      .to.emit(future, "UpdatePosition")
      .withArgs(
        posKey,
        eth.address,
        usdAddress,
        user0.address,
        false,
        posMargin, // margin
        expandDecimals(5, 18), // open notional
        expandDecimals(7700, 18), // size
        3771668 // entryFundingRate
      );

    expect(await future.totalShortOpenNotionals(pairKey)).to.equal(
      ethUsdState.totalShortOpenNotional.add(expandDecimals(2, 18))
    );
    expect(await future.totalShortSizes(pairKey)).to.equal(
      ethUsdState.totalShortSize.add(expandDecimals(3200, 18))
    );
    expect(await future.tokenBalances(eth.address)).to.equal(
      ethUsdState.tokenBalance.add(
        expandDecimals(1, 18).toBigInt() - BigInt("5133332000000000") / BigInt(2)
      )
    );
    expect(await future.longFundingRates(pairKey)).to.equal(-286087);
    expect(await future.shortFundingRates(pairKey)).to.equal(1884683);
    expect(await future.cumulativeLongFundingRates(pairKey)).to.equal(-572583); // -92 +  7204 * -286087 / 3600
    expect(await future.cumulativeShortFundingRates(pairKey)).to.equal(3771668); // 208 + 7204 * 1884683 / 3600
    expect(await future.lastFundingTimestamps(pairKey)).to.equal(blockTime);
    expect(await future.collateralInsuranceFunds(eth.address)).to.equal(
      ethUsdState.insuranceFund.add("1508374600000000")
    );

    pos = await future.getPosition(eth.address, usdAddress, user0.address, false);
    expect(pos.margin).to.equal(posMargin);
    expect(pos.openNotional).to.equal(expandDecimals(5, 18));
    expect(pos.size).to.equal(expandDecimals(7700, 18));
    expect(pos.entryFundingRate).to.equal(3771668);
  });

  it("decreaseLongPosition", async function () {
    let posKey = await future.getPositionKey(eth.address, usdAddress, user0.address, true);
    let pairKey = await future.getPairKey(eth.address, usdAddress);

    let lastFundingTimestamp = await future.lastFundingTimestamps(pairKey);
    let blockTime = lastFundingTimestamp.toNumber() + 7201;
    await setNextBlockTimeAndMine(blockTime);

    await fastPriceFeed
      .connect(updater0)
      .setPrices([eth.address], [expandDecimals(1600, 30)], blockTime);

    let pos = await future.getPosition(eth.address, usdAddress, user0.address, true);
    let posMargin =
      pos.margin.toBigInt() -
      expandDecimals(5, 17).toBigInt() - // margin delta
      BigInt("3000000000000000") - // trading fee
      BigInt("-62537200000000") + // funding fee
      expandDecimals(-625, 14).toBigInt(); // pnl
    blockTime = (await getLatestBlockTime()) + 1;
    lastFundingTimestamp = await future.lastFundingTimestamps(pairKey);
    let fundingDuration = blockTime - lastFundingTimestamp.toNumber(); // 7203
    // decrease 1 eth
    // long 1, short: 3
    await expect(
      future.connect(user0).decreasePosition(
        eth.address,
        usdAddress,
        user0.address,
        true,
        expandDecimals(5, 17), // marign delta
        expandDecimals(1, 18), // notional delta
        user0.address
      )
    )
      .to.emit(future, "UpdateFundingRate")
      .withArgs(
        pairKey,
        eth.address,
        usdAddress,
        -266666, // longFundingRates
        2400000, // shortFundingRates
        -533333, // cumulativeLongFundingRates
        4800000, // cumulativeShortFundingRates
        lastFundingTimestamp.toNumber() + 7200 // timestamp
      )
      .to.emit(future, "DecreasePosition")
      .withArgs(
        posKey,
        eth.address,
        usdAddress,
        user0.address,
        true,
        expandDecimals(5, 17), // margin delta
        expandDecimals(1, 18), // open notional delta
        expandDecimals(1500, 18), // size delta
        "3000000000000000", // trading fee: 0.001 * 4500e6/1500e6 * 1e18
        "-62537200000000", // fundingFee: 2e18 * (-312686 - 0) / 1e10
        expandDecimals(-625, 14), // pnl: (3000e18/1600 - 2e18)/2
        expandDecimals(1600, 30),
        expandDecimals(1, 30)
      )
      .to.emit(future, "UpdatePosition")
      .withArgs(
        posKey,
        eth.address,
        usdAddress,
        user0.address,
        true,
        posMargin, // margin
        expandDecimals(2, 18), // open notional
        expandDecimals(1500, 18), // size
        -312686 // entryFundingRate
      )
      .to.emit(eth, "Transfer")
      .withArgs(future.address, swap.address, BigInt("3000000000000000") / BigInt(2))
      .to.emit(eth, "Transfer")
      .withArgs(future.address, user0.address, expandDecimals(5, 17));

    expect(await future.totalLongSizes(pairKey)).to.equal(
      ethUsdState.totalLongSize.sub(expandDecimals(1500, 18))
    );
    expect(await future.longFundingRates(pairKey)).to.equal(-156232);
    expect(await future.shortFundingRates(pairKey)).to.equal(1406091);
    expect(await future.cumulativeLongFundingRates(pairKey)).to.equal(-312686); // -92 + 7203 * -156232 / 3600
    expect(await future.cumulativeShortFundingRates(pairKey)).to.equal(2813561); // 208 + 7203 * 1406091 / 3600
    expect(await future.lastFundingTimestamps(pairKey)).to.equal(blockTime);
    expect(await future.collateralInsuranceFunds(eth.address)).to.equal(
      ethUsdState.insuranceFund.add(BigInt("-62537200000000") - expandDecimals(-625, 14).toBigInt()) // pay funding fee and pnl
    );
    expect(await future.tokenBalances(eth.address)).to.equal(
      ethUsdState.tokenBalance.add(
        -expandDecimals(5, 17).toBigInt() - BigInt("3000000000000000") / BigInt(2)
      )
    );

    pos = await future.getPosition(eth.address, usdAddress, user0.address, true);
    expect(pos.margin).to.equal(posMargin);
    expect(pos.openNotional).to.equal(expandDecimals(1, 18));
    expect(pos.size).to.equal(expandDecimals(1500, 18));
    expect(pos.entryFundingRate).to.equal(-312686);
  });

  it("decreaseShortPosition", async function () {
    let posKey = await future.getPositionKey(eth.address, usdAddress, user0.address, true);
    let pairKey = await future.getPairKey(eth.address, usdAddress);

    let lastFundingTimestamp = await future.lastFundingTimestamps(pairKey);
    let blockTime = lastFundingTimestamp.toNumber() + 7201;
    await setNextBlockTimeAndMine(blockTime);

    await fastPriceFeed
      .connect(updater0)
      .setPrices([eth.address], [expandDecimals(1600, 30)], blockTime);

    let pos = await future.getPosition(eth.address, usdAddress, user0.address, false);
    let posMargin =
      pos.margin.toBigInt() - // previous margin
      expandDecimals(5, 17).toBigInt() - // margin delta
      expandDecimals(5, 14).toBigInt() - // trading fee
      BigInt("87916800000000") + // funding fee
      BigInt("31250000000000000"); // pnl
    // decrease 0.5 eth
    // long 2, short: 2.5
    blockTime = (await getLatestBlockTime()) + 1;
    lastFundingTimestamp = await future.lastFundingTimestamps(pairKey);
    let fundingDuration = blockTime - lastFundingTimestamp.toNumber(); // 7203
    await expect(
      future
        .connect(user0)
        .decreasePosition(
          eth.address,
          usdAddress,
          user0.address,
          false,
          expandDecimals(5, 17),
          expandDecimals(5, 17),
          user0.address
        )
    )
      .to.emit(future, "UpdateFundingRate")
      .withArgs(
        pairKey,
        eth.address,
        usdAddress,
        -93739, // longFundingRates
        146467, // shortFundingRates
        -187648, // cumulativeLongFundingRates
        293264, // cumulativeShortFundingRates
        blockTime
      )
      .to.emit(future, "DecreasePosition")
      .withArgs(
        posKey,
        eth.address,
        usdAddress,
        user0.address,
        false,
        expandDecimals(5, 17), // margin delta
        expandDecimals(5, 17), // open notional delta
        expandDecimals(750, 18), // size delta
        expandDecimals(1, 15), // trading fee,
        "87916800000000", // fundingFee: 3e18 * (293264 - 208) / 1e10
        "31250000000000000", // pnl: (3e18 - 4500e18/1600) / 6
        expandDecimals(1600, 30),
        expandDecimals(1, 30)
      )
      .to.emit(future, "UpdatePosition")
      .withArgs(
        posKey,
        eth.address,
        usdAddress,
        user0.address,
        false,
        posMargin, // margin
        expandDecimals(25, 17), // open notional
        expandDecimals(3750, 18), // size
        293264 // entryFundingRate
      )
      .to.emit(eth, "Transfer")
      .withArgs(future.address, swap.address, expandDecimals(1, 15).toBigInt() / BigInt(2))
      .to.emit(eth, "Transfer")
      .withArgs(future.address, user0.address, expandDecimals(5, 17));

    expect(await future.totalShortSizes(pairKey)).to.equal(
      ethUsdState.totalShortSize.sub(expandDecimals(750, 18))
    );
    expect(await future.longFundingRates(pairKey)).to.equal(-93739);
    expect(await future.shortFundingRates(pairKey)).to.equal(146467);
    expect(await future.cumulativeLongFundingRates(pairKey)).to.equal(-187648); // -92 + -93739 * 7203 / 3600
    expect(await future.cumulativeShortFundingRates(pairKey)).to.equal(293264); // 208 + 146467 * 7203 / 3600
    expect(await future.lastFundingTimestamps(pairKey)).to.equal(blockTime);

    expect(await future.collateralInsuranceFunds(eth.address)).to.equal(
      ethUsdState.insuranceFund.add(BigInt("87916800000000") - BigInt("31250000000000000")) // pay funding fee and pnl
    );
    expect(await future.tokenBalances(eth.address)).to.equal(
      ethUsdState.tokenBalance.add(
        -expandDecimals(5, 17).toBigInt() - expandDecimals(5, 14).toBigInt() / BigInt(2)
      )
    );
    pos = await future.getPosition(eth.address, usdAddress, user0.address, false);
    expect(pos.margin).to.equal(posMargin);
    expect(pos.openNotional).to.equal(expandDecimals(25, 17));
    expect(pos.size).to.equal(expandDecimals(3750, 18));
    expect(pos.entryFundingRate).to.equal(293264);
  });

  it("closeLongPosition", async function () {
    await eth.transfer(future.address, expandDecimals(5, 17));

    let pairKey = await future.getPairKey(eth.address, usdAddress);
    let blockTime = (await getLatestBlockTime()) + 1;
    let lastFundingTimestamp = await future.lastFundingTimestamps(pairKey);
    let fundingDuration = blockTime - lastFundingTimestamp.toNumber(); // 2

    setNextBlockTime(blockTime);

    await future
      .connect(user1)
      .increasePosition(eth.address, usdAddress, user1.address, true, expandDecimals(5, 17));

    expect(await future.longFundingRates(pairKey)).to.equal(-104154);
    expect(await future.shortFundingRates(pairKey)).to.equal(149983);
    expect(await future.cumulativeLongFundingRates(pairKey)).to.equal(-149); // -92 + -104154 * 2 / 3600
    expect(await future.cumulativeShortFundingRates(pairKey)).to.equal(291); // 208 + 149983 * 2 / 3600
    expect(await future.lastFundingTimestamps(pairKey)).to.equal(blockTime);

    ethUsdState.insuranceFund = ethUsdState.insuranceFund.add(-5207700000000); // 1000112500000000000 + -5207700000000  = 1000107292300000000;
    ethUsdState.totalLongSize = ethUsdState.totalLongSize.add(expandDecimals(750, 18));
    ethUsdState.tokenBalance = ethUsdState.tokenBalance.add(
      expandDecimals(5, 17).toBigInt() - expandDecimals(5, 14).toBigInt() / BigInt(2)
    );
    expect(await future.collateralInsuranceFunds(eth.address)).to.equal(ethUsdState.insuranceFund);
    expect(await future.totalLongSizes(pairKey)).to.equal(ethUsdState.totalLongSize);
    expect(await future.tokenBalances(eth.address)).to.equal(ethUsdState.tokenBalance);

    let pos = await future.getPosition(eth.address, usdAddress, user1.address, true);
    let posKey = await future.getPositionKey(eth.address, usdAddress, user1.address, true);

    // fundingFee: -104154 * 5e17 / 1e10 = -5207700000000
    expect(pos.margin).to.equal("499505207700000000"); // 5e17 - 5e14 - -5207700000000
    expect(pos.openNotional).to.equal(expandDecimals(5, 17));
    expect(pos.size).to.equal(expandDecimals(750, 18));
    expect(pos.entryFundingRate).to.equal(-149);

    // two hours later
    lastFundingTimestamp = await future.lastFundingTimestamps(pairKey);
    blockTime = lastFundingTimestamp.toNumber() + 7201; // 7203

    await setNextBlockTimeAndMine(blockTime);

    await fastPriceFeed
      .connect(updater0)
      .setPrices([eth.address], [expandDecimals(1600, 30)], blockTime);

    blockTime = (await getLatestBlockTime()) + 1;

    await expect(
      future
        .connect(user1)
        .decreasePosition(
          eth.address,
          usdAddress,
          user1.address,
          true,
          0,
          pos.openNotional,
          user1.address
        )
    )
      .to.emit(future, "UpdateFundingRate")
      .withArgs(
        pairKey,
        eth.address,
        usdAddress,
        -156233, // longFundingRates
        351524, // shortFundingRates
        -533650, // cumulativeLongFundingRates
        1200645, // cumulativeShortFundingRates
        blockTime // timestamp
      )
      .to.emit(future, "ClosePosition")
      .withArgs(
        posKey,
        eth.address,
        usdAddress,
        user1.address,
        true,
        "499505207700000000", // margin delta: 499505207700000000
        expandDecimals(5, 17), // open notional delta
        expandDecimals(750, 18), // size delta
        "750000000000000", // trading fee: 0.001 * 4500e6/3000e6 * 5e17
        "-15629800000000", // fundingFee: (-312745 - -149) * 5e17 / 1e10
        "-31250000000000000", // pnl: (750-0.5*1600) / 1600 * 1e18
        expandDecimals(1600, 30),
        expandDecimals(1, 30)
      )
      .to.emit(future, "UpdatePosition")
      .withArgs(
        posKey,
        eth.address,
        usdAddress,
        user1.address,
        true,
        0, // margin
        0, // open notional
        0, // size
        0 // entryFundingRate
      )
      .to.emit(eth, "Transfer")
      .withArgs(future.address, swap.address, BigInt("750000000000000") / BigInt(2))
      .to.emit(eth, "Transfer")
      .withArgs(
        future.address,
        user1.address,
        BigInt("499505207700000000") + // pre margin
        BigInt("-31250000000000000") - // pnl
        BigInt("-15629800000000") - // funding fee
        BigInt("750000000000000") // trading fee
      ); //

    expect(await future.longFundingRates(pairKey)).to.equal(-156233);
    expect(await future.shortFundingRates(pairKey)).to.equal(351524);
    expect(await future.cumulativeLongFundingRates(pairKey)).to.equal(-312745); // -149 + 7203 * -156233 / 3600
    expect(await future.cumulativeShortFundingRates(pairKey)).to.equal(703631); // 291 + 7203 * 351524 / 3600
    expect(await future.lastFundingTimestamps(pairKey)).to.equal(blockTime);
    expect(await future.totalLongSizes(pairKey)).to.equal(
      ethUsdState.totalLongSize.sub(expandDecimals(750, 18))
    );
    expect(await future.tokenBalances(eth.address)).to.equal(
      ethUsdState.tokenBalance.add(
        -(
          BigInt("499505207700000000") + // pre margin
          BigInt("-31250000000000000") - // pnl
          BigInt("-15629800000000") - // funding fee
          BigInt("750000000000000")
        ) -
        BigInt("750000000000000") / BigInt(2)
      )
    );
    expect(await future.collateralInsuranceFunds(eth.address)).to.equal(
      ethUsdState.insuranceFund.add(BigInt("-15629800000000") - BigInt("-31250000000000000"))
    );
    pos = await future.getPosition(eth.address, usdAddress, user1.address, true);
    expect(pos.margin).to.equal(0);
    expect(pos.openNotional).to.equal(0);
    expect(pos.size).to.equal(0);
    expect(pos.entryFundingRate).to.equal(0);
  });

  it("closeShortPosition", async function () {
    await eth.transfer(future.address, expandDecimals(5, 17));

    let pairKey = await future.getPairKey(eth.address, usdAddress);
    let blockTime = (await getLatestBlockTime()) + 1;
    let lastFundingTimestamp = await future.lastFundingTimestamps(pairKey);
    let fundingDuration = blockTime - lastFundingTimestamp.toNumber();

    setNextBlockTime(blockTime);
    await future
      .connect(user1)
      .increasePosition(eth.address, usdAddress, user1.address, false, expandDecimals(5, 17));

    expect(await future.longFundingRates(pairKey)).to.equal(-214261);
    expect(await future.shortFundingRates(pairKey)).to.equal(656176);
    expect(await future.cumulativeLongFundingRates(pairKey)).to.equal(-211); // -92 + -214261 * 2 / 3600
    expect(await future.cumulativeShortFundingRates(pairKey)).to.equal(572); // 208 + 656176 * 2 / 3600
    expect(await future.lastFundingTimestamps(pairKey)).to.equal(blockTime);

    ethUsdState.insuranceFund = ethUsdState.insuranceFund.add("32808800000000"); // 1000112500000000000 + 32808800000000  = 1000145308800000000;
    ethUsdState.totalShortSize = ethUsdState.totalShortSize.add(expandDecimals(750, 18));
    // tradingFee = 0.001 * 1e9 * 5250e18/3000e18 * 5e17/1e9 = 875000000000000
    ethUsdState.tokenBalance = ethUsdState.tokenBalance.add(
      expandDecimals(5, 17).toBigInt() - BigInt("875000000000000") / BigInt(2)
    );

    expect(await future.collateralInsuranceFunds(eth.address)).to.equal(ethUsdState.insuranceFund);
    expect(await future.tokenBalances(eth.address)).to.equal(ethUsdState.tokenBalance);
    expect(await future.totalShortSizes(pairKey)).to.equal(ethUsdState.totalShortSize);

    let pos = await future.getPosition(eth.address, usdAddress, user1.address, false);
    let posKey = await future.getPositionKey(eth.address, usdAddress, user1.address, false);

    // fundingFee: 656176 * 5e17 / 1e10 = 32808800000000
    expect(pos.margin).to.equal("499092191200000000"); // 5e17 - 875000000000000 - 32808800000000 = 499092191200000000
    expect(pos.openNotional).to.equal(expandDecimals(5, 17));
    expect(pos.size).to.equal(expandDecimals(750, 18));
    expect(pos.entryFundingRate).to.equal(572);

    // two hours later
    lastFundingTimestamp = await future.lastFundingTimestamps(pairKey);
    blockTime = lastFundingTimestamp.toNumber() + 7201; // 7203
    await setNextBlockTimeAndMine(blockTime);

    await fastPriceFeed
      .connect(updater0)
      .setPrices([eth.address], [expandDecimals(1600, 30)], blockTime);

    blockTime = (await getLatestBlockTime()) + 1;

    await expect(
      future
        .connect(user1)
        .decreasePosition(
          eth.address,
          usdAddress,
          user1.address,
          false,
          0,
          pos.openNotional,
          user1.address
        )
    )
      .to.emit(future, "UpdateFundingRate")
      .withArgs(
        pairKey,
        eth.address,
        usdAddress,
        -156227, // longFundingRates
        351511, // shortFundingRates
        -312795, // cumulativeLongFundingRates
        703886, // cumulativeShortFundingRates
        blockTime // timestamp
      )
      .to.emit(future, "ClosePosition")
      .withArgs(
        posKey,
        eth.address,
        usdAddress,
        user1.address,
        false,
        "499092191200000000", // margin delta
        expandDecimals(5, 17), // open notional delta
        expandDecimals(750, 17), // size delta
        expandDecimals(5, 14), // trading fee,
        "35165700000000", // fundingFee: 5e17 * (703886 - 572) / 1e10
        "31250000000000000", // pnl: (0.5 - 750/1600) * 1e18
        expandDecimals(1600, 30),
        expandDecimals(1, 30)
      )
      .to.emit(future, "UpdatePosition")
      .withArgs(
        posKey,
        eth.address,
        usdAddress,
        user1.address,
        false,
        0, // margin
        0, // open notional
        0, // size
        0 // entryFundingRate
      )
      .to.emit(eth, "Transfer")
      .withArgs(future.address, swap.address, expandDecimals(5, 14).toBigInt() / BigInt(2))
      .to.emit(eth, "Transfer")
      .withArgs(
        future.address,
        user1.address,
        BigInt("499092191200000000") +
        BigInt("31250000000000000") -
        BigInt("35165700000000") -
        expandDecimals(5, 14).toBigInt()
      );

    expect(await future.totalShortSizes(pairKey)).to.equal(
      ethUsdState.totalShortSize.sub(expandDecimals(750, 18))
    );

    expect(await future.longFundingRates(pairKey)).to.equal(-156227);
    expect(await future.shortFundingRates(pairKey)).to.equal(351511);
    expect(await future.cumulativeLongFundingRates(pairKey)).to.equal(-312795); // -211 + 7203 * -156227 / 3600
    expect(await future.cumulativeShortFundingRates(pairKey)).to.equal(703886); // 572 + 7203 * 351511 / 3600
    expect(await future.lastFundingTimestamps(pairKey)).to.equal(blockTime);
    expect(await future.collateralInsuranceFunds(eth.address)).to.equal(
      ethUsdState.insuranceFund.add(BigInt("35165700000000") - BigInt("31250000000000000"))
    );
    expect(await future.tokenBalances(eth.address)).to.equal(
      ethUsdState.tokenBalance.add(
        -(
          BigInt("499092191200000000") +
          BigInt("31250000000000000") -
          BigInt("35165700000000") -
          expandDecimals(5, 14).toBigInt()
        ) -
        expandDecimals(5, 14).toBigInt() / BigInt(2)
      )
    );

    pos = await future.getPosition(eth.address, usdAddress, user1.address, false);
    expect(pos.margin).to.equal(0);
    expect(pos.openNotional).to.equal(0);
    expect(pos.size).to.equal(0);
    expect(pos.entryFundingRate).to.equal(0);
  });

  it("liquidateLongPosition", async function () {
    await eth.transfer(future.address, expandDecimals(3, 17));

    let pairKey = await future.getPairKey(eth.address, usdAddress);
    let blockTime = (await getLatestBlockTime()) + 1;
    let lastFundingTimestamp = await future.lastFundingTimestamps(pairKey);
    let fundingDuration = blockTime - lastFundingTimestamp.toNumber(); // 2

    setNextBlockTime(blockTime);

    await future
      .connect(user1)
      .increasePosition(eth.address, usdAddress, user1.address, true, expandDecimals(5, 17));

    expect(await future.longFundingRates(pairKey)).to.equal(-104154);
    expect(await future.shortFundingRates(pairKey)).to.equal(149983);
    expect(await future.cumulativeLongFundingRates(pairKey)).to.equal(-149); // -92 + -104154 * 2 / 3600
    expect(await future.cumulativeShortFundingRates(pairKey)).to.equal(291); // 208 + 149983 * 2 / 3600
    expect(await future.lastFundingTimestamps(pairKey)).to.equal(blockTime);

    ethUsdState.insuranceFund = ethUsdState.insuranceFund.add(-5207700000000); // 1000112500000000000 + -5207700000000  = 1000107292300000000;
    ethUsdState.totalLongSize = ethUsdState.totalLongSize.add(expandDecimals(750, 18));
    ethUsdState.tokenBalance = ethUsdState.tokenBalance.add(
      expandDecimals(3, 17).toBigInt() - expandDecimals(5, 14).toBigInt() / BigInt(2)
    );
    expect(await future.collateralInsuranceFunds(eth.address)).to.equal(ethUsdState.insuranceFund);
    expect(await future.totalLongSizes(pairKey)).to.equal(ethUsdState.totalLongSize);
    expect(await future.tokenBalances(eth.address)).to.equal(ethUsdState.tokenBalance);

    let pos = await future.getPosition(eth.address, usdAddress, user1.address, true);
    let posKey = await future.getPositionKey(eth.address, usdAddress, user1.address, true);

    // fundingFee: -104154 * 5e17 / 1e10 = -5207700000000
    expect(pos.margin).to.equal("299505207700000000"); // 3e17 - 5e14 - -5207700000000
    expect(pos.openNotional).to.equal(expandDecimals(5, 17));
    expect(pos.size).to.equal(expandDecimals(750, 18));
    expect(pos.entryFundingRate).to.equal(-149);

    // two hours later
    lastFundingTimestamp = await future.lastFundingTimestamps(pairKey);
    blockTime = lastFundingTimestamp.toNumber() + 7201; // 7203

    await setNextBlockTimeAndMine(blockTime);
    await fastPriceFeed
      .connect(updater0)
      .setPrices([eth.address], [expandDecimals(3750, 30)], blockTime);

    blockTime = (await getLatestBlockTime()) + 1;

    await expect(future.liquidatePosition(eth.address, usdAddress, user1.address, true))
      .to.emit(future, "UpdateFundingRate")
      .withArgs(
        pairKey,
        eth.address,
        usdAddress,
        -66659, // longFundingRates
        149983, // shortFundingRates
        -133522, // cumulativeLongFundingRates
        300381, // cumulativeShortFundingRates
        blockTime
      )
      .to.emit(future, "LiquidatePosition")
      .withArgs(
        posKey,
        eth.address,
        usdAddress,
        user1.address,
        true,
        pos.margin,
        pos.openNotional,
        pos.size,
        "750000000000000", // trading fee: 0.001 * 4500e6/3000e6 * 5e17
        "-6664900000000", // funding fee: 5e17  * (-133522 - -224) / 1e10
        "-300000000000000000", // pnl: (750/3750 - 0.5) * 1e18
        expandDecimals(3750, 30),
        expandDecimals(1, 30)
      )
      .to.emit(future, "UpdatePosition")
      .withArgs(posKey, eth.address, usdAddress, user1.address, true, 0, 0, 0, 0)
      .to.emit(eth, "Transfer")
      .withArgs(future.address, swap.address, BigInt("750000000000000") / BigInt(2));

    expect(await future.longFundingRates(pairKey)).to.equal(-66659);
    expect(await future.shortFundingRates(pairKey)).to.equal(149983);
    expect(await future.cumulativeLongFundingRates(pairKey)).to.equal(-133522); // -149 + 7203 * -66659 / 3600
    expect(await future.cumulativeShortFundingRates(pairKey)).to.equal(300381); // 291 + 7203 * 149983 / 3600
    expect(await future.lastFundingTimestamps(pairKey)).to.equal(blockTime);
    expect(await future.totalLongSizes(pairKey)).to.equal(
      ethUsdState.totalLongSize.sub(expandDecimals(750, 18))
    );
    expect(await future.tokenBalances(eth.address)).to.equal(
      ethUsdState.tokenBalance.add(-BigInt("750000000000000") / BigInt(2))
    );
    let leftMargin =
      BigInt("299505207700000000") + // margin
      BigInt("-300000000000000000") - // pnl
      BigInt("-6664900000000") - // funding fee
      BigInt("750000000000000"); // trading fee
    let toInsuranceFund = -BigInt("-300000000000000000") + BigInt("-6664900000000") + leftMargin;
    expect(await future.collateralInsuranceFunds(eth.address)).to.equal(
      ethUsdState.insuranceFund.add(toInsuranceFund)
    );

    pos = await future.getPosition(eth.address, usdAddress, user1.address, true);
    expect(pos.margin).to.equal(0);
    expect(pos.openNotional).to.equal(0);
    expect(pos.size).to.equal(0);
    expect(pos.entryFundingRate).to.equal(0);
  });

  it("liquidateShortPosition", async function () {
    await eth.transfer(future.address, expandDecimals(3, 17));

    let pairKey = await future.getPairKey(eth.address, usdAddress);
    let blockTime = (await getLatestBlockTime()) + 1;
    let lastFundingTimestamp = await future.lastFundingTimestamps(pairKey);
    let fundingDuration = blockTime - lastFundingTimestamp.toNumber();

    setNextBlockTime(blockTime);
    await future
      .connect(user1)
      .increasePosition(eth.address, usdAddress, user1.address, false, expandDecimals(5, 17));

    expect(await future.longFundingRates(pairKey)).to.equal(-214261);
    expect(await future.shortFundingRates(pairKey)).to.equal(656176);
    expect(await future.cumulativeLongFundingRates(pairKey)).to.equal(-211); // -92 + -214261 * 2 / 3600
    expect(await future.cumulativeShortFundingRates(pairKey)).to.equal(572); // 208 + 656176 * 2 / 3600
    expect(await future.lastFundingTimestamps(pairKey)).to.equal(blockTime);

    ethUsdState.insuranceFund = ethUsdState.insuranceFund.add("32808800000000"); // 1000112500000000000 + 32808800000000  = 1000145308800000000;
    ethUsdState.totalShortSize = ethUsdState.totalShortSize.add(expandDecimals(750, 18));
    // tradingFee = 0.001 * 1e9 * 5250e18/3000e18 * 5e17/1e9 = 875000000000000
    ethUsdState.tokenBalance = ethUsdState.tokenBalance.add(
      expandDecimals(3, 17).toBigInt() - BigInt("875000000000000") / BigInt(2)
    );

    expect(await future.collateralInsuranceFunds(eth.address)).to.equal(ethUsdState.insuranceFund);
    expect(await future.tokenBalances(eth.address)).to.equal(ethUsdState.tokenBalance);
    expect(await future.totalShortSizes(pairKey)).to.equal(ethUsdState.totalShortSize);

    let pos = await future.getPosition(eth.address, usdAddress, user1.address, false);
    let posKey = await future.getPositionKey(eth.address, usdAddress, user1.address, false);

    // fundingFee: 656176 * 5e17 / 1e10 = 32808800000000
    expect(pos.margin).to.equal("299092191200000000"); // 3e17 - 875000000000000 - 32808800000000
    expect(pos.openNotional).to.equal(expandDecimals(5, 17));
    expect(pos.size).to.equal(expandDecimals(750, 18));
    expect(pos.entryFundingRate).to.equal(572);

    // two hours later
    lastFundingTimestamp = await future.lastFundingTimestamps(pairKey);
    blockTime = lastFundingTimestamp.toNumber() + 7201; // 7203
    await setNextBlockTimeAndMine(blockTime);

    await fastPriceFeed
      .connect(updater0)
      .setPrices([eth.address], [expandDecimals(940, 30)], blockTime);

    blockTime = (await getLatestBlockTime()) + 1;

    await expect(future.liquidatePosition(eth.address, usdAddress, user1.address, false))
      .to.emit(future, "UpdateFundingRate")
      .withArgs(
        pairKey,
        eth.address,
        usdAddress,
        -265918, // longFundingRates
        598317, // shortFundingRates
        -532268, // cumulativeLongFundingRates
        1197704, // cumulativeShortFundingRates
        blockTime
      )
      .to.emit(future, "LiquidatePosition")
      .withArgs(
        posKey,
        eth.address,
        usdAddress,
        user1.address,
        false,
        pos.margin,
        pos.openNotional,
        pos.size,
        expandDecimals(5, 14), // trading fee
        "59842300000000", // funding fee: (1197704 - 858) * 5e17 / 1e10
        "-297872340425531900", // pnl: (0.5 - 750/940) * 1e18
        expandDecimals(940, 30),
        expandDecimals(1, 30)
      )
      .to.emit(future, "UpdatePosition")
      .withArgs(posKey, eth.address, usdAddress, user1.address, false, 0, 0, 0, 0)
      .to.emit(eth, "Transfer")
      .withArgs(future.address, swap.address, expandDecimals(5, 14).toBigInt() / BigInt(2));

    expect(await future.longFundingRates(pairKey)).to.equal(-265918);
    expect(await future.shortFundingRates(pairKey)).to.equal(598317);
    expect(await future.cumulativeLongFundingRates(pairKey)).to.equal(-532268); // -211 + 7203 * -265918 / 3600
    expect(await future.cumulativeShortFundingRates(pairKey)).to.equal(1197704); // 572 + 7203 * 598317 / 3600
    expect(await future.lastFundingTimestamps(pairKey)).to.equal(blockTime);
    expect(await future.totalShortSizes(pairKey)).to.equal(
      ethUsdState.totalShortSize.sub(expandDecimals(750, 18))
    );
    expect(await future.tokenBalances(eth.address)).to.equal(
      ethUsdState.tokenBalance.add(-expandDecimals(5, 14).toBigInt() / BigInt(2))
    );
    let leftMargin =
      BigInt("299092191200000000") + // margin
      BigInt("-297872340425531900") - // pnl
      BigInt("59842300000000") - // funding fee
      expandDecimals(5, 14).toBigInt(); // trading fee
    let toInsuranceFund = -BigInt("-297872340425531900") + BigInt("59842300000000") + leftMargin;
    expect(await future.collateralInsuranceFunds(eth.address)).to.equal(
      ethUsdState.insuranceFund.add(toInsuranceFund)
    );

    pos = await future.getPosition(eth.address, usdAddress, user1.address, true);
    expect(pos.margin).to.equal(0);
    expect(pos.openNotional).to.equal(0);
    expect(pos.size).to.equal(0);
    expect(pos.entryFundingRate).to.equal(0);
  });
});
