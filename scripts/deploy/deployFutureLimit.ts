import { ethers } from "hardhat";
import {
  FastPriceFeed,
  Future,
  FuturePriceFeed,
  FutureRouter,
  FutureUtil,
  MyERC20,
} from "../../typechain";
import { FutureLimit } from "../../typechain/FutureLimit";
import * as helper from "../helper";

export const deployFutureLimit = async () => {
    console.log('start deployFutureLimit')
    const minExecFee = 1e13
    const future = (await helper.getDeployedContract('Future', helper.getDeployedAddress('future'))) as Future
    const futureLimit = (await helper.deployContract('FutureLimit', [
        future.address,
        minExecFee
    ])) as FutureLimit
    helper.setDeployedAddress("futureLimit", futureLimit.address);
    await future.setSystemRouter(futureLimit.address, true)
    console.log('end deployFutureLimit')
}


if (require.main == module) {
    deployFutureLimit()
      .then(() => {
        process.exit(0);
      })
      .catch((e) => {
        console.error(e);
        process.exit(1);
      });
  }
  