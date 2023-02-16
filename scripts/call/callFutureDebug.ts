import {
  FastPriceFeed,
  Future,
  FutureLimit,
  FutureReader,
  FutureRouter,
  FutureUtil,
  MyERC20,
  Reader,
  Swap,
  SwapPriceProxy,
} from "../../typechain";
import * as helper from "../helper";
import {
  calcCollateralLiqPrice,
  calcIndexLiqPrice,
  calcMr,
  calcOpIncreasePosition,
  LEVERAGE_PRECISION,
  opDecreaseMargin,
  opDecreasePosition,
  opIncreaseMargin,
  opIncreasePosition,
  parseGetPairs2,
  parseGetPositionList2,
} from "../../helper/future";
import { sleep } from "zksync-web3/build/src/utils";
import { BigNumber } from "ethers";

const calculateTradingFee = async function (
  _collateralToken: any,
  _indexToken: any,
  _isLong: any,
  _notionalDelta: any,
  sizeDelta: any,
  _isIncreasePosition: any,
  future: Future
) {
  const pairKey = await future.getPairKey(_collateralToken, _indexToken)
  let feeRate = await future.tradingFeeRates(pairKey)
  let totalLongSize = await future.totalLongSizes(pairKey)
  let totalShortSize = await future.totalShortSizes(pairKey)
  if (_isIncreasePosition) {
    if (_isLong) {
      totalLongSize = totalLongSize.add(sizeDelta)
    } else {
      totalShortSize = totalShortSize.add(sizeDelta)
    }
    if (_isLong && totalLongSize.gt(totalShortSize) && !totalShortSize.eq(0)) {
      feeRate = totalLongSize.mul(feeRate).div(totalShortSize)
    }
    if (!_isLong && totalLongSize.lt(totalShortSize) && !totalLongSize.eq(0)) {
      feeRate = totalShortSize.mul(feeRate).div(totalShortSize)
    }
  } else {
    if (_isLong) {
      totalLongSize = totalLongSize.sub(sizeDelta)
    } else {
      totalShortSize = totalShortSize.sub(sizeDelta)
    }
    if (!_isLong && totalLongSize.gt(totalShortSize) && !totalShortSize.eq(0)) {
      feeRate = totalLongSize.mul(feeRate).div(totalShortSize)
    }
    if (_isLong && totalLongSize.lt(totalShortSize) && !totalLongSize.eq(0)) {
      feeRate = totalShortSize.mul(feeRate).div(totalLongSize)
    }
  }
  return feeRate.mul(_notionalDelta).div('1000000000')
}

function token1ToToken2(
  token1Amount: BigNumber,
  token1Price: BigNumber,
  token1Decimal: BigNumber,
  token2Price: BigNumber,
  token2Decimal: BigNumber
) {
  if (token1Decimal.gt(token2Decimal)) {
    const exp = BigNumber.from('10').pow(token1Decimal.sub(token2Decimal))
    const d = token2Price.mul(exp)
    return token1Amount.mul(token1Price).div(d)
  } else {
    const exp = BigNumber.from('10').pow(token2Decimal.sub(token1Decimal))
    return token1Amount.mul(token1Price).mul(exp).div(token2Price);
  }
}

const calculateFundingFee = async function (
  _collateralToken: any,
  _indexToken: any,
  pos: any,
  _isLong: any,
  _notionalDelta: any,
  _isIncreasePosition: any,
  future: Future
) {
  const pairKey = await future.getPairKey(_collateralToken, _indexToken)
  let _increaseNotionalDelta = BigNumber.from('0');
  let _fundingFee = BigNumber.from('0')
  const FUNDING_RATE_PRECISION = '10000000000'
  if (_isIncreasePosition) {
    _increaseNotionalDelta = _notionalDelta
  }
  const cumulativeLongFundingRate = await future.cumulativeLongFundingRates(pairKey)
  if (_isLong) {
    _fundingFee = pos.openNotional.mul(cumulativeLongFundingRate.sub(pos.entryFundingRate)).div(FUNDING_RATE_PRECISION)
    _fundingFee = _fundingFee.add(
      _increaseNotionalDelta.mul(await future.longFundingRates(pairKey)).div(FUNDING_RATE_PRECISION)
    )
  } else {
    _fundingFee = pos.openNotional.mul(cumulativeLongFundingRate.sub(pos.entryFundingRate)).div(FUNDING_RATE_PRECISION)
    _fundingFee = _fundingFee.add(
      _increaseNotionalDelta.mul(await future.shortFundingRates(pairKey)).div(FUNDING_RATE_PRECISION)
    )
  }
  return _fundingFee
}

