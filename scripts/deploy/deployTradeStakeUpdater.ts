import { TradeStake } from "../../typechain";
import * as helper from "../helper";
import { BigNumber, BigNumberish } from "ethers";
import { TradeStakeUpdater } from "../../typechain/TradeStakeUpdater";

function e(num: BigNumberish, exp: BigNumberish) {
  return BigNumber.from(10).pow(exp).mul(num);
}

export async function deployTradeStakeUpdater()  {
  const swapAddress = helper.getDeployedAddress('swap');
  const oracleAddress = helper.getDeployedAddress('oracle');
  const futureAddress = helper.getDeployedAddress('future');
  const tradeStakeAddress = helper.getDeployedAddress('tradeStake');
  const tradeStakeUpdater = (await helper.deployContract("TradeStakeUpdater", [
    swapAddress,
    oracleAddress,
    futureAddress,
    tradeStakeAddress
  ])) as TradeStakeUpdater;
  const tradeStake = (await helper.getDeployedContract("TradeStake", helper.getDeployedAddress("tradeStake"))) as TradeStake;
  helper.setDeployedAddress('tradeStakeUpdater', tradeStakeUpdater.address)
  await tradeStake.setUpdater(tradeStakeUpdater.address, true);
  console.log(`deploy tradeStakeUpdater ${tradeStakeUpdater.address}`)
};

if (require.main == module) {
  deployTradeStakeUpdater()
    .then(() => {
      process.exit(0);
    })
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
