import { utils, Wallet, Provider, EIP712Signer, types } from 'zksync-web3';
import * as ethers from 'ethers';
import * as helper from "../helper";
import * as hre from "hardhat";

export async function deployMultisig() {
  const AA_FACTORY_ADDRESS = helper.getDeployedAddress('factory');
  const wallet = await helper.getWallet();
  const provider = wallet.provider as Provider;
  const factoryArtifact = await hre.artifacts.readArtifact('AAFactory');

  const aaFactory = new ethers.Contract(
    AA_FACTORY_ADDRESS,
    factoryArtifact.abi,
    wallet
  );

  // The two owners of the multisig
  const owner1 = Wallet.createRandom();
  const owner2 = Wallet.createRandom();
  const owner3 = Wallet.createRandom();
  const owner4 = Wallet.createRandom();
  const owner5 = Wallet.createRandom();
  const thresold = 3;

  // For the simplicity of the tutorial, we will use zero hash as salt
  const salt = ethers.constants.HashZero;

  const tx = await aaFactory.deployAccount(
    salt,
    owner1.address,
    owner2.address,
    owner3.address,
    owner4.address,
    owner5.address,
    thresold
  );
  await tx.wait();
  // Getting the address of the deployed contract
  const abiCoder = new ethers.utils.AbiCoder();
  const multisigAddress = utils.create2Address(
    AA_FACTORY_ADDRESS,
    await aaFactory.aaBytecodeHash(),
    salt,
    abiCoder.encode(
      ['address', 'address', 'address', 'address', 'address', 'uint8'],
      [owner1.address, owner2.address, owner3.address, owner4.address, owner5.address, thresold])
  );
  console.log(`Multisig deployed on address ${multisigAddress}`);

  await (
    await wallet.sendTransaction({
      to: multisigAddress,
      // You can increase the amount of ETH sent to the multisig
      value: ethers.utils.parseEther('0.003'),
    })
  ).wait();

  let aaTx = await aaFactory.populateTransaction.deployAccount(
    salt,
    Wallet.createRandom().address,
    Wallet.createRandom().address,
    Wallet.createRandom().address,
    Wallet.createRandom().address,
    Wallet.createRandom().address,
    thresold
  );

  const gasLimit = await provider.estimateGas(aaTx);
  const gasPrice = await provider.getGasPrice();

  aaTx = {
    ...aaTx,
    from: multisigAddress,
    gasLimit: gasLimit,
    gasPrice: gasPrice,
    chainId: (await provider.getNetwork()).chainId,
    nonce: await provider.getTransactionCount(multisigAddress),
    type: 113,
    customData: {
      ergsPerPubdata: utils.DEFAULT_ERGS_PER_PUBDATA_LIMIT,
    } as types.Eip712Meta,
    value: ethers.BigNumber.from(0),
  };
  const signedTxHash = EIP712Signer.getSignedDigest(aaTx);

  const signature = ethers.utils.concat([
    // Note, that `signMessage` wouldn't work here, since we don't want
    // the signed hash to be prefixed with `\x19Ethereum Signed Message:\n`
    ethers.utils.joinSignature(owner1._signingKey().signDigest(signedTxHash)),
    ethers.utils.joinSignature(owner2._signingKey().signDigest(signedTxHash)),
    ethers.utils.joinSignature(owner3._signingKey().signDigest(signedTxHash)),
    ethers.utils.joinSignature(owner4._signingKey().signDigest(signedTxHash)),
    ethers.utils.joinSignature(owner5._signingKey().signDigest(signedTxHash)),
  ]);

  aaTx.customData = {
    ...aaTx.customData,
    customSignature: signature,
  };

  console.log(
    `The multisig's nonce before the first tx is ${await provider.getTransactionCount(
      multisigAddress
    )}`
  );
  const sentTx = await provider.sendTransaction(utils.serialize(aaTx));
  await sentTx.wait();

  // Checking that the nonce for the account has increased
  console.log(
    `The multisig's nonce after the first tx is ${await provider.getTransactionCount(
      multisigAddress
    )}`
  );
}

if (require.main == module) {
  deployMultisig()
    .then(() => {
      process.exit(0);
    })
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}