import { BigNumber, ethers } from "ethers";

type numberfy = bigint | number | string | BigNumber;

export const TRADING_FEE_RATE_PRECISION = 1e9;
export const FUNDING_RATE_PRECISION = 1e10;
export const LEVERAGE_PRECISION = 1e9;
export const MARGIN_RATIO_PRECISION = 1e9;
export const OPEN_INTEREST_RATIO_PRECISION = 1e9;
export const UTILISATION_RATIO_PRECISION = 1e9;
export const PRICE_PRECISION = 1e30;
export const MAX_MR = 1e9 * 1e9;

export function numberfyToBigInt(num: numberfy) {
  return BigNumber.from(num).toBigInt();
}

export interface Position {
  collateralToken: string;
  indexToken: string;
  isLong: boolean;
  margin: bigint;
  openNotional: bigint;
  size: bigint;

  entryFundingRate: bigint;
  entryCollateralPrice: bigint;
  entryIndexPrice: bigint;
  mmr: bigint;
}

export interface FuturePair {
  collateralToken: string;
  indexToken: string;
  tradingFeeRate: bigint;

  maxMmr: bigint;
  minMmr: bigint;
  maxLeverage: bigint;

  maxTotalLongSize: bigint;
  maxTotalShortSize: bigint;

  cumulativeLongFundingRate: bigint;
  cumulativeShortFundingRate: bigint;
  longFundingRate: bigint;
  shortFundingRate: bigint;
  lastFundingTimestamp: bigint;

  collateralInsuranceFund: bigint;
  totalShortSize: bigint;
  totalLongSize: bigint;

  collateralTokenDecimal: bigint;
  indexTokenDecimal: bigint;

  collateralPrice: bigint;
  indexPrice: bigint;
}

export enum ExecStatus {
  success,
  decreaseExceed,
  pairUnlist,
  pendingExec,
  cancel,
}

export enum Operation {
  create,
  update,
  cancel,
  exec,
}

export enum DecreaseExecType {
  takeProfit,
  stopLoss,
}

export function calcFutureFundingFee(
  openNotional: bigint,
  entryFundingRate: bigint,
  cumulativeFundingRate: bigint
) {
  if (BigInt(entryFundingRate) === BigInt(0)) {
    return BigInt(0);
  }
  return (BigInt(openNotional) * BigInt(cumulativeFundingRate)) / BigInt(entryFundingRate);
}

export function calcTradingFee(notionalDelta: bigint, tradingFeeRate: bigint) {
  return (BigInt(notionalDelta) * BigInt(tradingFeeRate)) / BigInt(TRADING_FEE_RATE_PRECISION);
}

export function calcFutureMaintanenceRatio(
  margin: bigint,
  openNotional: bigint,
  minMmr: bigint,
  maxMmr: bigint
) {
  const initMr = (BigInt(margin) * BigInt(MARGIN_RATIO_PRECISION)) / BigInt(openNotional);
  let mmr = initMr / BigInt(2);
  if (mmr < BigInt(minMmr)) {
    mmr = BigInt(minMmr);
  }
  if (mmr > BigInt(maxMmr)) {
    mmr = BigInt(maxMmr);
  }
  return mmr;
}

export function parseGetPairs2(res: [string[], string[], numberfy[]]): FuturePair[] {
  let pairList = res[0].map((collToken, idx) => {
    const startIndex = idx * 18;
    return {
      collateralToken: collToken,
      indexToken: res[1][idx],

      tradingFeeRate: numberfyToBigInt(res[2][startIndex + 0]),

      maxMmr: numberfyToBigInt(res[2][startIndex + 1]),
      minMmr: numberfyToBigInt(res[2][startIndex + 2]),
      maxLeverage: numberfyToBigInt(res[2][startIndex + 3]),

      maxTotalLongSize: numberfyToBigInt(res[2][startIndex + 4]),
      maxTotalShortSize: numberfyToBigInt(res[2][startIndex + 5]),

      cumulativeLongFundingRate: numberfyToBigInt(res[2][startIndex + 6]),
      cumulativeShortFundingRate: numberfyToBigInt(res[2][startIndex + 7]),
      longFundingRate: numberfyToBigInt(res[2][startIndex + 8]),
      shortFundingRate: numberfyToBigInt(res[2][startIndex + 9]),
      lastFundingTimestamp: numberfyToBigInt(res[2][startIndex + 10]),

      collateralInsuranceFund: numberfyToBigInt(res[2][startIndex + 11]),
      totalLongSize: numberfyToBigInt(res[2][startIndex + 12]),
      totalShortSize: numberfyToBigInt(res[2][startIndex + 13]),

      collateralTokenDecimal: numberfyToBigInt(res[2][startIndex + 14]),
      indexTokenDecimal: numberfyToBigInt(res[2][startIndex + 15]),
      collateralPrice: numberfyToBigInt(res[2][startIndex + 16]),
      indexPrice: numberfyToBigInt(res[2][startIndex + 17]),
    };
  });
  return pairList;
}

