import { FastPriceEvent, FastPriceFeed, Faucet, MyERC20, SaleToken, Swap } from "../../typechain";
import * as helper from "../helper";
import { BigNumber, BigNumberish } from "ethers";

function e(num: BigNumberish, exp: BigNumberish) {
  return BigNumber.from(10).pow(exp).mul(num);
}

export async function deploySaleToken() {
  const daiAddress = await helper.getDeployedAddress("dai");
  const usdtAddress = await helper.getDeployedAddress("usdt");
  const usdcAddress = await helper.getDeployedAddress("usdc");
  const wallet = await helper.getWallet();
  const ot = await helper.getDeployedContract('MyERC20', helper.getDeployedAddress('ot'));
  const _startAt = Math.floor((new Date().getTime()) / 1000 + 3600)
  const saleToken = (await helper.deployContract("SaleToken", [
    ot.address,
    wallet.address,
    _startAt,
    _startAt + 10 * 60,
    '10000000000000000000000000',
    '2000000',
    [usdtAddress, usdcAddress, daiAddress]
  ])) as SaleToken;
  await ot.approve(saleToken.address, '10000000000000000000000000')
  helper.setDeployedAddress('saleToken', saleToken.address);
  console.log(`deploy saleToken end`)
};

if (require.main == module) {
  deploySaleToken()
    .then(() => {
      process.exit(0);
    })
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
