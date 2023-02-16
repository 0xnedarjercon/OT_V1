import {
  FastPriceFeed,
  Future,
  FutureRouter,
  FutureUtil,
  MyERC20,
  Reader,
  Swap,
  SwapPriceProxy,
  SwapRouter,
  WETH9,
} from "../../typechain";
import * as helper from "../helper";

const main = async () => {
  const wethAddr = helper.getDeployedAddress("weth");
  const swapRouter = (await helper.getDeployedContract(
    "SwapRouter",
    helper.getDeployedAddress("swapRouter")
  )) as SwapRouter;
  const nextBlockTimestamp = Math.floor(new Date().getTime() / 1000) + 100 * 60
  const wallet = await helper.getWallet()
  const resp = await swapRouter.addLiquidity(
    wethAddr,
    '100000000000000000',
    await swapRouter.signer.getAddress(),
    nextBlockTimestamp,
    {
      value: '100000000000000000'
    })
};

main()
  .then(() => {
    process.exit(0);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