export function parseGetPositionList2(
  res: [string[], string[], boolean[], numberfy[]]
): Position[] {
  let positionList = res[0].map((collToken, idx) => {
    return {
      collateralToken: collToken,
      indexToken: res[1][idx],
      isLong: res[2][idx],
      margin: numberfyToBigInt(res[3][idx * 7 + 0]),
      openNotional: numberfyToBigInt(res[3][idx * 7 + 1]),
      size: numberfyToBigInt(res[3][idx * 7 + 2]),
      entryFundingRate: numberfyToBigInt(res[3][idx * 7 + 3]),
      entryCollateralPrice: numberfyToBigInt(res[3][idx * 7 + 4]),
      entryIndexPrice: numberfyToBigInt(res[3][idx * 7 + 5]),
      mmr: numberfyToBigInt(res[3][idx * 7 + 6]),
    };
  });
  return positionList;
}

export function calcUtilisationRatio(
  pair: FuturePair,
  longSizeDelta: bigint,
  shortSizeDelta: bigint,
  collateralPrice: bigint,
  indexPrice: bigint
) {
  if (pair.collateralInsuranceFund == BigInt(0)) {
    return BigInt(UTILISATION_RATIO_PRECISION);
  }

  let longSize = pair.totalLongSize + longSizeDelta;
  let shortSize = pair.totalShortSize + shortSizeDelta;
  let diffSize = longSize > shortSize ? longSize - shortSize : shortSize - longSize;
  let diffNotional = token1ToToken2(
    diffSize,
    indexPrice,
    collateralPrice,
    pair.indexTokenDecimal,
    pair.collateralTokenDecimal
  );

  return (diffNotional * BigInt(UTILISATION_RATIO_PRECISION)) / pair.collateralInsuranceFund;
}

export function calcHourFundingRate(
  pair: FuturePair,
  longSizeDelta: bigint,
  shortSizeDelta: bigint,
  utilisationRatio: bigint
) {
  let longSize = pair.totalLongSize + longSizeDelta;
  let shortSize = pair.totalShortSize + shortSizeDelta;

  if (longSize == BigInt(0) || shortSize == BigInt(0)) {
    longSize = BigInt(1);
    shortSize = BigInt(1);
  }

  const fundingRateMultipier = BigInt(250000);
  let k = BigInt(1) * fundingRateMultipier * utilisationRatio;
  let longFundingRate = (k * longSize) / (shortSize * BigInt(UTILISATION_RATIO_PRECISION));
  let shortFundingRate = (k * shortSize) / (longSize * BigInt(UTILISATION_RATIO_PRECISION));

  if (longFundingRate > shortFundingRate) {
    return {
      long: longFundingRate,
      short: -shortFundingRate,
    };
  }
  if (longFundingRate < shortFundingRate) {
    return {
      long: -longFundingRate,
      short: shortFundingRate,
    };
  }
  return {
    long: BigInt(0),
    short: BigInt(0),
  };
}

function exp(base: bigint, exp: bigint) {
  return BigInt(Math.pow(Number(base), Number(exp)));
}

export function token1ToToken2(
  token1Amount: bigint,
  token1Price: bigint,
  token2Price: bigint,
  token1Decimal: bigint,
  token2Decimal: bigint
) {
  if (token1Decimal > token2Decimal) {
    return (
      (token1Amount * token1Price) / (token2Price * exp(BigInt(10), token1Decimal - token2Decimal))
    );
  } else {
    return (
      (token1Amount * token1Price * exp(BigInt(10), token2Decimal - token1Decimal)) / token2Price
    );
  }
}

export function calcPrice(
  token1Amount: bigint,
  token2Amount: bigint,
  token1Price: bigint,
  token1Decimal: bigint,
  token2Decimal: bigint
) {
  if (token1Decimal > token2Decimal) {
    const exp_ = exp(BigInt(10), token1Decimal - token2Decimal);
    return (token1Amount * token1Price) / (token2Amount * exp_);
  } else {
    const exp_ = exp(BigInt(10), token2Decimal - token1Decimal);
    return (token1Amount * token1Price * exp_) / token2Amount;
  }
}

export function calcTradingFeeRate(
  pair: FuturePair,
  sizeDelta: bigint,
  isLong: boolean,
  isIncrease: boolean
) {
  let feeRate = pair.tradingFeeRate;
  let totalLongSize = pair.totalLongSize;
  let totalShortSize = pair.totalShortSize;

  if (isIncrease) {
    if (isLong) {
      totalLongSize += sizeDelta;
    } else {
      totalShortSize += sizeDelta
    }

    if (isLong && totalLongSize > totalShortSize && totalShortSize != BigInt(0)) {
      feeRate = totalLongSize * feeRate / totalShortSize
    }
    if (!isLong && totalLongSize < totalShortSize && totalLongSize != BigInt(0)) {
      feeRate = totalShortSize * feeRate / totalLongSize
    }
  } else {
    if (isLong) {
      totalLongSize -= sizeDelta
    } else {
      totalShortSize -= sizeDelta
    }
    if (!isLong && totalLongSize > totalShortSize && totalShortSize != BigInt(0)) {
      feeRate = totalLongSize * feeRate / totalShortSize
    }
    if (isLong && totalLongSize < totalShortSize && totalLongSize != BigInt(0)) {
      feeRate = totalShortSize * feeRate / totalLongSize
    }
  }
  return feeRate
}

