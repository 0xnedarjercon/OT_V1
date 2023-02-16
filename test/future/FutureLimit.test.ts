import {
  FastPriceFeed,
  MockSwap,
  Future,
  FutureUtil,
  FuturePriceFeed,
  FastPriceEvent,
  MyERC20,
  FutureLimit,
} from "../../typechain";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ethers, network } from "hardhat";
import {
  expandDecimals,
  getEthBalance,
  getLatestBlockTime,
  setNextBlockTime,
  setNextBlockTimeAndMine,
} from "../helpers";
import { expect } from "chai";
import { BigNumber } from "ethers";

enum ExecStatus {
  success, // exec success
  decreaseExceed, // failed before operating, pos.openNotional < notionalDelta when decrease
  pairUnlist, // failed before operating, pair unlist
  pendingExec, // waiting for exec
  cancel, // user cancel
}

enum Operation {
  create,
  update,
  cancel,
  exec,
}

enum DecreaseExecType {
  takeProfit,
  stopLoss,
}

describe("Future/FutureLimit", async function () {
  let futureUtil: FutureUtil;
  let future: Future;
  let swap: MockSwap;

  let futureLimit: FutureLimit;

  let futurePriceFeed: FuturePriceFeed;
  let fastPriceFeed: FastPriceFeed;
  let fastPriceEvent: FastPriceEvent;

  let weth: MyERC20;
  let usdc: MyERC20;
  let btc: MyERC20;

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

    weth = await (await ethers.getContractFactory("MyERC20")).deploy("weth", "weth", 18);
    btc = await (await ethers.getContractFactory("MyERC20")).deploy("btc", "btc", 8);
    usdc = await (await ethers.getContractFactory("MyERC20")).deploy("usdc", "usdc", 6);

    let blockTime = await getLatestBlockTime();
    await fastPriceFeed
      .connect(updater0)
      .setPrices(
        [weth.address, usdc.address],
        [expandDecimals(1500, 30), expandDecimals(1, 30)],
        blockTime
      );
    await future.listPair(usdc.address, weth.address);

    // deploy future limit
    futureLimit = await (
      await ethers.getContractFactory("FutureLimit")
    ).deploy(future.address, 1e10);
    await future.setSystemRouter(futureLimit.address, true);

    // increase insuranceFund
    let insuranceFund = expandDecimals(1e5, 6);
    await usdc.transfer(future.address, insuranceFund);
    await future.increaseInsuranceFund(usdc.address);

    // max leverage: 10x; maxOpenNotional: 3000 * 10
    await future.setMaxLeverage(usdc.address, weth.address, 3000, 10e9);
    // minMaintanenceMarginRatio: 0.5%， maxMaintanenceMarginRatio: 5%
    await future.setMarginRatio(usdc.address, weth.address, 5e6, 5e7);
    // feeRate: 0.1%, protocolFeeRate: 50% * 0.1%
    await future.setTradingFeeRate(usdc.address, weth.address, 1e6, 5e8);

    swap = await (await ethers.getContractFactory("MockSwap")).deploy();
    await future.setSwapPool(swap.address);
  });

  it("setMinExecFee", async function () {
    expect(await futureLimit.minExecFee()).to.equal(1e10);
    await expect(futureLimit.connect(user0).setMinExecFee(1e8)).to.be.revertedWith(
      "Ownable: caller is not the owner"
    );
    await futureLimit.setMinExecFee(1e7);
    expect(await futureLimit.minExecFee()).to.equal(1e7);
  });

  it("setSystemRouter", async function () {
    expect(await futureLimit.systemRouters(user0.address)).to.equal(false);
    await expect(
      futureLimit.connect(user0).setSystemRouter(user0.address, true)
    ).to.be.revertedWith("Ownable: caller is not the owner");
    await futureLimit.setSystemRouter(user0.address, true);
    expect(await futureLimit.systemRouters(user0.address)).to.equal(true);
  });

  it("createIncreaseOrder", async function () {
    await usdc.transfer(futureLimit.address, 1e3 * 1e6);

    await expect(
      futureLimit
        .connect(user1)
        .createIncreaseOrder(
          usdc.address,
          weth.address,
          user0.address,
          true,
          3e3 * 1e6,
          expandDecimals(1, 18),
          1e7,
          { value: 1e6 }
        )
    ).to.be.revertedWith("invalid_router");
    await expect(
      futureLimit
        .connect(user0)
        .createIncreaseOrder(
          usdc.address,
          btc.address,
          user0.address,
          true,
          3e3 * 1e6,
          expandDecimals(1, 18),
          1e7,
          { value: 1e6 }
        )
    ).to.be.revertedWith("pair_unlist");
    await expect(
      futureLimit
        .connect(user0)
        .createIncreaseOrder(
          usdc.address,
          weth.address,
          user0.address,
          true,
          3e3 * 1e6,
          expandDecimals(1, 18),
          1e7,
          { value: 1e6 }
        )
    ).to.be.revertedWith("incorrect_exec_fee");
    await expect(
      futureLimit
        .connect(user0)
        .createIncreaseOrder(
          usdc.address,
          weth.address,
          user0.address,
          true,
          3e3 * 1e6,
          expandDecimals(1, 18),
          1e7,
          { value: 1e7 }
        )
    ).to.be.revertedWith("low_exec_fee");

    await expect(
      futureLimit
        .connect(user0)
        .createIncreaseOrder(
          usdc.address,
          weth.address,
          user0.address,
          true,
          3e3 * 1e6,
          expandDecimals(1, 18),
          1e10,
          { value: 1e10 }
        )
    ).to.be.revertedWith("invalid_open_price");

    await expect(
      futureLimit
        .connect(user0)
        .createIncreaseOrder(
          usdc.address,
          weth.address,
          user0.address,
          false,
          3e3 * 1e6,
          expandDecimals(3, 18),
          1e10,
          { value: 1e10 }
        )
    ).to.be.revertedWith("invalid_open_price");

    await expect(
      futureLimit
        .connect(user0)
        .createIncreaseOrder(
          usdc.address,
          weth.address,
          user0.address,
          true,
          0,
          expandDecimals(1, 18),
          1e10,
          { value: 1e10 }
        )
    ).to.be.revertedWith("invalid_notional_delta");

    await expect(
      futureLimit
        .connect(user0)
        .createIncreaseOrder(usdc.address, weth.address, user0.address, true, 3e3 * 1e6, 0, 1e10, {
          value: 1e10,
        })
    ).to.be.revertedWith("invalid_size_delta");

    let flEthBalance = await getEthBalance(futureLimit.address);

    await expect(
      futureLimit
        .connect(user0)
        .createIncreaseOrder(
          usdc.address,
          weth.address,
          user0.address,
          true,
          3e3 * 1e6,
          expandDecimals(3, 18),
          1e10,
          { value: 1e10 }
        )
    )
      .to.emit(futureLimit, "CreateIncreaseOrder")
      .withArgs(user0.address, 0)
      .to.emit(futureLimit, "UpdateIncreaseOrder")
      .withArgs(
        usdc.address,
        weth.address,
        user0.address,
        true,
        1e3 * 1e6,
        3e3 * 1e6,
        expandDecimals(3, 18),
        1e10,
        0,
        Operation.create,
        ExecStatus.pendingExec
      );

    expect(await getEthBalance(futureLimit.address)).to.equal(
      flEthBalance.toBigInt() + BigInt(1e10)
    );

    const order = await futureLimit.increaseOrders(user0.address, 0);
    expect(order.collateralToken).to.equal(usdc.address);
    expect(order.indexToken).to.equal(weth.address);
    expect(order.account).to.equal(user0.address);
    expect(order.isLong).to.equal(true);
    expect(order.marginDelta).to.equal(1e3 * 1e6);
    expect(order.notionalDelta).to.equal(3e3 * 1e6);
    expect(order.sizeDelta).to.equal(expandDecimals(3, 18));
    expect(order.execFee).to.equal(1e10);
  });

  it("updateIncreaseOrder", async function () {
    let orderIndex = 0;
    await expect(
      futureLimit
        .connect(user1)
        .updateIncreaseOrder(user0.address, orderIndex, 3e3 * 1e6, expandDecimals(1, 18))
    ).to.be.revertedWith("invalid_router");
    await expect(
      futureLimit
        .connect(user0)
        .updateIncreaseOrder(user0.address, orderIndex, 3e3 * 1e6, expandDecimals(1, 18))
    ).to.be.revertedWith("non_exist_order");

    // side: long
    await usdc.transfer(futureLimit.address, 1e3 * 1e6);
    await futureLimit
      .connect(user0)
      .createIncreaseOrder(
        usdc.address,
        weth.address,
        user0.address,
        true,
        3e3 * 1e6,
        expandDecimals(3, 18),
        1e10,
        { value: 1e10 }
      );

    let order = await futureLimit.increaseOrders(user0.address, orderIndex);

    await expect(
      futureLimit
        .connect(user0)
        .updateIncreaseOrder(user0.address, orderIndex, 0, expandDecimals(1, 18))
    ).to.be.revertedWith("invalid_notional_delta");
    await expect(
      futureLimit.connect(user0).updateIncreaseOrder(user0.address, orderIndex, 3e3 * 1e6, 0)
    ).to.be.revertedWith("invalid_size_delta");
    await expect(
      futureLimit
        .connect(user0)
        .updateIncreaseOrder(user0.address, orderIndex, 3e3 * 1e6, expandDecimals(1, 18))
    ).to.be.revertedWith("invalid_open_price");
    await expect(
      futureLimit
        .connect(user0)
        .updateIncreaseOrder(user0.address, orderIndex, 3e3 * 1e6, expandDecimals(4, 18))
    )
      .to.be.emit(futureLimit, "EditIncreaseOrder")
      .withArgs(user0.address, orderIndex)
      .to.be.emit(futureLimit, "UpdateIncreaseOrder")
      .withArgs(
        order.collateralToken,
        order.indexToken,
        order.account,
        order.isLong,
        order.marginDelta,
        3e3 * 1e6,
        expandDecimals(4, 18),
        order.execFee,
        orderIndex,
        Operation.update,
        ExecStatus.pendingExec
      );

    order = await futureLimit.increaseOrders(user0.address, orderIndex);
    expect(order.notionalDelta).to.equal(3e3 * 1e6);
    expect(order.sizeDelta).to.equal(expandDecimals(4, 18));

    // side: short
    await usdc.transfer(futureLimit.address, 1e3 * 1e6);
    await futureLimit
      .connect(user0)
      .createIncreaseOrder(
        usdc.address,
        weth.address,
        user0.address,
        false,
        3e3 * 1e6,
        expandDecimals(1, 18),
        1e10,
        { value: 1e10 }
      );

    orderIndex = orderIndex + 1;
    order = await futureLimit.increaseOrders(user0.address, orderIndex);

    await expect(
      futureLimit
        .connect(user0)
        .updateIncreaseOrder(user0.address, orderIndex, 3e3 * 1e6, expandDecimals(4, 18))
    ).to.be.revertedWith("invalid_open_price");
    await futureLimit
      .connect(user0)
      .updateIncreaseOrder(user0.address, orderIndex, 4e3 * 1e6, expandDecimals(2, 18));
  });

  it("cancelIncreaseOrder", async function () {
    let orderIndex = 0;
    await expect(
      futureLimit
        .connect(user1)
        .cancelIncreaseOrder(user0.address, orderIndex, user0.address, user0.address)
    ).to.be.revertedWith("invalid_router");
    await expect(
      futureLimit
        .connect(user0)
        .cancelIncreaseOrder(user0.address, orderIndex, user0.address, user0.address)
    ).to.be.revertedWith("non_exist_order");

    await usdc.transfer(futureLimit.address, 1e3 * 1e6);
    await futureLimit
      .connect(user0)
      .createIncreaseOrder(
        usdc.address,
        weth.address,
        user0.address,
        true,
        3e3 * 1e6,
        expandDecimals(3, 18),
        1e10,
        { value: 1e10 }
      );

    let user1UsdcBalance = await usdc.balanceOf(user1.address);
    let user1EthBalance = await getEthBalance(user1.address);
    let flEthBalance = await getEthBalance(futureLimit.address);

    let order = await futureLimit.increaseOrders(user0.address, orderIndex);
    await expect(
      futureLimit
        .connect(user0)
        .cancelIncreaseOrder(user0.address, orderIndex, user1.address, user1.address)
    )
      .to.be.emit(futureLimit, "CancelIncreaseOrder")
      .withArgs(user0.address, orderIndex)
      .to.be.emit(futureLimit, "UpdateIncreaseOrder")
      .withArgs(
        order.collateralToken,
        order.indexToken,
        order.account,
        order.isLong,
        order.marginDelta,
        order.notionalDelta,
        order.sizeDelta,
        order.execFee,
        orderIndex,
        Operation.cancel,
        ExecStatus.cancel
      );
    expect(await usdc.balanceOf(user1.address)).to.equal(
      user1UsdcBalance.toBigInt() + order.marginDelta.toBigInt()
    );
    expect(await getEthBalance(user1.address)).to.equal(
      user1EthBalance.toBigInt() + order.execFee.toBigInt()
    );
    expect(await getEthBalance(futureLimit.address)).to.equal(
      flEthBalance.toBigInt() - order.execFee.toBigInt()
    );
    order = await futureLimit.increaseOrders(user0.address, orderIndex);
    expect(order.account).to.equal(ethers.constants.AddressZero);
  });

  it("execIncreaseOrder", async function () {
    let orderIndex = 0;
    await expect(
      futureLimit.connect(user1).execIncreaseOrder(user0.address, orderIndex, user2.address)
    ).to.be.revertedWith("non_exist_order");
    await usdc.transfer(futureLimit.address, 1e3 * 1e6);
    await futureLimit
      .connect(user0)
      .createIncreaseOrder(
        usdc.address,
        weth.address,
        user0.address,
        true,
        3e3 * 1e6,
        expandDecimals(3, 18),
        1e10,
        { value: 1e10 }
      );
    let order = await futureLimit.increaseOrders(user0.address, orderIndex);
    await fastPriceFeed
      .connect(updater0)
      .setPrices(
        [weth.address, usdc.address],
        [expandDecimals(1500, 30), expandDecimals(1, 30)],
        await getLatestBlockTime()
      );

    let flEthBalance = await getEthBalance(futureLimit.address);
    let user2EthBalance = await getEthBalance(user2.address);

    expect(await futureLimit.validateIncreaseOrderPrice(user0.address, orderIndex, false)).to.equal(
      false
    );
    await expect(
      futureLimit.connect(user1).execIncreaseOrder(user0.address, orderIndex, user2.address)
    ).to.be.revertedWith("price_not_triggered");

    await fastPriceFeed
      .connect(updater0)
      .setPrices(
        [weth.address, usdc.address],
        [expandDecimals(800, 30), expandDecimals(1, 30)],
        await getLatestBlockTime()
      );
    expect(await futureLimit.validateIncreaseOrderPrice(user0.address, orderIndex, false)).to.equal(
      true
    );
    await expect(
      futureLimit.connect(user1).execIncreaseOrder(user0.address, orderIndex, user2.address)
    )
      .to.be.emit(futureLimit, "ExecIncreaseOrder")
      .withArgs(user0.address, orderIndex)
      .to.be.emit(futureLimit, "UpdateIncreaseOrder")
      .withArgs(
        order.collateralToken,
        order.indexToken,
        order.account,
        order.isLong,
        order.marginDelta,
        order.notionalDelta,
        order.sizeDelta,
        order.execFee,
        orderIndex,
        Operation.exec,
        ExecStatus.success
      );

    expect(await getEthBalance(futureLimit.address)).to.equal(
      flEthBalance.toBigInt() - order.execFee.toBigInt()
    );
    expect(await getEthBalance(user2.address)).to.equal(
      user2EthBalance.toBigInt() + order.execFee.toBigInt()
    );

    const pos = await future.getPosition(
      order.collateralToken,
      order.indexToken,
      order.account,
      order.isLong
    );
    expect(pos.margin).to.lte(order.marginDelta);
    expect(pos.openNotional).to.equal(order.notionalDelta);
    expect(pos.size).to.gte(order.sizeDelta);

    order = await futureLimit.increaseOrders(user0.address, orderIndex);
    expect(order.account).to.equal(ethers.constants.AddressZero);
  });

  it("createDecreaseOrder", async function () {
    await usdc.transfer(futureLimit.address, 1e3 * 1e6);

    await expect(
      futureLimit
        .connect(user1)
        .createDecreaseOrder(
          usdc.address,
          weth.address,
          user0.address,
          true,
          3e3 * 1e6,
          expandDecimals(1, 18),
          expandDecimals(1, 18),
          1e7,
          { value: 1e6 }
        )
    ).to.be.revertedWith("invalid_router");
    await expect(
      futureLimit
        .connect(user0)
        .createDecreaseOrder(
          usdc.address,
          btc.address,
          user0.address,
          true,
          3e3 * 1e6,
          expandDecimals(1, 18),
          expandDecimals(1, 18),
          1e7,
          { value: 1e6 }
        )
    ).to.be.revertedWith("pair_unlist");
    await expect(
      futureLimit
        .connect(user0)
        .createDecreaseOrder(
          usdc.address,
          weth.address,
          user0.address,
          true,
          3e3 * 1e6,
          expandDecimals(1, 18),
          expandDecimals(1, 18),
          1e7,
          { value: 1e6 }
        )
    ).to.be.revertedWith("incorrect_exec_fee");
    await expect(
      futureLimit
        .connect(user0)
        .createDecreaseOrder(
          usdc.address,
          weth.address,
          user0.address,
          true,
          3e3 * 1e6,
          expandDecimals(1, 18),
          expandDecimals(1, 18),
          1e7,
          { value: 1e7 }
        )
    ).to.be.revertedWith("low_exec_fee");

    await expect(
      futureLimit
        .connect(user0)
        .createDecreaseOrder(
          usdc.address,
          weth.address,
          user0.address,
          true,
          3e3 * 1e6,
          0,
          0,
          1e10,
          { value: 1e10 }
        )
    ).to.be.revertedWith("invalid_size_delta");

    await expect(
      futureLimit
        .connect(user0)
        .createDecreaseOrder(
          usdc.address,
          weth.address,
          user0.address,
          true,
          3e3 * 1e6,
          expandDecimals(1, 18),
          expandDecimals(9, 17),
          1e10,
          { value: 1e10 }
        )
    ).to.be.revertedWith("invalid_size_delta");

    await expect(
      futureLimit
        .connect(user0)
        .createDecreaseOrder(
          usdc.address,
          weth.address,
          user0.address,
          true,
          3e3 * 1e6,
          expandDecimals(4, 18),
          0,
          1e10,
          { value: 1e10 }
        )
    ).to.be.revertedWith("invalid_open_price");

    await expect(
      futureLimit
        .connect(user0)
        .createDecreaseOrder(
          usdc.address,
          weth.address,
          user0.address,
          true,
          3e3 * 1e6,
          0,
          expandDecimals(1, 18),
          1e10,
          { value: 1e10 }
        )
    ).to.be.revertedWith("invalid_open_price");

    await expect(
      futureLimit
        .connect(user0)
        .createDecreaseOrder(
          usdc.address,
          weth.address,
          user0.address,
          true,
          0,
          expandDecimals(1, 18),
          expandDecimals(4, 18),
          1e10,
          { value: 1e10 }
        )
    ).to.be.revertedWith("invalid_notional_delta");

    // await expect(
    //   futureLimit
    //     .connect(user0)
    //     .createDecreaseOrder(
    //       usdc.address,
    //       weth.address,
    //       user0.address,
    //       true,
    //       3e3 * 1e6,
    //       expandDecimals(1, 18),
    //       expandDecimals(4, 18),
    //       1e10,
    //       {
    //         value: 1e10,
    //       }
    //     )
    // ).to.be.revertedWith("notional_delta_exceed");

    await usdc.transfer(future.address, 1e3 * 1e6);
    await future
      .connect(user0)
      .increasePosition(usdc.address, weth.address, user0.address, true, 3e3 * 1e6);

    const pos = await future.getPosition(usdc.address, weth.address, user0.address, true);

    let flEthBalance = await getEthBalance(futureLimit.address);

    await expect(
      futureLimit
        .connect(user0)
        .createDecreaseOrder(
          usdc.address,
          weth.address,
          user0.address,
          true,
          3e3 * 1e6,
          expandDecimals(1, 18),
          expandDecimals(4, 18),
          1e10,
          {
            value: 1e10,
          }
        )
    )
      .to.emit(futureLimit, "CreateDecreaseOrder")
      .withArgs(user0.address, 0)
      .to.emit(futureLimit, "UpdateDecreaseOrder")
      .withArgs(
        usdc.address,
        weth.address,
        user0.address,
        true,
        3e3 * 1e6,
        expandDecimals(1, 18),
        expandDecimals(4, 18),
        1e10,
        0,
        Operation.create,
        ExecStatus.pendingExec,
        DecreaseExecType.takeProfit
      );

    expect(await getEthBalance(futureLimit.address)).to.equal(
      flEthBalance.toBigInt() + BigInt(1e10)
    );

    const order = await futureLimit.decreaseOrders(user0.address, 0);
    expect(order.collateralToken).to.equal(usdc.address);
    expect(order.indexToken).to.equal(weth.address);
    expect(order.account).to.equal(user0.address);
    expect(order.isLong).to.equal(true);
    expect(order.notionalDelta).to.equal(3e3 * 1e6);
    expect(order.minSizeDelta).to.equal(expandDecimals(1, 18));
    expect(order.maxSizeDelta).to.equal(expandDecimals(4, 18));
    expect(order.execFee).to.equal(1e10);
  });

  it("updateDecreaseOrder", async function () {
    let orderIndex = 0;
    await expect(
      futureLimit
        .connect(user1)
        .updateDecreaseOrder(
          user0.address,
          orderIndex,
          3e3 * 1e6,
          expandDecimals(1, 18),
          expandDecimals(4, 18)
        )
    ).to.be.revertedWith("invalid_router");
    await expect(
      futureLimit
        .connect(user0)
        .updateDecreaseOrder(
          user0.address,
          orderIndex,
          3e3 * 1e6,
          expandDecimals(1, 18),
          expandDecimals(4, 18)
        )
    ).to.be.revertedWith("non_exist_order");

    await usdc.transfer(future.address, 1e3 * 1e6);
    await future
      .connect(user0)
      .increasePosition(usdc.address, weth.address, user0.address, true, 3e3 * 1e6);
    await futureLimit
      .connect(user0)
      .createDecreaseOrder(
        usdc.address,
        weth.address,
        user0.address,
        true,
        3e3 * 1e6,
        expandDecimals(1, 18),
        expandDecimals(4, 18),
        1e10,
        { value: 1e10 }
      );

    await expect(
      futureLimit.connect(user0).updateDecreaseOrder(user0.address, orderIndex, 3e3 * 1e6, 0, 0)
    ).to.be.revertedWith("invalid_size_delta");
    await expect(
      futureLimit
        .connect(user0)
        .updateDecreaseOrder(user0.address, orderIndex, 3e3 * 1e6, expandDecimals(4, 18), 0)
    ).to.be.revertedWith("invalid_open_price");
    await expect(
      futureLimit
        .connect(user0)
        .updateDecreaseOrder(user0.address, orderIndex, 3e3 * 1e6, 0, expandDecimals(1, 18))
    ).to.be.revertedWith("invalid_open_price");
    await expect(
      futureLimit
        .connect(user0)
        .updateDecreaseOrder(
          user0.address,
          orderIndex,
          0,
          expandDecimals(1, 18),
          expandDecimals(4, 18)
        )
    ).to.be.revertedWith("invalid_notional_delta");
    // await expect(
    //   futureLimit
    //     .connect(user0)
    //     .updateDecreaseOrder(
    //       user0.address,
    //       orderIndex,
    //       4e3 * 1e6,
    //       expandDecimals(1, 18),
    //       expandDecimals(4, 18)
    //     )
    // ).to.be.revertedWith("notional_delta_exceed");

    let order = await futureLimit.decreaseOrders(user0.address, orderIndex);
    await expect(
      futureLimit
        .connect(user0)
        .updateDecreaseOrder(
          user0.address,
          orderIndex,
          1e3 * 1e6,
          expandDecimals(3, 17),
          expandDecimals(4, 18)
        )
    )
      .to.be.emit(futureLimit, "EditDecreaseOrder")
      .withArgs(user0.address, orderIndex)
      .to.be.emit(futureLimit, "UpdateDecreaseOrder")
      .withArgs(
        order.collateralToken,
        order.indexToken,
        order.account,
        order.isLong,
        1e3 * 1e6,
        expandDecimals(3, 17),
        expandDecimals(4, 18),
        order.execFee,
        orderIndex,
        Operation.update,
        ExecStatus.pendingExec,
        DecreaseExecType.takeProfit
      );

    order = await futureLimit.decreaseOrders(user0.address, orderIndex);
    expect(order.notionalDelta).to.equal(1e3 * 1e6);
    expect(order.minSizeDelta).to.equal(expandDecimals(3, 17));
    expect(order.maxSizeDelta).to.equal(expandDecimals(4, 18));
  });

  it("cancelDecreaseOrder", async function () {
    let orderIndex = 0;
    await expect(
      futureLimit.connect(user1).cancelDecreaseOrder(user0.address, orderIndex, user0.address)
    ).to.be.revertedWith("invalid_router");
    await expect(
      futureLimit.connect(user0).cancelDecreaseOrder(user0.address, orderIndex, user0.address)
    ).to.be.revertedWith("non_exist_order");

    await usdc.transfer(future.address, 1e3 * 1e6);
    await future
      .connect(user0)
      .increasePosition(usdc.address, weth.address, user0.address, true, 3e3 * 1e6);
    await futureLimit
      .connect(user0)
      .createDecreaseOrder(
        usdc.address,
        weth.address,
        user0.address,
        true,
        3e3 * 1e6,
        expandDecimals(1, 18),
        expandDecimals(4, 18),
        1e10,
        { value: 1e10 }
      );
    let user1EthBalance = await getEthBalance(user1.address);
    let flEthBalance = await getEthBalance(futureLimit.address);

    let order = await futureLimit.decreaseOrders(user0.address, orderIndex);
    await expect(
      futureLimit.connect(user0).cancelDecreaseOrder(user0.address, orderIndex, user1.address)
    )
      .to.be.emit(futureLimit, "CancelDecreaseOrder")
      .withArgs(user0.address, orderIndex)
      .to.be.emit(futureLimit, "UpdateDecreaseOrder")
      .withArgs(
        order.collateralToken,
        order.indexToken,
        order.account,
        order.isLong,
        order.notionalDelta,
        order.minSizeDelta,
        order.maxSizeDelta,
        order.execFee,
        orderIndex,
        Operation.cancel,
        ExecStatus.cancel,
        DecreaseExecType.takeProfit
      );
    expect(await getEthBalance(user1.address)).to.equal(
      user1EthBalance.toBigInt() + order.execFee.toBigInt()
    );
    expect(await getEthBalance(futureLimit.address)).to.equal(
      flEthBalance.toBigInt() - order.execFee.toBigInt()
    );
    order = await futureLimit.decreaseOrders(user0.address, orderIndex);
    expect(order.account).to.equal(ethers.constants.AddressZero);
  });

  it("execDecreaseOrder", async function () {
    let orderIndex = 0;
    await expect(
      futureLimit
        .connect(user1)
        .execDecreaseOrder(user0.address, orderIndex, user1.address, user1.address)
    ).to.be.revertedWith("invalid_router");
    await expect(
      futureLimit
        .connect(user0)
        .execDecreaseOrder(user0.address, orderIndex, user1.address, user1.address)
    ).to.be.revertedWith("non_exist_order");

    await usdc.transfer(future.address, 1e3 * 1e6);
    await future
      .connect(user0)
      .increasePosition(usdc.address, weth.address, user0.address, true, 3e3 * 1e6);
    await futureLimit
      .connect(user0)
      .createDecreaseOrder(
        usdc.address,
        weth.address,
        user0.address,
        true,
        3e3 * 1e6,
        expandDecimals(1, 18),
        expandDecimals(22, 17),
        1e10,
        { value: 1e10 }
      );

    let order = await futureLimit.decreaseOrders(user0.address, orderIndex);
    await fastPriceFeed
      .connect(updater0)
      .setPrices(
        [weth.address, usdc.address],
        [expandDecimals(1500, 30), expandDecimals(1, 30)],
        await getLatestBlockTime()
      );

    let validRes = await futureLimit.validateDecreaseOrderPrice(user0.address, orderIndex, false);
    expect(validRes.stopLossValid).to.equal(false);
    expect(validRes.takeProfitValid).to.equal(false);
    await expect(
      futureLimit
        .connect(user0)
        .execDecreaseOrder(user0.address, orderIndex, user2.address, user2.address)
    ).to.be.revertedWith("price_not_triggered");

    await fastPriceFeed.connect(updater0).setPrices(
      [weth.address, usdc.address],
      [expandDecimals(1250, 30), expandDecimals(1, 30)], // pnl = 500
      await getLatestBlockTime()
    );
    validRes = await futureLimit.validateDecreaseOrderPrice(user0.address, orderIndex, false);
    expect(validRes.stopLossValid).to.equal(true);
    expect(validRes.takeProfitValid).to.equal(false);

    let user2EthBalance = await getEthBalance(user2.address);
    let flEthBalance = await getEthBalance(futureLimit.address);
    let user2UsdcBalance = await usdc.balanceOf(user2.address);

    let pairKey = await future.getPairKey(usdc.address, weth.address)

    await expect(
      futureLimit
        .connect(user0)
        .execDecreaseOrder(user0.address, orderIndex, user2.address, user2.address)
    )
      .to.be.emit(futureLimit, "ExecDecreaseOrder")
      .withArgs(user0.address, orderIndex)
      .to.be.emit(futureLimit, "UpdateDecreaseOrder")
      .withArgs(
        order.collateralToken,
        order.indexToken,
        order.account,
        order.isLong,
        order.notionalDelta,
        order.minSizeDelta,
        order.maxSizeDelta,
        order.execFee,
        orderIndex,
        Operation.exec,
        ExecStatus.success,
        DecreaseExecType.stopLoss
      );

    expect(await getEthBalance(futureLimit.address)).to.equal(
      flEthBalance.toBigInt() - order.execFee.toBigInt()
    );
    expect(await getEthBalance(user2.address)).to.equal(
      user2EthBalance.toBigInt() + order.execFee.toBigInt()
    );
    expect(await usdc.balanceOf(user2.address)).gt(user2UsdcBalance);

    let pos = await future.getPosition(
      order.collateralToken,
      order.indexToken,
      order.account,
      order.isLong
    );
    expect(pos.margin).to.lte(1e3 * 1e6);
    expect(pos.openNotional).to.equal(BigInt(3e3 * 1e6) - order.notionalDelta.toBigInt());
    expect(pos.size).to.lt(expandDecimals(2, 18));

    order = await futureLimit.decreaseOrders(user0.address, orderIndex);
    expect(order.account).to.equal(ethers.constants.AddressZero);

    // take profit
    await fastPriceFeed
      .connect(updater0)
      .setPrices(
        [weth.address, usdc.address],
        [expandDecimals(1500, 30), expandDecimals(1, 30)],
        await getLatestBlockTime()
      );
    await usdc.transfer(future.address, 1e3 * 1e6);
    await future
      .connect(user0)
      .increasePosition(usdc.address, weth.address, user0.address, true, 3e3 * 1e6);
    await futureLimit
      .connect(user0)
      .createDecreaseOrder(
        usdc.address,
        weth.address,
        user0.address,
        true,
        3e3 * 1e6,
        expandDecimals(1, 18),
        expandDecimals(3, 18),
        1e10,
        { value: 1e10 }
      );
    orderIndex += 1;
    order = await futureLimit.decreaseOrders(user0.address, orderIndex);
    await fastPriceFeed
      .connect(updater0)
      .setPrices(
        [weth.address, usdc.address],
        [expandDecimals(4000, 30), expandDecimals(1, 30)],
        await getLatestBlockTime()
      );

    validRes = await futureLimit.validateDecreaseOrderPrice(user0.address, orderIndex, false);
    expect(validRes.stopLossValid).to.equal(false);
    expect(validRes.takeProfitValid).to.equal(true);

    user2EthBalance = await getEthBalance(user2.address);
    flEthBalance = await getEthBalance(futureLimit.address);
    user2UsdcBalance = await usdc.balanceOf(user2.address);

    await expect(
      futureLimit
        .connect(user0)
        .execDecreaseOrder(user0.address, orderIndex, user2.address, user2.address)
    )
      .to.be.emit(futureLimit, "ExecDecreaseOrder")
      .withArgs(user0.address, orderIndex)
      .to.be.emit(futureLimit, "UpdateDecreaseOrder")
      .withArgs(
        order.collateralToken,
        order.indexToken,
        order.account,
        order.isLong,
        order.notionalDelta,
        order.minSizeDelta,
        order.maxSizeDelta,
        order.execFee,
        orderIndex,
        Operation.exec,
        ExecStatus.success,
        DecreaseExecType.takeProfit
      );
    expect(await getEthBalance(futureLimit.address)).to.equal(
      flEthBalance.toBigInt() - order.execFee.toBigInt()
    );
    expect(await getEthBalance(user2.address)).to.equal(
      user2EthBalance.toBigInt() + order.execFee.toBigInt()
    );
    expect(await usdc.balanceOf(user2.address)).gt(user2UsdcBalance.toBigInt() + BigInt(1e3 * 1e6));
    pos = await future.getPosition(
      order.collateralToken,
      order.indexToken,
      order.account,
      order.isLong
    );
    expect(pos.margin).to.lte(1e3 * 1e6);
    expect(pos.openNotional).to.equal(BigInt(3e3 * 1e6) - order.notionalDelta.toBigInt());
    expect(pos.size).to.lt(expandDecimals(1, 18));

    order = await futureLimit.decreaseOrders(user0.address, orderIndex);
    expect(order.account).to.equal(ethers.constants.AddressZero);
  });
});
