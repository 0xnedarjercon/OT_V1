import { FastPriceEvent, FastPriceFeed, Faucet, MyERC20, Swap } from "../../typechain";
import * as helper from "../helper";
import { BigNumber, BigNumberish } from "ethers";
import { Stake } from "../../typechain/Stake";

function e(num: BigNumberish, exp: BigNumberish) {
  return BigNumber.from(10).pow(exp).mul(num);
}

export async function deployStake() {
  const swapAddress = await helper.getDeployedAddress("swap");
  const swap = (await helper.getDeployedContract('Swap', swapAddress)) as Swap;
  const daiAddress = await helper.getDeployedAddress("dai");
  const btcAddress = await helper.getDeployedAddress("btc");
  const usdtAddress = await helper.getDeployedAddress("usdt");
  const usdcAddress = await helper.getDeployedAddress("usdc");
  const wethAddress = await helper.getDeployedAddress("weth");
  const osdAddress = await helper.getDeployedAddress("osd");
  const daiPoolInfo = await swap.getPoolInfo(daiAddress);
  const btcPoolInfo = await swap.getPoolInfo(btcAddress);
  const usdtPoolInfo = await swap.getPoolInfo(usdtAddress);
  const usdcPoolInfo = await swap.getPoolInfo(usdcAddress);
  const wethPoolInfo = await swap.getPoolInfo(wethAddress);
  // 部署挖矿奖励token
  const ot = (await helper.getDeployedContract(
    "MyERC20",
    helper.getDeployedAddress("ot")
  )) as MyERC20;
  const rewardToken = ot;
  // 部署挖矿合约
  const stake = (await helper.deployContract("Stake", [])) as Stake;
  console.log('end deploy stake')
  // 设置挖矿合约可以mint
  await rewardToken.transfer(stake.address, '1000000000000000000000000')
  const rewardPerSecondRaw = e(1, 10);
  const startTime = Math.floor((new Date()).getTime() / 1000)
  const deltaSecond = 60 * 60 * 24 * 30
  console.log('start config stake')
  // dai lp 挖矿
  await stake.addToken(rewardToken.address, daiPoolInfo.liquidity, rewardPerSecondRaw, startTime, deltaSecond)
  await stake.addRevenueToken(daiPoolInfo.liquidity, daiAddress);
  await stake.addRevenueToken(daiPoolInfo.liquidity, osdAddress);
  console.log("end dai")
  // btc lp 挖矿
  await stake.addToken(rewardToken.address, btcPoolInfo.liquidity, rewardPerSecondRaw.mul(50000), startTime, deltaSecond)
  await stake.addRevenueToken(btcPoolInfo.liquidity, btcAddress);
  await stake.addRevenueToken(btcPoolInfo.liquidity, osdAddress);
  console.log("end btc")
  // usdt lp 挖矿
  await stake.addToken(rewardToken.address, usdtPoolInfo.liquidity, rewardPerSecondRaw, startTime, deltaSecond)
  await stake.addRevenueToken(usdtPoolInfo.liquidity, usdtAddress);
  await stake.addRevenueToken(usdtPoolInfo.liquidity, osdAddress);
  console.log("end usdt")
  // usdc lp 挖矿
  await stake.addToken(rewardToken.address, usdcPoolInfo.liquidity, rewardPerSecondRaw, startTime, deltaSecond)
  await stake.addRevenueToken(usdcPoolInfo.liquidity, usdcAddress);
  await stake.addRevenueToken(usdcPoolInfo.liquidity, osdAddress);
  console.log("end usdc")
  // weth lp 挖矿
  await stake.addToken(rewardToken.address, wethPoolInfo.liquidity, rewardPerSecondRaw.mul(1500), startTime, deltaSecond)
  await stake.addRevenueToken(wethPoolInfo.liquidity, wethAddress);
  await stake.addRevenueToken(wethPoolInfo.liquidity, osdAddress);
  console.log("end weth")
  helper.setDeployedAddress('rewardToken', rewardToken.address)
  helper.setDeployedAddress('stake', stake.address);
  console.log('end config stake')
};

if (require.main == module) {
  deployStake()
    .then(() => {
      process.exit(0);
    })
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
