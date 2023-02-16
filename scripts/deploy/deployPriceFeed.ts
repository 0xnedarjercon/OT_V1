import { FastPriceEvent, FastPriceFeed, MyERC20 } from "../../typechain";
import * as helper from "../helper";

const main = async () => {
  const fastPriceEvent = (await helper.deployContract("FastPriceEvent", [])) as FastPriceEvent;
  console.log("fastPriceEvent deployed to ", fastPriceEvent.address);

  const priceDuration = 1800; // 30 minutes
  const minBlockInterval = 5;
  const maxDeviationBasicPoints = 250;
  const fastPriceFeed = (await helper.deployContract("FastPriceFeed", [
    priceDuration,
    minBlockInterval,
    maxDeviationBasicPoints,
    fastPriceEvent.address,
  ])) as FastPriceFeed;
  console.log("fastPriceFeed deployed to ", fastPriceFeed.address);

  await fastPriceEvent.setIsPriceFeed(fastPriceFeed.address, true)

  console.log("fastPriceFeed.setMaxTimeDeviation...");
  await fastPriceFeed.setMaxTimeDeviation(10 * 60);

  console.log("setUpdater ", "0x12804db7a21393631a1550f626e735b1c885e4cd", "...");
  await fastPriceFeed.setUpdater("0x12804Db7A21393631A1550F626E735b1C885E4Cd", true);

  const swapPriceProxy = await helper.deployContract("SwapPriceProxy", [fastPriceFeed.address]);
  console.log("swapPriceProxy deployed to ", swapPriceProxy.address);

  helper.setDeployedAddress("fastPriceEvent", fastPriceEvent.address);
  helper.setDeployedAddress("fastPriceFeed", fastPriceFeed.address);
  helper.setDeployedAddress("swapPriceProxy", swapPriceProxy.address);
};

main()
  .then(() => {
    process.exit(0);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
