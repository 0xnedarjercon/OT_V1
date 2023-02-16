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
  const futureReader = (await helper.getDeployedContract("FutureReader",
    helper.getDeployedAddress('futureReader')
  )) as FutureReader;
  await futureReader.setPairs(
    [helper.getDeployedAddress("usdc"), helper.getDeployedAddress("usdc"), helper.getDeployedAddress('osd'), helper.getDeployedAddress('osd')],
    [helper.getDeployedAddress("btc"), helper.getDeployedAddress("weth"), helper.getDeployedAddress('weth'), helper.getDeployedAddress('btc')],
  );

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
