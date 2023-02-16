import {
  FastPriceFeed,
  Future,
  FutureLimit,
  FutureReader,
  FutureRouter,
  FutureUtil,
  MyERC20,
  Reader,
  Swap,
  SwapPriceProxy,
} from "../../typechain";
import * as helper from "../helper";
import {
  calcCollateralLiqPrice,
  calcIndexLiqPrice,
  calcMr,
  calcOpIncreasePosition,
  LEVERAGE_PRECISION,
  opDecreaseMargin,
  opDecreasePosition,
  opIncreaseMargin,
  opIncreasePosition,
  parseGetPairs2,
  parseGetPositionList2,
} from "../../helper/future";
import { sleep } from "zksync-web3/build/src/utils";

const main1 = async () => {
  const wethAddr = helper.getDeployedAddress("weth");
  const linkAddr = helper.getDeployedAddress("link");
  const usdcAddr = helper.getDeployedAddress("usdc");
  const osdAddr = helper.getDeployedAddress("osd");

  const usdc = (await helper.getDeployedContract("MyERC20", usdcAddr)) as MyERC20;

  const futureRouter = (await helper.getDeployedContract(
    "FutureRouter",
    helper.getDeployedAddress("futureRouter")
  )) as FutureRouter;
  const future = (await helper.getDeployedContract(
    "Future",
    helper.getDeployedAddress("future")
  )) as Future;
  const futureReader = (await helper.getDeployedContract(
    "FutureReader",
    helper.getDeployedAddress("futureReader")
  )) as FutureReader;
  const futureLimit = (await helper.getDeployedContract('FutureLimit', helper.getDeployedAddress('futureLimit'))) as FutureLimit

  await futureLimit.setSystemRouter(futureRouter.address, true)

  console.log("start pair res");
  const pairRes = await futureReader.getPairs2();
  const pairs2 = parseGetPairs2(pairRes);
  // // console.log("pairs2", pairs2);
  const addr = await future.owner();

  // await (await usdc.approve(futureRouter.address, 1000 * 1e6)).wait();
  // await futureRouter.increasePosition(
  //   usdcAddr,
  //   usdcAddr,
  //   wethAddr,
  //   false,
  //   1000 * 1e6,
  //   0,
  //   4000 * 1e6,
  //   0,
  //   0
  // );

  const positionListRes = await futureReader.getPositionList2(addr);
  // console.log("positionListRes", positionListRes);
  const posList = parseGetPositionList2(positionListRes);
  // console.log("posList", posList);

  const usdcEthPair = pairs2.find(
    (pair) => pair.collateralToken === usdcAddr && pair.indexToken === wethAddr
  )!;

  const osdEthPair = pairs2.find(
    (pair) => pair.collateralToken === osdAddr && pair.indexToken === wethAddr
  )!;

  const longOsdEthPos = posList.find(
    (pos) => pos.collateralToken === osdAddr && pos.indexToken === wethAddr && pos.isLong
  )!;

  const longEthPos = posList.find(
    (pos) => pos.collateralToken === usdcAddr && pos.indexToken === wethAddr && pos.isLong
  )!;

  // prePos(10x, 1388 usdc, 10 eth), 20x, 20 eth => ?? margin
  longEthPos.margin = BigInt(1500) * BigInt(10) ** BigInt(6);
  longEthPos.openNotional = BigInt(4500) * BigInt(10) ** BigInt(6);
  longEthPos.size = BigInt(3) * BigInt(10) ** BigInt(18);

  console.log(
    "calcOpIncreasePosition",
    opDecreaseMargin(
      longEthPos,
      usdcEthPair,
      BigInt(20 * 1e6),
      usdcEthPair.collateralPrice,
      usdcEthPair.indexPrice
    )
  );
};

const main2 = async () => {
  console.log("start main2");
  const futureRouter = (await helper.getDeployedContract(
    "FutureRouter",
    helper.getDeployedAddress("futureRouter")
  )) as FutureRouter;
  const futureReader = (await helper.getDeployedContract(
    "FutureReader",
    helper.getDeployedAddress("futureReader")
  )) as FutureReader;

  const wethAddr = helper.getDeployedAddress("weth");
  const linkAddr = helper.getDeployedAddress("link");
  const usdcAddr = helper.getDeployedAddress("usdc");
  const osdAddr = helper.getDeployedAddress("osd");

  const usdc = (await helper.getDeployedContract("MyERC20", usdcAddr)) as MyERC20;
  console.log("start main2");

  const addr = await futureReader.owner();
  console.log("start main2");
  const positionListRes = await futureReader.getPositionList2(addr);
  const posList = parseGetPositionList2(positionListRes);
  const pairRes = await futureReader.getPairs2();
  const pairs2 = parseGetPairs2(pairRes);

  const usdcEthPair = pairs2.find(
    (pair) => pair.collateralToken === usdcAddr && pair.indexToken === wethAddr
  )!;

  const shortEthPos = posList.find(
    (pos) => pos.collateralToken === usdcAddr && pos.indexToken === wethAddr && pos.isLong
  )!;
  shortEthPos.margin = BigInt(0);
  shortEthPos.entryFundingRate = BigInt(0);
  shortEthPos.size = BigInt(0);
  shortEthPos.openNotional = BigInt(0);

  const res = calcOpIncreasePosition(
    shortEthPos,
    usdcEthPair,
    BigInt(10) * BigInt(LEVERAGE_PRECISION),
    BigInt(0),
    BigInt(10) ** BigInt(17),
    usdcEthPair.collateralPrice,
    usdcEthPair.indexPrice
  );
  console.log("res", res);
};

const main = async () => {
  await main1();
};

main()
  .then(() => {
    process.exit(0);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
