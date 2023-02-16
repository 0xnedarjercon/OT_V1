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
import { BigNumber } from "ethers";

const main = async () => {
  const osdContract = (await helper.getDeployedContract(
    "MyERC20",
    helper.getDeployedAddress("osd")
  )) as MyERC20;
  const futureRouter = (await helper.getDeployedContract(
    "FutureRouter",
    helper.getDeployedAddress('futureRouter')
  )) as FutureRouter;
  await osdContract.approve(futureRouter.address, '10000000000000000000000');
  await futureRouter.increaseInsuranceFund(helper.getDeployedAddress("osd"), '10000000000000000000000');
};

main()
  .then(() => {
    process.exit(0);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