export function calcNewFundingRate(
  pair: FuturePair,
  longSizeDelta: bigint,
  shortSizeDelta: bigint,
  collateralPrice: bigint,
  indexPrice: bigint
): {
  shouldUpdate: boolean;
  longFundingRate: bigint;
  shortFundingRate: bigint;
  durationLongFundingRate: bigint;
  durationShortFundingRate: bigint;
  pair: FuturePair;
} {
  const ur = calcUtilisationRatio(pair, longSizeDelta, shortSizeDelta, collateralPrice, indexPrice);
  const now = BigInt(Math.round(Date.now() / 1e3));
  let timeLapse = now - pair.lastFundingTimestamp;
  if (pair.lastFundingTimestamp === BigInt(0)) {
    timeLapse = BigInt(3600);
  }
  if (timeLapse < 0) {
    timeLapse = BigInt(0);
  }
  const hourFundingRate = calcHourFundingRate(pair, longSizeDelta, shortSizeDelta, ur);

  const durationLongFundingRate = (hourFundingRate.long * timeLapse) / BigInt(3600);
  const durationShortFundingRate = (hourFundingRate.short * timeLapse) / BigInt(3600);
  return {
    shouldUpdate: true,
    longFundingRate: hourFundingRate.long,
    shortFundingRate: hourFundingRate.short,
    durationLongFundingRate,
    durationShortFundingRate,
    pair: {
      ...pair,
      longFundingRate: hourFundingRate.long,
      shortFundingRate: hourFundingRate.short,
      cumulativeLongFundingRate: pair.cumulativeLongFundingRate + hourFundingRate.long,
      cumulativeShortFundingRate: pair.cumulativeShortFundingRate + hourFundingRate.short,
    },
  };
}



export function calcFundingFee(pos: Position, pair: FuturePair, increaseNotionalDelta: bigint) {
  let prevFunding = BigInt(0);
  let newFunding = BigInt(0);

  if (pos.isLong) {
    prevFunding =
      (pos.openNotional * (pair.cumulativeLongFundingRate - pos.entryFundingRate)) /
      BigInt(FUNDING_RATE_PRECISION);
    newFunding = (increaseNotionalDelta * pair.longFundingRate) / BigInt(FUNDING_RATE_PRECISION);
  } else {
    prevFunding =
      (pos.openNotional * (pair.cumulativeShortFundingRate - pos.entryFundingRate)) /
      BigInt(FUNDING_RATE_PRECISION);
    newFunding = (increaseNotionalDelta * pair.shortFundingRate) / BigInt(FUNDING_RATE_PRECISION);
  }
  return prevFunding + newFunding;
}

// calc liq price for usd based future
export function calcLiqPrice(
  pos: Position,
  pair: FuturePair,
  collateralPrice: bigint,
  indexPrice: bigint,
  calcType: "index" | "collateral"
) {
  const { pair: updatedPair } = calcNewFundingRate(
    pair,
    pos.isLong ? -pos.size : BigInt(0),
    !pos.isLong ? -pos.size : BigInt(0),
    collateralPrice,
    indexPrice
  );
  const mmr = pos.mmr;
  const fundingFee = calcFundingFee(pos, updatedPair, BigInt(0));
  const tradingFeeRate = calcTradingFeeRate(pair, pos.size, pos.isLong, false)
  const tradingFee = calcTradingFee(pos.openNotional, tradingFeeRate);
  const leftMargin = pos.margin - fundingFee - tradingFee;
  // mmr = (pos.margin - fundingFee - tradingFee + pnl) / (size * indexPrice / collateralPrice)
  // long pnl = pos.size * indexPrice / collateralPrice - pos.openNotional
  // short pnl = pos.openNotional - pos.size * indexPrice / collateralPrice

  let x = BigInt(0); // size * indexPrice / collaterapPrice
  if (pos.isLong) {
    // (pos.margin - fundingFee - tradingFee + pos.size * indexPrice / collateralPrice - pos.openNotional) / (size * indexPrice / collateralPrice) = mmr
    // (a + x) / x = b
    // (a + x) = bx
    // x = a / (b - 1)
    const a =
      (pos.margin - fundingFee - tradingFee - pos.openNotional) * BigInt(MARGIN_RATIO_PRECISION);
    const b = mmr;
    x = a / (b - BigInt(MARGIN_RATIO_PRECISION));
  } else {
    // (pos.margin - fundingFee - tradingFee + ppos.openNotional - pos.size * indexPrice / collateralPrice) / (size * indexPrice / collateralPrice) = mmr
    // (a - x) / x = b
    // a = (b + 1) x
    // x = a / (b + 1)
    const a =
      (pos.margin - fundingFee - tradingFee + pos.openNotional) * BigInt(MARGIN_RATIO_PRECISION);
    const b = mmr;
    x = a / (b + BigInt(MARGIN_RATIO_PRECISION));
  }
  if (calcType === "index") {
    return calcPrice(
      x,
      pos.size,
      collateralPrice,
      pair.collateralTokenDecimal,
      pair.indexTokenDecimal
    );
  } else {
    return calcPrice(pos.size, x, indexPrice, pair.indexTokenDecimal, pair.collateralTokenDecimal);
  }
}

