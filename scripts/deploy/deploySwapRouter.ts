import { TradeStakeUpdater } from "../../typechain";
import * as helper from "../helper";

export async function deploySwapRouter() {
  console.log("start deploy swapRouter");
  const swapRouter = await helper.deployContract("SwapRouter", [
    helper.getDeployedAddress("weth"),
    helper.getDeployedAddress("swap"),
    helper.getDeployedAddress("osd"),
    helper.getDeployedAddress("tradeStakeUpdater")
  ]);
  helper.setDeployedAddress("swapRouter", swapRouter.address);
  const tradeStakeUpdater = (await helper.getDeployedContract("TradeStakeUpdater", helper.getDeployedAddress('tradeStakeUpdater'))) as TradeStakeUpdater;
  await tradeStakeUpdater.setCaller(swapRouter.address, true);
  console.log(`end deploy SwapRouter ${swapRouter.address}`);
}

if (require.main == module) {
  deploySwapRouter()
    .then(() => {
      process.exit(0);
    })
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
