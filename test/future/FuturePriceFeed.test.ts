import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { FastPriceEvent, FastPriceFeed, FuturePriceFeed, MyERC20 } from "../../typechain";
import { expandDecimals, getLatestBlockTime } from "../helpers";

describe("Future/FuturePriceFeed", function () {
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
  let updater0: SignerWithAddress;
  let updater1: SignerWithAddress;
  let updater2: SignerWithAddress;

  before(async function () {
    [owner, user0, user1, updater0, updater1, updater2] = await ethers.getSigners();
  });

  beforeEach(async function () {
    const minBlockInterval = 2; // 2 blocks, if block not timed out, can't update
    const priceDuration = 5 * 60; // 300 seconds, if price timed out, not used;
    const maxDeviationBasisPoints = 250; // 250 / 10000 = 2.5% , if price in this deviation, price used, otherwise, not used;

    fastPriceEvent = await (await ethers.getContractFactory("FastPriceEvent")).deploy();
    fastPriceFeed = await (
      await ethers.getContractFactory("FastPriceFeed")
    ).deploy(priceDuration, minBlockInterval, maxDeviationBasisPoints, fastPriceEvent.address);
    futurePriceFeed = await (await ethers.getContractFactory("FuturePriceFeed")).deploy();

    eth = await (await ethers.getContractFactory("MyERC20")).deploy("eth", "eth", 18);
    btc = await (await ethers.getContractFactory("MyERC20")).deploy("btc", "btc", 8);
    dai = await (await ethers.getContractFactory("MyERC20")).deploy("dai", "dai", 18);
    usdc = await (await ethers.getContractFactory("MyERC20")).deploy("usdc", "usdc", 6);

    await fastPriceFeed.setUpdater(updater0.address, true);
    await fastPriceEvent.setIsPriceFeed(fastPriceFeed.address, true);
  });

  it("setFastPriceFeed", async function () {
    expect(await futurePriceFeed.fastPriceFeed()).eq(ethers.constants.AddressZero);
    await expect(futurePriceFeed.connect(user0).setFastPriceFeed(user1.address)).to.be.revertedWith(
      "Ownable: caller is not the owner"
    );
    await futurePriceFeed.transferOwnership(user0.address);
    await futurePriceFeed.connect(user0).setFastPriceFeed(user1.address);
    expect(await futurePriceFeed.fastPriceFeed()).eq(user1.address);
  });

  it("getPrice", async function () {
    await futurePriceFeed.setFastPriceFeed(fastPriceFeed.address);

    await fastPriceFeed.setMaxTimeDeviation(300);

    let blockTime = await getLatestBlockTime();
    await fastPriceFeed
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
      );

    expect(await futurePriceFeed.getPrice(btc.address)).eq(expandDecimals(20_000, 30));
    expect(await futurePriceFeed.getPrice(eth.address)).eq(expandDecimals(1_500, 30));
    expect(await futurePriceFeed.getPrice(dai.address)).eq(expandDecimals(99, 30 - 2));
    expect(await futurePriceFeed.getPrice(usdc.address)).eq(expandDecimals(1001, 30 - 3));

    await expect( futurePriceFeed.getPrice(user0.address)).to.be.revertedWith('price_zero')
  });
});