// 计算币本位清算价格
// calc liq price for coin based future
export function calcCollateralLiqPrice(
  pos: Position,
  pair: FuturePair,
  collateralPrice: bigint,
  indexPrice: bigint
) {
  return calcLiqPrice(pos, pair, collateralPrice, indexPrice, "collateral");
}

// 计算 u 本位清算价格
export function calcIndexLiqPrice(
  pos: Position,
  pair: FuturePair,
  collateralPrice: bigint,
  indexPrice: bigint
) {
  return calcLiqPrice(pos, pair, collateralPrice, indexPrice, "index");
}

// export function calcFuturePosition(pos: Position, pair: FuturePair) {}

export function calcNewMmr(pair: FuturePair, margin: bigint, notional: bigint) {
  if (notional === BigInt(0)) {
    return {
      mr: BigInt(MAX_MR),
      mmr: BigInt(0),
    };
  }
  const mr = (margin * BigInt(MARGIN_RATIO_PRECISION)) / notional;
  let mmr = mr / BigInt(2);
  if (mmr < pair.minMmr) {
    mmr = pair.minMmr;
  }
  if (mmr > pair.maxMmr) {
    mmr = pair.maxMmr;
  }
  return {
    mr,
    mmr,
  };
}

export function calcMr(
  pos: Position,
  pair: FuturePair,
  collateralPrice: bigint,
  indexPrice: bigint
) {
  const pnl = calcPnl(pos, pair, collateralPrice, indexPrice);
  const fundingFee = calcFundingFee(pos, pair, BigInt(0)); // todo usd newPair
  const leftMargin = pos.margin - fundingFee + pnl;
  const mrs = calcNewMmr(
    pair,
    leftMargin,
    token1ToToken2(
      pos.size,
      indexPrice,
      collateralPrice,
      pair.indexTokenDecimal,
      pair.collateralTokenDecimal
    )
  );
  return mrs.mr;
}

export function calcPnl(
  pos: Position,
  pair: FuturePair,
  collateralPrice: bigint,
  indexPrice: bigint
) {
  const notional = token1ToToken2(
    pos.size,
    indexPrice,
    collateralPrice,
    pair.indexTokenDecimal,
    pair.collateralTokenDecimal
  );
  if (pos.isLong) {
    return notional - pos.openNotional;
  } else {
    return pos.openNotional - notional;
  }
}

export interface OpReturn {
  pos: Position; // 此次操作后的 position
  pair: FuturePair;
  hourFundingRate: bigint; // 此次操作后用户的资金费率 (每小时)
  fundingFee: bigint; // 此次操作结算资金费用
  tradingFee: bigint; // 此次操作交易手续费
  tradingFeeRate: bigint; // 此次操作交易的手续费率
  pnl: bigint; // 此次操作结算的盈亏
  receiveMargin: bigint; // 此次操作可以收到的保证金数量, decreassePosition 时返回非0值，其他操作返回0
  notionalDelta: bigint; // 此次操作传给合约的 notionalDelta
  mr: bigint; // 操作之后的仓位保证金率
  indexLiqPrice: bigint; // u本位 清算价格
  collateralLiqPrice: bigint; // 币本位 清算价格
}

