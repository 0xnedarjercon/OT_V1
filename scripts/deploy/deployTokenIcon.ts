import * as helper from "../helper";

const main = async () => {
  const tokenIcon = await helper.deployContract("TokenIcon", []);
  console.log("tokenIcon deployed to ", tokenIcon.address);
  helper.setDeployedAddress("tokenIcon", tokenIcon.address);
};

main()
  .then(() => {
    process.exit(0);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
