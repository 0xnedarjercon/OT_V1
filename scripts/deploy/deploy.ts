import { deployContract } from "ethereum-waffle";
import { BigNumberish, BigNumber } from "ethers";
import * as hre from "hardhat";
import { MyERC20, Osd, Swap, WETH9 } from "../../typechain";
import * as helper from "../helper";
import { deployBorrow } from "./deployBorrow";
import { deployBorrowRouter } from "./deployBorrowRouter";
import { deployBorrowRouterReader } from "./deployBorrowRouterReader";
import { deployFuture } from "./deployFuture";
import { deployFutureLimit } from "./deployFutureLimit";
import { deployFutureReader } from "./deployFutureReader";
import { deployFutureRouter } from "./deployFutureRouter";
import { deployStake } from "./deployStake";
import { deployStakeRevenue } from "./deployStakeRevenue";
import { deploySwap } from "./deploySwap";
import { deploySwapBorrowEthDelegate } from "./deploySwapBorrowEthDelegate";
import { deploySwapBorrowReader } from "./deploySwapBorrowReader";
import { deploySwapRouter } from "./deploySwapRouter";
import { deployTradeStake } from "./deployTradeStake";
import { deployTradeStakeUpdater } from "./deployTradeStakeUpdater";

const main = async () => {
  await deploySwap();
  await deployBorrow();
  await deploySwapBorrowReader();
  await deploySwapBorrowEthDelegate();
  await deployFuture();
  await deployTradeStake()
  await deployTradeStakeUpdater()
  await deployFutureLimit()
  await deployFutureRouter()
  await deployFutureReader()
  await deploySwapRouter()
  await deployStake()
  await deployStakeRevenue()
  await deploySwapBorrowReader()
  await deployBorrowRouterReader()
  await deployBorrowRouter()
};

main()
  .then(() => {
    process.exit(0);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