export function calcOpIncreasePosition(
  pos: Position,
  pair: FuturePair,
  leverage: bigint,
  marginDelta: bigint,
  sizeDelta: bigint,
  collateralPrice: bigint,
  indexPrice: bigint
) {
  if (leverage <= 0) {
    throw new Error("invalid_leverage_args");
  }
  if (marginDelta > 0 && sizeDelta > 0) {
    throw new Error("marginDelta or sizeDelta must be zero");
  }
  if (marginDelta <= 0 && sizeDelta <= 0) {
    return {
      marginDelta: 0,
      sizeDelta: 0,
      leverage,
    };
  }

  // pos.openNotional + notionalDelta = leverage * (pos.margin + marginDelta - notionalDelta * tradingFeeRate)
  // (pos.openNotional + notionalDelta) * LEVERAGE_PRECISION = leverage * (pos.margin + marginDelta - notionalDelta * tradingFeeRate / TRADING_FEE_RATE_PRECISION)
  /**
pos.openNotional * LEVERAGE_PRECISION * TRADING_FEE_RATE_PRECISION + 
notionalDelta * LEVERAGE_PRECISION * TRADING_FEE_RATE_PRECISION 
= 
leverage * pos.margin * TRADING_FEE_RATE_PRECISION + 
leverage * marginDelta * TRADING_FEE_RATE_PRECISION - 
leverage * notionalDelta * tradingFeeRate
   */
  if (marginDelta > 0) {
    // calc notionalDelta/sizeDelta
    const numerator =
      leverage * pos.margin * BigInt(TRADING_FEE_RATE_PRECISION) +
      leverage * marginDelta * BigInt(TRADING_FEE_RATE_PRECISION) -
      pos.openNotional * BigInt(LEVERAGE_PRECISION) * BigInt(TRADING_FEE_RATE_PRECISION);
    const denominator =
      BigInt(LEVERAGE_PRECISION) * BigInt(TRADING_FEE_RATE_PRECISION) +
      leverage * pair.tradingFeeRate;
    const notionalDelta = numerator / denominator;
    sizeDelta = token1ToToken2(
      notionalDelta,
      collateralPrice,
      indexPrice,
      pair.collateralTokenDecimal,
      pair.indexTokenDecimal
    );
  } else {
    const notionalDelta = token1ToToken2(
      sizeDelta,
      indexPrice,
      collateralPrice,
      pair.indexTokenDecimal,
      pair.collateralTokenDecimal
    );
    const numerator =
      pos.openNotional * BigInt(LEVERAGE_PRECISION) * BigInt(TRADING_FEE_RATE_PRECISION) +
      notionalDelta * BigInt(LEVERAGE_PRECISION) * BigInt(TRADING_FEE_RATE_PRECISION) -
      leverage * pos.margin * BigInt(TRADING_FEE_RATE_PRECISION) +
      leverage * notionalDelta * pair.tradingFeeRate;
    const denominator = leverage * BigInt(TRADING_FEE_RATE_PRECISION);
    marginDelta = numerator / denominator;
    // calc marginDelta
  }
  return {
    sizeDelta,
    marginDelta,
    leverage,
  };
}

export function opIncreasePosition(
  pos: Position,
  pair: FuturePair,
  marginDelta: bigint,
  sizeDelta: bigint,
  collateralPrice: bigint,
  indexPrice: bigint
): OpReturn {
  assertLiquidate(pos, pair, collateralPrice, indexPrice);
  const newPos = { ...pos };
  const notionalDelta = token1ToToken2(
    sizeDelta,
    indexPrice,
    collateralPrice,
    pair.indexTokenDecimal,
    pair.collateralTokenDecimal
  );
  const tradingFeeRate = calcTradingFeeRate(pair, sizeDelta, pos.isLong, true)
  const tradingFee = calcTradingFee(notionalDelta, tradingFeeRate);

  const newPair = calcNewFundingRate(
    pair,
    pos.isLong ? sizeDelta : BigInt(0),
    !pos.isLong ? sizeDelta : BigInt(0),
    collateralPrice,
    indexPrice
  ).pair;
  const fundingFee = calcFundingFee(pos, newPair, notionalDelta);
  newPos.margin = newPos.margin + marginDelta - tradingFee + fundingFee;
  newPos.openNotional = newPos.openNotional + notionalDelta;
  newPos.size = newPos.size + sizeDelta;
  newPos.entryFundingRate = pos.isLong
    ? newPair.cumulativeLongFundingRate
    : newPair.cumulativeShortFundingRate;

  const mrs = calcNewMmr(newPair, newPos.margin, newPos.openNotional);
  if (mrs.mr < mrs.mmr) {
    throw new Error("insuff_margin");
  }
  newPos.mmr = mrs.mmr;
  if (validateLiquidate(newPos, pair, collateralPrice, indexPrice)) {
    throw new Error("insuff_margin");
  }
  return {
    pos: newPos,
    pair: {
      ...newPair,
      totalLongSize: pos.isLong ? newPair.totalLongSize + sizeDelta : newPair.totalLongSize,
      totalShortSize: !pos.isLong ? newPair.totalShortSize + sizeDelta : newPair.totalShortSize,
    },
    hourFundingRate: pos.isLong ? newPair.longFundingRate : newPair.shortFundingRate,
    fundingFee,
    tradingFee,
    pnl: BigInt(0),
    receiveMargin: BigInt(0),
    notionalDelta,
    mr: calcMr(newPos, newPair, pair.collateralPrice, pair.indexPrice),
    tradingFeeRate,

    indexLiqPrice: calcIndexLiqPrice(newPos, newPair, collateralPrice, indexPrice),
    collateralLiqPrice: calcCollateralLiqPrice(newPos, newPair, collateralPrice, indexPrice),
  };
}

