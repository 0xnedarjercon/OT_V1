import { expandDecimals } from "../../test/helpers";
import {
  FastPriceFeed,
  Future,
  FutureReader,
  FutureRouter,
  FutureUtil,
  MyERC20,
  Reader,
  Swap,
  SwapPriceProxy,
  VariableBorrow,
} from "../../typechain";
import * as helper from "../helper";

const main = async () => {
  const borrowAddr = helper.getDeployedAddress("borrow");
  const usdcAddr = helper.getDeployedAddress("usdc");
  const borrow = (await helper.getDeployedContract("VariableBorrow", borrowAddr)) as VariableBorrow;
  const tx = await borrow.extractProtocolRevenue(usdcAddr, {
    gasLimit: 1012888,
  })
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
