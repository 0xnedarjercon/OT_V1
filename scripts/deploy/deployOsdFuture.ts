import { expandDecimals } from "../../test/helpers";
import {
  FastPriceFeed,
  Future,
  FuturePriceFeed,
  FutureReader,
  FutureRouter,
  FutureUtil,
  MyERC20,
} from "../../typechain";
import * as helper from "../helper";

export const deployOsdFuture = async () => {
  const future = (await helper.getDeployedContract(
    "Future",
    helper.getDeployedAddress("future")
  )) as Future;
  const futureReader = (await helper.getDeployedContract(
    "FutureReader",
    helper.getDeployedAddress("futureReader")
  )) as FutureReader;
  const fastPriceFeed = (await helper.getDeployedContract(
    "FastPriceFeed",
    helper.getDeployedAddress("fastPriceFeed")
  )) as FastPriceFeed;

  await (
    await fastPriceFeed.setPrices(
      [helper.getDeployedAddress("osd")],
      [expandDecimals(1, 30)],
      Math.round(Date.now() / 1e3)
    )
  ).wait();

  const feeTo = "0x09a31793fd6968D2849B9C437ea5D23d7dd3d030";
  const feeCapture = await helper.deployContract("FutureTradeFeeCapture", [feeTo]);

  const osd = helper.getDeployedAddress("osd");
  const weth = helper.getDeployedAddress("weth");
  const btc = helper.getDeployedAddress("btc");

  await future.listPair(osd, weth);
  console.log(`future.listPair weth/osd done`);
  await future.setMaxLeverage(osd, weth, 3000, 30e9);
  await future.setMarginRatio(osd, weth, 5e6, 5e7);
  await future.setTradingFeeRate(osd, weth, 1e6, 5e8);
  await future.setCustomSwapPool(osd, weth, feeCapture.address);
  console.log(`future.set weth/osd done`);

  await future.listPair(osd, btc);
  console.log(`future.listPair btc/osd done`);
  await future.setMaxLeverage(osd, btc, 3000, 30e9);
  await future.setMarginRatio(osd, btc, 5e6, 5e7);
  await future.setTradingFeeRate(osd, btc, 1e6, 5e8);
  await future.setCustomSwapPool(osd, btc, feeCapture.address);
  console.log(`future.set btc/osd done`);

  const pairs = await futureReader.getPairs();
  const collTokens = [...pairs.collTokens, osd, osd];
  const idxTokens = [...pairs.idxTokens, weth, btc];

  await futureReader.setPairs(collTokens, idxTokens);
  console.log("update futureReader pairs done");
};

if (require.main == module) {
  deployOsdFuture()
    .then(() => {
      process.exit(0);
    })
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
