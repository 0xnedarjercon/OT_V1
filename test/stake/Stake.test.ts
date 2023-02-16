import { e, e6, e8, e18, getLatestBlockTime } from "../helpers";
import { Block } from "@ethersproject/abstract-provider";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { BigNumber, BigNumberish, Signer } from "ethers";
import { ethers, network } from "hardhat";

// infer concrete type
// https://github.com/microsoft/TypeScript/issues/26591#issuecomment-414894092

async function getStakeFactory() {
  return await ethers.getContractFactory("Stake");
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
  let btcLp: ERC20;
  let ot: ERC20;
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
        stake = await Stake.deploy();
        ot = await ERC20.deploy("OT", "OT", 18);
        await ot.setMinter(stake.address, true);
      })(),
      (async () => (btc = await ERC20.deploy("BTC", "BTC", 8)))(),
      (async () => (btcLp = await ERC20.deploy("BTC LP", "BTC LP", 8)))(),
      (async () => {
        const blockNumBefore = await ethers.provider.getBlockNumber();
        blockBefore = await ethers.provider.getBlock(blockNumBefore);
        nextBlockTimestamp = blockBefore.timestamp + 10 * 60; // seconds
      })(),
    ]);
  });

  describe("Stake unit", function () {
    it("Should end time ok ", async function () {
      const rewardToken = ot;
      const lpToken = btcLp;
      // 1s <-> 10**18
      const rewardPerSecondRaw = e(1, await ot.decimals());
      const startTime = (await getLatestBlockTime()) + 60;
      const deltaSecond = 10000;
      await lpToken.transfer(alice.address, e18(10000));
      await lpToken.transfer(bob.address, e18(10000));
      // new pool
      await stake.addToken(
        rewardToken.address,
        lpToken.address,
        rewardToken.address,
        rewardPerSecondRaw,
        startTime,
        deltaSecond
      );
      const depositLpTokenAmount = e18(1000);
      // deposit
      await depositToken(alice, lpToken, depositLpTokenAmount);
      await depositToken(bob, lpToken, depositLpTokenAmount.mul(2));
      // mine block after 100 seconds
      await minBlock(startTime, 100);
      expect([
        (await stake.pending(lpToken.address, alice.address))[0],
        (await stake.pending(lpToken.address, bob.address))[0],
      ]).to.be.deep.equals([
        BigNumber.from("33333333333000000000"),
        BigNumber.from("66666666666000000000"),
      ]);
      await minBlock(startTime, 10000);
      expect([
        (await stake.pending(lpToken.address, alice.address))[0],
        (await stake.pending(lpToken.address, bob.address))[0],
      ]).to.be.deep.equals([
        BigNumber.from("3333333333333000000000"),
        BigNumber.from("6666666666666000000000"),
      ]);
      await minBlock(startTime, 20000);
      expect([
        (await stake.pending(lpToken.address, alice.address))[0],
        (await stake.pending(lpToken.address, bob.address))[0],
      ]).to.be.deep.equals([
        BigNumber.from("3333333333333000000000"),
        BigNumber.from("6666666666666000000000"),
      ]);
      await stake.connect(alice).withdraw(lpToken.address, depositLpTokenAmount);
      await stake.connect(bob).withdraw(lpToken.address, depositLpTokenAmount.mul(2));
      expect([
        await ot.balanceOf(alice.address),
        await ot.balanceOf(bob.address),
      ]).to.be.deep.equals([
        BigNumber.from("3333333333333000000000"),
        BigNumber.from("6666666666666000000000"),
      ]);
      await depositToken(alice, lpToken, depositLpTokenAmount);
      await depositToken(bob, lpToken, depositLpTokenAmount.mul(2));
      await minBlock(startTime, 30000);
      expect([
        (await stake.pending(lpToken.address, alice.address))[0],
        (await stake.pending(lpToken.address, bob.address))[0],
      ]).to.be.deep.equals([BigNumber.from("0"), BigNumber.from("0")]);
    });

    it("Should update rewardPerSeconds ok ", async function () {
      const rewardToken = ot;
      const lpToken = btcLp;
      const rewardPerSecondRaw = e(1, await ot.decimals());
      const startTime = (await getLatestBlockTime()) + 60;
      const deltaSecond = 10000;
      await lpToken.transfer(alice.address, e18(10000));
      await lpToken.transfer(bob.address, e18(10000));
      await stake.addToken(
        rewardToken.address,
        lpToken.address,
        rewardToken.address,
        rewardPerSecondRaw,
        startTime,
        deltaSecond
      );
      const depositLpTokenAmount = e18(1000);
      // deposit
      await depositToken(alice, lpToken, depositLpTokenAmount);
      await depositToken(bob, lpToken, depositLpTokenAmount.mul(2));
      // 100s
      await minBlock(startTime, 100);
      await setNextBlockTimeAndMine(startTime, 1000);
      await stake.setPoolInfo(lpToken.address, rewardPerSecondRaw.mul(2), 0);
      expect([
        (await stake.pending(lpToken.address, alice.address))[0],
        (await stake.pending(lpToken.address, bob.address))[0],
      ]).to.be.deep.equals([
        BigNumber.from("333333333333000000000"),
        BigNumber.from("666666666666000000000"),
      ]);
      await minBlock(startTime, 2000);
      expect([
        (await stake.pending(lpToken.address, alice.address))[0],
        (await stake.pending(lpToken.address, bob.address))[0],
      ]).to.be.deep.equals([
        BigNumber.from("999999999999000000000"),
        BigNumber.from("1999999999998000000000"),
      ]);
    });

    it("Should update endTime ok ", async function () {
      const rewardToken = ot;
      const lpToken = btcLp;
      const rewardPerSecondRaw = e(1, await ot.decimals());
      const startTime = (await getLatestBlockTime()) + 60;
      const rewardSecondNumber = 10000;
      await lpToken.transfer(alice.address, e18(10000));
      await lpToken.transfer(bob.address, e18(10000));
      await stake.addToken(
        rewardToken.address,
        lpToken.address,
        rewardToken.address,
        rewardPerSecondRaw,
        startTime,
        rewardSecondNumber
      );
      const depositLpTokenAmount = e18(1000);
      // deposit
      await depositToken(alice, lpToken, depositLpTokenAmount);
      await depositToken(bob, lpToken, depositLpTokenAmount.mul(2));
      // 100s
      // await minBlock(startTime, 1000)
      await setNextBlockTimeAndMine(startTime, 1000);
      await stake.setPoolInfo(lpToken.address, rewardPerSecondRaw.mul(2), startTime + 20000);
      expect([
        (await stake.pending(lpToken.address, alice.address))[0],
        (await stake.pending(lpToken.address, bob.address))[0],
      ]).to.be.deep.equals([
        BigNumber.from("333333333333000000000"),
        BigNumber.from("666666666666000000000"),
      ]);
      await minBlock(startTime, 2000);
      expect([
        (await stake.pending(lpToken.address, alice.address))[0],
        (await stake.pending(lpToken.address, bob.address))[0],
      ]).to.be.deep.equals([
        BigNumber.from("999999999999000000000"),
        BigNumber.from("1999999999998000000000"),
      ]);
      await minBlock(startTime, 20000);
      expect([
        (await stake.pending(lpToken.address, alice.address))[0],
        (await stake.pending(lpToken.address, bob.address))[0],
      ]).to.be.deep.equals([
        BigNumber.from("12999999999999000000000"),
        BigNumber.from("25999999999998000000000"),
      ]);
      await minBlock(startTime, 30000);
      expect([
        (await stake.pending(lpToken.address, alice.address))[0],
        (await stake.pending(lpToken.address, bob.address))[0],
      ]).to.be.deep.equals([
        BigNumber.from("12999999999999000000000"),
        BigNumber.from("25999999999998000000000"),
      ]);
    });
  });
});
