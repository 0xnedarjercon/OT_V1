import { e, e6, e8, e18 } from "../helpers";
import { Block } from "@ethersproject/abstract-provider";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { BigNumber, BigNumberish, Signer } from "ethers";
import { ethers } from "hardhat";
import { MockOracle } from "../../typechain";

// infer concrete type
// https://github.com/microsoft/TypeScript/issues/26591#issuecomment-414894092
async function getSwapFactory() {
  return await ethers.getContractFactory("Swap");
}
async function getBorrowFactory() {
  return await ethers.getContractFactory("MockBorrow");
}
async function getOsdFactory() {
  return await ethers.getContractFactory("Osd");
}
async function getERC20Factory() {
  return await ethers.getContractFactory("MyERC20");
}
type Resolve<T> = T extends Promise<infer R> ? R : T;
type SwapFactory = Resolve<ReturnType<typeof getSwapFactory>>;
type Swap = Resolve<ReturnType<SwapFactory["deploy"]>>;
type BorrowFactory = Resolve<ReturnType<typeof getBorrowFactory>>;
type Borrow = Resolve<ReturnType<BorrowFactory["deploy"]>>;
type OsdFactory = Resolve<ReturnType<typeof getOsdFactory>>;
type Osd = Resolve<ReturnType<OsdFactory["deploy"]>>;
type ERC20Factory = Resolve<ReturnType<typeof getERC20Factory>>;
type ERC20 = Resolve<ReturnType<ERC20Factory["deploy"]>>;

