import { e, e6, e8, e18, getLatestBlockTime } from "../helpers";
import { Block } from "@ethersproject/abstract-provider";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { BigNumber, BigNumberish, Signer } from "ethers";
import { ethers, network } from "hardhat";

async function getTimelockFactory() {
  return await ethers.getContractFactory("Timelock");
}

async function getGreeterFactory() {
  return await ethers.getContractFactory("Greeter");
}

type Resolve<T> = T extends Promise<infer R> ? R : T;
type TimelockFactory = Resolve<ReturnType<typeof getTimelockFactory>>;
type Timelock = Resolve<ReturnType<TimelockFactory["deploy"]>>;
type GreeterFactory = Resolve<ReturnType<typeof getGreeterFactory>>;
type Greeter = Resolve<ReturnType<GreeterFactory["deploy"]>>;

describe("Stake", async function () {
  let Timelock: TimelockFactory;
  let Greeter: GreeterFactory;
  let owner: SignerWithAddress;
  let alice: SignerWithAddress;
  let bob: SignerWithAddress;
  let addrs: SignerWithAddress[];

  let timelock: Timelock;
  let greeter: Greeter;

  async function minBlock(startTime: number, deltaTime: number) {
    await network.provider.send("evm_setNextBlockTimestamp", [startTime + deltaTime]);
    await network.provider.send("hardhat_mine", ["0x1"]);
  }

  async function setNextBlockTimeAndMine(startTime: number, deltaTime: number) {
    await network.provider.send("evm_setNextBlockTimestamp", [startTime + deltaTime]);
  }

  before(async function () {
    [owner, alice, bob, ...addrs] = await ethers.getSigners();
    [Timelock, Greeter] = await Promise.all([getTimelockFactory(), getGreeterFactory()]);
  });

  beforeEach(async function () {
    await Promise.all([
      (async () => {
        timelock = await Timelock.deploy(owner.address, 60);
        greeter = await Greeter.deploy("hello");
        await greeter.transferOwnership(timelock.address)
      })()
    ]);
  });

  describe("Timelock unit", function () {
    it("Should exec ok", async function () {
      expect(await greeter.greet()).to.be.equal('hello')
      const time = (await getLatestBlockTime()) + 70;
      const calldata = greeter.interface.encodeFunctionData("setGreeting", ['world'])
      const target = greeter.address
      const value = '1000000000000000000'
      const signature = ''
      const data = calldata
      const eta = time
      await timelock.queueTransaction(target, value, signature, data, eta)
      await minBlock(time, 80)
      await timelock.executeTransaction(target, value, signature, data, eta, {
        value: value
      })
      expect(await greeter.greet()).to.be.equal('world')
    });

    it("Should change admin", async function () {
      const time = (await getLatestBlockTime()) + 70;
      const calldata = timelock.interface.encodeFunctionData("setPendingAdmin", [alice.address])
      const target = timelock.address
      const value = '1000000000000000000'
      const signature = ''
      const data = calldata
      const eta = time
      await timelock.queueTransaction(target, value, signature, data, eta)
      await minBlock(time, 80)
      await timelock.executeTransaction(target, value, signature, data, eta, {
        value: value
      })
      await timelock.connect(alice).acceptAdmin()
    });
  });
});
