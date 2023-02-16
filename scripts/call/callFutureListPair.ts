import {
  FastPriceFeed,
  Future,
  FutureLimit,
  FutureReader,
  FutureRouter,
  FutureUtil,
  MyERC20,
  Reader,
  Swap,
  SwapPriceProxy,
} from "../../typechain";
import * as helper from "../helper";
import {
  calcCollateralLiqPrice,
  calcIndexLiqPrice,
  calcMr,
  calcOpIncreasePosition,
  LEVERAGE_PRECISION,
  opDecreaseMargin,
  opDecreasePosition,
  opIncreaseMargin,
  opIncreasePosition,
  parseGetPairs2,
  parseGetPositionList2,
} from "../../helper/future";
import { sleep } from "zksync-web3/build/src/utils";

const main1 = async () => {
  const wethAddr = helper.getDeployedAddress("weth");
  const btcAddr = helper.getDeployedAddress('btc');
  const osdAddr = helper.getDeployedAddress("osd");

  const osd = (await helper.getDeployedContract("MyERC20", osdAddr)) as MyERC20;
  const future = (await helper.getDeployedContract(
    "Future",
    helper.getDeployedAddress("future")
  )) as Future;

  await future.listPair(osdAddr, btcAddr);
  console.log(`future.listPair weth/osd done`);
  await future.setMaxLeverage(osdAddr, btcAddr, 3000, 30e9);
  await future.setMarginRatio(osdAddr, btcAddr, 5e6, 5e7);
  await future.setTradingFeeRate(osdAddr, btcAddr, 1e6, 5e8);
  console.log(`future.set weth/osd done`);
};

const main = async () => {
  await main1();
};

main()
  .then(() => {
    process.exit(0);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
