import * as hre from "hardhat";
import { OT } from "../../typechain";
import * as helper from "../helper";

const main = async () => {
  const token = (await helper.deployContract("OT", ["OT", "OT"])) as OT;
  console.log(`ot token deployed to `, token.address);
  helper.setDeployedAddress('ot', token.address);
};

main()
  .then(() => {
    process.exit(0);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
