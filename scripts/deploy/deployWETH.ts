import * as helper from "../helper";

const main = async () => {
  const weth = await helper.deployContract("WETH9", []);
  console.log("weth deployed to ", weth.address);
  helper.setDeployedAddress("weth", weth.address);
};

main()
  .then(() => {
    process.exit(0);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
