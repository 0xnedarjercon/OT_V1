import { MyERC20, Osd, Swap, WETH9, FastPriceFeed } from "../../typechain";
import { expandDecimals } from "../../test/helpers";
import { BigNumberish, BigNumber } from "ethers";
import * as helper from "../helper";

function e(num: BigNumberish, exp: BigNumberish) {
  return BigNumber.from(10).pow(exp).mul(num);
}

const listToken = async (
  token: MyERC20,
  swap: Swap,
  price: BigNumberish,
  rebalancible = false,
  usePriceFeed: boolean,
  feeType = 1,
  revenueRate = 0,
  ownerAddress: string,
  feeRates: [number, number, number]
) => {
  console.log("listToken", await token.symbol());
  const AMOUNT = 100;
  const decimals = await token.decimals();
  const transferAmount = e(AMOUNT, decimals);
  const virtualOsdAmount = e(BigNumber.from(AMOUNT).mul(price), 18);
  {
    const tx = await token.approve(swap.address, transferAmount);
    await tx.wait();
  }
  console.log('approve done')
  {
    const tx = await swap.listToken(token.address, transferAmount, virtualOsdAmount, ownerAddress);
    await tx.wait();
  }
  console.log('list token done')
  {
    const tx = await swap.updatePool(
      token.address,
      transferAmount,
      virtualOsdAmount,
      rebalancible,
      usePriceFeed,
      feeType,
      revenueRate,
      feeRates
    );
    await tx.wait();
  }
  console.log('update pool done')
};

const listWeth = async (
  token: WETH9,
  swap: Swap,
  price: BigNumberish,
  rebalancible = false,
  usePriceFeed: boolean,
  feeType = 1,
  revenueRate = 0,
  ownerAddress: string,
  feeRates: [number, number, number]
) => {
  console.log("listWeth", await token.symbol());
  const AMOUNT = 1;
  const decimals = await token.decimals();
  const transferAmount = e(AMOUNT, decimals).div(100);
  const virtualOsdAmount = e(BigNumber.from(AMOUNT).mul(price), 18);
  {
    const tx = await token.deposit({ value: transferAmount });
    await tx.wait();
  }
  {
    const tx = await token.approve(swap.address, transferAmount);
    await tx.wait();
  }
  {
    const tx = await swap.listToken(token.address, transferAmount, virtualOsdAmount, ownerAddress);
    await tx.wait();
  }
  {
    const tx = await swap.updatePool(
      token.address,
      transferAmount,
      virtualOsdAmount,
      rebalancible,
      usePriceFeed,
      feeType,
      revenueRate,
      feeRates
    );
    await tx.wait();
  }
};

export async function deploySwap() {
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

  console.log("start deploy swap");

  const osd = (await helper.deployContract("Osd", [])) as Osd;
  helper.setDeployedAddress("osd", osd.address);

  const swap = (await helper.deployContract("Swap", [osd.address])) as Swap;
  helper.setDeployedAddress("swap", swap.address);

  await osd.setMinter(swap.address, true);
  console.log("osd.setMinter swap done");

  const wallet = await helper.getWallet();
  const priceFeed = helper.getDeployedAddress("swapPriceProxy");

  await swap.setPriceFeed(priceFeed);
  console.log("set swap price feed done");

  // list token
  console.log("listing token...");
  await listToken(btc, swap, 22000, true, false, 1, 70, wallet.address, [300, 150, 300]);
  await listToken(dai, swap, 1, true, true, 2, 1, wallet.address, [60, 30, 30]);
  await listToken(usdt, swap, 1, true, true, 2, 1, wallet.address, [60, 30, 30]);
  await listToken(usdc, swap, 1, true, true, 2, 1, wallet.address, [60, 30, 30]);
  await listWeth(weth, swap, 1600, true, false, 1, 70, wallet.address, [300, 150, 300]);
  console.log("list token done");

  const addr = helper.getDeployedAddress("fastPriceFeed");
  console.log("addr", addr);
  const fastPriceFeed = (await helper.getDeployedContract(
    "FastPriceFeed",
    addr
  )) as FastPriceFeed;
  await fastPriceFeed.setPrice(
    helper.getDeployedAddress('osd'),
    expandDecimals(1, 30),
    Math.round(Date.now() / 1e3)
  );
  console.log("end deploy swap");
}

if (require.main == module) {
  deploySwap()
    .then(() => {
      process.exit(0);
    })
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
