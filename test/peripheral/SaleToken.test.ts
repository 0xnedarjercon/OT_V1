import { e, e6, e8, e18, getLatestBlockTime } from "../helpers";
import { Block } from "@ethersproject/abstract-provider";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { BigNumber, BigNumberish, Signer } from "ethers";
import { ethers, network } from "hardhat";

// infer concrete type
// https://github.com/microsoft/TypeScript/issues/26591#issuecomment-414894092

async function getSaleTokenFactory() {
  return await ethers.getContractFactory("SaleToken");
}

async function getERC20Factory() {
  return await ethers.getContractFactory("MyERC20");
}

type Resolve<T> = T extends Promise<infer R> ? R : T;
type ERC20Factory = Resolve<ReturnType<typeof getERC20Factory>>;
type ERC20 = Resolve<ReturnType<ERC20Factory["deploy"]>>;
type SaleTokenFactory = Resolve<ReturnType<typeof getSaleTokenFactory>>;
type SaleToken = Resolve<ReturnType<SaleTokenFactory["deploy"]>>;

describe("SaleToken", async function () {
  let ERC20: ERC20Factory;
  let SaleToken: SaleTokenFactory;
  let owner: SignerWithAddress;
  let alice: SignerWithAddress;
  let bob: SignerWithAddress;
  let addrs: SignerWithAddress[];

  let usdt: ERC20;
  let usdc: ERC20;
  let dai: ERC20;
  let ot: ERC20;
  let blockBefore: Block;
  let startTime: number;
  let saleToken: SaleToken;

  async function minBlock(startTime: number, deltaTime: number) {
    await network.provider.send("evm_setNextBlockTimestamp", [startTime + deltaTime]);
    await network.provider.send("hardhat_mine", ["0x1"]);
  }

  async function setNextBlockTimeAndMine(startTime: number, deltaTime: number) {
    await network.provider.send("evm_setNextBlockTimestamp", [startTime + deltaTime]);
  }

  before(async function () {
    [owner, alice, bob, ...addrs] = await ethers.getSigners();
    [ERC20, SaleToken] = await Promise.all([getERC20Factory(), getSaleTokenFactory()]);
    // 实例化token
    [usdt, usdc, dai, ot] = await Promise.all([
      ERC20.deploy('USDT', 'USDT', 6),
      ERC20.deploy('USDC', 'USDC', 8),
      ERC20.deploy('DAI', 'DAI', 18),
      ERC20.deploy('OT', 'OT', 18),
    ])
    await usdt.transfer(alice.address, '100000000000000000')
    await usdt.transfer(bob.address, '100000000000000000')
    await usdc.transfer(alice.address, '100000000000000000')
    await usdc.transfer(bob.address, '100000000000000000')
    await dai.transfer(alice.address, '10000000000000000000000000000000000')
    await dai.transfer(bob.address, '100000000000000000000000000000000000')

    const blockNumBefore = await ethers.provider.getBlockNumber();
    blockBefore = await ethers.provider.getBlock(blockNumBefore);
    startTime = blockBefore.timestamp
    let _startAt = blockBefore.timestamp + 10 * 60;
    saleToken = await SaleToken.deploy(
      ot.address,
      owner.address,
      _startAt,
      _startAt + 10 * 60,
      // 1kw ot
      '10000000000000000000000000',
      // 200w usd
      '2000000',
      [usdt.address, usdc.address]
    )
    // 
    await ot.approve(saleToken.address, '10000000000000000000000000')
  });

  describe("SaleToken unit", function () {
    it("Should onlyAtSaleTime ok ", async function () {
      await dai.connect(alice).approve(saleToken.address, '1000000000000000000000000')
      expect(saleToken.connect(alice).buyToken(dai.address, '1000000000000000000000000')).to.be.revertedWith(
        'onlyAtSaleTime'
      )
    });
    it("Should unspported ok ", async function () {
      await minBlock(startTime, 10 * 60 + 10)
      await dai.connect(alice).approve(saleToken.address, '1000000000000000000000000')
      expect(saleToken.connect(alice).buyToken(dai.address, '1000000000000000000000000')).to.be.revertedWith(
        'Token not support'
      )
    });
    it("Should buyToken ok ", async function () {
      await minBlock(startTime, 10 * 60 + 30)
      await usdt.connect(alice).approve(saleToken.address, '1000000000000')
      await saleToken.connect(alice).buyToken(usdt.address, '1000000000000')
      await usdc.connect(bob).approve(saleToken.address, '300000000000000')
      await saleToken.connect(bob).buyToken(usdc.address, '300000000000000')
    });
    it("Should withdrawToken ok ", async function () {
      await minBlock(startTime, 10 * 60 + 10 * 60)
      await saleToken.connect(alice).withdrawToken()
      expect(saleToken.connect(alice).withdrawToken()).to.be.revertedWith(
        'Account have already withdraw'
      )
    });
  });
});