const calculatePnl = async function (
  _collateralToken: any,
  _indexToken: any,
  _account: any,
  _isLong: any,
  future: Future
) {
  const posKey = await future.getPositionKey(_collateralToken, _indexToken, _account, _isLong)
  const pos = await future.positions(posKey)
  const collateralPrice = await future.getPrice(_collateralToken);
  const indexPrice = await future.getPrice(_indexToken);
  const indexDecimal = await future.tokenDecimals(_indexToken);
  const collateralDecimal = await future.tokenDecimals(_collateralToken)
  const notional = await token1ToToken2(
    pos.size,
    indexPrice,
    BigNumber.from(indexDecimal),
    collateralPrice,
    BigNumber.from(collateralDecimal)
  )
  let pnl = BigNumber.from('0')
  if (_isLong) {
    pnl = notional.sub(pos.openNotional)
  } else {
    pnl = pos.openNotional.sub(notional)
  }
  return {
    pnl,
    notional
  }
  console.log("calculatePnl: ", notional)
}

const _calcNewPosition = async function (
  _collateralToken: any,
  _indexToken: any,
  _account: any,
  _isLong: any,
  _notionalDelta: any,
  _sizeDelta: any,
  _isIncreasePosition: any,
  future: Future
) {
  const posKey = await future.getPositionKey(_collateralToken, _indexToken, _account, _isLong)
  const pos = await future.positions(posKey)
  const tradingFee = await calculateTradingFee(_collateralToken, _indexToken, _isLong, _notionalDelta, _sizeDelta, _isIncreasePosition, future)
  const fundingFee = await calculateFundingFee(_collateralToken, _indexToken, pos, _isLong, _notionalDelta, _isIncreasePosition, future)
  let { pnl, notional } = await calculatePnl(_collateralToken, _indexToken, _account, _isLong, future)
  const remainMargin = pos.margin.sub(tradingFee).sub(fundingFee).add(pnl)
}

const main = async () => {
  /*
  bulkValidateLiquidate
  [
    _collTokens  [ '0x42437026bd32bc07914dc1fb35b8009805277915' ],
    _indexTokens [ '0xb9362fa23cf301521b844cd996393d9f4dde2d54' ],
    _accounts    [ '0xf8c0c6bf9d861d1b93f5d0a9204bc85d38ca8904' ],
    _isLongs     [ false ]
  ]*/
  const wethAddr = helper.getDeployedAddress("weth");
  const linkAddr = helper.getDeployedAddress("link");
  const usdcAddr = helper.getDeployedAddress("usdc");
  const _collToken = '0x42437026bd32bc07914dc1fb35b8009805277915'
  const _indexToken = '0xb9362fa23cf301521b844cd996393d9f4dde2d54'
  const _account = '0xf8c0c6bf9d861d1b93f5d0a9204bc85d38ca8904'
  const _isLong = false
  const future = (await helper.getDeployedContract(
    "Future",
    helper.getDeployedAddress("future")
  )) as Future;
  const posKey = await future.getPositionKey(_collToken, _indexToken, _account, _isLong)
  const pos = await future.positions(posKey)
  const info = await _calcNewPosition(_collToken, _indexToken, _account, _isLong, pos.openNotional, pos.size, false, future)
  // const addr = await future.owner();
  // console.log('addr', addr)
};

main()
  .then(() => {
    process.exit(0);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
