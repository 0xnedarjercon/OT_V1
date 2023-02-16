import {
  FastPriceFeed,
  Future,
  FutureRouter,
  FutureUtil,
  MyERC20,
  Reader,
  Swap,
  SwapPriceProxy,
} from "../../typechain";
import * as helper from "../helper";

const main = async () => {
  const usdcAddr = helper.getDeployedAddress("usdc");
  const wethAddr = helper.getDeployedAddress("weth");
  const usdc = (await helper.getDeployedContract("MyERC20", usdcAddr)) as MyERC20;
  const swap = (await helper.getDeployedContract(
    "Swap",
    helper.getDeployedAddress("swap")
  )) as Swap;

  const reader = (await helper.getDeployedContract(
    "Reader",
    helper.getDeployedAddress("reader")
  )) as Reader;

  const swapPriceProxy = (await helper.getDeployedContract(
    "SwapPriceProxy",
    helper.getDeployedAddress("swapPriceProxy")
  )) as SwapPriceProxy;

  console.log("proxy", await swapPriceProxy.feed());

  console.log(await swap.priceFeed(), "priceFeed");

  console.log(
    "bulkSwapPoolInfo",
    await reader.bulkSwapPoolInfo([
      "0x160736fa267cdc55f219407e769c5854ebbe19d7",
      "0x440b4f63674b5cc4b1fe3021eca276c49518db27",
      "0x5c2d4b1c8ab6764cd67c0a9c0f92ea40ab7a673c",
      "0x67dfa871ef70c2c1c50d77b7dfee5723d9f516b4",
      "0x89e8996a909b4d6207b1fca6553f40febf45ef87",
    ])
  );
  console.log(
    "bulkSwapRatio",
    await reader.bulkSwapRatio([
      "0x160736fa267cdc55f219407e769c5854ebbe19d7",
      "0x440b4f63674b5cc4b1fe3021eca276c49518db27",
      "0x5c2d4b1c8ab6764cd67c0a9c0f92ea40ab7a673c",
      "0x67dfa871ef70c2c1c50d77b7dfee5723d9f516b4",
      "0x89e8996a909b4d6207b1fca6553f40febf45ef87",
    ])
  );
};

main()
  .then(() => {
    process.exit(0);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
