import { TradeStakeUpdater, VariableBorrow, VariableBorrowRouter, MyERC20, Swap } from "../../typechain";
import { BigNumber, BigNumberish } from "ethers";
import * as helper from "../helper";

function e(num: BigNumberish, exp: BigNumberish) {
  return BigNumber.from(10).pow(exp).mul(num);
}

export async function deployBorrowRouter() {
  console.log("start deploy VariableBorrowRouter");
  const variableBorrowRouter = await helper.deployContract("VariableBorrowRouter", [
    helper.getDeployedAddress("weth"),
    helper.getDeployedAddress("borrow"),
  ]) as VariableBorrowRouter;
  helper.setDeployedAddress("borrowRouter", variableBorrowRouter.address);
  const variableBorrow = (await helper.getDeployedContract("VariableBorrow", helper.getDeployedAddress('borrow'))) as VariableBorrow;
  await variableBorrow.setRouter(variableBorrowRouter.address);
  // console.log(`end deploy variableBorrowRouter ${variableBorrowRouter.address}`);
  const swapAddress = await helper.getDeployedAddress("swap");
  const swap = (await helper.getDeployedContract('Swap', swapAddress)) as Swap;
  const daiAddress = await helper.getDeployedAddress("dai");
  const btcAddress = await helper.getDeployedAddress("btc");
  const linkAddress = await helper.getDeployedAddress("link");
  const usdcAddress = await helper.getDeployedAddress("usdc");
  const wethAddress = await helper.getDeployedAddress("weth");
  const daiPoolInfo = await swap.getPoolInfo(daiAddress);
  const btcPoolInfo = await swap.getPoolInfo(btcAddress);
  const linkPoolInfo = await swap.getPoolInfo(linkAddress);
  const usdcPoolInfo = await swap.getPoolInfo(usdcAddress);
  const wethPoolInfo = await swap.getPoolInfo(wethAddress);
  // 部署挖矿奖励token
  const ot = (await helper.getDeployedContract(
    "MyERC20",
    helper.getDeployedAddress("ot")
  )) as MyERC20;
  const rewardToken = ot;
  // 部署挖矿合约
  console.log('end deploy stake')
  // 设置挖矿合约可以mint
  await rewardToken.transfer(variableBorrowRouter.address, '1000000000000000000000000')
  const rewardPerSecondRaw = e(1, 15);
  const startTime = Math.floor((new Date()).getTime() / 1000)
  const deltaSecond = 60 * 60 * 24 * 30
  console.log('start config stake')
  // dai lp 挖矿
  await variableBorrowRouter.addMintPool(rewardToken.address, daiAddress, rewardPerSecondRaw, startTime, deltaSecond)
  // btc lp 挖矿
  await variableBorrowRouter.addMintPool(rewardToken.address, btcAddress, rewardPerSecondRaw, startTime, deltaSecond)
  // link lp 挖矿
  await variableBorrowRouter.addMintPool(rewardToken.address, linkAddress, rewardPerSecondRaw, startTime, deltaSecond)
  // usdc lp 挖矿
  await variableBorrowRouter.addMintPool(rewardToken.address, usdcAddress, rewardPerSecondRaw, startTime, deltaSecond)
  // weth lp 挖矿
  await variableBorrowRouter.addMintPool(rewardToken.address, wethAddress, rewardPerSecondRaw, startTime, deltaSecond)


}

if (require.main == module) {
  deployBorrowRouter()
    .then(() => {
      process.exit(0);
    })
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
