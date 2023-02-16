import { FastPriceEvent, FastPriceFeed, Faucet, MyERC20, StakeRevenue, Swap } from "../../typechain";
import * as helper from "../helper";
import { BigNumber, BigNumberish } from "ethers";
import { Stake } from "../../typechain/Stake";

function e(num: BigNumberish, exp: BigNumberish) {
  return BigNumber.from(10).pow(exp).mul(num);
}

export async function deployStakeRevenue() {
  const daiAddress = await helper.getDeployedAddress("dai");
  const btcAddress = await helper.getDeployedAddress("btc");
  const usdcAddress = await helper.getDeployedAddress("usdc");
  // 部署挖矿奖励token
  const ot = (await helper.getDeployedContract(
    "MyERC20",
    helper.getDeployedAddress("ot")
  )) as MyERC20;
  const rewardToken = ot;
  // 部署挖矿合约
  console.log("ot.address", ot.address)
  const stake = (await helper.deployContract("StakeRevenue", [ot.address])) as StakeRevenue;
  console.log('end deploy StakeRevenue')
  // 设置挖矿合约可以mint
  await stake.addRevenueToken(btcAddress);
  await stake.addRevenueToken(daiAddress);
  await stake.addRevenueToken(usdcAddress);
  helper.setDeployedAddress('stakeRevenue', stake.address)
  console.log('end config stake')
};

if (require.main == module) {
  deployStakeRevenue()
    .then(() => {
      process.exit(0);
    })
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
