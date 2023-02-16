import { e, e6, e8, e18, getLatestBlockTime } from "../helpers";
import { Block } from "@ethersproject/abstract-provider";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { BigNumber, BigNumberish, Signer } from "ethers";
import { ethers, network } from "hardhat";

// infer concrete type
// https://github.com/microsoft/TypeScript/issues/26591#issuecomment-414894092

async function getStakeFactory() {
  return await ethers.getContractFactory("TradeStake");
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
      })()
    ]);
    stake.setUpdater(owner.address, true)
  });

  describe("Stake unit", function () {
    it("Should end time ok ", async function () {
      const startTime = (await getLatestBlockTime()) + 60;
      // set reward number
      await stake.setRewardPerUnit(10000000);
      await stake.setMinter(ot.address);
      const daySeconds = 60 * 60 * 24 + 1
      // day1 
      await stake.updateScore(bob.address, 10000);
      await stake.updateScore(alice.address, 10000);
      console.log("day1 ", await stake.pending(bob.address), await stake.pending(alice.address))
      await minBlock(startTime, daySeconds);
      // day2
      await stake.updateScore(bob.address, 20000);
      await stake.updateScore(alice.address, 10000);
      console.log("day2", await stake.pending(bob.address), await stake.pending(alice.address))
      await minBlock(startTime, daySeconds * 2);
      // day3
      await stake.connect(alice).withdraw()
      console.log("day3", await stake.pending(bob.address), await stake.pending(alice.address))
      console.log("ot balanceOf", await ot.balanceOf(bob.address), await ot.balanceOf(alice.address))
      await minBlock(startTime, daySeconds * 3);
      console.log("day4", await stake.pending(bob.address), await stake.pending(alice.address))
      await minBlock(startTime, daySeconds * 4);
      console.log("day5", await stake.pending(bob.address), await stake.pending(alice.address))
      await stake.connect(bob).withdraw()
      await stake.connect(alice).withdraw()
      console.log("day5", await stake.pending(bob.address), await stake.pending(alice.address))
      console.log("ot balanceOf", await ot.balanceOf(bob.address), await ot.balanceOf(alice.address))
    })
  });
});
