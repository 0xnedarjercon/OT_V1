import { MyERC20, Osd, Swap, WETH9 } from "../../typechain";
import { BigNumberish, BigNumber } from "ethers";
import * as helper from "../helper";

function e(num: BigNumberish, exp: BigNumberish) {
  return BigNumber.from(10).pow(exp).mul(num);
}

export async function deployBorrow() {
  console.log("start deploy borrow");

  const priceFeed = helper.getDeployedAddress("swapPriceProxy");
  const swap = (await helper.getDeployedContract(
    "Swap",
    helper.getDeployedAddress("swap")
  )) as Swap;

  const btc = (await helper.getDeployedContract(
    "MyERC20",
    helper.getDeployedAddress("btc")
  )) as MyERC20;
  const ot = (await helper.getDeployedContract(
    "MyERC20",
    helper.getDeployedAddress("ot")
  )) as MyERC20;
  const dai = (await helper.getDeployedContract(
    "MyERC20",
    helper.getDeployedAddress("dai")
  )) as MyERC20;
  const usdt = (await helper.getDeployedContract(
    "MyERC20",
    helper.getDeployedAddress("usdt")
  )) as MyERC20;
  const usdc = (await helper.getDeployedContract(
    "MyERC20",
    helper.getDeployedAddress("usdc")
  )) as MyERC20;
  const weth = (await helper.getDeployedContract(
    "WETH9",
    helper.getDeployedAddress("weth")
  )) as WETH9;

  const variableBorrow = await helper.deployContract("VariableBorrow", [swap.address, priceFeed]);
  helper.setDeployedAddress("borrow", variableBorrow.address);
  console.log("config borrow");
  {
    const tx = await swap.setBorrow(variableBorrow.address);
    await tx.wait();
  }
  console.log('update asset')

  // do not open borrowing for eth in test
  await variableBorrow.updateAsset(btc.address, 0, 6500, 800, 10000, 115, 85, 10);
  console.log("borrow: update btc asset done");
  await variableBorrow.updateAsset(weth.address, 0, 6500, 800, 10000, 115, 85, 10);
  console.log("borrow: update eth asset done");
  await variableBorrow.updateAsset(dai.address, 0, 9000, 400, 6000, 110, 90, 5);
  console.log("borrow: update dai asset done");
  await variableBorrow.updateAsset(usdt.address, 0, 9000, 400, 6000, 110, 90, 5);
  console.log("borrow: update link asset done");
  await variableBorrow.updateAsset(usdc.address, 0, 9000, 400, 6000, 110, 90, 5);
  console.log("borrow: update usdc asset done");
  const wallet = await helper.getWallet();
  await variableBorrow.updateProtocolRevenue(wallet.address, 50, 50, 10);
  console.log("config borrow done");
  console.log("end deploy borrow");
}

if (require.main == module) {
  deployBorrow()
    .then(() => {
      process.exit(0);
    })
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
