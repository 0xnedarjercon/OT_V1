import { FastPriceEvent, FastPriceFeed, Faucet, MyERC20 } from "../../typechain";
import * as helper from "../helper";
import { BigNumber, BigNumberish } from "ethers";

function e(num: BigNumberish, exp: BigNumberish) {
  return BigNumber.from(10).pow(exp).mul(num);
}
function e18(num: BigNumberish) {
  return e(num, 18);
}
function e8(num: BigNumberish) {
  return e(num, 8);
}
function e6(num: BigNumberish) {
  return e(num, 6);
}

const transferERC20 = async (tokenAddr: string, toAddr: string, amount: BigNumber) => {
  const token = (await helper.getDeployedContract("MyERC20", tokenAddr)) as MyERC20;
  const tx = await token.transfer(toAddr, amount);
  const receipt = await tx.wait();
  return receipt;
};

const main = async () => {
  const faucet = (await helper.deployContract("Faucet", [])) as Faucet;

  console.log("faucet deployed to ", faucet.address);

  helper.setDeployedAddress('faucet', faucet.address)

  const daiAddress = await helper.getDeployedAddress("dai");
  const btcAddress = await helper.getDeployedAddress("btc");
  const usdtAddress = await helper.getDeployedAddress("usdt");
  const usdcAddress = await helper.getDeployedAddress("usdc");

  console.log("updateFaucet...");
  await faucet.updateFaucet(false, btcAddress, e8(100));
  await faucet.updateFaucet(false, usdcAddress, e6(100));
  await faucet.updateFaucet(false, usdtAddress, e6(100));
  await faucet.updateFaucet(false, daiAddress, e18(100));

  console.log("transfer token to faucet....");
  await transferERC20(btcAddress, faucet.address, e8(1e8));
  await transferERC20(usdcAddress, faucet.address, e6(1e8));
  await transferERC20(usdtAddress, faucet.address, e6(1e8));
  await transferERC20(daiAddress, faucet.address, e18(1e8));
  console.log("done");
};

main()
  .then(() => {
    process.exit(0);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
