import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers, userConfig } from "hardhat";
import { ETH_ADDRESS } from "zksync-web3/build/src/utils";
import {
  FastPriceEvent,
  FastPriceFeed,
  Future,
  FuturePriceFeed,
  FutureUtil,
  MockSwap,
  MyERC20,
  TradeStake,
  TradeStakeUpdater,
} from "../../typechain";
import { expandDecimals, getLatestBlockTime } from "../helpers";

describe("Future/ValidateOperation", async function () {
  let futureUtil: FutureUtil;
  let future: Future;
  let swap: MockSwap;
  let tradeStakeUpdater: TradeStakeUpdater;
  let tradeStake: TradeStake;

  let futurePriceFeed: FuturePriceFeed;
  let fastPriceFeed: FastPriceFeed;
  let fastPriceEvent: FastPriceEvent;

  let eth: MyERC20;
  let btc: MyERC20;
  let usdc: MyERC20;
  let dai: MyERC20;
  let osd: MyERC20;
  let ot: MyERC20;


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
    usdc = await (await ethers.getContractFactory("MyERC20")).deploy("usdc", "usdc", 6);
    dai = await (await ethers.getContractFactory("MyERC20")).deploy("dai", "dai", 18);
    osd = await (await ethers.getContractFactory("MyERC20")).deploy("osd", "osd", 18);
    ot = await (await ethers.getContractFactory("MyERC20")).deploy("ot", "ot", 18);


    let blockTime = await getLatestBlockTime();
    await fastPriceFeed
      .connect(updater0)
      .setPrices(
        [eth.address, usdc.address],
        [expandDecimals(1500, 30), expandDecimals(1, 30)],
        blockTime
      );
    await future.listPair(usdc.address, eth.address);

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

    swap = await (await ethers.getContractFactory("MockSwap")).deploy();
    await future.setSwapPool(swap.address);


    tradeStake = await (await ethers.getContractFactory("TradeStake")).deploy();
    tradeStakeUpdater = await (await ethers.getContractFactory("TradeStakeUpdater")).deploy(
      swap.address,
      swap.address,
      swap.address,
      future.address,
      tradeStake.address
    );
    // setup tradeStake
    await tradeStake.setUpdater(tradeStakeUpdater.address, true)
    await tradeStake.setRewardPerUnit(10000000);
    await tradeStake.setMinter(ot.address);
    // setup ot minter

    await ot.setMinter(tradeStake.address, true)
    tradeStakeUpdater.setCaller(owner.address, true)

  });

  it("validateIncreaseLongPosition", async function () {
    // usdc.transfer(future.address, 1000 * 1e6);

    await expect(
      future
        .connect(user1)
        .increasePosition(user0.address, usdc.address, eth.address, true, 10000 * 1e6)
    ).to.be.revertedWith("invalid_router");

    await expect(
      future
        .connect(user0)
        .increasePosition(usdc.address, eth.address, user0.address, true, 10000 * 1e6)
    ).to.be.revertedWith("insuff_margin");

    await usdc.transfer(future.address, 1000 * 1e6);
    await expect(
      future
        .connect(user0)
        .increasePosition(usdc.address, eth.address, user0.address, true, 100000 * 1e6)
    ).to.be.revertedWith("exceed_leverage");
    let posKey = await future.getPositionKey(usdc.address, eth.address, user0.address, true);
    await tradeStakeUpdater.increasePosition(usdc.address, eth.address, user0.address, true, 9900 * 1e6)
    await expect(
      future
        .connect(user0)
        .increasePosition(usdc.address, eth.address, user0.address, true, 9900 * 1e6)
    )
      .to.emit(future, "IncreasePosition")
      .withArgs(
        posKey,
        usdc.address,
        eth.address,
        user0.address,
        true, // isLong
        1000 * 1e6, // marginDelta
        9900 * 1e6, // notionalDelta
        "6600000000000000000", // sizeDelta
        9900000, // tradingFee
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
        "990100000", // margin
        9900 * 1e6, // open notional
        "6600000000000000000", // size
        0 // entryFundingRate
      )
      .to.emit(usdc, "Transfer")
      .withArgs(future.address, swap.address, 4950000); // tradingFee to swap pool

    // let pos = await future.getPosition(usdc.address, eth.address, user0.address, true);
    // let pairKey = await future.getPairKey(usdc.address, eth.address);
    // // (1000 - 9900 * 0.001) * 1e6 = 990.1 * 1e6
    // expect(pos.margin).to.equal("990100000");
    // // 9900 / 1500 * 1e18 = 6.6 * 1e18
    // expect(pos.size).to.equal("6600000000000000000");
    // expect(pos.openNotional).to.equal(9900 * 1e6);
    // expect(pos.entryFundingRate).to.equal(0); // first hour no funding fee
    // expect(await future.totalLongSizes(pairKey)).to.equal("6600000000000000000");
    // expect(await future.totalLongOpenNotionals(pairKey)).to.equal(9900 * 1e6);
    // expect(await future.protocolUnrealizedFees(pairKey)).to.equal(4950000); // tradingFee to protocol
    // expect(await future.tokenBalances(usdc.address)).to.equal(1995050000); // insuranceFund + margin + protocolFees

    // // position which should liquidate cannot increase
    // let blockTime = await getLatestBlockTime();
    // await fastPriceFeed
    //   .connect(updater0)
    //   .setPrices(
    //     [eth.address, usdc.address],
    //     [expandDecimals(500, 30), expandDecimals(1, 30)],
    //     blockTime
    //   );
    // await usdc.transfer(future.address, 6000 * 1e6);
    // await expect(
    //   future
    //     .connect(user0)
    //     .increasePosition(usdc.address, eth.address, user0.address, true, 1 * 1e6)
    // ).to.be.revertedWith("should_liquidate");
  });

  it("validateIncreaseShortPosition", async function () {
    await expect(
      future
        .connect(user1)
        .increasePosition(user0.address, usdc.address, eth.address, false, 10000 * 1e6)
    ).to.be.revertedWith("invalid_router");

    await expect(
      future
        .connect(user0)
        .increasePosition(usdc.address, eth.address, user0.address, false, 10000 * 1e6)
    ).to.be.revertedWith("insuff_margin");

    await usdc.transfer(future.address, 1000 * 1e6);
    await expect(
      future
        .connect(user0)
        .increasePosition(usdc.address, eth.address, user0.address, false, 100000 * 1e6)
    ).to.be.revertedWith("exceed_leverage");
    let posKey = await future.getPositionKey(usdc.address, eth.address, user0.address, false);
    await expect(
      future
        .connect(user0)
        .increasePosition(usdc.address, eth.address, user0.address, false, 9900 * 1e6)
    )
      .to.emit(future, "IncreasePosition")
      .withArgs(
        posKey,
        usdc.address,
        eth.address,
        user0.address,
        false, // isLong
        1000 * 1e6, // marginDelta
        9900 * 1e6, // notionalDelta
        "6600000000000000000", // sizeDelta
        9900000, // tradingFee
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
        false,
        "990100000", // margin
        9900 * 1e6, // open notional
        "6600000000000000000", // size
        0 // entryFundingRate
      )
      .to.emit(usdc, "Transfer")
      .withArgs(future.address, swap.address, 4950000); // tradingFee to swap pool

    let pos = await future.getPosition(usdc.address, eth.address, user0.address, false);
    let pairKey = await future.getPairKey(usdc.address, eth.address);
    // (1000 - 9900 * 0.001) * 1e6 = 990.1 * 1e6
    expect(pos.margin).to.equal("990100000");
    // 9900 / 1500 * 1e18 = 6.6 * 1e18
    expect(pos.size).to.equal("6600000000000000000");
    expect(pos.openNotional).to.equal(9900 * 1e6);
    expect(pos.entryFundingRate).to.equal(0); // first hour no funding fee
    expect(await future.totalShortSizes(pairKey)).to.equal("6600000000000000000");
    expect(await future.totalShortOpenNotionals(pairKey)).to.equal(9900 * 1e6);
    expect(await future.protocolUnrealizedFees(pairKey)).to.equal(4950000); // tradingFee to protocol
    expect(await future.tokenBalances(usdc.address)).to.equal(1995050000); // insuranceFund + margin + protocolFees

    // position which should liquidate cannot increase
    let blockTime = await getLatestBlockTime();
    await fastPriceFeed
      .connect(updater0)
      .setPrices(
        [eth.address, usdc.address],
        [expandDecimals(4500, 30), expandDecimals(1, 30)],
        blockTime
      );
    await usdc.transfer(future.address, 6000 * 1e6);
    await expect(
      future
        .connect(user0)
        .increasePosition(usdc.address, eth.address, user0.address, false, 1 * 1e6)
    ).to.be.revertedWith("should_liquidate");
  });

  it("validateDecreaseLongPosition", async function () {
    await expect(
      future
        .connect(user1)
        .decreasePosition(
          usdc.address,
          eth.address,
          user0.address,
          true,
          100 * 1e6,
          1000 * 1e6,
          user0.address
        )
    ).to.be.revertedWith("invalid_router");

    await expect(
      future
        .connect(user0)
        .decreasePosition(
          dai.address,
          eth.address,
          user0.address,
          true,
          100 * 1e6,
          1000 * 1e6,
          user0.address
        )
    ).to.be.revertedWith("pair_unlist");

    await expect(
      future
        .connect(user0)
        .decreasePosition(
          usdc.address,
          eth.address,
          user0.address,
          true,
          100 * 1e6,
          1000 * 1e6,
          user0.address
        )
    ).to.be.revertedWith("position_not_exist");

    let posKey = await future.getPositionKey(usdc.address, eth.address, user0.address, true);

    await usdc.transfer(future.address, 1000 * 1e6);
    await future
      .connect(user0)
      .increasePosition(usdc.address, eth.address, user0.address, true, 9900 * 1e6);
    let pos = await future.getPosition(usdc.address, eth.address, user0.address, true);
    let pairKey = await future.getPairKey(usdc.address, eth.address);
    // (1000 - 9900 * 0.001) * 1e6 = 990.1 * 1e6
    expect(pos.margin).to.equal("990100000");
    // 9900 / 1500 * 1e18 = 6.6 * 1e18
    expect(pos.size).to.equal("6600000000000000000");
    expect(pos.openNotional).to.equal(9900 * 1e6);
    expect(pos.entryFundingRate).to.equal(0); // first hour no funding fee
    expect(await future.totalLongSizes(pairKey)).to.equal("6600000000000000000");
    expect(await future.totalLongOpenNotionals(pairKey)).to.equal(9900 * 1e6);
    expect(await future.protocolUnrealizedFees(pairKey)).to.equal(4950000); // tradingFee to protocol
    expect(await future.tokenBalances(usdc.address)).to.equal(1995050000); // insuranceFund + margin + protocolFees

    await expect(
      future
        .connect(user0)
        .decreasePosition(
          usdc.address,
          eth.address,
          user0.address,
          true,
          100 * 1e6,
          9901 * 1e6,
          user0.address
        )
    ).to.be.revertedWith("decrease_size_exceed");

    let blockTime = await getLatestBlockTime();
    await fastPriceFeed
      .connect(updater0)
      .setPrices(
        [eth.address, usdc.address],
        [expandDecimals(500, 30), expandDecimals(1, 30)],
        blockTime
      );

    await expect(
      future
        .connect(user0)
        .decreasePosition(
          usdc.address,
          eth.address,
          user0.address,
          true,
          100 * 1e6,
          9000 * 1e6,
          user0.address
        )
    ).to.be.revertedWith("should_liquidate");

    blockTime = await getLatestBlockTime();
    await fastPriceFeed
      .connect(updater0)
      .setPrices(
        [eth.address, usdc.address],
        [expandDecimals(1500, 30), expandDecimals(1, 30)],
        blockTime
      );

    await expect(
      future
        .connect(user0)
        .decreasePosition(
          usdc.address,
          eth.address,
          user0.address,
          true,
          100 * 1e6,
          9000 * 1e6,
          user0.address
        )
    ).to.be.emit(future, "DecreasePosition");
  });

  it("validateDecreaseShortPosition", async function () {
    await expect(
      future
        .connect(user1)
        .decreasePosition(
          usdc.address,
          eth.address,
          user0.address,
          false,
          100 * 1e6,
          1000 * 1e6,
          user0.address
        )
    ).to.be.revertedWith("invalid_router");

    await expect(
      future
        .connect(user0)
        .decreasePosition(
          dai.address,
          eth.address,
          user0.address,
          false,
          100 * 1e6,
          1000 * 1e6,
          user0.address
        )
    ).to.be.revertedWith("pair_unlist");

    await expect(
      future
        .connect(user0)
        .decreasePosition(
          usdc.address,
          eth.address,
          user0.address,
          false,
          100 * 1e6,
          1000 * 1e6,
          user0.address
        )
    ).to.be.revertedWith("position_not_exist");

    await usdc.transfer(future.address, 1000 * 1e6);
    await future
      .connect(user0)
      .increasePosition(usdc.address, eth.address, user0.address, false, 9900 * 1e6);
    let pos = await future.getPosition(usdc.address, eth.address, user0.address, false);
    let pairKey = await future.getPairKey(usdc.address, eth.address);
    // (1000 - 9900 * 0.001) * 1e6 = 990.1 * 1e6
    expect(pos.margin).to.equal("990100000");
    // 9900 / 1500 * 1e18 = 6.6 * 1e18
    expect(pos.size).to.equal("6600000000000000000");
    expect(pos.openNotional).to.equal(9900 * 1e6);
    expect(pos.entryFundingRate).to.equal(0); // first hour no funding fee
    expect(await future.totalShortSizes(pairKey)).to.equal("6600000000000000000");
    expect(await future.totalShortOpenNotionals(pairKey)).to.equal(9900 * 1e6);
    expect(await future.protocolUnrealizedFees(pairKey)).to.equal(4950000); // tradingFee to protocol
    expect(await future.tokenBalances(usdc.address)).to.equal(1995050000); // insuranceFund + margin + protocolFees

    await expect(
      future
        .connect(user0)
        .decreasePosition(
          usdc.address,
          eth.address,
          user0.address,
          false,
          100 * 1e6,
          9901 * 1e6,
          user0.address
        )
    ).to.be.revertedWith("decrease_size_exceed");

    let blockTime = await getLatestBlockTime();
    await fastPriceFeed
      .connect(updater0)
      .setPrices(
        [eth.address, usdc.address],
        [expandDecimals(1500, 30), expandDecimals(1, 29)],
        blockTime
      );

    await expect(
      future
        .connect(user0)
        .decreasePosition(
          usdc.address,
          eth.address,
          user0.address,
          false,
          100 * 1e6,
          9000 * 1e6,
          user0.address
        )
    ).to.be.revertedWith("should_liquidate");

    blockTime = await getLatestBlockTime();
    await fastPriceFeed
      .connect(updater0)
      .setPrices(
        [eth.address, usdc.address],
        [expandDecimals(1500, 30), expandDecimals(1, 30)],
        blockTime
      );

    await tradeStakeUpdater.decreasePosition(usdc.address,
      eth.address,
      user0.address,
      false,
      100 * 1e6,
      9000 * 1e6,
      user0.address)
    await expect(
      future
        .connect(user0)
        .decreasePosition(
          usdc.address,
          eth.address,
          user0.address,
          false,
          100 * 1e6,
          9000 * 1e6,
          user0.address
        )
    ).to.be.emit(future, "DecreasePosition");
  });

  it("validateIncrease/DecreaseMargin", async function () {
    await expect(
      future.connect(user1).increaseMargin(usdc.address, eth.address, user0.address, true)
    ).to.be.revertedWith("invalid_router");

    await expect(
      future.connect(user0).increaseMargin(usdc.address, eth.address, user0.address, true)
    ).to.be.revertedWith("position_not_exist");

    await usdc.transfer(future.address, 1000 * 1e6);
    await future
      .connect(user0)
      .increasePosition(usdc.address, eth.address, user0.address, true, 9900 * 1e6);
    let pos = await future.getPosition(usdc.address, eth.address, user0.address, true);
    let posMargin = pos.margin;

    let blockTime = await getLatestBlockTime();
    await fastPriceFeed
      .connect(updater0)
      .setPrices([eth.address], [expandDecimals(50, 30)], blockTime);

    await usdc.transfer(future.address, 1 * 1e6);

    await expect(
      future.connect(user0).increaseMargin(usdc.address, eth.address, user0.address, true)
    ).to.be.revertedWith("should_liquidate");

    blockTime = await getLatestBlockTime();
    await fastPriceFeed
      .connect(updater0)
      .setPrices([eth.address], [expandDecimals(1500, 30)], blockTime);
    await future.connect(user0).increaseMargin(usdc.address, eth.address, user0.address, true);
    await future.getPosition(usdc.address, eth.address, user0.address, true);

    pos = await future.getPosition(usdc.address, eth.address, user0.address, true);
    expect(posMargin.add(1 * 1e6)).to.equal(pos.margin);
    posMargin = pos.margin;

    // decrease margin
    await expect(
      future
        .connect(user1)
        .decreaseMargin(usdc.address, eth.address, user0.address, true, 1e6, user1.address)
    ).to.be.revertedWith("invalid_router");

    await expect(
      future
        .connect(user1)
        .decreaseMargin(usdc.address, eth.address, user1.address, true, 1e6, user1.address)
    ).to.be.revertedWith("position_not_exist");

    await expect(
      future
        .connect(user0)
        .decreaseMargin(usdc.address, eth.address, user0.address, true, 10000 * 1e6, user0.address)
    ).to.be.revertedWith("margin_delta_exceed");

    blockTime = await getLatestBlockTime();
    await fastPriceFeed
      .connect(updater0)
      .setPrices([eth.address], [expandDecimals(50, 30)], blockTime);

    await expect(
      future
        .connect(user0)
        .decreaseMargin(usdc.address, eth.address, user0.address, true, 1 * 1e6, user0.address)
    ).to.be.revertedWith("should_liquidate");

    blockTime = await getLatestBlockTime();
    await fastPriceFeed
      .connect(updater0)
      .setPrices([eth.address], [expandDecimals(1500, 30)], blockTime);

    await expect(
      future
        .connect(user0)
        .decreaseMargin(usdc.address, eth.address, user0.address, true, 990 * 1e6, user0.address)
    ).to.be.revertedWith("should_liquidate");

    await future
      .connect(user0)
      .decreaseMargin(usdc.address, eth.address, user0.address, true, 1 * 1e6, user0.address);
    pos = await future.getPosition(usdc.address, eth.address, user0.address, true);
    expect(posMargin.sub(1 * 1e6)).to.equal(pos.margin);
    expect(await usdc.balanceOf(user0.address)).to.equal(1e6);
  });

  it("validateLiquidatePosition", async function () {
    await expect(
      future.liquidatePosition(usdc.address, eth.address, user0.address, true)
    ).to.be.revertedWith("position_not_exist");

    await usdc.transfer(future.address, 1000 * 1e6);
    await future
      .connect(user0)
      .increasePosition(usdc.address, eth.address, user0.address, true, 9900 * 1e6);

    await expect(
      future.liquidatePosition(usdc.address, eth.address, user0.address, true)
    ).to.be.revertedWith("position_cannot_liquidate");

    let blockTime = await getLatestBlockTime();
    await fastPriceFeed
      .connect(updater0)
      .setPrices([eth.address], [expandDecimals(700, 30)], blockTime);

    await tradeStakeUpdater.liquidatePosition(usdc.address, eth.address, user0.address, true);
    await future.liquidatePosition(usdc.address, eth.address, user0.address, true);
  });

  it("validateMaxTotalSize", async function () {
    // no restrict
    await usdc.transfer(future.address, 1000 * 1e6);
    await future
      .connect(user0)
      .increasePosition(usdc.address, eth.address, user0.address, true, 9900 * 1e6);

    await usdc.transfer(future.address, 1000 * 1e6);
    await future
      .connect(user0)
      .increasePosition(usdc.address, eth.address, user0.address, false, 9900 * 1e6);

    // restrict
    await future.setMaxTotalSize(usdc.address, eth.address, 300, 400);

    await usdc.transfer(future.address, 1000 * 1e6);
    await expect(
      future
        .connect(user0)
        .increasePosition(usdc.address, eth.address, user0.address, true, 100 * 1e6)
    ).to.be.revertedWith("total_size_exceed");
    await expect(
      future
        .connect(user0)
        .increasePosition(usdc.address, eth.address, user0.address, false, 100 * 1e6)
    ).to.be.revertedWith("total_size_exceed");

    // 1000 * 1e6
    await future.increaseInsuranceFund(usdc.address);

    // can decrease position
    await tradeStakeUpdater.decreasePosition(
      usdc.address,
      eth.address,
      user0.address,
      true,
      10 * 1e6,
      1000 * 1e6,
      user0.address
    )
    await future
      .connect(user0)
      .decreasePosition(
        usdc.address,
        eth.address,
        user0.address,
        true,
        10 * 1e6,
        1000 * 1e6,
        user0.address
      );
    await future
      .connect(user0)
      .decreasePosition(
        usdc.address,
        eth.address,
        user0.address,
        false,
        10 * 1e6,
        1000 * 1e6,
        user0.address
      );
  });
});
