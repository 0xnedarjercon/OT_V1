import * as hre from "hardhat";
import { MyERC20 } from "../../typechain";
import * as helper from "../helper";

const deployERC20 = async (name: string, symbol: string, decimals: number) => {
  // const symbol = "USDC";
  // const name = "USD Coin";
  // const decimals = 6;
  const token = (await helper.deployContract("MyERC20", [name, symbol, decimals])) as MyERC20;
  console.log(`${symbol} token deployed to `, token.address);
  helper.setDeployedAddress(symbol.toLowerCase(), token.address);
};

const main = async () => {
  await deployERC20("USD Coin", "USDC", 6);
  await deployERC20("USDT", "USDT", 6);
  await deployERC20("Dai Stablecoin", "DAI", 18);
  await deployERC20("ChainLink Token", "LINK", 18);
  await deployERC20("Bitcoin", "BTC", 8);
};

main()
  .then(() => {
    process.exit(0);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });

/*
1. erc20
npx hardhat run --network zk scripts/deploy/deployERC20.ts
2. ot
npx hardhat run --network zk scripts/deploy/deployOT.ts
3. pricePeed
npx hardhat run --network zk scripts/deploy/deployPriceFeed.ts
4. weth
npx hardhat run --network zk scripts/deploy/deployWETH.ts
5. faucet
npx hardhat run --network zk scripts/deploy/deployFaucet.ts
6. tokenIcon
npx hardhat run --network zk scripts/deploy/deployTokenIcon.ts
7. config token icon
npx hardhat run --network zk scripts/call/callTokenIcon.ts
8. timelock
npx hardhat run --network zk scripts/deploy/deployTimelock.ts
9. greeter
npx hardhat run --network zk scripts/deploy/deployGreeter.ts
10. saleToken
npx hardhat run --network zk scripts/deploy/deploySaleToken.ts
11. config osd price
npx hardhat run --network zk scripts/call/callFastPriceFeed.ts 

*/