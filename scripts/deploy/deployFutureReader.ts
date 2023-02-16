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

export const deployFutureReader = async () => {
  const futureReader = (await helper.deployContract("FutureReader", [
    helper.getDeployedAddress("future"),
  ])) as FutureReader;
  helper.setDeployedAddress("futureReader", futureReader.address);

  await futureReader.setPairs(
    [helper.getDeployedAddress("usdc"), helper.getDeployedAddress("usdc"), helper.getDeployedAddress('osd'), helper.getDeployedAddress('osd')],
    [helper.getDeployedAddress("btc"), helper.getDeployedAddress("weth"), helper.getDeployedAddress('weth'), helper.getDeployedAddress('btc')]
  );
};

if (require.main == module) {
  deployFutureReader()
    .then(() => {
      process.exit(0);
    })
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
