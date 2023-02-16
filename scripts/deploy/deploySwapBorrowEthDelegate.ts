import { MyERC20, Osd, Swap, WETH9 } from "../../typechain";
import * as helper from "../helper";

export async function deploySwapBorrowEthDelegate() {
  console.log("start deploy swap borrow eth delegate");
  const ethDelegate = await helper.deployContract("ETHDelegate", [
    helper.getDeployedAddress("weth"),
    helper.getDeployedAddress("swap"),
    helper.getDeployedAddress("osd"),
  ]);
  helper.setDeployedAddress("ethDelegate", ethDelegate.address);
  console.log("end deploy swap borrow eth delegate");
}

if (require.main == module) {
  deploySwapBorrowEthDelegate()
    .then(() => {
      process.exit(0);
    })
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
