import { e, e6, e8, e18, getLatestBlockTime } from "../helpers";
import { Block } from "@ethersproject/abstract-provider";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { BigNumber, BigNumberish, Signer } from "ethers";
import { ethers, network } from "hardhat";

// infer concrete type
// https://github.com/microsoft/TypeScript/issues/26591#issuecomment-414894092

async function getStakeFactory() {
  return await ethers.getContractFactory("StakeRevenue");
}

async function getERC20Factory() {
  return await ethers.getContractFactory("MyERC20");
}

type Resolve<T> = T extends Promise<infer R> ? R : T;
type ERC20Factory = Resolve<ReturnType<typeof getERC20Factory>>;
type ERC20 = Resolve<ReturnType<ERC20Factory["deploy"]>>;
type StakeFactory = Resolve<ReturnType<typeof getStakeFactory>>;
type Stake = Resolve<ReturnType<StakeFactory["deploy"]>>;

describe("Stake", async function () {
  let ERC20: ERC20Factory;
  let Stake: StakeFactory;
  let owner: SignerWithAddress;
  let alice: SignerWithAddress;
  let bob: SignerWithAddress;
  let addrs: SignerWithAddress[];

  let btc: ERC20;
  let ot: ERC20;
  let link: ERC20;
  let eth: ERC20;
  let blockBefore: Block;
  let nextBlockTimestamp: number;
  let stake: Stake;

  async function depositToken(user: Signer, lpToken: ERC20, amount: BigNumberish) {
    await lpToken.connect(user).approve(stake.address, amount);
    await stake.connect(user).deposit(lpToken.address, amount);
  }

  async function minBlock(startTime: number, deltaTime: number) {
    await network.provider.send("evm_setNextBlockTimestamp", [startTime + deltaTime]);
    await network.provider.send("hardhat_mine", ["0x1"]);
  }

  async function setNextBlockTimeAndMine(startTime: number, deltaTime: number) {
    await network.provider.send("evm_setNextBlockTimestamp", [startTime + deltaTime]);
  }

  before(async function () {
    [owner, alice, bob, ...addrs] = await ethers.getSigners();
    [ERC20, Stake] = await Promise.all([getERC20Factory(), getStakeFactory()]);
  });

  beforeEach(async function () {
    await Promise.all([
      (async () => {
        ot = await ERC20.deploy("OT", "OT", 18);
        stake = await Stake.deploy(ot.address);
      })(),
      (async () => (btc = await ERC20.deploy("BTC", "BTC", 8)))(),
      (async () => (link = await ERC20.deploy("LINK", "LINK", 18)))(),
      (async () => (eth = await ERC20.deploy("ETH", "ETH", 18)))(),
      (async () => {
        const blockNumBefore = await ethers.provider.getBlockNumber();
        blockBefore = await ethers.provider.getBlock(blockNumBefore);
        nextBlockTimestamp = blockBefore.timestamp + 10 * 60; // seconds
      })(),
    ]);
  });

  describe("Stake unit", function () {
    it("addRevenueToken", async function () {
      // 添加要奖励的token
      await ot.transfer(alice.address, '1000000000000000000000000');
      await ot.transfer(bob.address, '1000000000000000000000000');

      await stake.addRevenueToken(btc.address);
      await stake.addRevenueToken(eth.address);
      await stake.addRevenueToken(link.address);
      await expect(await stake.revenueInfoList(0)).to.be.equal(btc.address);
      await expect(await stake.revenueInfoList(1)).to.be.equal(eth.address);
      await expect(await stake.revenueInfoList(2)).to.be.equal(link.address);
      await expect(stake.addRevenue([btc.address], [])).to.be.revertedWith('tokenList eq amountList')
      await expect(stake.addRevenue([link.address], [0])).to.be.revertedWith('addRevenue gt 0')
      await expect(stake.addRevenue([ot.address], [1])).to.be.revertedWith('revenueInfo not exists')
      await expect(stake.addRevenue([link.address], [1])).to.be.revertedWith('no stake token')
      // deposit
      const stakeAmount = 10000000000000
      // owner 抵押
      await ot.connect(bob).approve(stake.address, stakeAmount)
      await stake.connect(bob).deposit(stakeAmount)
      // 添加奖励
      await btc.approve(stake.address, 10000000 * 3)
      await eth.approve(stake.address, 20000000 * 3)
      await link.approve(stake.address, 30000000 * 3)
      await stake.addRevenue([
        btc.address,
        eth.address,
        link.address
      ], [
        10000000,
        20000000,
        30000000
      ])
      // console.log(await stake.getAccountInfo(owner.address))
      const startTime = (await getLatestBlockTime()) + 60;
      await minBlock(startTime, 365 * 24 * 60 * 60)
      // // console.log("owner b1", await stake.getAccountInfo(owner.address))
      // alice 抵押
      await ot.connect(alice).approve(stake.address, stakeAmount)
      await stake.connect(alice).deposit(stakeAmount)
      await stake.addRevenue([
        btc.address,
        eth.address,
        link.address
      ], [
        10000000,
        20000000,
        30000000
      ])
      // console.log("owner b2", await stake.getAccountInfo(owner.address))
      // console.log("alice b1", await stake.getAccountInfo(alice.address))
      await stake.connect(bob).withdrawReward()
      await stake.connect(alice).withdrawReward()
      console.log('btc', await btc.balanceOf(bob.address), await btc.balanceOf(alice.address))
      // console.log("alice b2", await stake.getAccountInfo(alice.address))
      await stake.connect(alice).withdraw(1000000000000)
      // await stake.withdrawReward()
      // await stake.connect(alice).withdrawReward()
      // await stake.connect(alice).deposit(stakeAmount)
      await stake.addRevenue([
        btc.address,
        eth.address,
        link.address
      ], [
        10000000,
        20000000,
        30000000
      ])
      console.log("alice b3", await stake.getAccountInfo(bob.address))
      console.log("alice b3", await stake.getAccountInfo(alice.address))
      await stake.connect(bob).withdrawReward()
      await stake.connect(alice).withdrawReward()
      console.log('btc', await btc.balanceOf(bob.address), await btc.balanceOf(alice.address))
      console.log('balance', await ot.balanceOf(stake.address), await stake.stakeTokenAmount())
    })
  });
});