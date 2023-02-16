import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
import {
  FastPriceEvent,
  FastPriceFeed,
  Future,
  FuturePriceFeed,
  FutureReader,
  FutureUtil,
  MockSwap,
  MyERC20,
} from "../../typechain";
import { expandDecimals, getLatestBlockTime } from "../helpers";

describe("Future/FutureReader", async function () {
  let futureReader: FutureReader;
  let future: Future;
  let futureUtil: FutureUtil;
  let swap: MockSwap;

  let futurePriceFeed: FuturePriceFeed;
  let fastPriceFeed: FastPriceFeed;
  let fastPriceEvent: FastPriceEvent;

  let owner: SignerWithAddress;
  let user0: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  let updater0: SignerWithAddress;

  let eth: MyERC20;
  let btc: MyERC20;
  let usdc: MyERC20;
  let dai: MyERC20;

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
        [eth.address, btc.address, usdc.address],
        [expandDecimals(1500, 30), expandDecimals(20000, 30), expandDecimals(1, 30)],
        blockTime
      );
    await future.listPair(usdc.address, eth.address);
    await future.listPair(usdc.address, btc.address);

    let insuranceFund = expandDecimals(1, 18);
    await eth.transfer(future.address, insuranceFund);
    await future.increaseInsuranceFund(eth.address);
    expect(await future.collateralInsuranceFunds(eth.address)).to.equal(insuranceFund);

    // max leverage: 10x; maxOpenNotional: 3000 * 10
    await future.setMaxLeverage(usdc.address, eth.address, 3000, 10e9);
    // minMaintanenceMarginRatio: 0.5%， maxMaintanenceMarginRatio: 5%
    await future.setMarginRatio(usdc.address, eth.address, 5e6, 5e7);
    // feeRate: 0.1%, protocolFeeRate: 50% * 0.1%
    await future.setTradingFeeRate(usdc.address, eth.address, 1e6, 5e8);

    // max leverage: 10x; maxOpenNotional: 3000 * 10
    await future.setMaxLeverage(usdc.address, btc.address, 3000, 10e9);
    // minMaintanenceMarginRatio: 0.5%， maxMaintanenceMarginRatio: 5%
    await future.setMarginRatio(usdc.address, btc.address, 5e6, 5e7);
    // feeRate: 0.1%, protocolFeeRate: 50% * 0.1%
    await future.setTradingFeeRate(usdc.address, btc.address, 1e6, 5e8);

    // todo change it to collateral based
    swap = await (await ethers.getContractFactory("MockSwap")).deploy();
    await future.setSwapPool(swap.address);

    futureReader = await (await ethers.getContractFactory("FutureReader")).deploy(future.address);
    await futureReader.setPairs([usdc.address, usdc.address], [eth.address, btc.address]);
  });

  it("setPairs", async function () {
    await expect(
      futureReader.connect(user0).setPairs([usdc.address, usdc.address], [eth.address, btc.address])
    ).to.be.revertedWith("Ownable: caller is not the owner");
    await futureReader.setPairs([usdc.address, usdc.address], [eth.address, btc.address]);
    const pairs = await futureReader.getPairs();
    expect(pairs.collTokens).to.eql([usdc.address, usdc.address]);
    expect(pairs.idxTokens).to.eql([eth.address, btc.address]);

    const pairs2 = await futureReader.getPairs2();
    const posRes = await futureReader.getPositionList2(owner.address);
  });
});
