import { utils } from 'zksync-web3';
import * as ethers from 'ethers';
import { Deployer } from '@matterlabs/hardhat-zksync-deploy';
import { getDeployer } from '../helper';
import * as helper from "../helper";

export async function deployAAFactory() {
  const deployer = await getDeployer() as Deployer;
  const factoryArtifact = await deployer.loadArtifact('AAFactory');
  const aaArtifact = await deployer.loadArtifact('FiveUserMultisig');
  // Getting the bytecodeHash of the account
  const bytecodeHash = utils.hashBytecode(aaArtifact.bytecode);

  const factory = await deployer.deploy(
    factoryArtifact,
    [bytecodeHash],
    undefined,
    [
      // Since the factory requires the code of the multisig to be available,
      // we should pass it here as well.
      aaArtifact.bytecode,
    ]
  );

  console.log(`AA factory address: ${factory.address}`);
  helper.setDeployedAddress('factory', factory.address)
}

if (require.main == module) {
  deployAAFactory()
    .then(() => {
      process.exit(0);
    })
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
