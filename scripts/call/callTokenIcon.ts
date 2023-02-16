import {
  TokenIcon,
} from "../../typechain";
import * as helper from "../helper";

const main = async () => {
  const tokenSymbolList: string[] = ['btc', 'usdc', 'dai', 'link', 'weth', 'usdt'];
  const tokenIconMap = [
    'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599/logo.png',
    'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png',
    'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x89d24A6b4CcB1B6fAA2625fE562bDD9a23260359/logo.png',
    'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x514910771AF9Ca656af840dff83E8264EcF986CA/logo.png',
    'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2/logo.png',
    'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xdAC17F958D2ee523a2206206994597C13D831ec7/logo.png',
  ]
  const tokenAddressList: string[] = tokenSymbolList.map(function (value) { return helper.getDeployedAddress(value) });
  const tokenIcon = (await helper.getDeployedContract(
    "TokenIcon",
    helper.getDeployedAddress("tokenIcon")
  )) as TokenIcon;
  for (let index = 0; index < tokenAddressList.length; index++) {
    const tokenAddress = tokenAddressList[index];
    const tokenIconUrl: string = tokenIconMap[index];
    await tokenIcon.setTokenIcon(tokenAddress, tokenIconUrl);
    console.log('url', await tokenIcon.getTokenIcon(tokenAddress));
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
