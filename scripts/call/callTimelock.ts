import {
  Timelock,
  Greeter
} from "../../typechain";
import * as helper from "../helper";

const sleep = function (second: number) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve()
    }, second * 1000);
  })
}

const main = async () => {
  const timelock = (await helper.getDeployedContract(
    "Timelock",
    helper.getDeployedAddress("timelock")
  )) as Timelock;
  const greeter = (await helper.getDeployedContract(
    "Greeter",
    helper.getDeployedAddress("greeter")
  )) as Greeter;
  console.log("timelock", timelock.address)
  // owner
  console.log("greeter", greeter.address)
  // await greeter.setGreeting("world")
  // const time = Math.floor((new Date().getTime()) / 1000 + 70)
  const time = 1670909324
  const calldata = timelock.interface.encodeFunctionData("setPendingAdmin", ['0x330B2a0F1338dC10c626BaEBda7670265A5925Cc'])
  const target = timelock.address
  const value = '0'
  const signature = ''
  const data = calldata
  const eta = time
  console.log(target, value, signature, data, eta)
  // 向执行队列提交交易
  // const resp = await timelock.queueTransaction(target, value, signature, data, eta)
  // console.log("resp", resp)
  // await sleep(70)
  // 执行已提交交易
  const resp2 = await timelock.executeTransaction(target, value, signature, data, eta)
  console.log("resp2", resp2)
}
main()
  .then(() => {
    process.exit(0);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
