import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers, network } from "hardhat";
import { FastPriceEvents, FastPriceFeed, MyERC20 } from "../../typechain";
import {
  expandDecimals,
  getExpandedPrice,
  getLatestBlockNumber,
  getLatestBlockTime,
  getPriceBitArray,
  getPriceBits,
  hardhatMine,
  mineBlock,
} from "../helpers";

describe("FastPriceFeed", function () {
  let fastPriceFeed: FastPriceFeed;
  let fastPriceEvent: FastPriceEvents;

  let eth: MyERC20;
  let btc: MyERC20;
  let dai: MyERC20;
  let usdc: MyERC20;

  let owner: SignerWithAddress;
  let user0: SignerWithAddress;
  let user1: SignerWithAddress;
  let updater0: SignerWithAddress;
  let updater1: SignerWithAddress;
  let updater2: SignerWithAddress;

  const minBlockInterval = 2; // 2 blocks, if block not timed out, can't update
  const priceDuration = 5 * 60; // 300 seconds, if price timed out, not used;
  const maxDeviationBasisPoints = 250; // 250 / 10000 = 2.5% , if price in this deviation, price used, otherwise, not used;

  before(async function () {
    [owner, user0, user1, updater0, updater1, updater2] = await ethers.getSigners();
  });

  beforeEach(async function () {
    fastPriceEvent = await (await ethers.getContractFactory("FastPriceEvent")).deploy();
    fastPriceFeed = await (
      await ethers.getContractFactory("FastPriceFeed")
    ).deploy(priceDuration, minBlockInterval, maxDeviationBasisPoints, fastPriceEvent.address);

    eth = await (await ethers.getContractFactory("MyERC20")).deploy("eth", "eth", 18);
    btc = await (await ethers.getContractFactory("MyERC20")).deploy("btc", "btc", 8);
    dai = await (await ethers.getContractFactory("MyERC20")).deploy("dai", "dai", 18);
    usdc = await (await ethers.getContractFactory("MyERC20")).deploy("usdc", "usdc", 6);

    await fastPriceFeed.setUpdater(updater0.address, true);
    await fastPriceFeed.setUpdater(updater1.address, true);
    await fastPriceEvent.setIsPriceFeed(fastPriceFeed.address, true);
  });

  it("inits", async () => {
    expect(await fastPriceFeed.owner()).eq(owner.address);
    expect(await fastPriceFeed.priceDuration()).eq(priceDuration);
    expect(await fastPriceFeed.minBlockInterval()).eq(minBlockInterval);
    expect(await fastPriceFeed.maxDeviationBasisPoints()).eq(maxDeviationBasisPoints);
    expect(await fastPriceFeed.isUpdater(owner.address)).eq(false);
    expect(await fastPriceFeed.isUpdater(updater0.address)).eq(true);
    expect(await fastPriceFeed.isUpdater(updater1.address)).eq(true);
    expect(await fastPriceFeed.isUpdater(updater2.address)).eq(false);
  });

  it("setUpdater", async () => {
    await expect(fastPriceFeed.connect(user0).setUpdater(user0.address, true)).to.be.revertedWith(
      "Ownable: caller is not the owner"
    );
    await fastPriceFeed.transferOwnership(user0.address);

    // expect(await fastPriceFeed.isUpdater(updater0.address)).eq(true);
    // await fastPriceFeed.connect(user0).setUpdater(updater0.address, false);
    // expect(await fastPriceFeed.isUpdater(updater0.address)).eq(false);

    expect(await fastPriceFeed.isUpdater(updater2.address)).eq(false);
    await fastPriceFeed.connect(user0).setUpdater(updater2.address, true);
    expect(await fastPriceFeed.isUpdater(updater2.address)).eq(true);
  });

  it("setFastPriceEvents", async () => {
    await expect(fastPriceFeed.connect(user0).setFastPriceEvents(user1.address)).to.be.revertedWith(
      "Ownable: caller is not the owner"
    );
    await fastPriceFeed.transferOwnership(user0.address);
    expect(await fastPriceFeed.fastPriceEvent()).eq(fastPriceEvent.address);
    await fastPriceFeed.connect(user0).setFastPriceEvents(user1.address);
    expect(await fastPriceFeed.fastPriceEvent()).eq(user1.address);
  });

  it("setPriceDuration", async () => {
    await expect(fastPriceFeed.connect(user0).setPriceDuration(30 * 60)).to.be.revertedWith(
      "Ownable: caller is not the owner"
    );

    await fastPriceFeed.transferOwnership(user0.address);

    await expect(fastPriceFeed.connect(user0).setPriceDuration(31 * 60)).to.be.revertedWith(
      "invalid_price_duration"
    );

    expect(await fastPriceFeed.priceDuration()).eq(5 * 60);
    await fastPriceFeed.connect(user0).setPriceDuration(30 * 60);
    expect(await fastPriceFeed.priceDuration()).eq(30 * 60);
  });

  it("setMinBlockInterval", async () => {
    await expect(fastPriceFeed.connect(user0).setMinBlockInterval(10)).to.be.revertedWith(
      "Ownable: caller is not the owner"
    );

    await fastPriceFeed.transferOwnership(user0.address);

    expect(await fastPriceFeed.minBlockInterval()).eq(minBlockInterval);
    await fastPriceFeed.connect(user0).setMinBlockInterval(10);
    expect(await fastPriceFeed.minBlockInterval()).eq(10);
  });

  it("setMaxTimeDeviation", async () => {
    await expect(fastPriceFeed.connect(user0).setMaxTimeDeviation(1000)).to.be.revertedWith(
      "Ownable: caller is not the owner"
    );

    await fastPriceFeed.transferOwnership(user0.address);

    expect(await fastPriceFeed.maxTimeDeviation()).eq(0);
    await fastPriceFeed.connect(user0).setMaxTimeDeviation(1000);
    expect(await fastPriceFeed.maxTimeDeviation()).eq(1000);
  });

  it("setLastUpdatedAt", async () => {
    await expect(fastPriceFeed.connect(user0).setLastUpdatedAt(700)).to.be.revertedWith(
      "Ownable: caller is not the owner"
    );

    await fastPriceFeed.transferOwnership(user0.address);

    expect(await fastPriceFeed.lastUpdatedAt()).eq(0);
    await fastPriceFeed.connect(user0).setLastUpdatedAt(700);
    expect(await fastPriceFeed.lastUpdatedAt()).eq(700);
  });

  it("setMaxDeviationBasisPoints", async () => {
    await expect(fastPriceFeed.connect(user0).setMaxDeviationBasisPoints(100)).revertedWith(
      "Ownable: caller is not the owner"
    );

    await fastPriceFeed.transferOwnership(user0.address);

    expect(await fastPriceFeed.maxDeviationBasisPoints()).eq(maxDeviationBasisPoints);
    await fastPriceFeed.connect(user0).setMaxDeviationBasisPoints(100);
    expect(await fastPriceFeed.maxDeviationBasisPoints()).eq(100);
  });

  it("setPrices", async () => {
    let blockTime = await getLatestBlockTime();
    await expect(
      fastPriceFeed
        .connect(owner)
        .setPrices(
          [btc.address, eth.address, dai.address, usdc.address],
          [
            expandDecimals(20_000, 30),
            expandDecimals(1_500, 30),
            expandDecimals(99, 30 - 2),
            expandDecimals(1001, 30 - 3),
          ],
          blockTime + 100
        )
    ).to.be.revertedWith("fast_price_feed_forbideen");

    expect(await fastPriceFeed.lastUpdatedAt()).eq(0);
    expect(await fastPriceFeed.lastUpdatedBlock()).eq(0);

    await expect(
      fastPriceFeed
        .connect(updater0)
        .setPrices(
          [btc.address, eth.address, dai.address, usdc.address],
          [
            expandDecimals(20_000, 30),
            expandDecimals(1_500, 30),
            expandDecimals(99, 30 - 2),
            expandDecimals(1001, 30 - 3),
          ],
          blockTime + 100
        )
    ).to.be.revertedWith("max_time_deviation");

    await fastPriceFeed.setMaxTimeDeviation(200);
    await expect(
      fastPriceFeed
        .connect(updater0)
        .setPrices(
          [btc.address, eth.address, dai.address, usdc.address],
          [
            expandDecimals(20_000, 30),
            expandDecimals(1_500, 30),
            expandDecimals(99, 30 - 2),
            expandDecimals(1001, 30 - 3),
          ],
          blockTime + 100
        )
    )
      .to.emit(fastPriceEvent, "PriceUpdate")
      .withArgs(btc.address, expandDecimals(20_000, 30), blockTime + 100, fastPriceFeed.address)
      .to.emit(fastPriceEvent, "PriceUpdate")
      .withArgs(eth.address, expandDecimals(1_500, 30), blockTime + 100, fastPriceFeed.address);
    const blockNumber0 = await getLatestBlockNumber();
    expect(await fastPriceFeed.lastUpdatedBlock()).eq(blockNumber0);

    expect(await fastPriceFeed.prices(btc.address)).eq(expandDecimals(20_000, 30));
    expect(await fastPriceFeed.prices(eth.address)).eq(expandDecimals(1_500, 30));
    expect(await fastPriceFeed.prices(dai.address)).eq(expandDecimals(99, 30 - 2));
    expect(await fastPriceFeed.prices(usdc.address)).eq(expandDecimals(1001, 30 - 3));

    expect(await fastPriceFeed.lastUpdatedAt()).eq(blockTime + 100);

    await expect(
      fastPriceFeed
        .connect(updater0)
        .setPrices(
          [btc.address, eth.address, dai.address, usdc.address],
          [
            expandDecimals(20_000, 30),
            expandDecimals(1_500, 30),
            expandDecimals(99, 30 - 2),
            expandDecimals(1001, 30 - 3),
          ],
          blockTime + 100
        )
    ).to.be.revertedWith("min_block_interval");
    const blockNumber1 = await getLatestBlockNumber();
    expect(blockNumber1 - blockNumber0).eq(1);
    await mineBlock();

    await fastPriceFeed
      .connect(updater1)
      .setPrices(
        [btc.address, eth.address, dai.address, usdc.address],
        [
          expandDecimals(20_000, 30),
          expandDecimals(1_500, 30),
          expandDecimals(99, 30 - 2),
          expandDecimals(1001, 30 - 3),
        ],
        blockTime + 100
      );
    expect(await fastPriceFeed.lastUpdatedBlock()).eq(blockNumber0 + 3);
  });

  it("getPrices", async () => {
    let blockTime = await getLatestBlockTime();
    await fastPriceFeed.setMaxTimeDeviation(1000);

    expect(await fastPriceFeed.getPrice(btc.address, 20000)).eq(20000);
    await fastPriceFeed.connect(updater0).setPrices([btc.address], [20000], blockTime);

    // 19514 * (10000 + 250) / 10000 = 20001
    expect(await fastPriceFeed.getPrice(btc.address, 19514)).eq(20000);
    // 19513 * (10000 + 250) / 10000 = 20000
    expect(await fastPriceFeed.getPrice(btc.address, 19513)).eq(20000);
    // 19512 * (10000 + 250) / 10000 = 19999
    expect(await fastPriceFeed.getPrice(btc.address, 19512)).eq(19512);

    // 20514 * (10000 - 250) / 10000 = 20001
    expect(await fastPriceFeed.getPrice(btc.address, 20514)).eq(20514);
    // 20513 * (10000 - 250) / 10000 = 20000
    expect(await fastPriceFeed.getPrice(btc.address, 20513)).eq(20000);
    // 20512 * (10000 - 250) / 10000 = 19999
    expect(await fastPriceFeed.getPrice(btc.address, 20513)).eq(20000);

    expect(await fastPriceFeed.getPrice(btc.address, 0)).eq(20000);
  });

  it("setTokens", async () => {
    const token1 = await (
      await ethers.getContractFactory("MyERC20")
    ).deploy("token1", "token1", 18);
    const token2 = await (await ethers.getContractFactory("MyERC20")).deploy("token2", "token2", 6);

    await expect(
      fastPriceFeed.connect(user0).setTokens([token1.address, token2.address], [100, 1000])
    ).to.be.revertedWith("Ownable: caller is not the owner");
    await fastPriceFeed.transferOwnership(user0.address);

    await expect(
      fastPriceFeed.connect(user0).setTokens([token1.address, token2.address], [100])
    ).to.be.revertedWith("invalid_length");

    await fastPriceFeed.connect(user0).setTokens([token1.address, token2.address], [100, 1000]);

    expect(await fastPriceFeed.tokens(0)).eq(token1.address);
    expect(await fastPriceFeed.tokens(1)).eq(token2.address);
    expect(await fastPriceFeed.tokenPrecisions(0)).eq(100);
    expect(await fastPriceFeed.tokenPrecisions(1)).eq(1000);
  });

  it("setCompactedPrices", async () => {
    const price1 = "2009991111";
    const price2 = "1004445555";
    const price3 = "123";
    const price4 = "4567";
    const price5 = "891011";
    const price6 = "1213141516";
    const price7 = "234";
    const price8 = "5678";
    const price9 = "910910";
    const price10 = "10";

    const token1 = await (await ethers.getContractFactory("MyERC20")).deploy("token", "token", 18);
    const token2 = await (await ethers.getContractFactory("MyERC20")).deploy("token", "token", 18);
    const token3 = await (await ethers.getContractFactory("MyERC20")).deploy("token", "token", 18);
    const token4 = await (await ethers.getContractFactory("MyERC20")).deploy("token", "token", 18);
    const token5 = await (await ethers.getContractFactory("MyERC20")).deploy("token", "token", 18);
    const token6 = await (await ethers.getContractFactory("MyERC20")).deploy("token", "token", 18);
    const token7 = await (await ethers.getContractFactory("MyERC20")).deploy("token", "token", 18);
    const token8 = await (await ethers.getContractFactory("MyERC20")).deploy("token", "token", 18);
    const token9 = await (await ethers.getContractFactory("MyERC20")).deploy("token", "token", 18);
    const token10 = await (await ethers.getContractFactory("MyERC20")).deploy("token", "token", 18);

    await fastPriceFeed.connect(owner).setTokens([token1.address, token2.address], [1000, 1000]);
    await fastPriceFeed.setMaxTimeDeviation(1000);

    let priceBitArray = getPriceBitArray([price1, price2]);
    let blockTime = await getLatestBlockTime();

    expect(priceBitArray.length).eq(1);

    await expect(
      fastPriceFeed.connect(user0).setCompactedPrices(priceBitArray, blockTime)
    ).to.be.revertedWith("fast_price_feed_forbideen");
    await fastPriceFeed.connect(owner).setUpdater(user0.address, true);
    expect(await fastPriceFeed.lastUpdatedAt()).eq(0);

    await expect(fastPriceFeed.connect(user0).setCompactedPrices(priceBitArray, blockTime))
      .to.emit(fastPriceEvent, "PriceUpdate")
      .withArgs(token1.address, expandDecimals(+price1, 30 - 3), blockTime, fastPriceFeed.address)
      .to.emit(fastPriceEvent, "PriceUpdate")
      .withArgs(token2.address, expandDecimals(+price2, 30 - 3), blockTime, fastPriceFeed.address);
    // console.log('ppppp', priceBitArray, getExpandedPrice(price1, 1000), await fastPriceFeed.prices(token1.address))
    expect(await fastPriceFeed.prices(token1.address)).eq(getExpandedPrice(price1, 1000));
    expect(await fastPriceFeed.prices(token2.address)).eq(getExpandedPrice(price2, 1000));

    expect(await fastPriceFeed.lastUpdatedAt()).eq(blockTime);

    await fastPriceFeed.connect(owner).setTokens([token1.address, token2.address], [1000, 10000]);
    blockTime = blockTime + 500;
    await fastPriceFeed.connect(user0).setCompactedPrices(priceBitArray, blockTime);
    expect(await fastPriceFeed.prices(token1.address)).eq(getExpandedPrice(price1, 1000));
    expect(await fastPriceFeed.prices(token2.address)).eq(getExpandedPrice(price2, 10000));
    expect(await fastPriceFeed.lastUpdatedAt()).eq(blockTime);

    await fastPriceFeed
      .connect(owner)
      .setTokens(
        [
          token1.address,
          token2.address,
          token3.address,
          token4.address,
          token5.address,
          token6.address,
          token7.address,
        ],
        [1000, 100, 10, 1000, 10000, 1000, 1000]
      );

    priceBitArray = getPriceBitArray([price1, price2, price3, price4, price5, price6, price7]);

    expect(priceBitArray.length).eq(1);

    await fastPriceFeed.connect(user0).setCompactedPrices(priceBitArray, blockTime);

    const p1 = await fastPriceFeed.prices(token1.address);
    expect(ethers.utils.formatUnits(p1, 30)).eq("2009991.111");
    expect(await fastPriceFeed.prices(token1.address)).eq("2009991111000000000000000000000000000");
    expect(await fastPriceFeed.prices(token2.address)).eq(getExpandedPrice(price2, 100));
    expect(await fastPriceFeed.prices(token3.address)).eq(getExpandedPrice(price3, 10));
    expect(await fastPriceFeed.prices(token4.address)).eq(getExpandedPrice(price4, 1000));
    expect(await fastPriceFeed.prices(token5.address)).eq(getExpandedPrice(price5, 10000));
    expect(await fastPriceFeed.prices(token6.address)).eq(getExpandedPrice(price6, 1000));
    expect(await fastPriceFeed.prices(token7.address)).eq(getExpandedPrice(price7, 1000));

    await fastPriceFeed
      .connect(owner)
      .setTokens(
        [
          token1.address,
          token2.address,
          token3.address,
          token4.address,
          token5.address,
          token6.address,
          token7.address,
          token8.address,
        ],
        [1000, 100, 10, 1000, 10000, 1000, 1000, 100]
      );

    priceBitArray = getPriceBitArray([
      price1,
      price2,
      price3,
      price4,
      price5,
      price6,
      price7,
      price8,
    ]);

    expect(priceBitArray.length).eq(1);

    await fastPriceFeed.connect(user0).setCompactedPrices(priceBitArray, blockTime);

    expect(await fastPriceFeed.prices(token1.address)).eq(getExpandedPrice(price1, 1000));
    expect(await fastPriceFeed.prices(token2.address)).eq(getExpandedPrice(price2, 100));
    expect(await fastPriceFeed.prices(token3.address)).eq(getExpandedPrice(price3, 10));
    expect(await fastPriceFeed.prices(token4.address)).eq(getExpandedPrice(price4, 1000));
    expect(await fastPriceFeed.prices(token5.address)).eq(getExpandedPrice(price5, 10000));
    expect(await fastPriceFeed.prices(token6.address)).eq(getExpandedPrice(price6, 1000));
    expect(await fastPriceFeed.prices(token7.address)).eq(getExpandedPrice(price7, 1000));
    expect(await fastPriceFeed.prices(token8.address)).eq(getExpandedPrice(price8, 100));

    await fastPriceFeed
      .connect(owner)
      .setTokens(
        [
          token1.address,
          token2.address,
          token3.address,
          token4.address,
          token5.address,
          token6.address,
          token7.address,
          token8.address,
          token9.address,
        ],
        [1000, 100, 10, 1000, 10000, 1000, 1000, 100, 10]
      );

    priceBitArray = getPriceBitArray([
      price1,
      price2,
      price3,
      price4,
      price5,
      price6,
      price7,
      price8,
      price9,
    ]);

    expect(priceBitArray.length).eq(2);

    await fastPriceFeed.connect(user0).setCompactedPrices(priceBitArray, blockTime);

    expect(await fastPriceFeed.prices(token1.address)).eq(getExpandedPrice(price1, 1000));
    expect(await fastPriceFeed.prices(token2.address)).eq(getExpandedPrice(price2, 100));
    expect(await fastPriceFeed.prices(token3.address)).eq(getExpandedPrice(price3, 10));
    expect(await fastPriceFeed.prices(token4.address)).eq(getExpandedPrice(price4, 1000));
    expect(await fastPriceFeed.prices(token5.address)).eq(getExpandedPrice(price5, 10000));
    expect(await fastPriceFeed.prices(token6.address)).eq(getExpandedPrice(price6, 1000));
    expect(await fastPriceFeed.prices(token7.address)).eq(getExpandedPrice(price7, 1000));
    expect(await fastPriceFeed.prices(token8.address)).eq(getExpandedPrice(price8, 100));
    expect(await fastPriceFeed.prices(token9.address)).eq(getExpandedPrice(price9, 10));

    await fastPriceFeed
      .connect(owner)
      .setTokens(
        [
          token1.address,
          token2.address,
          token3.address,
          token4.address,
          token5.address,
          token6.address,
          token7.address,
          token8.address,
          token9.address,
          token10.address,
        ],
        [1000, 100, 10, 1000, 10000, 1000, 1000, 100, 10, 10000]
      );

    priceBitArray = getPriceBitArray([
      price1,
      price2,
      price3,
      price4,
      price5,
      price6,
      price7,
      price8,
      price9,
      price10,
    ]);

    expect(priceBitArray.length).eq(2);

    await fastPriceFeed.connect(user0).setCompactedPrices(priceBitArray, blockTime);

    expect(await fastPriceFeed.prices(token1.address)).eq(getExpandedPrice(price1, 1000));
    expect(await fastPriceFeed.prices(token2.address)).eq(getExpandedPrice(price2, 100));
    expect(await fastPriceFeed.prices(token3.address)).eq(getExpandedPrice(price3, 10));
    expect(await fastPriceFeed.prices(token4.address)).eq(getExpandedPrice(price4, 1000));
    expect(await fastPriceFeed.prices(token5.address)).eq(getExpandedPrice(price5, 10000));
    expect(await fastPriceFeed.prices(token6.address)).eq(getExpandedPrice(price6, 1000));
    expect(await fastPriceFeed.prices(token7.address)).eq(getExpandedPrice(price7, 1000));
    expect(await fastPriceFeed.prices(token8.address)).eq(getExpandedPrice(price8, 100));
    expect(await fastPriceFeed.prices(token9.address)).eq(getExpandedPrice(price9, 10));
    expect(await fastPriceFeed.prices(token10.address)).eq(getExpandedPrice(price10, 10000));
  });

  it("setPricesWithBits", async () => {
    const price1 = "2009991111";
    const price2 = "1004445555";
    const price3 = "123";
    const price4 = "4567";
    const price5 = "891011";
    const price6 = "1213141516";
    const price7 = "234";
    const price8 = "5678";
    const price9 = "910910";
    const price10 = "10";

    const token1 = await (await ethers.getContractFactory("MyERC20")).deploy("token", "token", 18);
    const token2 = await (await ethers.getContractFactory("MyERC20")).deploy("token", "token", 18);
    const token3 = await (await ethers.getContractFactory("MyERC20")).deploy("token", "token", 18);
    const token4 = await (await ethers.getContractFactory("MyERC20")).deploy("token", "token", 18);
    const token5 = await (await ethers.getContractFactory("MyERC20")).deploy("token", "token", 18);
    const token6 = await (await ethers.getContractFactory("MyERC20")).deploy("token", "token", 18);
    const token7 = await (await ethers.getContractFactory("MyERC20")).deploy("token", "token", 18);
    const token8 = await (await ethers.getContractFactory("MyERC20")).deploy("token", "token", 18);
    const token9 = await (await ethers.getContractFactory("MyERC20")).deploy("token", "token", 18);
    const token10 = await (await ethers.getContractFactory("MyERC20")).deploy("token", "token", 18);

    await fastPriceFeed.connect(owner).setTokens([token1.address, token2.address], [1000, 1000]);
    await fastPriceFeed.setMaxTimeDeviation(1000);

    let priceBits = getPriceBits([price1, price2]);
    let blockTime = await getLatestBlockTime();

    await expect(
      fastPriceFeed.connect(user0).setPricesWithBits(priceBits, blockTime)
    ).to.be.revertedWith("fast_price_feed_forbideen");

    await fastPriceFeed.connect(owner).setUpdater(user0.address, true);

    expect(await fastPriceFeed.lastUpdatedAt()).eq(0);

    await expect(fastPriceFeed.connect(user0).setPricesWithBits(priceBits, blockTime))
      .to.emit(fastPriceEvent, "PriceUpdate")
      .withArgs(token1.address, expandDecimals(+price1, 30 - 3), blockTime, fastPriceFeed.address)
      .to.emit(fastPriceEvent, "PriceUpdate")
      .withArgs(token2.address, expandDecimals(+price2, 30 - 3), blockTime, fastPriceFeed.address);

    expect(await fastPriceFeed.prices(token1.address)).eq(getExpandedPrice(price1, 1000));
    expect(await fastPriceFeed.prices(token2.address)).eq(getExpandedPrice(price2, 1000));

    expect(await fastPriceFeed.lastUpdatedAt()).eq(blockTime);

    await fastPriceFeed.connect(owner).setTokens([token1.address, token2.address], [1000, 10000]);

    blockTime = blockTime + 500;

    await fastPriceFeed.connect(user0).setPricesWithBits(priceBits, blockTime);

    expect(await fastPriceFeed.prices(token1.address)).eq(getExpandedPrice(price1, 1000));
    expect(await fastPriceFeed.prices(token2.address)).eq(getExpandedPrice(price2, 10000));

    expect(await fastPriceFeed.lastUpdatedAt()).eq(blockTime);

    await fastPriceFeed
      .connect(owner)
      .setTokens(
        [
          token1.address,
          token2.address,
          token3.address,
          token4.address,
          token5.address,
          token6.address,
          token7.address,
        ],
        [1000, 100, 10, 1000, 10000, 1000, 1000]
      );

    priceBits = getPriceBits([price1, price2, price3, price4, price5, price6, price7]);

    await fastPriceFeed.connect(user0).setPricesWithBits(priceBits, blockTime);

    const p1 = await fastPriceFeed.prices(token1.address);
    expect(ethers.utils.formatUnits(p1, 30)).eq("2009991.111");
    expect(await fastPriceFeed.prices(token1.address)).eq("2009991111000000000000000000000000000");
    expect(await fastPriceFeed.prices(token2.address)).eq(getExpandedPrice(price2, 100));
    expect(await fastPriceFeed.prices(token3.address)).eq(getExpandedPrice(price3, 10));
    expect(await fastPriceFeed.prices(token4.address)).eq(getExpandedPrice(price4, 1000));
    expect(await fastPriceFeed.prices(token5.address)).eq(getExpandedPrice(price5, 10000));
    expect(await fastPriceFeed.prices(token6.address)).eq(getExpandedPrice(price6, 1000));
    expect(await fastPriceFeed.prices(token7.address)).eq(getExpandedPrice(price7, 1000));

    await fastPriceFeed
      .connect(owner)
      .setTokens(
        [
          token1.address,
          token2.address,
          token3.address,
          token4.address,
          token5.address,
          token6.address,
          token7.address,
          token8.address,
        ],
        [1000, 100, 10, 1000, 10000, 1000, 1000, 100]
      );

    priceBits = getPriceBits([price1, price2, price3, price4, price5, price6, price7, price8]);

    await fastPriceFeed.connect(user0).setPricesWithBits(priceBits, blockTime);

    expect(await fastPriceFeed.prices(token1.address)).eq(getExpandedPrice(price1, 1000));
    expect(await fastPriceFeed.prices(token2.address)).eq(getExpandedPrice(price2, 100));
    expect(await fastPriceFeed.prices(token3.address)).eq(getExpandedPrice(price3, 10));
    expect(await fastPriceFeed.prices(token4.address)).eq(getExpandedPrice(price4, 1000));
    expect(await fastPriceFeed.prices(token5.address)).eq(getExpandedPrice(price5, 10000));
    expect(await fastPriceFeed.prices(token6.address)).eq(getExpandedPrice(price6, 1000));
    expect(await fastPriceFeed.prices(token7.address)).eq(getExpandedPrice(price7, 1000));
    expect(await fastPriceFeed.prices(token8.address)).eq(getExpandedPrice(price8, 100));

    priceBits = getPriceBits([price1, price2, price3, price4, price5, price6, price7, price9]);

    await mineBlock();
    await fastPriceFeed.connect(user0).setPricesWithBits(priceBits, blockTime);

    expect(await fastPriceFeed.prices(token1.address)).eq(getExpandedPrice(price1, 1000));
    expect(await fastPriceFeed.prices(token2.address)).eq(getExpandedPrice(price2, 100));
    expect(await fastPriceFeed.prices(token3.address)).eq(getExpandedPrice(price3, 10));
    expect(await fastPriceFeed.prices(token4.address)).eq(getExpandedPrice(price4, 1000));
    expect(await fastPriceFeed.prices(token5.address)).eq(getExpandedPrice(price5, 10000));
    expect(await fastPriceFeed.prices(token6.address)).eq(getExpandedPrice(price6, 1000));
    expect(await fastPriceFeed.prices(token7.address)).eq(getExpandedPrice(price7, 1000));
    expect(await fastPriceFeed.prices(token8.address)).eq(getExpandedPrice(price9, 100));

    priceBits = getPriceBits([price7, price1, price3, price4, price5, price6, price7, price8]);

    await mineBlock();
    await fastPriceFeed.connect(user0).setPricesWithBits(priceBits, blockTime - 1);

    expect(await fastPriceFeed.prices(token1.address)).eq(getExpandedPrice(price1, 1000));
    expect(await fastPriceFeed.prices(token2.address)).eq(getExpandedPrice(price2, 100));
    expect(await fastPriceFeed.prices(token3.address)).eq(getExpandedPrice(price3, 10));
    expect(await fastPriceFeed.prices(token4.address)).eq(getExpandedPrice(price4, 1000));
    expect(await fastPriceFeed.prices(token5.address)).eq(getExpandedPrice(price5, 10000));
    expect(await fastPriceFeed.prices(token6.address)).eq(getExpandedPrice(price6, 1000));
    expect(await fastPriceFeed.prices(token7.address)).eq(getExpandedPrice(price7, 1000));
    expect(await fastPriceFeed.prices(token8.address)).eq(getExpandedPrice(price9, 100));

    await mineBlock();
    await fastPriceFeed.connect(user0).setPricesWithBits(priceBits, blockTime + 1);

    expect(await fastPriceFeed.prices(token1.address)).eq(getExpandedPrice(price7, 1000));
    expect(await fastPriceFeed.prices(token2.address)).eq(getExpandedPrice(price1, 100));
    expect(await fastPriceFeed.prices(token3.address)).eq(getExpandedPrice(price3, 10));
    expect(await fastPriceFeed.prices(token4.address)).eq(getExpandedPrice(price4, 1000));
    expect(await fastPriceFeed.prices(token5.address)).eq(getExpandedPrice(price5, 10000));
    expect(await fastPriceFeed.prices(token6.address)).eq(getExpandedPrice(price6, 1000));
    expect(await fastPriceFeed.prices(token7.address)).eq(getExpandedPrice(price7, 1000));
    expect(await fastPriceFeed.prices(token8.address)).eq(getExpandedPrice(price8, 100));
  });

  it("minBlockInterval.setPrice", async () => {
    const token1 = await (await ethers.getContractFactory("MyERC20")).deploy("token", "token", 18);
    const token2 = await (await ethers.getContractFactory("MyERC20")).deploy("token", "token", 18);

    const price1 = "2009991111";
    const price2 = "1004445555";

    await fastPriceFeed.connect(owner).setTokens([token1.address, token2.address], [1000, 1000]);
    await fastPriceFeed.setMaxTimeDeviation(1000);

    expect(await fastPriceFeed.lastUpdatedAt()).eq(0);
    expect(await fastPriceFeed.lastUpdatedBlock()).eq(0);
    let blockTime = await getLatestBlockTime();

    await fastPriceFeed
      .connect(updater0)
      .setPrices(
        [token1.address, token2.address],
        [expandDecimals(+price1, 30), expandDecimals(+price2, 30)],
        blockTime + 200
      );

    blockTime = await getLatestBlockTime();
    await expect(
      fastPriceFeed
        .connect(updater0)
        .setPrices(
          [token1.address, token2.address],
          [expandDecimals(+price1, 30), expandDecimals(+price2, 30)],
          blockTime + 100
        )
    ).to.be.revertedWith("min_block_interval");
    await hardhatMine(5, 100);

    blockTime = await getLatestBlockTime();
    await fastPriceFeed
      .connect(updater0)
      .setPrices(
        [token1.address, token2.address],
        [expandDecimals(+price1, 30), expandDecimals(+price2, 30)],
        blockTime + 100
      );

    blockTime = await getLatestBlockTime();
    await expect(
      fastPriceFeed
        .connect(updater0)
        .setCompactedPrices(getPriceBitArray([price1, price2]), blockTime + 100)
    ).to.be.revertedWith("min_block_interval");
    await hardhatMine(3, 100);

    blockTime = await getLatestBlockTime();
    await fastPriceFeed
      .connect(updater0)
      .setCompactedPrices(getPriceBitArray([price1, price2]), blockTime + 100);

    blockTime = await getLatestBlockTime();
    await expect(
      fastPriceFeed.connect(updater0).setPricesWithBits(getPriceBits([price1, price2]), blockTime)
    ).to.be.revertedWith("min_block_interval");
    await hardhatMine(3, 90);

    blockTime = await getLatestBlockTime();
    await fastPriceFeed
      .connect(updater0)
      .setPricesWithBits(getPriceBits([price1, price2]), blockTime + 100);
  });

  it("maxTimeDeviation.setPrice", async () => {
    const token1 = await (await ethers.getContractFactory("MyERC20")).deploy("token", "token", 18);
    const token2 = await (await ethers.getContractFactory("MyERC20")).deploy("token", "token", 18);

    const price1 = "2009991111";
    const price2 = "1004445555";

    await fastPriceFeed.connect(owner).setTokens([token1.address, token2.address], [1000, 1000]);
    await fastPriceFeed.setMaxTimeDeviation(1000);
    await fastPriceFeed.setMinBlockInterval(0);

    expect(await fastPriceFeed.lastUpdatedAt()).eq(0);
    expect(await fastPriceFeed.lastUpdatedBlock()).eq(0);
    let blockTime = await getLatestBlockTime();

    await fastPriceFeed
      .connect(updater0)
      .setPrices(
        [token1.address, token2.address],
        [expandDecimals(+price1, 30), expandDecimals(+price2, 30)],
        blockTime + 200
      );
    await expect(
      fastPriceFeed
        .connect(updater0)
        .setPrices(
          [token1.address, token2.address],
          [expandDecimals(+price1, 30), expandDecimals(+price2, 30)],
          blockTime - 1200
        )
    ).to.be.revertedWith("max_time_deviation");
    await expect(
      fastPriceFeed
        .connect(updater0)
        .setPrices(
          [token1.address, token2.address],
          [expandDecimals(+price1, 30), expandDecimals(+price2, 30)],
          blockTime + 1200
        )
    ).to.be.revertedWith("max_time_deviation");

    blockTime = await getLatestBlockTime();
    fastPriceFeed
      .connect(updater0)
      .setPrices(
        [token1.address, token2.address],
        [expandDecimals(+price1, 30), expandDecimals(+price2, 30)],
        blockTime + 800
      );

    await expect(
      fastPriceFeed
        .connect(updater0)
        .setCompactedPrices(getPriceBitArray([price1, price2]), blockTime + 1200)
    ).to.be.revertedWith("max_time_deviation");
    await expect(
      fastPriceFeed
        .connect(updater0)
        .setCompactedPrices(getPriceBitArray([price1, price2]), blockTime - 1200)
    ).to.be.revertedWith("max_time_deviation");
    fastPriceFeed
      .connect(updater0)
      .setCompactedPrices(getPriceBitArray([price1, price2]), blockTime + 800);

    blockTime = await getLatestBlockTime();
    await expect(
      fastPriceFeed
        .connect(updater0)
        .setPricesWithBits(getPriceBits([price1, price2]), blockTime + 1200)
    ).to.be.revertedWith("max_time_deviation");
    await expect(
      fastPriceFeed
        .connect(updater0)
        .setPricesWithBits(getPriceBits([price1, price2]), blockTime - 1200)
    ).to.be.revertedWith("max_time_deviation");
    fastPriceFeed
      .connect(updater0)
      .setPricesWithBits(getPriceBits([price1, price2]), blockTime + 800);
  });
});
