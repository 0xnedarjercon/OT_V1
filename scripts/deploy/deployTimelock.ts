import { FastPriceEvent, FastPriceFeed, Faucet, MyERC20, Swap } from "../../typechain";
import * as helper from "../helper";
import { BigNumber, BigNumberish } from "ethers";
import { Timelock } from "../../typechain";

function e(num: BigNumberish, exp: BigNumberish) {
  return BigNumber.from(10).pow(exp).mul(num);
}

export async function deployTimelock() {
  // 部署挖矿合约
  const wallet = await helper.getWallet()
  const timelock = (await helper.deployContract("Timelock", [
    wallet.address,
    60
  ])) as Timelock;
  console.log('end deploy timelock')
  helper.setDeployedAddress('timelock', timelock.address);
};

if (require.main == module) {
  deployTimelock()
    .then(() => {
      process.exit(0);
    })
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
