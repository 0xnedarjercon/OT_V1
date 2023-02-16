import {
  Swap
} from "../../typechain";
import * as helper from "../helper";

const main = async () => {
  const swap = (await helper.getDeployedContract(
    "Swap",
    helper.getDeployedAddress("swap")
  )) as Swap;
  const btc = await helper.getDeployedAddress('btc')
  // -------1---------
  // 查看池子的配置
  const btcConfig = await swap.pools(btc)
  // 更新池子配置
  // swap.updatePool()
  console.log('btcConfig', btcConfig)
  // -------2---------
  // 查看永续合约地址
  // const future = await swap.future()
  // console.log('future', future)
  // swap.setFutureAddress()
  // -------3---------
  // 查看借贷合约地址
  const borrow = await swap.$borrow()
  // 更新借贷合约
  // swap.setBorrow()
  console.log('borrow', borrow)
  // -------4---------
  // 查看Oracle地址
  const priceFeed = await swap.priceFeed()
  // 更新Oracle地址
  // swap.setPriceFeed()
  console.log("priceFeed", priceFeed)
  // -------5---------
  // 查看收益
  const revenueOsd = await swap.getRevenueOsd(btc)
  // 提取收益
  // swap.withdrawRevenueOsd()
  console.log("revenueOsd", revenueOsd)
};

main()
  .then(() => {
    process.exit(0);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
