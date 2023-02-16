import * as helper from "../helper";

export async function deployBorrowRouterReader() {
  console.log("start deploy variableBorrowRouterReader");
  const variableBorrowRouterReader = await helper.deployContract("VariableBorrowRouterReader", []);
  helper.setDeployedAddress("variableBorrowRouterReader", variableBorrowRouterReader.address);
  console.log("end deploy variableBorrowRouterReader");
}

if (require.main == module) {
  deployBorrowRouterReader()
    .then(() => {
      process.exit(0);
    })
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
