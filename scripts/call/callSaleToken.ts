import * as hre from "hardhat";
import { MyERC20, SaleToken } from "../../typechain";
import * as helper from "../helper";
import * as zk from "zksync-web3";
import { ethers } from "hardhat";

const main = async () => {
  const saleTokenAddress = helper.getDeployedAddress("saleToken");
  const usdt = await helper.getDeployedContract('MyERC20', helper.getDeployedAddress('usdt')) as MyERC20;
  const saleToken = (await helper.getDeployedContract("SaleToken", saleTokenAddress)) as SaleToken;
  const amount = 10000000000
  const resp = await usdt.approve(saleToken.address, amount)
  console.log("resp: ", resp)
  await saleToken.buyToken(usdt.address, amount)
};

main()
  .then(() => {
    process.exit(0);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
