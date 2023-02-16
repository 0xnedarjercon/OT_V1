import * as hre from "hardhat";
import { MyERC20 } from "../../typechain";
import * as helper from "../helper";
import * as zk from "zksync-web3";
import { ethers } from "hardhat";

const main = async () => {
  const lunaAddress = helper.getDeployedAddress("luna");
  console.log("address", lunaAddress);
  const luna = (await helper.getDeployedContract("MyERC20", lunaAddress)) as MyERC20;
  const tx = await luna.transfer("0x0855D91A0A677534A4167E702Fc763Ff548aBe2C", 3);
  console.log("tx", tx);
  const receipt = await tx.wait();
  console.log("receipt", receipt);
};

main()
  .then(() => {
    process.exit(0);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