export function validateLiquidate(
  pos: Position,
  pair: FuturePair,
  collateralPrice: bigint,
  indexPrice: bigint
) {
  if (pos.size === BigInt(0)) {
    return false;
  }
  const tradingFeeRate = calcTradingFeeRate(pair, pos.size, pos.isLong, true)
  const tradingFee = calcTradingFee(pos.openNotional, tradingFeeRate);
  const newPair = calcNewFundingRate(
    pair,
    pos.isLong ? -pos.size : BigInt(0),
    !pos.isLong ? -pos.size : BigInt(0),
    collateralPrice,
    indexPrice
  ).pair;
  const fundingFee = calcFundingFee(pos, newPair, BigInt(0));
  const pnl = calcPnl(pos, pair, collateralPrice, indexPrice);
  const leftMargin = pos.margin - tradingFee - fundingFee + pnl;
  if (leftMargin <= 0) {
    return true;
  }
  const preMrs = calcNewMmr(pair, pos.margin, pos.openNotional);
  const newMrs = calcNewMmr(
    pair,
    leftMargin,
    token1ToToken2(
      pos.size,
      indexPrice,
      collateralPrice,
      pair.indexTokenDecimal,
      pair.collateralTokenDecimal
    )
  );
  if (preMrs.mmr > newMrs.mr) {
    return true;
  }
  return false;
}

export function assertLiquidate(
  pos: Position,
  pair: FuturePair,
  collateralPrice: bigint,
  indexPrice: bigint
) {
  const shouldLiquidate = validateLiquidate(pos, pair, collateralPrice, indexPrice);
  if (shouldLiquidate) {
    throw new Error("should_liquidate");
  }
}

export function opDecreasePosition(
  pos: Position,
  pair: FuturePair,
  sizeDelta: bigint,
  collateralPrice: bigint,
  indexPrice: bigint
): OpReturn {
  assertLiquidate(pos, pair, collateralPrice, indexPrice);
  if (pos.size === BigInt(0)) {
    throw new Error("position_not_exist");
  }
  const notionalDelta = (sizeDelta * pos.openNotional) / pos.size;
  const tradingFeeRate = calcTradingFeeRate(pair, sizeDelta, pos.isLong, false)
  const tradingFee = calcTradingFee(notionalDelta, tradingFeeRate);

  if (notionalDelta > pos.openNotional) {
    throw new Error("decrease_size_exceed");
  }
  const pnl = calcPnl(pos, pair, collateralPrice, indexPrice);
  const newPair = calcNewFundingRate(
    pair,
    pos.isLong ? -sizeDelta : BigInt(0),
    !pos.isLong ? -sizeDelta : BigInt(0),
    collateralPrice,
    indexPrice
  ).pair;
  const fundingFee = calcFundingFee(pos, newPair, BigInt(0));

  let ret: OpReturn = {
    pos: pos,
    pair: {
      ...newPair,
      totalLongSize: pos.isLong ? newPair.totalLongSize - sizeDelta : newPair.totalLongSize,
      totalShortSize: !pos.isLong ? newPair.totalShortSize - sizeDelta : newPair.totalShortSize,
    },
    hourFundingRate: pos.isLong ? newPair.longFundingRate : newPair.shortFundingRate,
    fundingFee,
    tradingFee,
    tradingFeeRate,
    pnl: BigInt(0),
    receiveMargin: BigInt(0),
    notionalDelta,
    mr: BigInt(0),
    indexLiqPrice: BigInt(0),
    collateralLiqPrice: BigInt(0),
  };
  const preMrs = calcNewMmr(newPair, pos.margin, pos.openNotional);

  if (notionalDelta === pos.openNotional) {
    // close
    const leftMargin = pos.margin - fundingFee - tradingFee + pnl;
    ret.pos = {
      ...pos,
      margin: BigInt(0),
      openNotional: BigInt(0),
      size: BigInt(0),
      entryFundingRate: BigInt(0),
      mmr: BigInt(0),
    };
    ret.pnl = pnl;
    ret.receiveMargin = leftMargin;
    ret.mr = BigInt(MAX_MR);
    ret.indexLiqPrice = BigInt(0);
    ret.collateralLiqPrice = BigInt(0);
    return ret;
  } else {
    // decrease
    const partPnl = (notionalDelta * pnl) / pos.openNotional;
    const leftMargin = pos.margin - fundingFee - tradingFee + partPnl;
    const receiveMargin = (notionalDelta * leftMargin) / pos.openNotional;
    const newMrs = calcNewMmr(
      newPair,
      leftMargin - receiveMargin,
      pos.openNotional - notionalDelta
    );
    ret.receiveMargin = receiveMargin;
    ret.pnl = partPnl;

    ret.pos = {
      ...pos,
      margin: leftMargin - receiveMargin,
      openNotional: pos.openNotional - notionalDelta,
      size: pos.size - sizeDelta,
      entryFundingRate: pos.isLong
        ? newPair.cumulativeLongFundingRate
        : newPair.cumulativeShortFundingRate,
      mmr: newMrs.mmr,
    };

    ret.mr = calcMr(pos, pair, pair.collateralPrice, pair.indexPrice);

    assertLiquidate(ret.pos, ret.pair, collateralPrice, indexPrice);

    ret.indexLiqPrice = calcIndexLiqPrice(ret.pos, ret.pair, collateralPrice, indexPrice);
    ret.collateralLiqPrice = calcCollateralLiqPrice(ret.pos, ret.pair, collateralPrice, indexPrice);
    return ret;
  }
}

