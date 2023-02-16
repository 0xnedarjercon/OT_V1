import * as helper from "../helper";
import { Greeter } from "../../typechain/Greeter";

export async function deployGreeter() {
  const greeter = (await helper.deployContract("Greeter", [
    "Hello"
  ])) as Greeter;
  const timelock = helper.getDeployedAddress('timelock');
  await greeter.transferOwnership(timelock);
  helper.setDeployedAddress('greeter', greeter.address);
  console.log('end deploy greeter')
};

if (require.main == module) {
  deployGreeter()
    .then(() => {
      process.exit(0);
    })
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
