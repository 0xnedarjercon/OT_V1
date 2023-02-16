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
  let btc: MyERC20;
  let usdc: MyERC20;
  let dai: MyERC20;

  let owner: SignerWithAddress;
  let user0: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  let updater0: SignerWithAddress;

  let usdcEthState: {
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
    btc = await (await ethers.getContractFactory("MyERC20")).deploy("btc", "btc", 8);
    usdc = await (await ethers.getContractFactory("MyERC20")).deploy("usdc", "usdc", 6);
    dai = await (await ethers.getContractFactory("MyERC20")).deploy("dai", "dai", 18);

    let blockTime = await getLatestBlockTime();
    await fastPriceFeed
      .connect(updater0)
      .setPrices(
        [eth.address, usdc.address],
        [expandDecimals(1500, 30), expandDecimals(1, 30)],
        blockTime
      );
    await future.listPair(usdc.address, eth.address);

    // increase insuranceFund
    let insuranceFund = 1000 * 1e6;
    await usdc.transfer(future.address, insuranceFund);
    await future.increaseInsuranceFund(usdc.address);
    expect(await future.collateralInsuranceFunds(usdc.address)).to.equal(insuranceFund);
    expect(await future.tokenBalances(usdc.address)).to.equal(1000 * 1e6);

    // max leverage: 10x; maxOpenNotional: 3000 * 10
    await future.setMaxLeverage(usdc.address, eth.address, 3000, 10e9);
    // minMaintanenceMarginRatio: 0.5%， maxMaintanenceMarginRatio: 5%
    await future.setMarginRatio(usdc.address, eth.address, 5e6, 5e7);
    // feeRate: 0.1%, protocolFeeRate: 50% * 0.1%
    await future.setTradingFeeRate(usdc.address, eth.address, 1e6, 5e8);

    // todo change it to collateral based
    swap = await (await ethers.getContractFactory("MockSwap")).deploy();
    await future.setSwapPool(swap.address);

    // increase long position
    {
      let posKey = await future.getPositionKey(usdc.address, eth.address, user0.address, true);
      await usdc.transfer(future.address, 1000 * 1e6);
      await expect(
        future
          .connect(user0)
          .increasePosition(usdc.address, eth.address, user0.address, true, 3000 * 1e6)
      )
        .to.emit(future, "IncreasePosition")
        .withArgs(
          posKey,
          usdc.address,
          eth.address,
          user0.address,
          true, // isLong
          1000 * 1e6, // marginDelta
          3000 * 1e6, // notionalDelta
          "2000000000000000000", // sizeDelta
          3000000, // tradingFee
          0, // fundingFee
          expandDecimals(1, 30), // collateral price
          expandDecimals(1500, 30) // index price
        )
        .to.emit(future, "UpdatePosition")
        .withArgs(
          posKey,
          usdc.address,
          eth.address,
          user0.address,
          true,
          "997000000", // margin
          3000 * 1e6, // open notional
          "2000000000000000000", // size
          0 // entryFundingRate
        )
        .to.emit(usdc, "Transfer")
        .withArgs(future.address, swap.address, 1500000); // tradingFee to swap pool

      let pos = await future.getPosition(usdc.address, eth.address, user0.address, true);
      let pairKey = await future.getPairKey(usdc.address, eth.address);

      expect(pos.margin).to.equal("997000000");
      expect(pos.size).to.equal("2000000000000000000");
      expect(pos.openNotional).to.equal(3000 * 1e6);
      expect(pos.entryFundingRate).to.equal(0); // first hour no funding fee
      expect(await future.totalLongSizes(pairKey)).to.equal("2000000000000000000");
      expect(await future.totalLongOpenNotionals(pairKey)).to.equal(3000 * 1e6);
      expect(await future.protocolUnrealizedFees(pairKey)).to.equal(1500000); // tradingFee to protocol
      expect(await future.tokenBalances(usdc.address)).to.equal(1998500000); // insuranceFund + margin + protocolFees
    }

    // increase short position
    {
      // console.log('increase short position')
      let pairKey = await future.getPairKey(usdc.address, eth.address);
      let posKey = await future.getPositionKey(usdc.address, eth.address, user0.address, false);
      await usdc.transfer(future.address, 1000 * 1e6);

      let blockTime = (await getLatestBlockTime()) + 1;
      let lastFundingTimestamp = (await future.lastFundingTimestamps(pairKey)).toNumber();
      let duration = blockTime - lastFundingTimestamp; // 2s
      await setNextBlockTime(blockTime);

      await expect(
        future
          .connect(user0)
          .increasePosition(usdc.address, eth.address, user0.address, false, 4500 * 1e6)
      )
        .to.emit(future, "IncreasePosition")
        .withArgs(
          posKey,
          usdc.address,
          eth.address,
          user0.address,
          false,
          1000 * 1e6, // margin
          4500 * 1e6, // open notional
          "3000000000000000000", // size
          "6750000", // trading fee: = 0.001 * 3e18/2e18 * 4500*1e6
          253125, // fundingFee  4500 * 1e6 * 562500 / 1e10
          expandDecimals(1, 30),
          expandDecimals(1500, 30)
        )
        .to.emit(future, "UpdatePosition")
        .withArgs(
          posKey,
          usdc.address,
          eth.address,
          user0.address,
          false,
          "992996875", // margin 1000 * 1e6 - 6750000 - 253125
          4500 * 1e6, // open notional
          "3000000000000000000", // size
          312 // entryFundingRate
        )
        .to.emit(usdc, "Transfer")
        .withArgs(future.address, swap.address, 3375000);

      let pos = await future.getPosition(usdc.address, eth.address, user0.address, false);

      expect(pos.margin).to.equal("992996875");
      expect(pos.size).to.equal("3000000000000000000");
      expect(pos.openNotional).to.equal(4500 * 1e6);
      expect(pos.entryFundingRate).to.equal(312);

      expect(await future.totalShortSizes(pairKey)).to.equal("3000000000000000000");
      expect(await future.protocolUnrealizedFees(pairKey)).to.equal(4875000); // tradingFee to protocol: 1500000 + 6750000/2
      expect(await future.tokenBalances(usdc.address)).to.equal(2995125000); // insuranceFund + margin + protocolFees
      expect(await future.longFundingRates(pairKey)).to.equal(-250000);
      expect(await future.shortFundingRates(pairKey)).to.equal(562500);
      expect(await future.cumulativeLongFundingRates(pairKey)).to.equal(-138); // -250000 * 2 / 3600
      expect(await future.cumulativeShortFundingRates(pairKey)).to.equal(312); // 562500 * 2 / 3600
      expect(await future.collateralInsuranceFunds(usdc.address)).to.equal(1000253125); // 1000e6 + 253125

      usdcEthState = {
        totalLongSize: await future.totalLongSizes(pairKey), // 2 eth
        totalShortSize: await future.totalShortSizes(pairKey), // 3 eth
        totalLongOpenNotional: await future.totalLongOpenNotionals(pairKey), // 3000 usdc
        totalShortOpenNotional: await future.totalShortOpenNotionals(pairKey), // 4500 usdc
        tokenBalance: await future.tokenBalances(usdc.address),
        insuranceFund: await future.collateralInsuranceFunds(usdc.address),
        cumulativeLongFundingRate: await future.cumulativeLongFundingRates(pairKey),
        cumulativeShortFundingRate: await future.cumulativeShortFundingRates(pairKey),
      };
    }
  });

  // todo delete legacy test
  it.skip("increaseMargin, decreaseMargin legacy", async function () {
    // increaseMargin
    {
      const posKey = await future.getPositionKey(usdc.address, eth.address, user0.address, true);
      const pos = await future.positions(posKey);
      const tokenBalance = await future.tokenBalances(usdc.address);
      await usdc.transfer(future.address, 20 * 1e6);
      await expect(
        future.connect(user0).increaseMargin(usdc.address, eth.address, user0.address, true)
      )
        .to.emit(future, "IncreaseMargin")
        .withArgs(posKey, usdc.address, eth.address, user0.address, true, 20 * 1e6)
        .to.emit(future, "UpdatePosition")
        .withArgs(
          posKey,
          usdc.address,
          eth.address,
          user0.address,
          true,
          pos.margin.add(20 * 1e6),
          pos.openNotional,
          pos.size,
          pos.entryFundingRate
        );

      expect(await future.tokenBalances(usdc.address)).to.equal(tokenBalance.add(20 * 1e6));
    }

    // decreaseMargin
    {
      const posKey = await future.getPositionKey(usdc.address, eth.address, user0.address, false);
      const pos = await future.positions(posKey);
      const tokenBalance = await future.tokenBalances(usdc.address);
      await expect(
        future
          .connect(user0)
          .decreaseMargin(usdc.address, eth.address, user0.address, false, 20 * 1e6, user0.address)
      )
        .to.emit(future, "DecreaseMargin")
        .withArgs(posKey, usdc.address, eth.address, user0.address, false, 20 * 1e6)
        .to.emit(future, "UpdatePosition")
        .withArgs(
          posKey,
          usdc.address,
          eth.address,
          user0.address,
          false,
          pos.margin.sub(20 * 1e6),
          pos.openNotional,
          pos.size,
          pos.entryFundingRate
        );

      expect(await future.tokenBalances(usdc.address)).to.equal(tokenBalance.sub(20 * 1e6));
    }
  });

  it("increaseMargin, decreaseMargin", async function () {
    // increaseMargin
    {
      const posKey = await future.getPositionKey(usdc.address, eth.address, user0.address, true);
      const pos = await future.positions(posKey);
      const tokenBalance = await future.tokenBalances(usdc.address);
      await usdc.transfer(future.address, 20 * 1e6);
      await expect(
        future.connect(user0).increaseMargin(usdc.address, eth.address, user0.address, true)
      )
        .to.emit(future, "IncreaseMargin")
        .withArgs(posKey, usdc.address, eth.address, user0.address, true, 20 * 1e6)
        .to.emit(future, "UpdatePosition")
        .withArgs(
          posKey,
          usdc.address,
          eth.address,
          user0.address,
          true,
          pos.margin.add(20 * 1e6),
          pos.openNotional,
          pos.size,
          pos.entryFundingRate
        );

      expect(await future.tokenBalances(usdc.address)).to.equal(tokenBalance.add(20 * 1e6));
    }

    // decreaseMargin
    {
      let pairKey = await future.getPairKey(usdc.address, eth.address);
      let lastFundingTimestamp = (await future.lastFundingTimestamps(pairKey)).toNumber();
      let blockTime = lastFundingTimestamp + 7201;
      await setNextBlockTimeAndMine(blockTime);

      const posKey = await future.getPositionKey(usdc.address, eth.address, user0.address, false);
      const tokenBalance = await future.tokenBalances(usdc.address);

      await fastPriceFeed
        .connect(updater0)
        .setPrices(
          [eth.address, usdc.address],
          [expandDecimals(1600, 30), expandDecimals(1, 30)],
          blockTime
        );

      let pos = await future.getPosition(usdc.address, eth.address, user0.address, false);
      let pnl = (-1600 + 1500) * 3 * 1e6;
      let fundignFee = 540087; // (1200507 - 312) * 4500e6 / 1e10
      let marginDelta = 20 * 1e6;
      let posMargin = pos.margin.toNumber() - fundignFee + pnl - marginDelta;
      let posOpenNotional = 3 * 1600 * 1e6;

      blockTime = (await getLatestBlockTime()) + 1;
      lastFundingTimestamp = (await future.lastFundingTimestamps(pairKey)).toNumber();
      let fundingDuration = blockTime - lastFundingTimestamp; // 7203

      await expect(
        future
          .connect(user0)
          .decreaseMargin(
            usdc.address,
            eth.address,
            user0.address,
            false,
            marginDelta,
            user0.address
          )
      )
        .to.emit(future, "UpdateFundingRate")
        .withArgs(
          pairKey,
          usdc.address,
          eth.address,
          -266599, // longFundingRates
          599848, // shortFundingRates
          -133381, // cumulativeLongFundingRates: -138 + -266599 / 7203 * 3600
          1200507, // cumulativeShortFundingRates: 312 + 599848 / 7203 * 3600
          blockTime // timestamp
        )
        .to.emit(future, "DecreaseMargin")
        .withArgs(
          posKey,
          usdc.address,
          eth.address,
          user0.address,
          false,
          pnl,
          fundignFee,
          marginDelta
        )
        .to.emit(future, "UpdatePosition")
        .withArgs(
          posKey,
          usdc.address,
          eth.address,
          user0.address,
          false,
          posMargin,
          posOpenNotional,
          pos.size,
          1200507
        );

      expect(await future.tokenBalances(usdc.address)).to.equal(tokenBalance.sub(20 * 1e6));
    }
  });

  it("increaseLongPosiiton", async function () {
    let posKey = await future.getPositionKey(usdc.address, eth.address, user0.address, true);
    let pairKey = await future.getPairKey(usdc.address, eth.address);

    let lastFundingTimestamp = await (await future.lastFundingTimestamps(pairKey)).toNumber();
    let blockTime = lastFundingTimestamp + 7201;
    await setNextBlockTimeAndMine(blockTime);

    await fastPriceFeed
      .connect(updater0)
      .setPrices(
        [eth.address, usdc.address],
        [expandDecimals(1600, 30), expandDecimals(1, 30)],
        blockTime
      );

    let pos = await future.getPosition(usdc.address, eth.address, user0.address, true);
    // increase 2 eth
    await usdc.transfer(future.address, 1000 * 1e6);

    blockTime = (await getLatestBlockTime()) + 1;
    lastFundingTimestamp = (await future.lastFundingTimestamps(pairKey)).toNumber();
    let fundingDuration = blockTime - lastFundingTimestamp; // 7204
    let posMargin = pos.margin.toNumber() + 1000 * 1e6 - 4266665 - 490678;

    await expect(
      future
        .connect(user0)
        .increasePosition(usdc.address, eth.address, user0.address, true, 3200 * 1e6)
    )
      .to.emit(future, "UpdateFundingRate")
      .withArgs(
        pairKey,
        usdc.address,
        eth.address,
        533198, // longFundingRates
        -299924, // shortFundingRates
        1066702, // cumulativeLongFundingRates
        -1124712, // cumulativeShortFundingRates
        lastFundingTimestamp + 7200 // timestamp
      )
      .to.emit(future, "IncreasePosition")
      .withArgs(
        posKey,
        usdc.address,
        eth.address,
        user0.address,
        true,
        1000 * 1e6, // margin delta
        3200 * 1e6, // open notional delta
        expandDecimals(2, 18), // size delta
        4266666, // tradingFee,   // 0.001 * 4e18/3e18 * 3200 * 1e6
        490678, // fundingFee 3000e6 * (1066850 - 0) / 1e10 + 3200e6 * 533198 / 1e10
        expandDecimals(1, 30),
        expandDecimals(1600, 30)
      )
      .to.emit(future, "UpdatePosition")
      .withArgs(
        posKey,
        usdc.address,
        eth.address,
        user0.address,
        true,
        posMargin, // margin
        6200 * 1e6, // open notional
        expandDecimals(4, 18), // size
        1066850 // entryFundingRate
      );

    pos = await future.getPosition(usdc.address, eth.address, user0.address, true);
    expect(pos.margin).to.equal(posMargin);
    expect(pos.openNotional).to.equal(6200 * 1e6);
    expect(pos.size).to.equal(expandDecimals(4, 18));
    expect(pos.entryFundingRate).to.equal(1066850);

    expect(await future.totalLongOpenNotionals(pairKey)).to.equal(
      usdcEthState.totalLongOpenNotional.add(3200 * 1e6)
    );
    expect(await future.totalLongSizes(pairKey)).to.equal(
      usdcEthState.totalLongSize.add(expandDecimals(2, 18))
    );
    expect(await future.collateralInsuranceFunds(usdc.address)).to.equal(
      usdcEthState.insuranceFund.add(490678)
    );
    expect(await future.tokenBalances(usdc.address)).to.equal(
      usdcEthState.tokenBalance.add(1000 * 1e6 - (4266666) / 2)
    );
    expect(await future.longFundingRates(pairKey)).to.equal(533198);
    expect(await future.shortFundingRates(pairKey)).to.equal(-299924);
    expect(await future.cumulativeLongFundingRates(pairKey)).to.equal(1066850); // -138 + 533198 * 7204 / 3600
    expect(await future.cumulativeShortFundingRates(pairKey)).to.equal(-599869); // 312 + -299924 * 7204 / 3600
    expect(await future.lastFundingTimestamps(pairKey)).to.equal(blockTime);
  });

  it("increaseLongPosition/customSwapPool", async function () {
    let posKey = await future.getPositionKey(usdc.address, eth.address, user0.address, true);
    let pairKey = await future.getPairKey(usdc.address, eth.address);
    const customSwap = await (await ethers.getContractFactory("MockSwap")).deploy();
    await future.setCustomSwapPool(usdc.address, eth.address, customSwap.address);

    let lastFundingTimestamp = await (await future.lastFundingTimestamps(pairKey)).toNumber();
    let blockTime = lastFundingTimestamp + 7201;
    await setNextBlockTimeAndMine(blockTime);

    await fastPriceFeed
      .connect(updater0)
      .setPrices(
        [eth.address, usdc.address],
        [expandDecimals(1600, 30), expandDecimals(1, 30)],
        blockTime
      );
    await expect(
      future
        .connect(user0)
        .increasePosition(usdc.address, eth.address, user0.address, true, 3200 * 1e6)
    )
      .to.emit(usdc, "Transfer")
      .withArgs(future.address, customSwap.address, 2133333);
  });

  it("increaseShortPosiiton", async function () {
    let posKey = await future.getPositionKey(usdc.address, eth.address, user0.address, false);
    let pairKey = await future.getPairKey(usdc.address, eth.address);

    let lastFundingTimestamp = await future.lastFundingTimestamps(pairKey);
    let blockTime = lastFundingTimestamp.toNumber() + 7201;
    await setNextBlockTimeAndMine(blockTime);

    await fastPriceFeed
      .connect(updater0)
      .setPrices(
        [eth.address, usdc.address],
        [expandDecimals(1600, 30), expandDecimals(1, 30)],
        blockTime
      );

    let pos = await future.getPosition(usdc.address, eth.address, user0.address, false);

    // pre margin + increase margin - trading fee - funding fee
    let posMargin = pos.margin.toNumber() + 1000 * 1e6 - 8000 * 1e3 - 3660571;
    // increase 2 eth
    await usdc.transfer(future.address, 1000 * 1e6);
    blockTime = (await getLatestBlockTime()) + 1;
    lastFundingTimestamp = await future.lastFundingTimestamps(pairKey);
    let fundingDuration = blockTime - lastFundingTimestamp.toNumber(); // 7204
    await expect(
      future
        .connect(user0)
        .increasePosition(usdc.address, eth.address, user0.address, false, 3200 * 1e6)
    )
      .to.emit(future, "UpdateFundingRate")
      .withArgs(
        pairKey,
        usdc.address,
        eth.address,
        -480000, // longFundingRates
        3000000, // shortFundingRates
        -960000, // cumulativeLongFundingRates
        6002124, // cumulativeShortFundingRates
        lastFundingTimestamp.toNumber() + 7200 // timestamp
      )
      .to.emit(future, "IncreasePosition")
      .withArgs(
        posKey,
        usdc.address,
        eth.address,
        user0.address,
        false,
        1000 * 1e6, // margin delta
        3200 * 1e6, // open notional delta
        expandDecimals(2, 18), // size delta
        8000 * 1e3, // trading fee: 0.001*5e18/2e18 * 3200e6
        3660571, // fundingFee: 4500 * 1e6 * (6002124 - 312) / 1e10 + 3200 * 1e6 * 2999240 / 1e10
        expandDecimals(1, 30),
        expandDecimals(1600, 30)
      )
      .to.emit(future, "UpdatePosition");
    // .withArgs(
    //   posKey,
    //   usdc.address,
    //   eth.address,
    //   user0.address,
    //   false,
    //   posMargin, // margin
    //   7700 * 1e6, // open notional
    //   expandDecimals(5, 18), // size
    //   6002124 // entryFundingRate
    // );

    expect(await future.totalShortOpenNotionals(pairKey)).to.equal(
      usdcEthState.totalShortOpenNotional.add(3200 * 1e6)
    );
    expect(await future.totalShortSizes(pairKey)).to.equal(
      usdcEthState.totalShortSize.add(expandDecimals(2, 18))
    );
    expect(await future.tokenBalances(usdc.address)).to.equal(
      usdcEthState.tokenBalance.add(1000 * 1e6 - (8000 * 1e3) / 2)
    );
    expect(await future.longFundingRates(pairKey)).to.equal(-479878);
    expect(await future.shortFundingRates(pairKey)).to.equal(2999240);
    expect(await future.cumulativeLongFundingRates(pairKey)).to.equal(-960427); // -138 +  7204 * -479878 / 3600
    expect(await future.cumulativeShortFundingRates(pairKey)).to.equal(6002124); // 312 + 7204 * 2999240 / 3600
    expect(await future.lastFundingTimestamps(pairKey)).to.equal(blockTime);
    expect(await future.collateralInsuranceFunds(usdc.address)).to.equal(
      usdcEthState.insuranceFund.add(3660571)
    );

    pos = await future.getPosition(usdc.address, eth.address, user0.address, false);
    expect(pos.margin).to.equal(posMargin);
    expect(pos.openNotional).to.equal(7700 * 1e6);
    expect(pos.size).to.equal(expandDecimals(5, 18));
    expect(pos.entryFundingRate).to.equal(6002124);
  });

  it("decreaseLongPosition", async function () {
    let posKey = await future.getPositionKey(usdc.address, eth.address, user0.address, true);
    let pairKey = await future.getPairKey(usdc.address, eth.address);

    let lastFundingTimestamp = await future.lastFundingTimestamps(pairKey);
    let blockTime = lastFundingTimestamp.toNumber() + 7201;
    await setNextBlockTimeAndMine(blockTime);

    await fastPriceFeed
      .connect(updater0)
      .setPrices(
        [eth.address, usdc.address],
        [expandDecimals(1600, 30), expandDecimals(1, 30)],
        blockTime
      );

    let pos = await future.getPosition(usdc.address, eth.address, user0.address, true);
    let posMargin = pos.margin.toNumber() - 500 * 1e6 - 4500000 + 160067 + 100 * 1e6;
    blockTime = (await getLatestBlockTime()) + 1;
    lastFundingTimestamp = await future.lastFundingTimestamps(pairKey);
    let fundingDuration = blockTime - lastFundingTimestamp.toNumber(); // 7203
    // decrease 1 eth
    // long 1, short: 3
    await expect(
      future
        .connect(user0)
        .decreasePosition(
          usdc.address,
          eth.address,
          user0.address,
          true,
          500 * 1e6,
          1500 * 1e6,
          user0.address
        )
    )
      .to.emit(future, "UpdateFundingRate")
      .withArgs(
        pairKey,
        usdc.address,
        eth.address,
        -266666, // longFundingRates
        2400000, // shortFundingRates
        -533333, // cumulativeLongFundingRates
        4800000, // cumulativeShortFundingRates
        lastFundingTimestamp.toNumber() + 7200 // timestamp
      )
      .to.emit(future, "DecreasePosition")
      .withArgs(
        posKey,
        usdc.address,
        eth.address,
        user0.address,
        true,
        500 * 1e6, // margin delta
        1500 * 1e6, // open notional delta
        expandDecimals(1, 18), // size delta
        4500000, // trading fee: 0.001 * 3e18/1e18 * 1500*1e6
        -160067, // fundingFee: 3000e6 * (-533558 - 0) / 1e10
        100 * 1e6, // pnl
        expandDecimals(1, 30),
        expandDecimals(1600, 30)
      )
      .to.emit(future, "UpdatePosition")
      .withArgs(
        posKey,
        usdc.address,
        eth.address,
        user0.address,
        true,
        posMargin, // margin
        1500 * 1e6, // open notional
        expandDecimals(1, 18), // size
        -533558 // entryFundingRate
      )
      .to.emit(usdc, "Transfer")
      .withArgs(future.address, swap.address, (4500000) / 2)
      .to.emit(usdc, "Transfer")
      .withArgs(future.address, user0.address, 500 * 1e6);

    expect(await future.totalLongSizes(pairKey)).to.equal(
      usdcEthState.totalLongSize.sub(expandDecimals(1, 18))
    );
    expect(await future.tokenBalances(usdc.address)).to.equal(
      usdcEthState.tokenBalance.add(-500 * 1e6 - (4500000) / 2)
    );
    expect(await future.longFundingRates(pairKey)).to.equal(-266599);
    expect(await future.shortFundingRates(pairKey)).to.equal(2399392);
    expect(await future.cumulativeLongFundingRates(pairKey)).to.equal(-533558); // -138 + 7203 * -266599 / 3600
    expect(await future.cumulativeShortFundingRates(pairKey)).to.equal(4801095); // 312 + 7203 * 2399392 / 3600
    expect(await future.lastFundingTimestamps(pairKey)).to.equal(blockTime);
    expect(await future.collateralInsuranceFunds(usdc.address)).to.equal(
      usdcEthState.insuranceFund.sub(160067 + 100 * 1e6) // pay funding fee and pnl
    );

    pos = await future.getPosition(usdc.address, eth.address, user0.address, true);
    expect(pos.margin).to.equal(posMargin);
    expect(pos.openNotional).to.equal(1500 * 1e6);
    expect(pos.size).to.equal(expandDecimals(1, 18));
    expect(pos.entryFundingRate).to.equal(-533558);
  });

  it("decreaseShortPosition", async function () {
    let posKey = await future.getPositionKey(usdc.address, eth.address, user0.address, true);
    let pairKey = await future.getPairKey(usdc.address, eth.address);

    let lastFundingTimestamp = await future.lastFundingTimestamps(pairKey);
    let blockTime = lastFundingTimestamp.toNumber() + 7201;
    await setNextBlockTimeAndMine(blockTime);

    await fastPriceFeed
      .connect(updater0)
      .setPrices(
        [eth.address, usdc.address],
        [expandDecimals(1600, 30), expandDecimals(1, 30)],
        blockTime
      );

    let pos = await future.getPosition(usdc.address, eth.address, user0.address, false);
    let posMargin = pos.margin.toNumber() - 50 * 1e6 - 750 * 1e3 - 225036 - 50 * 1e6;
    // decrease 0.5 eth
    // long 2, short: 2.5
    blockTime = (await getLatestBlockTime()) + 1;
    lastFundingTimestamp = await future.lastFundingTimestamps(pairKey);
    let fundingDuration = blockTime - lastFundingTimestamp.toNumber(); // 7203
    await expect(
      future
        .connect(user0)
        .decreasePosition(
          usdc.address,
          eth.address,
          user0.address,
          false,
          50 * 1e6,
          750 * 1e6,
          user0.address
        )
    )
      .to.emit(future, "UpdateFundingRate")
      .withArgs(
        pairKey,
        usdc.address,
        eth.address,
        -160000, // longFundingRates
        250000, // shortFundingRates
        -320000, // cumulativeLongFundingRates
        500000, // cumulativeShortFundingRates
        lastFundingTimestamp.toNumber() + 7200 // timestamp
      )
      .to.emit(future, "DecreasePosition")
      .withArgs(
        posKey,
        usdc.address,
        eth.address,
        user0.address,
        false,
        50 * 1e6, // margin delta
        750 * 1e6, // open notional delta
        expandDecimals(1, 18), // size delta
        750 * 1e3, // trading fee,
        225036, // fundingFee: 4500e6 * (500392 - 312) / 1e10
        -50 * 1e6, // pnl
        expandDecimals(1, 30),
        expandDecimals(1600, 30)
      )
      .to.emit(future, "UpdatePosition")
      .withArgs(
        posKey,
        usdc.address,
        eth.address,
        user0.address,
        false,
        posMargin, // margin
        3750 * 1e6, // open notional
        expandDecimals(1, 18), // size
        500392 // entryFundingRate
      )
      .to.emit(usdc, "Transfer")
      .withArgs(future.address, swap.address, (750 * 1e3) / 2)
      .to.emit(usdc, "Transfer")
      .withArgs(future.address, user0.address, 50 * 1e6);

    expect(await future.totalShortSizes(pairKey)).to.equal(
      usdcEthState.totalShortSize.sub(expandDecimals(5, 17))
    );
    expect(await future.collateralInsuranceFunds(usdc.address)).to.equal(
      usdcEthState.insuranceFund.sub(-225036 - 50 * 1e6) // pay funding fee and pnl
    );
    expect(await future.tokenBalances(usdc.address)).to.equal(
      usdcEthState.tokenBalance.add(-50 * 1e6 - (750 * 1e3) / 2)
    );
    expect(await future.longFundingRates(pairKey)).to.equal(-159959);
    expect(await future.shortFundingRates(pairKey)).to.equal(249936);
    expect(await future.cumulativeLongFundingRates(pairKey)).to.equal(-320189); // -138 + -159959 * 7203 / 3600
    expect(await future.cumulativeShortFundingRates(pairKey)).to.equal(500392); // 312 + 249936 * 7203 / 3600
    expect(await future.lastFundingTimestamps(pairKey)).to.equal(blockTime);

    pos = await future.getPosition(usdc.address, eth.address, user0.address, false);
    expect(pos.margin).to.equal(posMargin);
    expect(pos.openNotional).to.equal(3750 * 1e6);
    expect(pos.size).to.equal(expandDecimals(25, 17));
    expect(pos.entryFundingRate).to.equal(500392);
  });

  it("closeLongPosition", async function () {
    await usdc.transfer(future.address, 500 * 1e6);

    let pairKey = await future.getPairKey(usdc.address, eth.address);
    let blockTime = (await getLatestBlockTime()) + 1;
    let lastFundingTimestamp = await future.lastFundingTimestamps(pairKey);
    let fundingDuration = blockTime - lastFundingTimestamp.toNumber(); // 2

    setNextBlockTime(blockTime);

    await future
      .connect(user1)
      .increasePosition(usdc.address, eth.address, user1.address, true, 750 * 1e6);

    expect(await future.longFundingRates(pairKey)).to.equal(-156210);
    expect(await future.shortFundingRates(pairKey)).to.equal(224943);
    expect(await future.cumulativeLongFundingRates(pairKey)).to.equal(-224); // -138 + -156210 * 2 / 3600
    expect(await future.cumulativeShortFundingRates(pairKey)).to.equal(436); // 312 + 224943 * 2 / 3600
    expect(await future.lastFundingTimestamps(pairKey)).to.equal(blockTime);

    usdcEthState.insuranceFund = usdcEthState.insuranceFund.add(-11715); // 1000253125 + -11715  = 1000241410;
    usdcEthState.totalLongSize = usdcEthState.totalLongSize.add(expandDecimals(5, 17));
    usdcEthState.tokenBalance = usdcEthState.tokenBalance.add(500 * 1e6 - (750 * 1e3) / 2);
    expect(await future.collateralInsuranceFunds(usdc.address)).to.equal(
      usdcEthState.insuranceFund
    );
    expect(await future.totalLongSizes(pairKey)).to.equal(usdcEthState.totalLongSize);
    expect(await future.tokenBalances(usdc.address)).to.equal(usdcEthState.tokenBalance);

    let pos = await future.getPosition(usdc.address, eth.address, user1.address, true);
    let posKey = await future.getPositionKey(usdc.address, eth.address, user1.address, true);

    // fundingFee: -156210 * 750e6 / 1e10 = -11715
    expect(pos.margin).to.equal(499261715); // 500 * 1e6 - 750 * 1e3 - -11715
    expect(pos.openNotional).to.equal(750 * 1e6);
    expect(pos.size).to.equal(expandDecimals(5, 17));

    // two hours later
    lastFundingTimestamp = await future.lastFundingTimestamps(pairKey);
    blockTime = lastFundingTimestamp.toNumber() + 7201; // 7203

    await setNextBlockTimeAndMine(blockTime);

    await fastPriceFeed
      .connect(updater0)
      .setPrices(
        [eth.address, usdc.address],
        [expandDecimals(1600, 30), expandDecimals(1, 30)],
        blockTime
      );

    blockTime = (await getLatestBlockTime()) + 1;

    await expect(
      future
        .connect(user1)
        .decreasePosition(
          usdc.address,
          eth.address,
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
        usdc.address,
        eth.address,
        -266602, // longFundingRates
        599855, // shortFundingRates
        -533650, // cumulativeLongFundingRates
        1200645, // cumulativeShortFundingRates
        blockTime // timestamp
      )
      .to.emit(future, "ClosePosition")
      .withArgs(
        posKey,
        usdc.address,
        eth.address,
        user1.address,
        true,
        499261715, // margin delta: 499261715
        750 * 1e6, // open notional delta
        expandDecimals(5, 17), // size delta
        1125000, // trading fee: 0.001 * 3e18/2e18 * 750 * 1e6
        -40006, // fundingFee: (-533650 - -224) * 750 * 1e6 / 1e10
        50 * 1e6, // pnl: (1600 - 1500) * 0.5 * 1e6
        expandDecimals(5, 17),
        expandDecimals(1600, 30)
      )
      .to.emit(future, "UpdatePosition")
      .withArgs(
        posKey,
        usdc.address,
        eth.address,
        user1.address,
        true,
        0, // margin
        0, // open notional
        0, // size
        0 // entryFundingRate
      )
      .to.emit(usdc, "Transfer")
      .withArgs(future.address, swap.address, (1125000) / 2)
      .to.emit(usdc, "Transfer")
      .withArgs(future.address, user1.address, 499261715 + 50 * 1e6 - -40006 - 1125000); // 548551721

    expect(await future.longFundingRates(pairKey)).to.equal(-266602);
    expect(await future.shortFundingRates(pairKey)).to.equal(599855);
    expect(await future.cumulativeLongFundingRates(pairKey)).to.equal(-533650); // -224 + 7203 * -266602 / 3600
    expect(await future.cumulativeShortFundingRates(pairKey)).to.equal(1200645); // 436 + 7203 * 599855 / 3600
    expect(await future.lastFundingTimestamps(pairKey)).to.equal(blockTime);
    expect(await future.totalLongSizes(pairKey)).to.equal(
      usdcEthState.totalLongSize.sub(expandDecimals(5, 17))
    );
    expect(await future.tokenBalances(usdc.address)).to.equal(
      usdcEthState.tokenBalance.add(
        -((1125000) / 2) + -(499261715 + 50 * 1e6 - -40006 - 1125000)
      )
    );
    expect(await future.collateralInsuranceFunds(usdc.address)).to.equal(
      usdcEthState.insuranceFund.add(-50 * 1e6 - 40006)
    );
    pos = await future.getPosition(usdc.address, eth.address, user1.address, true);
    expect(pos.margin).to.equal(0);
    expect(pos.openNotional).to.equal(0);
    expect(pos.size).to.equal(0);
    expect(pos.entryFundingRate).to.equal(0);
  });

  it("closeShortPosition", async function () {
    await usdc.transfer(future.address, 500 * 1e6);

    let pairKey = await future.getPairKey(usdc.address, eth.address);
    let blockTime = (await getLatestBlockTime()) + 1;
    let lastFundingTimestamp = await future.lastFundingTimestamps(pairKey);
    let fundingDuration = blockTime - lastFundingTimestamp.toNumber();

    setNextBlockTime(blockTime);
    await future
      .connect(user1)
      .increasePosition(usdc.address, eth.address, user1.address, false, 750 * 1e6);

    expect(await future.longFundingRates(pairKey)).to.equal(-321347);
    expect(await future.shortFundingRates(pairKey)).to.equal(984125);
    expect(await future.cumulativeLongFundingRates(pairKey)).to.equal(-316); // -138 + -321347 * 2 / 3600
    expect(await future.cumulativeShortFundingRates(pairKey)).to.equal(858); // 312 + 984125 * 2 / 3600
    expect(await future.lastFundingTimestamps(pairKey)).to.equal(blockTime);

    usdcEthState.insuranceFund = usdcEthState.insuranceFund.add(73809); // 1000253125 + 73809  = 1000326934;
    usdcEthState.totalShortSize = usdcEthState.totalShortSize.add(expandDecimals(5, 17));
    // tradingFee = 0.001 * 3.5e18/2e18 * 750*1e6 = 1312500
    usdcEthState.tokenBalance = usdcEthState.tokenBalance.add(500 * 1e6 - (1312500) / 2);

    expect(await future.collateralInsuranceFunds(usdc.address)).to.equal(
      usdcEthState.insuranceFund
    );
    expect(await future.tokenBalances(usdc.address)).to.equal(usdcEthState.tokenBalance);
    expect(await future.totalShortSizes(pairKey)).to.equal(usdcEthState.totalShortSize);

    let pos = await future.getPosition(usdc.address, eth.address, user1.address, false);
    let posKey = await future.getPositionKey(usdc.address, eth.address, user1.address, false);

    // fundingFee: 984125 * 750e6 / 1e10 = 73809
    expect(pos.margin).to.equal(498613691); // 500 * 1e6 - 1312500 - 73809 = 498613691
    expect(pos.openNotional).to.equal(750 * 1e6);
    expect(pos.size).to.equal(expandDecimals(5, 17));

    // two hours later
    lastFundingTimestamp = await future.lastFundingTimestamps(pairKey);
    blockTime = lastFundingTimestamp.toNumber() + 7201; // 7203
    await setNextBlockTimeAndMine(blockTime);

    await fastPriceFeed
      .connect(updater0)
      .setPrices(
        [eth.address, usdc.address],
        [expandDecimals(1600, 30), expandDecimals(1, 30)],
        blockTime
      );

    blockTime = (await getLatestBlockTime()) + 1;

    await expect(
      future
        .connect(user1)
        .decreasePosition(
          usdc.address,
          eth.address,
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
        usdc.address,
        eth.address,
        -266579, // longFundingRates
        599803, // shortFundingRates
        -533696, // cumulativeLongFundingRates
        1200963, // cumulativeShortFundingRates
        blockTime // timestamp
      )
      .to.emit(future, "ClosePosition")
      .withArgs(
        posKey,
        usdc.address,
        eth.address,
        user1.address,
        false,
        498613691, // margin delta
        750 * 1e6, // open notional delta
        expandDecimals(5, 17), // size delta
        750 * 1e3, // trading fee,
        90007, // fundingFee: 750 * 1e6 * (1200963 - 858) / 1e10
        -50 * 1e6, // pnl
        expandDecimals(5, 17),
        expandDecimals(1600, 30)
      )
      .to.emit(future, "UpdatePosition")
      .withArgs(
        posKey,
        usdc.address,
        eth.address,
        user1.address,
        false,
        0, // margin
        0, // open notional
        0, // size
        0 // entryFundingRate
      )
      .to.emit(usdc, "Transfer")
      .withArgs(future.address, swap.address, (750 * 1e3) / 2)
      .to.emit(usdc, "Transfer")
      .withArgs(future.address, user1.address, 498613691 - 50 * 1e6 - 90007 - 750 * 1e3);

    expect(await future.totalShortSizes(pairKey)).to.equal(
      usdcEthState.totalShortSize.sub(expandDecimals(5, 17))
    );

    expect(await future.longFundingRates(pairKey)).to.equal(-266579);
    expect(await future.shortFundingRates(pairKey)).to.equal(599803);
    expect(await future.cumulativeLongFundingRates(pairKey)).to.equal(-533696); // -316 + 7203 * -266579 / 3600
    expect(await future.cumulativeShortFundingRates(pairKey)).to.equal(1200963); // 858 + 7203 * 599803 / 3600
    expect(await future.lastFundingTimestamps(pairKey)).to.equal(blockTime);
    expect(await future.collateralInsuranceFunds(usdc.address)).to.equal(
      usdcEthState.insuranceFund.add(50 * 1e6 + 90007)
    );
    expect(await future.tokenBalances(usdc.address)).to.equal(
      usdcEthState.tokenBalance.sub(498613691 - 50 * 1e6 - 90007 - 750 * 1e3 + (750 * 1e3) / 2)
    );

    pos = await future.getPosition(usdc.address, eth.address, user1.address, false);
    expect(pos.margin).to.equal(0);
    expect(pos.openNotional).to.equal(0);
    expect(pos.size).to.equal(0);
    expect(pos.entryFundingRate).to.equal(0);
  });

  it("liquidateLongPosition", async function () {
    await usdc.transfer(future.address, 500 * 1e6);

    let pairKey = await future.getPairKey(usdc.address, eth.address);
    let blockTime = (await getLatestBlockTime()) + 1;
    let lastFundingTimestamp = await future.lastFundingTimestamps(pairKey);
    let fundingDuration = blockTime - lastFundingTimestamp.toNumber(); // 2
    // console.log(
    //   "fundingDuration",
    //   fundingDuration,
    //   await future.collateralInsuranceFunds(usdc.address)
    // );

    setNextBlockTime(blockTime);

    await future
      .connect(user1)
      .increasePosition(usdc.address, eth.address, user1.address, true, 750 * 1e6);

    expect(await future.longFundingRates(pairKey)).to.equal(-156210);
    expect(await future.shortFundingRates(pairKey)).to.equal(224943);
    expect(await future.cumulativeLongFundingRates(pairKey)).to.equal(-224); // -138 + -156210 * 2 / 3600
    expect(await future.cumulativeShortFundingRates(pairKey)).to.equal(436); // 312 + 224943 * 2 / 3600
    expect(await future.lastFundingTimestamps(pairKey)).to.equal(blockTime);

    usdcEthState.insuranceFund = usdcEthState.insuranceFund.add(-11715); // 1000253125 + -11715  = 1000241410;
    usdcEthState.totalLongSize = usdcEthState.totalLongSize.add(expandDecimals(5, 17));
    usdcEthState.tokenBalance = usdcEthState.tokenBalance.add(500 * 1e6 - (750e3) / 2);
    expect(await future.collateralInsuranceFunds(usdc.address)).to.equal(
      usdcEthState.insuranceFund
    );
    expect(await future.totalLongSizes(pairKey)).to.equal(usdcEthState.totalLongSize);
    expect(await future.tokenBalances(usdc.address)).to.equal(usdcEthState.tokenBalance);

    let pos = await future.getPosition(usdc.address, eth.address, user1.address, true);
    let posKey = await future.getPositionKey(usdc.address, eth.address, user1.address, true);

    // fundingFee: -156210 * 750e6 / 1e10 = -11715
    expect(pos.margin).to.equal(499261715); // 500 * 1e6 - 750 * 1e3 - -11715
    expect(pos.openNotional).to.equal(750 * 1e6);
    expect(pos.size).to.equal(expandDecimals(5, 17));

    // two hours later
    lastFundingTimestamp = await future.lastFundingTimestamps(pairKey);
    blockTime = lastFundingTimestamp.toNumber() + 7201; // 7203

    await setNextBlockTimeAndMine(blockTime);
    await fastPriceFeed
      .connect(updater0)
      .setPrices(
        [eth.address, usdc.address],
        [expandDecimals(10, 30), expandDecimals(1, 30)],
        blockTime
      );

    blockTime = (await getLatestBlockTime()) + 1;

    await expect(future.liquidatePosition(usdc.address, eth.address, user1.address, true))
      .to.emit(future, "UpdateFundingRate")
      .withArgs(
        pairKey,
        usdc.address,
        eth.address,
        -1666, // longFundingRates
        3750, // shortFundingRates
        -3333, // cumulativeLongFundingRates
        7500, // cumulativeShortFundingRates
        lastFundingTimestamp.toNumber() + 7200 // timestamp
      )
      .to.emit(future, "LiquidatePosition")
      .withArgs(
        posKey,
        usdc.address,
        eth.address,
        user1.address,
        true,
        pos.margin,
        pos.openNotional,
        pos.size,
        1125000, // trading fee: 0.001 * 3e18/2e18 * 750e6
        -249, // funding fee: (-3557 - -224) * 750 * 1e6 / 1e10
        -745 * 1e6, // pnl
        expandDecimals(1, 30),
        expandDecimals(10, 30)
      )
      .to.emit(future, "UpdatePosition")
      .withArgs(posKey, usdc.address, eth.address, user1.address, true, 0, 0, 0, 0)
      .to.emit(usdc, "Transfer")
      .withArgs(future.address, swap.address, (1125000) / 2);

    expect(await future.longFundingRates(pairKey)).to.equal(-1666);
    expect(await future.shortFundingRates(pairKey)).to.equal(3749);
    expect(await future.cumulativeLongFundingRates(pairKey)).to.equal(-3557); // -224 + 7203 * -1666 / 3600
    expect(await future.cumulativeShortFundingRates(pairKey)).to.equal(7937); // 436 + 7203 * 3749 / 3600
    expect(await future.lastFundingTimestamps(pairKey)).to.equal(blockTime);
    expect(await future.totalLongSizes(pairKey)).to.equal(
      usdcEthState.totalLongSize.sub(expandDecimals(5, 17))
    );
    expect(await future.tokenBalances(usdc.address)).to.equal(
      usdcEthState.tokenBalance.add((-1125000) / 2)
    );
    let leftMargin = 499261715 - 745 * 1e6 - -249 - 1125000;
    let toInsuranceFund = 745 * 1e6 + -249 + leftMargin;
    expect(await future.collateralInsuranceFunds(usdc.address)).to.equal(
      usdcEthState.insuranceFund.add(toInsuranceFund)
    );

    pos = await future.getPosition(usdc.address, eth.address, user1.address, true);
    expect(pos.margin).to.equal(0);
    expect(pos.openNotional).to.equal(0);
    expect(pos.size).to.equal(0);
    expect(pos.entryFundingRate).to.equal(0);
  });

  it("liquidateShortPosition", async function () {
    await usdc.transfer(future.address, 500 * 1e6);

    let pairKey = await future.getPairKey(usdc.address, eth.address);
    let blockTime = (await getLatestBlockTime()) + 1;
    let lastFundingTimestamp = await future.lastFundingTimestamps(pairKey);
    let fundingDuration = blockTime - lastFundingTimestamp.toNumber();


    setNextBlockTime(blockTime);
    await future
      .connect(user1)
      .increasePosition(usdc.address, eth.address, user1.address, false, 750 * 1e6);

    expect(await future.longFundingRates(pairKey)).to.equal(-321347);
    expect(await future.shortFundingRates(pairKey)).to.equal(984125);
    expect(await future.cumulativeLongFundingRates(pairKey)).to.equal(-316); // -138 + -321347 * 2 / 3600
    expect(await future.cumulativeShortFundingRates(pairKey)).to.equal(858); // 312 + 984125 * 2 / 3600
    expect(await future.lastFundingTimestamps(pairKey)).to.equal(blockTime);

    usdcEthState.insuranceFund = usdcEthState.insuranceFund.add(73809); // 1000253125 + 73809  = 1000326934;
    usdcEthState.totalShortSize = usdcEthState.totalShortSize.add(expandDecimals(5, 17));
    // tradingFee = 0.001 * 3.5e18/2e18 * 750*1e6 = 1312500
    usdcEthState.tokenBalance = usdcEthState.tokenBalance.add(500 * 1e6 - (1312500) / 2);

    expect(await future.collateralInsuranceFunds(usdc.address)).to.equal(
      usdcEthState.insuranceFund
    );
    expect(await future.tokenBalances(usdc.address)).to.equal(usdcEthState.tokenBalance);
    expect(await future.totalShortSizes(pairKey)).to.equal(usdcEthState.totalShortSize);

    let pos = await future.getPosition(usdc.address, eth.address, user1.address, false);
    let posKey = await future.getPositionKey(usdc.address, eth.address, user1.address, false);

    // fundingFee: 984125 * 750e6 / 1e10 = 73809
    expect(pos.margin).to.equal(498613691); // 500 * 1e6 - 1312500 - 73809 = 498613691
    expect(pos.openNotional).to.equal(750 * 1e6);
    expect(pos.size).to.equal(expandDecimals(5, 17));

    // two hours later
    lastFundingTimestamp = await future.lastFundingTimestamps(pairKey);
    blockTime = lastFundingTimestamp.toNumber() + 7201; // 7203
    await setNextBlockTimeAndMine(blockTime);

    await fastPriceFeed
      .connect(updater0)
      .setPrices(
        [eth.address, usdc.address],
        [expandDecimals(2500, 30), expandDecimals(1, 30)],
        blockTime
      );

    blockTime = (await getLatestBlockTime()) + 1;

    await expect(future.liquidatePosition(usdc.address, eth.address, user1.address, false))
      .to.emit(future, "UpdateFundingRate")
      .withArgs(
        pairKey,
        usdc.address,
        eth.address,
        -416530, // longFundingRates
        937193, // shortFundingRates
        -833631, // cumulativeLongFundingRates
        1875602, // cumulativeShortFundingRates
        lastFundingTimestamp.toNumber() + 7200 // timestamp
      )
      .to.emit(future, "LiquidatePosition")
      .withArgs(
        posKey,
        usdc.address,
        eth.address,
        user1.address,
        false,
        pos.margin,
        pos.openNotional,
        pos.size,
        750 * 1e3, // trading fee
        140637, // funding fee: (1876024 - 858) * 750 * 1e6 / 1e10
        -500 * 1e6, // pnl
        expandDecimals(1, 30),
        expandDecimals(10, 30)
      )
      .to.emit(future, "UpdatePosition")
      .withArgs(posKey, usdc.address, eth.address, user1.address, false, 0, 0, 0, 0)
      .to.emit(usdc, "Transfer")
      .withArgs(future.address, swap.address, (750 * 1e3) / 2);

    expect(await future.longFundingRates(pairKey)).to.equal(-416530);
    expect(await future.shortFundingRates(pairKey)).to.equal(937193);
    expect(await future.cumulativeLongFundingRates(pairKey)).to.equal(-833723); // -316 + 7203 * -416530 / 3600
    expect(await future.cumulativeShortFundingRates(pairKey)).to.equal(1876024); // 858 + 7203 * 937193 / 3600
    expect(await future.lastFundingTimestamps(pairKey)).to.equal(blockTime);
    expect(await future.totalShortSizes(pairKey)).to.equal(
      usdcEthState.totalShortSize.sub(expandDecimals(5, 17))
    );
    expect(await future.tokenBalances(usdc.address)).to.equal(
      usdcEthState.tokenBalance.add((-750 * 1e3) / 2)
    );
    let leftMargin = 498613691 - 500 * 1e6 - 140637 - 750 * 1e3;
    let toInsuranceFund = 500 * 1e6 + 140637 + leftMargin;
    expect(await future.collateralInsuranceFunds(usdc.address)).to.equal(
      usdcEthState.insuranceFund.add(toInsuranceFund)
    );

    pos = await future.getPosition(usdc.address, eth.address, user1.address, true);
    expect(pos.margin).to.equal(0);
    expect(pos.openNotional).to.equal(0);
    expect(pos.size).to.equal(0);
    expect(pos.entryFundingRate).to.equal(0);
  });
});
