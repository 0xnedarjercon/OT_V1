import { expandDecimals } from "../../test/helpers";
import { FastPriceEvent, FastPriceFeed } from "../../typechain";
import * as helper from "../helper";

const main = async () => {
  {
    const addr = helper.getDeployedAddress("fastPriceFeed");
    console.log("addr", addr);
    const fastPriceFeed = (await helper.getDeployedContract(
      "FastPriceFeed",
      addr
    )) as FastPriceFeed;
    const fastPriceEvent = (await helper.getDeployedContract(
      "FastPriceEvent",
      helper.getDeployedAddress("fastPriceEvent")
    )) as FastPriceEvent;
    await fastPriceEvent.setIsPriceFeed(fastPriceFeed.address, true)
    // console.log("maxTimeDeviation", await fastPriceFeed.maxTimeDeviation());
    // return;
    await fastPriceEvent.setIsPriceFeed(fastPriceFeed.address, true);
    await fastPriceFeed.setUpdater(await fastPriceFeed.signer.getAddress(), true)
    const wethAddr = helper.getDeployedAddress("weth");
    const linkAddr = helper.getDeployedAddress("link");

    {
      const tx = await fastPriceFeed.setPrices(
        [helper.getDeployedAddress('osd')],
        [expandDecimals(1, 30)],
        Math.round(Date.now() / 1e3)
      );
      console.log(tx);
    }
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
