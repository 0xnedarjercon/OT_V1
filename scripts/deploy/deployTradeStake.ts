import { MyERC20, TradeStake, OT } from "../../typechain";
import * as helper from "../helper";
import { BigNumber, BigNumberish } from "ethers";

function e(num: BigNumberish, exp: BigNumberish) {
  return BigNumber.from(10).pow(exp).mul(num);
}

export async function deployTradeStake() {
  const tradeStake = (await helper.deployContract("TradeStake", [])) as TradeStake;
  await tradeStake.deployTransaction.wait()
  const ot = (await helper.getDeployedContract("OT", helper.getDeployedAddress('ot'))) as OT;
  helper.setDeployedAddress('tradeStake', tradeStake.address)
  console.log('setMinter')
  await ot.transfer(tradeStake.address, '100000000000000000000000')
  console.log('setRewardToken')
  await tradeStake.setRewardToken(ot.address);
  console.log('setRewardPerUnit')
  await tradeStake.setRewardPerUnit(e(10, 18));
  console.log(`deploy tradeStake ${tradeStake.address}`)
};

if (require.main == module) {
  deployTradeStake()
    .then(() => {
      process.exit(0);
    })
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
