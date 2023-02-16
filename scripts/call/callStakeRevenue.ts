import { expandDecimals } from "../../test/helpers";
import { ERC20__factory, FastPriceEvent, FastPriceFeed, MyERC20, Reader, Stake, StakeRevenue, Swap, SwapPriceProxy, VariableBorrowRouter } from "../../typechain";
import * as helper from "../helper";

const main = async () => {
  {
    const btc = (await helper.getDeployedContract(
      "MyERC20",
      helper.getDeployedAddress("btc")
    )) as MyERC20;
    const dai = (await helper.getDeployedContract(
      "MyERC20",
      helper.getDeployedAddress("dai")
    )) as MyERC20;
    const usdc = (await helper.getDeployedContract(
      "MyERC20",
      helper.getDeployedAddress("usdc")
    )) as MyERC20;
    const stakeRevenue = (await helper.getDeployedContract(
      "StakeRevenue",
      helper.getDeployedAddress("stakeRevenue")
    )) as StakeRevenue;
    await btc.approve(stakeRevenue.address, 100000)
    await dai.approve(stakeRevenue.address, '1000000000000000000')
    await usdc.approve(stakeRevenue.address, 100000000)
    await stakeRevenue.addRevenue([
      btc.address,
      dai.address,
      usdc.address
    ], [
      100000,
      '1000000000000000000',
      100000000
    ])
  }
};

main()
  .then(() => {
    process.exit(0);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
