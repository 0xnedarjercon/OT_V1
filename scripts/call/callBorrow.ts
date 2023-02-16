import { expandDecimals } from "../../test/helpers";
import {
  FastPriceFeed,
  Future,
  FutureReader,
  FutureRouter,
  FutureUtil,
  MyERC20,
  Reader,
  Swap,
  SwapPriceProxy,
  VariableBorrow,
} from "../../typechain";
import * as helper from "../helper";

const main = async () => {
  const borrowAddr = helper.getDeployedAddress("borrow");
  const usdcAddr = helper.getDeployedAddress("usdc");
  const linkAddr = helper.getDeployedAddress("link");
  const link = (await helper.getDeployedContract("MyERC20", linkAddr)) as MyERC20;
  const usdc = (await helper.getDeployedContract("MyERC20", usdcAddr)) as MyERC20;
  const borrow = (await helper.getDeployedContract("VariableBorrow", borrowAddr)) as VariableBorrow;

  const addr = await borrow.owner();
  {
    const tx = await link.approve(borrowAddr, expandDecimals(20, 18));
    await tx.wait();
  }
  {
    const tx = await borrow.borrow(
      usdcAddr,
      50e6,
      [{ token: linkAddr, amount: expandDecimals(20, 18) }],
      addr
    );
    console.log("tx", tx);
  }
};

main()
  .then(() => {
    process.exit(0);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
