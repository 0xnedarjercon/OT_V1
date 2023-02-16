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

const main = async () => {
  const future = (await helper.getDeployedContract(
    "Future",
    helper.getDeployedAddress("future")
  )) as Future;
  const tx = await future.realizeProtocolFee(
    [helper.getDeployedAddress("usdc"), helper.getDeployedAddress("usdc"), helper.getDeployedAddress('osd'), helper.getDeployedAddress('osd')],
    [helper.getDeployedAddress("btc"), helper.getDeployedAddress("weth"), helper.getDeployedAddress('weth'), helper.getDeployedAddress('btc')]
  )
  console.log('tx', tx)
};

main()
  .then(() => {
    process.exit(0);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
