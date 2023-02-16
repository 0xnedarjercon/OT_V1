import {
  FastPriceFeed,
  Future,
  FutureLimit,
  FuturePriceFeed,
  FutureReader,
  FutureRouter,
  FutureUtil,
  MyERC20,
  Swap,
  TradeStakeUpdater
} from "../../typechain";
import * as helper from "../helper";

export const deployFutureRouter = async () => {
  console.log('startDeployFutureRouter')
  const futureRouter = (await helper.deployContract("FutureRouter", [
    helper.getDeployedAddress("future"),
    helper.getDeployedAddress("weth"),
    helper.getDeployedAddress("swap"),
    helper.getDeployedAddress("tradeStakeUpdater"),
    helper.getDeployedAddress('futureLimit'),
  ])) as FutureRouter;
  helper.setDeployedAddress("futureRouter", futureRouter.address);
  const tradeStakeUpdater = (await helper.getDeployedContract("TradeStakeUpdater", helper.getDeployedAddress('tradeStakeUpdater'))) as TradeStakeUpdater;
  await tradeStakeUpdater.setCaller(futureRouter.address, true);

  const future = (await helper.getDeployedContract(
    "Future",
    helper.getDeployedAddress("future")
  )) as Future;

  const swap = (await helper.getDeployedContract(
    "Swap",
    helper.getDeployedAddress('swap')
  )) as Swap;

  await future.setSystemRouter(futureRouter.address, true);

  const futureLimit = (await helper.getDeployedContract('FutureLimit', helper.getDeployedAddress('futureLimit'))) as FutureLimit
  await futureLimit.setSystemRouter(futureRouter.address, true)

  const usdcContract = (await helper.getDeployedContract(
    "MyERC20",
    helper.getDeployedAddress("usdc")
  )) as MyERC20;

  await usdcContract.approve(futureRouter.address, 1000e6);
  await futureRouter.increaseInsuranceFund(helper.getDeployedAddress("usdc"), 1000e6);

  // btc -> osd
  const osdAddress = await helper.getDeployedAddress('osd')
  const btcAddress = await helper.getDeployedAddress('btc')
  const btcContract = (await helper.getDeployedContract(
    "MyERC20",
    helper.getDeployedAddress("btc")
  )) as MyERC20;
  const osdContract = (await helper.getDeployedContract(
    "MyERC20",
    helper.getDeployedAddress("osd")
  )) as MyERC20;
  const expectAmountOut = '20000000000000000000000'
  const approveAmount = '10000000000000000000000'
  const amountInBtc = await swap.getAmountIn(btcAddress, osdAddress, expectAmountOut)
  await btcContract.approve(swap.address, amountInBtc)
  const nextBlockTimestamp = Math.floor(new Date().getTime() / 1000) + 100 * 60
  await swap.swapIn(btcAddress, osdAddress, amountInBtc, '2000000000000000000000', await swap.signer.getAddress(), nextBlockTimestamp)

  // add osd
  await osdContract.approve(futureRouter.address, approveAmount);
  await futureRouter.increaseInsuranceFund(helper.getDeployedAddress("osd"), approveAmount);
};

if (require.main == module) {
  deployFutureRouter()
    .then(() => {
      process.exit(0);
    })
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
