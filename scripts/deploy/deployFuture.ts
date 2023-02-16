import { ethers } from "hardhat";
import {
  FastPriceFeed,
  Future,
  FuturePriceFeed,
  FutureRouter,
  FutureUtil,
  MyERC20,
  Swap,
} from "../../typechain";
import * as helper from "../helper";
import { deployFutureLimit } from "./deployFutureLimit";
import { deployFutureReader } from "./deployFutureReader";
import { deployFutureRouter } from "./deployFutureRouter";
import { deployOsdFuture } from "./deployOsdFuture";

export const deployFuture = async () => {
  const future = (await helper.deployContract("Future", [])) as Future;
  helper.setDeployedAddress("future", future.address);
  const futureUtil = (await helper.deployContract("FutureUtil", [future.address])) as FutureUtil;
  helper.setDeployedAddress("futureUtil", futureUtil.address);
  const futurePriceFeed = (await helper.deployContract("FuturePriceFeed", [])) as FuturePriceFeed;
  helper.setDeployedAddress("futurePriceFeed", futurePriceFeed.address);

  await futurePriceFeed.setFastPriceFeed(helper.getDeployedAddress("fastPriceFeed"));
  await future.setPriceFeed(helper.getDeployedAddress("futurePriceFeed"));
  await future.setFutureUtil(helper.getDeployedAddress("futureUtil"));
  const usdc = helper.getDeployedAddress("usdc");
  const weth = helper.getDeployedAddress("weth");
  const btc = helper.getDeployedAddress("btc");
  const osd = helper.getDeployedAddress('osd');
  const link = helper.getDeployedAddress("link");

  const usdAddr = ethers.constants.AddressZero;
  await future.listPair(usdc, weth);
  console.log(`future.listPair weth/usdc done`);
  await future.setMaxLeverage(usdc, weth, 3000, 30e9);
  await future.setMarginRatio(usdc, weth, 5e6, 5e7);
  await future.setTradingFeeRate(usdc, weth, 1e6);
  await futureUtil.setFundingRateMultiplier(usdc, weth, 250000)
  console.log(`future.set weth/usdc done`);

  await future.listPair(usdc, btc);
  console.log(`future.listPair btc/usdc done`);
  await future.setMaxLeverage(usdc, btc, 3000, 30e9);
  await future.setMarginRatio(usdc, btc, 5e6, 5e7);
  await future.setTradingFeeRate(usdc, btc, 1e6);
  await futureUtil.setFundingRateMultiplier(usdc, btc, 250000)
  console.log(`future.set btc/usdc done`);

  await future.listPair(weth, usdAddr);
  console.log(`future.listPair weth/weth coin done`);
  await future.setMaxLeverage(weth, usdAddr, 3000, 30e9);
  await future.setMarginRatio(weth, usdAddr, 5e6, 5e7);
  await future.setTradingFeeRate(weth, usdAddr, 1e6);
  await futureUtil.setFundingRateMultiplier(weth, usdAddr, 250000)
  console.log(`future.set weth/weth coin done`);

  await future.listPair(link, usdAddr);
  console.log(`future.listPair btc/btc coin done`);
  await future.setMaxLeverage(link, usdAddr, 3000, 30e9);
  await future.setMarginRatio(link, usdAddr, 5e6, 5e7);
  await future.setTradingFeeRate(link, usdAddr, 1e6);
  await futureUtil.setFundingRateMultiplier(link, usdAddr, 250000)
  console.log(`future.set btc/btc coin done`);

  await future.listPair(osd, weth)
  console.log(`future.listPair weth/osd coin done`);
  await future.setMaxLeverage(osd, weth, 3000, 30e9);
  await future.setMarginRatio(osd, weth, 5e6, 5e7);
  await future.setTradingFeeRate(osd, weth, 1e6);
  await futureUtil.setFundingRateMultiplier(osd, weth, 250000)
  console.log(`future.set weth/osd coin done`);

  await future.listPair(osd, btc)
  console.log(`future.listPair btc/osd coin done`);
  await future.setMaxLeverage(osd, btc, 3000, 30e9);
  await future.setMarginRatio(osd, btc, 5e6, 5e7);
  await future.setTradingFeeRate(osd, btc, 1e6);
  await futureUtil.setFundingRateMultiplier(osd, btc, 250000)
  console.log(`future.set btc/osd coin done`);
};

if (require.main == module) {
  deployFuture()
    .then(() => {
      process.exit(0);
    })
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
