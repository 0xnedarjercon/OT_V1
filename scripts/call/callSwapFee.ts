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
  const swap = (await helper.getDeployedContract(
    "Swap",
    helper.getDeployedAddress("swap")
  )) as Swap;
  const revenueOsd = await swap.getRevenueOsd(usdcAddr)
  console.log(revenueOsd)
  // await swap.withdrawRevenueOsd(usdcAddr, await swap.signer.getAddress(), revenueOsd)
};

main()
  .then(() => {
    process.exit(0);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