/**
 * 增加 保证金时
 * @param pos 原始的 pos
 * @param pair 原始的 futurePair
 * @param marginDelta 增加多少
 * @param collateralPrice 当前保证金token价格
 * @param indexPrice 当前 index token 价格
 * @returns
 */
export function opIncreaseMargin(
  pos: Position,
  pair: FuturePair,
  marginDelta: bigint,
  collateralPrice: bigint,
  indexPrice: bigint
): OpReturn {
  assertLiquidate(pos, pair, collateralPrice, indexPrice);
  if (pos.size === BigInt(0)) {
    throw new Error("position_not_exist");
  }
  const newPos = {
    ...pos,
    margin: pos.margin + marginDelta,
  };
  if (validateLiquidate(newPos, pair, collateralPrice, indexPrice)) {
    throw new Error("insuff_margin");
  }
  const mrs = calcNewMmr(pair, pos.margin, pos.openNotional);
  newPos.mmr = mrs.mmr;
  const mr = calcMr(newPos, pair, pair.collateralPrice, pair.indexPrice);

  return {
    pos: newPos,
    pair,
    hourFundingRate: pos.isLong ? pair.longFundingRate : pair.shortFundingRate,
    fundingFee: BigInt(0),
    tradingFee: BigInt(0),
    tradingFeeRate: BigInt(0),
    pnl: BigInt(0),
    receiveMargin: BigInt(0),
    notionalDelta: BigInt(0),
    mr: mr,
    indexLiqPrice: calcIndexLiqPrice(newPos, pair, collateralPrice, indexPrice),
    collateralLiqPrice: calcCollateralLiqPrice(newPos, pair, collateralPrice, indexPrice),
  };
}

export function opDecreaseMargin(
  pos: Position,
  pair: FuturePair,
  marginDelta: bigint,
  collateralPrice: bigint,
  indexPrice: bigint
): OpReturn {
  assertLiquidate(pos, pair, collateralPrice, indexPrice);
  if (pos.size === BigInt(0)) {
    throw new Error("position_not_exist");
  }

  const updatedPair = calcNewFundingRate(
    pair,
    BigInt(0),
    BigInt(0),
    collateralPrice,
    indexPrice
  ).pair;
  const pnl = calcPnl(pos, pair, collateralPrice, indexPrice);
  const fundingFee = calcFundingFee(pos, updatedPair, BigInt(0));
  const posMargin = pos.margin + pnl - fundingFee - marginDelta;
  if (posMargin < BigInt(0)) {
    throw new Error("margin_delta_exceed");
  }

  const newPos: Position = {
    ...pos,
    margin: posMargin,
    openNotional: token1ToToken2(
      pos.size,
      indexPrice,
      collateralPrice,
      pair.indexTokenDecimal,
      pair.collateralTokenDecimal
    ),
    entryFundingRate: pos.isLong
      ? updatedPair.cumulativeLongFundingRate
      : updatedPair.cumulativeShortFundingRate,
    entryCollateralPrice: collateralPrice,
    entryIndexPrice: indexPrice,
  };
  if (validateLiquidate(newPos, pair, collateralPrice, indexPrice)) {
    throw new Error("insuff_margin");
  }
  const mrs = calcNewMmr(updatedPair, pos.margin, pos.openNotional);
  newPos.mmr = mrs.mmr;
  const mr = calcMr(newPos, pair, pair.collateralPrice, pair.indexPrice);

  assertLiquidate(newPos, updatedPair, collateralPrice, indexPrice);

  return {
    pos: newPos,
    pair: updatedPair,
    hourFundingRate: pos.isLong ? updatedPair.longFundingRate : updatedPair.shortFundingRate,
    fundingFee: fundingFee,
    tradingFee: BigInt(0),
    tradingFeeRate: BigInt(0),
    pnl: pnl,
    receiveMargin: BigInt(0),
    notionalDelta: BigInt(0),
    mr: mr,
    indexLiqPrice: calcIndexLiqPrice(newPos, updatedPair, collateralPrice, indexPrice),
    collateralLiqPrice: calcCollateralLiqPrice(newPos, updatedPair, collateralPrice, indexPrice),
  };
}

