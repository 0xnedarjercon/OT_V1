import { e, e6, e8, e18, getLatestBlockTime } from "../helpers";
import { Block } from "@ethersproject/abstract-provider";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { BigNumber, BigNumberish, Signer } from "ethers";
import { ethers, network } from "hardhat";
import { Faucet } from "../../typechain"
// infer concrete type
// https://github.com/microsoft/TypeScript/issues/26591#issuecomment-414894092
async function getSwapFactory() {
  return await ethers.getContractFactory("Swap");
}
async function getOsdFactory() {
  return await ethers.getContractFactory("Osd");
}
async function getERC20Factory() {
  return await ethers.getContractFactory("MyERC20");
}
type Resolve<T> = T extends Promise<infer R> ? R : T;
type ERC20Factory = Resolve<ReturnType<typeof getERC20Factory>>;
type ERC20 = Resolve<ReturnType<ERC20Factory["deploy"]>>;

describe("Faucet", async function () {
  let ERC20: ERC20Factory;
  let owner: SignerWithAddress;
  let alice: SignerWithAddress;
  let bob: SignerWithAddress;
  let addrs: SignerWithAddress[];
  let btc: ERC20;
  let eth: ERC20;
  // non-official
  let luna: ERC20;
  let usdt: ERC20;
  let usdc: ERC20;
  let dai: ERC20;

  let faucet: Faucet | any;

  before(async function () {
    [owner, alice, bob, ...addrs] = await ethers.getSigners();
    [ERC20] = await Promise.all([getERC20Factory()]);
  });

  beforeEach(async function () {
    await Promise.all([
      (async () => {
        faucet = await (
          await ethers.getContractFactory("Faucet")
        ).deploy();
      })(),
      (async () => (btc = await ERC20.deploy("BTC", "BTC", 8)))(),
      (async () => (eth = await ERC20.deploy("ETH", "ETH", 18)))(),
      (async () => (luna = await ERC20.deploy("LUNA", "LUNA", 18)))(),
      (async () => (usdt = await ERC20.deploy("USDT", "USDT", 6)))(),
      (async () => (usdc = await ERC20.deploy("USDC", "USDC", 6)))(),
      (async () => (dai = await ERC20.deploy("DAI", "DAI", 18)))(),
    ]);

    await Promise.all(
      [
        faucet.updateFaucet(false, btc.address, e8(1)),
        faucet.updateFaucet(false, eth.address, e18(1)),
        faucet.updateFaucet(false, luna.address, e18(1)),
        faucet.updateFaucet(false, usdt.address, e6(1)),
        faucet.updateFaucet(false, usdc.address, e6(1)),
        faucet.updateFaucet(false, dai.address, e18(1))
      ]
    )

    await Promise.all(
      [
        btc.transfer(faucet.address, e8(1000000)),
        eth.transfer(faucet.address, e18(1000000)),
        luna.transfer(faucet.address, e18(1000000)),
        usdt.transfer(faucet.address, e6(1000000)),
        usdc.transfer(faucet.address, e6(1000000)),
        dai.transfer(faucet.address, e18(1000000)),
      ]
    )

  });

  it("Faucet request should ok", async () => {
    await faucet.connect(bob).requestTokens(bob.address);
    expect(await btc.balanceOf(bob.address)).to.be.equal(e8(1), "btc faucet should 1");
    expect(await eth.balanceOf(bob.address)).to.be.equal(e18(1), "eth faucet should 1");
    expect(await luna.balanceOf(bob.address)).to.be.equal(e18(1), "luna faucet should 1");
    expect(await usdt.balanceOf(bob.address)).to.be.equal(e6(1), "usdt faucet should 1");
    expect(await usdc.balanceOf(bob.address)).to.be.equal(e6(1), "usdc faucet should 1");
    expect(await dai.balanceOf(bob.address)).to.be.equal(e18(1), "dai faucet should 1");
    expect(faucet.connect(bob).requestTokens(bob.address)).to.be.revertedWith("Every 24 hours request once");
  });

  it("Faucet disable should ok", async () => {
    await faucet.updateFaucet(true, btc.address, e8(1));
    await faucet.updateFaucet(true, usdt.address, e6(1));
    await faucet.connect(bob).requestTokens(bob.address);
    expect(await btc.balanceOf(bob.address)).to.be.equal(e8(0), "btc faucet should 1");
    expect(await eth.balanceOf(bob.address)).to.be.equal(e18(1), "eth faucet should 1");
    expect(await luna.balanceOf(bob.address)).to.be.equal(e18(1), "luna faucet should 1");
    expect(await usdt.balanceOf(bob.address)).to.be.equal(e6(0), "usdt faucet should 1");
    expect(await usdc.balanceOf(bob.address)).to.be.equal(e6(1), "usdc faucet should 1");
    expect(await dai.balanceOf(bob.address)).to.be.equal(e18(1), "dai faucet should 1");
  })

  it("Faucet waitTime should ok", async () => {
    await faucet.connect(bob).requestTokens(bob.address);
    const deltaTime = 24 * 60 * 60 + 1;
    await network.provider.send("hardhat_mine", ["0x2", `0x${deltaTime.toString(16)}`]);
    await faucet.connect(bob).requestTokens(bob.address);
  })


  it("Faucet updateTime should ok", async () => {
    await faucet.updateWaitTime(30);
    await faucet.connect(bob).requestTokens(bob.address);
    const deltaTime = 30 + 1;
    await network.provider.send("hardhat_mine", ["0x2", `0x${deltaTime.toString(16)}`])
    await faucet.connect(alice).requestTokens(bob.address);
  })


});
