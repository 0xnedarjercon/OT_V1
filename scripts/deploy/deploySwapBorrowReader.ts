import * as helper from "../helper";

export async function deploySwapBorrowReader() {
  console.log("start deploy swap borrow reader");
  const reader = await helper.deployContract("Reader", [
    helper.getDeployedAddress("swap"),
    helper.getDeployedAddress("borrow"),
    helper.getDeployedAddress("swapPriceProxy"),
  ]);
  helper.setDeployedAddress("reader", reader.address);
  helper.setDeployedAddress("oracle", helper.getDeployedAddress("swapPriceProxy"));
  console.log("end deploy swap borrow reader");
}

if (require.main == module) {
  deploySwapBorrowReader()
    .then(() => {
      process.exit(0);
    })
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
