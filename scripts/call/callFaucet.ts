import * as hre from "hardhat";
import { Faucet } from "../../typechain";
import * as helper from "../helper";
import * as zk from "zksync-web3";
import { ethers } from "hardhat";

const main = async () => {
  const faucetAddress = helper.getDeployedAddress("faucet");
  console.log("address", faucetAddress);
  const faucet = (await helper.getDeployedContract("Faucet", faucetAddress)) as Faucet;
  const resp = await faucet.requestTokens('0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266');
  console.log("resp", resp);
};

main()
  .then(() => {
    process.exit(0);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