export function calcMaxDecreaseMargin(
  pos: Position,
  pair: FuturePair,
  collateralPrice: bigint,
  indexPrice: bigint
): bigint {
  assertLiquidate(pos, pair, collateralPrice, indexPrice);
  const pnl = calcPnl(pos, pair, collateralPrice, indexPrice);
  const tradingFeeRate = calcTradingFeeRate(pair, pos.size, pos.isLong, false)
  const tradingFee = calcTradingFee(pos.openNotional, tradingFeeRate);
  const updatedPair = calcNewFundingRate(
    pair,
    BigInt(0),
    BigInt(0),
    collateralPrice,
    indexPrice
  ).pair;
  const fundignFee = calcFundingFee(pos, updatedPair, BigInt(0));
  const notional = token1ToToken2(
    pos.size,
    indexPrice,
    collateralPrice,
    pair.indexTokenDecimal,
    pair.collateralTokenDecimal
  );
  const maxLeverageMargin = (notional * BigInt(LEVERAGE_PRECISION)) / pair.maxLeverage;
  const removeMargin = pos.margin + pnl - fundignFee - tradingFee - maxLeverageMargin;
  if (removeMargin <= 0) {
    return BigInt(0);
  }
  return removeMargin;
}

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(msg);
  }
}

export function calcLimitIncreaseSizeDelta(
  pair: FuturePair,
  isLong: boolean,
  notionalDelta: bigint,
  collateralPrice: bigint,
  indexPrice: bigint,
  limitPrice: bigint
): bigint {
  let limitSizeDelta = BigInt(0);
  if (pair.indexToken == ethers.constants.AddressZero) {
    // 币本位: limit price is collateral target price
    if (isLong) {
      assert(limitPrice > collateralPrice, "invalid_limit_price");
    } else {
      assert(limitPrice < collateralPrice, "invalid_limit_price");
    }
    limitSizeDelta = token1ToToken2(
      notionalDelta,
      limitPrice,
      indexPrice,
      pair.collateralTokenDecimal,
      pair.indexTokenDecimal
    );
  } else {
    // usd: limit price is index target price
    if (isLong) {
      assert(limitPrice < indexPrice, "invalid_limit_price");
    } else {
      assert(limitPrice > indexPrice, "invalid_limit_price");
    }
    limitSizeDelta = token1ToToken2(
      notionalDelta,
      collateralPrice,
      limitPrice,
      pair.collateralTokenDecimal,
      pair.indexTokenDecimal
    );
  }
  return limitSizeDelta;
}

export function calcLimitDecreaseSizeDelta(
  pair: FuturePair,
  isLong: boolean,
  notionalDelta: bigint,
  collateralPrice: bigint,
  indexPrice: bigint,
  minLimitPrice: bigint,
  maxLimitPrice: bigint
) {
  assert(
    !(minLimitPrice === BigInt(0) && maxLimitPrice === BigInt(0)),
    "min_or_max_should_be_non_zero"
  );
  const ret = {
    minSizeDelta: BigInt(0),
    maxSizeDelta: BigInt(0),
  };
  if (pair.indexToken == ethers.constants.AddressZero) {
    // 币本位
    if (minLimitPrice > 0) {
      assert(minLimitPrice < collateralPrice, "invalid_min_limit_price");
    }
    if (maxLimitPrice > 0) {
      assert(maxLimitPrice > collateralPrice, "invalid_min_limit_price");
    }
    ret.maxSizeDelta = token1ToToken2(
      notionalDelta,
      maxLimitPrice,
      indexPrice,
      pair.collateralTokenDecimal,
      pair.indexTokenDecimal
    );
    ret.minSizeDelta = token1ToToken2(
      notionalDelta,
      minLimitPrice,
      indexPrice,
      pair.collateralTokenDecimal,
      pair.indexTokenDecimal
    );
  } else {
    // u 本位
    if (minLimitPrice > 0) {
      assert(minLimitPrice < indexPrice, "invalid_min_limit_price");
    }
    if (maxLimitPrice < 0) {
      assert(maxLimitPrice > indexPrice, "invalid_min_limit_price");
    }
    ret.maxSizeDelta = token1ToToken2(
      notionalDelta,
      collateralPrice,
      minLimitPrice,
      pair.collateralTokenDecimal,
      pair.indexTokenDecimal
    );
    ret.minSizeDelta = token1ToToken2(
      notionalDelta,
      collateralPrice,
      maxLimitPrice,
      pair.collateralTokenDecimal,
      pair.indexTokenDecimal
    );
  }
  return ret;
}

// 计算币本位价格
export function calcLimitCollateralPrice(
  pair: FuturePair,
  collateralPrice: bigint,
  indexPrice: bigint,
  notionlDelta: bigint,
  sizeDelta: bigint
) {
  return calcPrice(
    sizeDelta,
    notionlDelta,
    indexPrice,
    pair.indexTokenDecimal,
    pair.collateralTokenDecimal
  );
}

// 计算u本位价格
export function calcLimitIndexPrice(
  pair: FuturePair,
  collateralPrice: bigint,
  indexPrice: bigint,
  notionlDelta: bigint,
  sizeDelta: bigint
) {
  return calcPrice(
    notionlDelta,
    sizeDelta,
    collateralPrice,
    pair.collateralTokenDecimal,
    pair.indexTokenDecimal
  );
}
