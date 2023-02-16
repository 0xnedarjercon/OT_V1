import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";

// infer concrete type
// https://github.com/microsoft/TypeScript/issues/26591#issuecomment-414894092
async function getTokenIconFactory() {
  return await ethers.getContractFactory("TokenIcon");
}
type Resolve<T> = T extends Promise<infer R> ? R : T;
type TokenIconFactory = Resolve<ReturnType<typeof getTokenIconFactory>>;
type TokenIcon = Resolve<ReturnType<TokenIconFactory["deploy"]>>;

describe("Faucet", async function () {
  let owner: SignerWithAddress;
  let alice: SignerWithAddress;
  let bob: SignerWithAddress;
  let TokenIcon: TokenIconFactory;
  let addrs: SignerWithAddress[];
  let tokenIcon: TokenIcon;

  before(async function () {
    [owner, alice, bob, ...addrs] = await ethers.getSigners();
    [TokenIcon] = await Promise.all([getTokenIconFactory()]);
  });

  beforeEach(async function () {
    await Promise.all([
      (async () => {
        tokenIcon = await TokenIcon.deploy()
      })()
    ]);

  });

  it("TokenIcon should set get ok", async () => {
    const assetAddress = '0xd3c34439125B4CbDbCa0485748b2956b272e844d'
    const assetIconUrl = 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599/logo.png'
    await tokenIcon.setTokenIcon(assetAddress, assetIconUrl)
    expect(await tokenIcon.getTokenIcon(assetAddress)).to.be.equal(assetIconUrl)
  });

  it("TokenIcon should bulk get ok", async () => {
    const btcAddress = '0xd3c34439125B4CbDbCa0485748b2956b272e844d'
    const ethAddress = '0xAEB2FB661951d5C4e847854a2B9b32a7198369f2'
    const unknownAddress = '0x39981E61429CAc3925D69Ed3cA009158f2075f54'
    const assetIconUrl = 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599/logo.png'
    await tokenIcon.setTokenIcon(btcAddress, assetIconUrl)
    await tokenIcon.setTokenIcon(ethAddress, assetIconUrl)
    const expectResp = [
      assetIconUrl,
      assetIconUrl,
      ''
    ]
    expect(await tokenIcon.bulkTokenIcon([btcAddress, ethAddress, unknownAddress])).to.deep.equal(expectResp)
  });

});