describe("Swap", async function () {
  let Swap: SwapFactory;
  let Borrow: BorrowFactory;
  let Osd: OsdFactory;
  let ERC20: ERC20Factory;
  let owner: SignerWithAddress;
  let alice: SignerWithAddress;
  let bob: SignerWithAddress;
  let addrs: SignerWithAddress[];
  let swap: Swap;
  let borrow: Borrow;
  let mockOracle: MockOracle;
  let osd: Osd;
  let btc: ERC20;
  let eth: ERC20;
  // non-official
  let luna: ERC20;
  let mdc: ERC20;
  let usdt: ERC20;
  let usdc: ERC20;
  let dai: ERC20;
  let blockBefore: Block;
  let nextBlockTimestamp: number;

  before(async function () {
    [owner, alice, bob, ...addrs] = await ethers.getSigners();
    [Swap, ERC20, Osd, Borrow] = await Promise.all([
      getSwapFactory(),
      getERC20Factory(),
      getOsdFactory(),
      getBorrowFactory(),
    ]);
  });

  beforeEach(async function () {
    await Promise.all([
      (async () => {
        osd = await Osd.deploy();
        borrow = await Borrow.deploy();
        swap = await Swap.deploy(osd.address);
        await swap.setBorrow(borrow.address);
        await osd.setMinter(swap.address, true);
        await osd.setMinter(owner.address, true);
        await osd.mint(owner.address, e(999, 50));
      })(),
      (async () => (btc = await ERC20.deploy("BTC", "BTC", 8)))(),
      (async () => (eth = await ERC20.deploy("ETH", "ETH", 18)))(),
      (async () => (luna = await ERC20.deploy("LUNA", "LUNA", 18)))(),
      (async () => (mdc = await ERC20.deploy("MDC", "MDC", 18)))(),
      (async () => (usdt = await ERC20.deploy("USDT", "USDT", 6)))(),
      (async () => (usdc = await ERC20.deploy("USDC", "USDC", 6)))(),
      (async () => (dai = await ERC20.deploy("DAI", "DAI", 18)))(),
      (async () => {
        const blockNumBefore = await ethers.provider.getBlockNumber();
        blockBefore = await ethers.provider.getBlock(blockNumBefore);
        nextBlockTimestamp = blockBefore.timestamp + 10 * 60; // seconds
      })(),
    ]);

    mockOracle = await (await ethers.getContractFactory("MockOracle")).deploy();
    await swap.setPriceFeed(mockOracle.address);

    async function listToken(
      token: ERC20,
      price: BigNumberish,
      rebalancible = false,
      usePriceFeed = false,
      feeType = 1,
      revenueRate = 0,
      feeRates: [number, number, number]
    ) {
      const AMOUNT = 100;
      const decimals = await token.decimals();
      const tokenAmount = e(AMOUNT, decimals);
      const osdAmount = BigNumber.from(10).pow(18).mul(AMOUNT).mul(price);
      await token.approve(swap.address, tokenAmount);
      await swap.listToken(token.address, tokenAmount, osdAmount, owner.address);
      await swap.updatePool(
        token.address,
        tokenAmount,
        osdAmount,
        rebalancible,
        usePriceFeed,
        feeType,
        revenueRate,
        feeRates
      );
      if (usePriceFeed) {
        await mockOracle.setPrice(token.address, e8(1), decimals);
      }
    }
    await Promise.all([
      listToken(btc, 50000, true, false, 1, 70, [300, 150, 300]),
      listToken(eth, 2000, true, false, 1, 70, [300, 150, 300]),
      listToken(luna, 10, false, false, 1, 70, [300, 150, 300]),
      listToken(usdt, 1, true, true, 2, 1, [60, 30, 30]),
      listToken(usdc, 1, true, true, 2, 1, [60, 30, 30]),
      listToken(dai, 1, true, true, 2, 1, [60, 30, 30]),
    ]);
    // TODO fixtures?
  });

  it("Should listToken()", async function () {
    await mdc.approve(swap.address, e(100, 18));
    const balBefore = await mdc.balanceOf(owner.address);
    const tx = await swap.listToken(mdc.address, e(100, 18), e(2000, 18), owner.address);
    const balAfter = await mdc.balanceOf(owner.address);

    expect(balBefore.sub(balAfter)).to.equal(e(100, 18));

    const pool = await swap.pools(mdc.address);
    const feeRates = await swap.getFeeRates(mdc.address);

    await expect(tx).to.emit(swap, "TokenListed").withArgs(mdc.address, pool.liquidity);

    expect(pool.token).to.equal(mdc.address);
    expect(pool.reserve).to.equal(e18(100));
    expect(pool.lastRatioToken).to.equal(e(100, 18));
    expect(pool.lastRatioOsd).to.equal(e(2000, 18));
    expect(pool.osd).to.equal(e18(0));
    expect(pool.rebalancible).to.be.false;
    expect(pool.revenueRate).to.equal(70);
    expect(feeRates).to.deep.equal([300, 150, 300]);
  });

  describe("addLiquidity()", async function () {
    it("Should basicly works", async function () {
      await btc.transfer(alice.address, e8(100));
      await btc.connect(alice).approve(swap.address, e8(100));
      await swap
        .connect(alice)
        .addLiquidity(btc.address, e8(100), alice.address, nextBlockTimestamp);

      const pool = await swap.pools(btc.address);
      const liquidityToken = ERC20.attach(pool.liquidity);
      expect(await liquidityToken.balanceOf(alice.address)).to.equal(e8(100));
    });

    it("Should include interest", async function () {
      await borrow.setDebt(btc.address, e8(100));
      await btc.transfer(alice.address, e8(100));
      await btc.connect(alice).approve(swap.address, e8(100));
      await swap
        .connect(alice)
        .addLiquidity(btc.address, e8(100), alice.address, nextBlockTimestamp);

      const pool = await swap.pools(btc.address);
      const liquidityToken = ERC20.attach(pool.liquidity);
      expect(await liquidityToken.balanceOf(alice.address)).to.equal(e8(50));
    });
  });

  describe("removeLiquidity()", async function () {
    it("Should basicly works", async function () {
      // ETH:200
      // owner:200000 alice:200000
      await eth.approve(swap.address, e18(100));
      await swap.addLiquidity(eth.address, e18(100), alice.address, nextBlockTimestamp);
      expect(await eth.balanceOf(swap.address)).to.equal(e18(200));

      await swap.removeLiquidity(eth.address, e18(50), bob.address, nextBlockTimestamp);

      const pool = await swap.pools(eth.address);
      const liquidityToken = ERC20.attach(pool.liquidity);
      expect(await liquidityToken.balanceOf(owner.address)).to.equal(
        e18(50).toBigInt() - BigInt(300)
      );

      expect(await eth.balanceOf(bob.address)).to.equal(e18(50));
      expect(await osd.balanceOf(bob.address)).to.equal(0);
    });
    it("Should mint osd after swap", async function () {
      // BTC:100 ETH:200
      // owner:200000 user1:200000
      // ====
      // BTC:101 ETH:178.03 OSD:49378.79
      // owner:100000 user1:200000
      await eth.approve(swap.address, e18(100));
      await swap.addLiquidity(eth.address, e18(100), alice.address, nextBlockTimestamp);
      expect(await eth.balanceOf(swap.address)).to.equal(e18(200));

      await btc.approve(swap.address, e8(1));
      await swap.swapIn(
        btc.address,
        eth.address,
        e8(1),
        e18(21),
        owner.address,
        nextBlockTimestamp
      );

      await swap.removeLiquidity(eth.address, e18(50), bob.address, nextBlockTimestamp);

      const pool = await swap.pools(eth.address);
      const liquidityToken = ERC20.attach(pool.liquidity);
      expect(await liquidityToken.balanceOf(owner.address)).to.equal(
        e18(50).toBigInt() - BigInt(300)
      );

      expect(await eth.balanceOf(bob.address)).to.equal("44508086356373878832");
      expect(await osd.balanceOf(bob.address)).to.equal("12344697710396039603961");
    });

    it("Should include interest", async function () {
      // ETH:200
      // owner:200000 alice:200000
      await eth.approve(swap.address, e18(100));
      await swap.addLiquidity(eth.address, e18(100), alice.address, nextBlockTimestamp);
      expect(await eth.balanceOf(swap.address)).to.equal(e18(200));

      await borrow.setDebt(eth.address, e18(100));
      await swap
        .connect(alice)
        .removeLiquidity(eth.address, e18(100), alice.address, nextBlockTimestamp);

      const pool = await swap.pools(eth.address);
      const liquidityToken = ERC20.attach(pool.liquidity);
      expect(await liquidityToken.balanceOf(alice.address)).to.equal(e18(0));

      expect(await eth.balanceOf(alice.address)).to.equal(e18(150));
      expect(await osd.balanceOf(alice.address)).to.equal(0);
    });
  });

  it("Should swapIn()", async function () {
    await btc.transfer(alice.address, e8(1));
    await btc.connect(alice).approve(swap.address, e8(1));

    const bal0Before = await btc.balanceOf(alice.address);
    const bal1Before = await eth.balanceOf(alice.address);

    expect(await swap.getAmountOut(btc.address, eth.address, e8(1))).to.equal(
      "19793563721358274160"
    );
    const tx = await swap
      .connect(alice)
      .swapIn(btc.address, eth.address, e8(1), e18(19), alice.address, nextBlockTimestamp);

    const bal0After = await btc.balanceOf(alice.address);
    const bal1After = await eth.balanceOf(alice.address);

    const poolIn = await swap.pools(btc.address);
    const poolOut = await swap.pools(eth.address);
    // expect(poolIn.osd).to.equal(-48640.63);
    expect(poolIn.revenueOsd).to.equal("51980198019801980197");

    expect(poolOut.osd).to.equal("49378790841584158415844");
    expect(poolOut.revenueOsd).to.equal("51902227722772277227");

    await expect(tx)
      .to.emit(swap, "Swapped")
      .withArgs(
        alice.address,
        btc.address,
        eth.address,
        e8(1),
        "19793563721358274160",
        alice.address
      );
    expect(bal0Before.sub(bal0After)).to.equal(e8(1));
    expect(bal1After.sub(bal1Before)).to.equal("19793563721358274160");
  });

  it("Should swapOut()", async function () {
    await btc.transfer(alice.address, e8(1));
    await btc.connect(alice).approve(swap.address, e8(1));

    const bal0Before = await btc.balanceOf(alice.address);
    const bal1Before = await eth.balanceOf(alice.address);

    expect(await swap.getAmountIn(btc.address, eth.address, "19793563721358274159")).to.equal(
      "99999999"
    );

    await swap
      .connect(alice)
      .swapOut(
        btc.address,
        eth.address,
        e8(1),
        "19793563721358274159",
        alice.address,
        nextBlockTimestamp
      );

    const bal0After = await btc.balanceOf(alice.address);
    const bal1After = await eth.balanceOf(alice.address);

    expect(bal0Before.sub(bal0After)).to.equal("99999999");
    expect(bal1After.sub(bal1Before)).to.equal("19793563721358274159");
  });

  it("Should rebalance", async function () {
    {
      // btc
      const { liquidity } = await swap.pools(btc.address);
      const lToken = ERC20.attach(liquidity);

      expect(await lToken.balanceOf(owner.address)).to.equal(e(100, 8).toBigInt() - BigInt(300));

      await btc.approve(swap.address, e8(1));
      await swap.swapIn(
        btc.address,
        eth.address,
        e8(1),
        e18(19),
        alice.address,
        nextBlockTimestamp
      );

      let pool = await swap.pools(btc.address);
      expect(pool.reserve).to.equal(e8(101));
      expect(pool.osd).to.equal("22277227722772277228");

      expect(await lToken.balanceOf(owner.address)).to.equal("10100150978");

      await btc.approve(swap.address, e8(3000));
      await swap.swapIn(btc.address, eth.address, e8(3000), 0, alice.address, 0);
      pool = await swap.pools(btc.address);
      expect(pool.reserve).to.equal(e8(3101));
      expect(pool.osd).to.equal("2155142903439005622588");
      expect(await lToken.balanceOf(owner.address)).to.equal("320196883268");
    }

    {
      // usdc
      const { liquidity } = await swap.pools(usdc.address);
      const lToken = ERC20.attach(liquidity);

      expect(await lToken.balanceOf(owner.address)).to.equal(e(100, 6).toBigInt() - BigInt(300));

      await usdc.approve(swap.address, e6(1));
      await swap.swapIn(usdc.address, eth.address, e6(1), 0, alice.address, 0);

      let pool = await swap.pools(usdc.address);
      expect(pool.reserve).to.equal(e6(101));
      expect(pool.osd).to.equal("297000000000000");

      expect(await lToken.balanceOf(owner.address)).to.equal("101000000");

      await usdc.approve(swap.address, e6(3000));
      await swap.swapIn(usdc.address, eth.address, e6(3000), 0, alice.address, 0);
      pool = await swap.pools(usdc.address);
      expect(pool.reserve).to.equal(e6(3101));
      expect(pool.osd).to.equal("891000000000000000");
      expect(await lToken.balanceOf(owner.address)).to.equal("3102167569");
    }
  });

  it("Should not rebalance", async function () {
    await luna.transfer(alice.address, e18(210));
    await luna.connect(alice).approve(swap.address, e18(210));

    await expect(
      swap
        .connect(alice)
        .swapIn(luna.address, eth.address, e18(210), e18(1), alice.address, nextBlockTimestamp)
    ).to.be.revertedWith("INSUFF_OSD");
  });

  // https://onchaintrade.gitbook.io/ot/fee-policy
  describe("fees", async function () {
    // 1Token=1OSD
    async function resetPrice(token: ERC20) {
      const { usePriceFeed, rebalancible, feeType, revenueRate } = await swap.pools(token.address);
      const feeRates = await swap.getFeeRates(token.address);
      const tokenDecimal = await token.decimals();
      const lastRatioToken = e(tokenDecimal, 1);
      const lastRatioOsd = BigNumber.from(10)
        .pow(18 - tokenDecimal)
        .mul(lastRatioToken);
      await swap.updatePool(
        token.address,
        lastRatioToken,
        lastRatioOsd,
        rebalancible,
        usePriceFeed,
        feeType,
        revenueRate,
        feeRates
      );
    }
    async function testFee(tokenIn: ERC20, tokenOut: ERC20, amountOut: string) {
      if (tokenIn !== osd) await resetPrice(tokenIn);
      if (tokenOut !== osd) await resetPrice(tokenOut);
      const decIn = await tokenIn.decimals();
      await tokenIn.transfer(alice.address, e(1, decIn));
      await tokenIn.connect(alice).approve(swap.address, e(1, decIn));

      if (tokenIn == tokenOut) {
        await expect(
          swap.getAmountOut(tokenIn.address, tokenOut.address, e(1, decIn))
        ).to.be.revertedWith("SAME_TOKEN");
        await expect(
          swap
            .connect(alice)
            .swapIn(
              tokenIn.address,
              tokenOut.address,
              e(1, decIn),
              e18(0),
              bob.address,
              nextBlockTimestamp
            )
        ).to.be.revertedWith("SAME_TOKEN");
      } else {
        expect(await swap.getAmountOut(tokenIn.address, tokenOut.address, e(1, decIn))).to.equal(
          amountOut
        );
        await swap
          .connect(alice)
          .swapIn(
            tokenIn.address,
            tokenOut.address,
            e(1, decIn),
            e18(0),
            bob.address,
            nextBlockTimestamp
          );
        expect(await tokenOut.balanceOf(bob.address)).to.equal(amountOut);
      }

      // TODO reverse swapOut
    }

    it("A -> OSD", async () => await testFee(eth, osd, "987128712871287130")); // 0.3%
    it("OSD -> A", async () => await testFee(osd, eth, "987158034397061299")); // 0.3%
    it("A -> B", async () => await testFee(btc, eth, "977481914180472890")); // 0.15% + 0.15%
    it("S -> OSD", async () => await testFee(usdt, osd, "999400000000000000")); // 0.06%
    it("OSD -> S", async () => await testFee(osd, usdt, "999400")); // 0.06%
    it("S1 -> S2", async () => await testFee(usdc, usdt, "999400")); // 0.03% + 0.03%
    it("A -> S", async () => await testFee(eth, usdt, "986832")); // 0.33%
    it("S -> A", async () => await testFee(usdt, eth, "986864809561319048")); // 0.33%

    describe("decimals", async function () {
      it("OSD -> S", async () => await testFee(osd, dai, "999400000000000000")); // 0.06%
      it("S1 -> S2", async () => await testFee(usdc, dai, "999400090000000000")); // 0.03% + 0.03%
      it("A -> S", async () => await testFee(eth, dai, "986832574257425744")); // 0.33%
    });

    describe("same token", async function () {
      it("OSD -> OSD", async () => await testFee(osd, osd, "1000000000000000000")); // 0%
      it("A -> A", async () => await testFee(eth, eth, "997031852069171344")); // 0.15% + 0.15%
      it("S -> S", async () => await testFee(usdt, usdt, "999400")); // 0.06%
    });
  });

  describe("osd", async function () {
    it("Should swapIn() from osd to eth", async function () {
      await osd.transfer(alice.address, e18(1));
      await osd.connect(alice).approve(swap.address, e18(1));

      expect(await swap.getAmountOut(osd.address, eth.address, e18(1))).to.equal("498497514989888");

      await swap
        .connect(alice)
        .swapIn(
          osd.address,
          eth.address,
          e18(1),
          "498497514989887",
          alice.address,
          nextBlockTimestamp
        );

      expect(await osd.balanceOf(alice.address)).to.equal("0");
      expect(await eth.balanceOf(alice.address)).to.equal("498497514989888");
    });

    it("Should swapIn() from eth to osd", async function () {
      await eth.transfer(alice.address, e18(1));
      await eth.connect(alice).approve(swap.address, e18(1));

      expect(await swap.getAmountOut(eth.address, osd.address, e18(1))).to.equal(
        "1974257425742574257426"
      );
      await swap
        .connect(alice)
        .swapIn(
          eth.address,
          osd.address,
          e18(1),
          "1974257425742574257425",
          alice.address,
          nextBlockTimestamp
        );
      expect(await eth.balanceOf(alice.address)).to.equal("0");
      expect(await osd.balanceOf(alice.address)).to.equal("1974257425742574257426");
    });

    it("Should swapOut() from osd to eth", async function () {
      await osd.transfer(alice.address, e18(1));
      await osd.connect(alice).approve(swap.address, e18(1));

      expect(await swap.getAmountIn(osd.address, eth.address, "498497514989887")).to.equal(
        "999999999999998444"
      );

      await swap
        .connect(alice)
        .swapOut(
          osd.address,
          eth.address,
          e18(1),
          "498497514989887",
          alice.address,
          nextBlockTimestamp
        );

      expect(await osd.balanceOf(alice.address)).to.equal("1556");
      expect(await eth.balanceOf(alice.address)).to.equal("498497514989887");
    });

    it("Should swapOut() from eth to osd", async function () {
      await eth.transfer(alice.address, e18(1));
      await eth.connect(alice).approve(swap.address, e18(1));

      expect(await swap.getAmountIn(eth.address, osd.address, "1974257425742574257425")).to.equal(
        "999999999999999999"
      );
      await swap
        .connect(alice)
        .swapOut(
          eth.address,
          osd.address,
          e18(1),
          "1974257425742574257425",
          alice.address,
          nextBlockTimestamp
        );

      expect(await eth.balanceOf(alice.address)).to.equal("1");
      expect(await osd.balanceOf(alice.address)).to.equal("1974257425742574257425");
    });
  });

  describe("ISwapForBorrow", function () {
    it("Should call borrow on reserve change", async function () {
      await btc.approve(swap.address, e18(100));
      await eth.approve(swap.address, e18(100));

      await swap.addLiquidity(btc.address, e8(1), alice.address, nextBlockTimestamp);
      expect(await borrow.availabilities(btc.address)).to.be.equal(e8(101));

      await swap.removeLiquidity(btc.address, e8(2), alice.address, nextBlockTimestamp);
      expect(await borrow.availabilities(btc.address)).to.be.equal(e8(99));

      await swap.swapIn(btc.address, eth.address, e8(3), e18(0), alice.address, nextBlockTimestamp);
      expect(await borrow.availabilities(btc.address)).to.be.equal(e8(102));

      await swap.swapOut(
        eth.address,
        btc.address,
        e18(99),
        e8(4),
        alice.address,
        nextBlockTimestamp
      );
      expect(await borrow.availabilities(btc.address)).to.be.equal(e8(98));
    });
  });
});
