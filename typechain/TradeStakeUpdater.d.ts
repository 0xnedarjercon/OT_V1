/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */

import {
  ethers,
  EventFilter,
  Signer,
  BigNumber,
  BigNumberish,
  PopulatedTransaction,
  BaseContract,
  ContractTransaction,
  Overrides,
  CallOverrides,
} from "ethers";
import { BytesLike } from "@ethersproject/bytes";
import { Listener, Provider } from "@ethersproject/providers";
import { FunctionFragment, EventFragment, Result } from "@ethersproject/abi";
import type { TypedEventFilter, TypedEvent, TypedListener } from "./common";

interface TradeStakeUpdaterInterface extends ethers.utils.Interface {
  functions: {
    "OSD_PRICE()": FunctionFragment;
    "decreasePosition(address,address,address,bool,uint256,uint256,address)": FunctionFragment;
    "future()": FunctionFragment;
    "increasePosition(address,address,address,bool,uint256)": FunctionFragment;
    "liquidatePosition(address,address,address,bool)": FunctionFragment;
    "osd()": FunctionFragment;
    "owner()": FunctionFragment;
    "priceFeed()": FunctionFragment;
    "renounceOwnership()": FunctionFragment;
    "setCaller(address,bool)": FunctionFragment;
    "swap()": FunctionFragment;
    "swapIn(address,address,uint256,uint256,address,uint256)": FunctionFragment;
    "swapOut(address,address,uint256,uint256,address,uint256)": FunctionFragment;
    "tradeStake()": FunctionFragment;
    "transferOwnership(address)": FunctionFragment;
  };

  encodeFunctionData(functionFragment: "OSD_PRICE", values?: undefined): string;
  encodeFunctionData(
    functionFragment: "decreasePosition",
    values: [
      string,
      string,
      string,
      boolean,
      BigNumberish,
      BigNumberish,
      string
    ]
  ): string;
  encodeFunctionData(functionFragment: "future", values?: undefined): string;
  encodeFunctionData(
    functionFragment: "increasePosition",
    values: [string, string, string, boolean, BigNumberish]
  ): string;
  encodeFunctionData(
    functionFragment: "liquidatePosition",
    values: [string, string, string, boolean]
  ): string;
  encodeFunctionData(functionFragment: "osd", values?: undefined): string;
  encodeFunctionData(functionFragment: "owner", values?: undefined): string;
  encodeFunctionData(functionFragment: "priceFeed", values?: undefined): string;
  encodeFunctionData(
    functionFragment: "renounceOwnership",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "setCaller",
    values: [string, boolean]
  ): string;
  encodeFunctionData(functionFragment: "swap", values?: undefined): string;
  encodeFunctionData(
    functionFragment: "swapIn",
    values: [string, string, BigNumberish, BigNumberish, string, BigNumberish]
  ): string;
  encodeFunctionData(
    functionFragment: "swapOut",
    values: [string, string, BigNumberish, BigNumberish, string, BigNumberish]
  ): string;
  encodeFunctionData(
    functionFragment: "tradeStake",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "transferOwnership",
    values: [string]
  ): string;

  decodeFunctionResult(functionFragment: "OSD_PRICE", data: BytesLike): Result;
  decodeFunctionResult(
    functionFragment: "decreasePosition",
    data: BytesLike
  ): Result;
  decodeFunctionResult(functionFragment: "future", data: BytesLike): Result;
  decodeFunctionResult(
    functionFragment: "increasePosition",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "liquidatePosition",
    data: BytesLike
  ): Result;
  decodeFunctionResult(functionFragment: "osd", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "owner", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "priceFeed", data: BytesLike): Result;
  decodeFunctionResult(
    functionFragment: "renounceOwnership",
    data: BytesLike
  ): Result;
  decodeFunctionResult(functionFragment: "setCaller", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "swap", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "swapIn", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "swapOut", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "tradeStake", data: BytesLike): Result;
  decodeFunctionResult(
    functionFragment: "transferOwnership",
    data: BytesLike
  ): Result;

  events: {
    "OwnershipTransferred(address,address)": EventFragment;
  };

  getEvent(nameOrSignatureOrTopic: "OwnershipTransferred"): EventFragment;
}

export type OwnershipTransferredEvent = TypedEvent<
  [string, string] & { previousOwner: string; newOwner: string }
>;

export class TradeStakeUpdater extends BaseContract {
  connect(signerOrProvider: Signer | Provider | string): this;
  attach(addressOrName: string): this;
  deployed(): Promise<this>;

  listeners<EventArgsArray extends Array<any>, EventArgsObject>(
    eventFilter?: TypedEventFilter<EventArgsArray, EventArgsObject>
  ): Array<TypedListener<EventArgsArray, EventArgsObject>>;
  off<EventArgsArray extends Array<any>, EventArgsObject>(
    eventFilter: TypedEventFilter<EventArgsArray, EventArgsObject>,
    listener: TypedListener<EventArgsArray, EventArgsObject>
  ): this;
  on<EventArgsArray extends Array<any>, EventArgsObject>(
    eventFilter: TypedEventFilter<EventArgsArray, EventArgsObject>,
    listener: TypedListener<EventArgsArray, EventArgsObject>
  ): this;
  once<EventArgsArray extends Array<any>, EventArgsObject>(
    eventFilter: TypedEventFilter<EventArgsArray, EventArgsObject>,
    listener: TypedListener<EventArgsArray, EventArgsObject>
  ): this;
  removeListener<EventArgsArray extends Array<any>, EventArgsObject>(
    eventFilter: TypedEventFilter<EventArgsArray, EventArgsObject>,
    listener: TypedListener<EventArgsArray, EventArgsObject>
  ): this;
  removeAllListeners<EventArgsArray extends Array<any>, EventArgsObject>(
    eventFilter: TypedEventFilter<EventArgsArray, EventArgsObject>
  ): this;

  listeners(eventName?: string): Array<Listener>;
  off(eventName: string, listener: Listener): this;
  on(eventName: string, listener: Listener): this;
  once(eventName: string, listener: Listener): this;
  removeListener(eventName: string, listener: Listener): this;
  removeAllListeners(eventName?: string): this;

  queryFilter<EventArgsArray extends Array<any>, EventArgsObject>(
    event: TypedEventFilter<EventArgsArray, EventArgsObject>,
    fromBlockOrBlockhash?: string | number | undefined,
    toBlock?: string | number | undefined
  ): Promise<Array<TypedEvent<EventArgsArray & EventArgsObject>>>;

  interface: TradeStakeUpdaterInterface;

  functions: {
    OSD_PRICE(overrides?: CallOverrides): Promise<[BigNumber]>;

    decreasePosition(
      _collateralToken: string,
      _indexToken: string,
      _account: string,
      arg3: boolean,
      arg4: BigNumberish,
      _notionalDelta: BigNumberish,
      arg6: string,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<ContractTransaction>;

    future(overrides?: CallOverrides): Promise<[string]>;

    increasePosition(
      _collateralToken: string,
      _indexToken: string,
      _account: string,
      arg3: boolean,
      _notionalDelta: BigNumberish,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<ContractTransaction>;

    liquidatePosition(
      _collateralToken: string,
      _indexToken: string,
      _account: string,
      _isLong: boolean,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<ContractTransaction>;

    osd(overrides?: CallOverrides): Promise<[string]>;

    owner(overrides?: CallOverrides): Promise<[string]>;

    priceFeed(overrides?: CallOverrides): Promise<[string]>;

    renounceOwnership(
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<ContractTransaction>;

    setCaller(
      _caller: string,
      _approve: boolean,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<ContractTransaction>;

    swap(overrides?: CallOverrides): Promise<[string]>;

    swapIn(
      tokenIn: string,
      tokenOut: string,
      amountIn: BigNumberish,
      arg3: BigNumberish,
      to: string,
      deadline: BigNumberish,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<ContractTransaction>;

    swapOut(
      tokenIn: string,
      tokenOut: string,
      arg2: BigNumberish,
      amountOut: BigNumberish,
      to: string,
      deadline: BigNumberish,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<ContractTransaction>;

    tradeStake(overrides?: CallOverrides): Promise<[string]>;

    transferOwnership(
      newOwner: string,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<ContractTransaction>;
  };

  OSD_PRICE(overrides?: CallOverrides): Promise<BigNumber>;

  decreasePosition(
    _collateralToken: string,
    _indexToken: string,
    _account: string,
    arg3: boolean,
    arg4: BigNumberish,
    _notionalDelta: BigNumberish,
    arg6: string,
    overrides?: Overrides & { from?: string | Promise<string> }
  ): Promise<ContractTransaction>;

  future(overrides?: CallOverrides): Promise<string>;

  increasePosition(
    _collateralToken: string,
    _indexToken: string,
    _account: string,
    arg3: boolean,
    _notionalDelta: BigNumberish,
    overrides?: Overrides & { from?: string | Promise<string> }
  ): Promise<ContractTransaction>;

  liquidatePosition(
    _collateralToken: string,
    _indexToken: string,
    _account: string,
    _isLong: boolean,
    overrides?: Overrides & { from?: string | Promise<string> }
  ): Promise<ContractTransaction>;

  osd(overrides?: CallOverrides): Promise<string>;

  owner(overrides?: CallOverrides): Promise<string>;

  priceFeed(overrides?: CallOverrides): Promise<string>;

  renounceOwnership(
    overrides?: Overrides & { from?: string | Promise<string> }
  ): Promise<ContractTransaction>;

  setCaller(
    _caller: string,
    _approve: boolean,
    overrides?: Overrides & { from?: string | Promise<string> }
  ): Promise<ContractTransaction>;

  swap(overrides?: CallOverrides): Promise<string>;

  swapIn(
    tokenIn: string,
    tokenOut: string,
    amountIn: BigNumberish,
    arg3: BigNumberish,
    to: string,
    deadline: BigNumberish,
    overrides?: Overrides & { from?: string | Promise<string> }
  ): Promise<ContractTransaction>;

  swapOut(
    tokenIn: string,
    tokenOut: string,
    arg2: BigNumberish,
    amountOut: BigNumberish,
    to: string,
    deadline: BigNumberish,
    overrides?: Overrides & { from?: string | Promise<string> }
  ): Promise<ContractTransaction>;

  tradeStake(overrides?: CallOverrides): Promise<string>;

  transferOwnership(
    newOwner: string,
    overrides?: Overrides & { from?: string | Promise<string> }
  ): Promise<ContractTransaction>;

  callStatic: {
    OSD_PRICE(overrides?: CallOverrides): Promise<BigNumber>;

    decreasePosition(
      _collateralToken: string,
      _indexToken: string,
      _account: string,
      arg3: boolean,
      arg4: BigNumberish,
      _notionalDelta: BigNumberish,
      arg6: string,
      overrides?: CallOverrides
    ): Promise<void>;

    future(overrides?: CallOverrides): Promise<string>;

    increasePosition(
      _collateralToken: string,
      _indexToken: string,
      _account: string,
      arg3: boolean,
      _notionalDelta: BigNumberish,
      overrides?: CallOverrides
    ): Promise<void>;

    liquidatePosition(
      _collateralToken: string,
      _indexToken: string,
      _account: string,
      _isLong: boolean,
      overrides?: CallOverrides
    ): Promise<void>;

    osd(overrides?: CallOverrides): Promise<string>;

    owner(overrides?: CallOverrides): Promise<string>;

    priceFeed(overrides?: CallOverrides): Promise<string>;

    renounceOwnership(overrides?: CallOverrides): Promise<void>;

    setCaller(
      _caller: string,
      _approve: boolean,
      overrides?: CallOverrides
    ): Promise<void>;

    swap(overrides?: CallOverrides): Promise<string>;

    swapIn(
      tokenIn: string,
      tokenOut: string,
      amountIn: BigNumberish,
      arg3: BigNumberish,
      to: string,
      deadline: BigNumberish,
      overrides?: CallOverrides
    ): Promise<void>;

    swapOut(
      tokenIn: string,
      tokenOut: string,
      arg2: BigNumberish,
      amountOut: BigNumberish,
      to: string,
      deadline: BigNumberish,
      overrides?: CallOverrides
    ): Promise<void>;

    tradeStake(overrides?: CallOverrides): Promise<string>;

    transferOwnership(
      newOwner: string,
      overrides?: CallOverrides
    ): Promise<void>;
  };

  filters: {
    "OwnershipTransferred(address,address)"(
      previousOwner?: string | null,
      newOwner?: string | null
    ): TypedEventFilter<
      [string, string],
      { previousOwner: string; newOwner: string }
    >;

    OwnershipTransferred(
      previousOwner?: string | null,
      newOwner?: string | null
    ): TypedEventFilter<
      [string, string],
      { previousOwner: string; newOwner: string }
    >;
  };

  estimateGas: {
    OSD_PRICE(overrides?: CallOverrides): Promise<BigNumber>;

    decreasePosition(
      _collateralToken: string,
      _indexToken: string,
      _account: string,
      arg3: boolean,
      arg4: BigNumberish,
      _notionalDelta: BigNumberish,
      arg6: string,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<BigNumber>;

    future(overrides?: CallOverrides): Promise<BigNumber>;

    increasePosition(
      _collateralToken: string,
      _indexToken: string,
      _account: string,
      arg3: boolean,
      _notionalDelta: BigNumberish,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<BigNumber>;

    liquidatePosition(
      _collateralToken: string,
      _indexToken: string,
      _account: string,
      _isLong: boolean,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<BigNumber>;

    osd(overrides?: CallOverrides): Promise<BigNumber>;

    owner(overrides?: CallOverrides): Promise<BigNumber>;

    priceFeed(overrides?: CallOverrides): Promise<BigNumber>;

    renounceOwnership(
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<BigNumber>;

    setCaller(
      _caller: string,
      _approve: boolean,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<BigNumber>;

    swap(overrides?: CallOverrides): Promise<BigNumber>;

    swapIn(
      tokenIn: string,
      tokenOut: string,
      amountIn: BigNumberish,
      arg3: BigNumberish,
      to: string,
      deadline: BigNumberish,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<BigNumber>;

    swapOut(
      tokenIn: string,
      tokenOut: string,
      arg2: BigNumberish,
      amountOut: BigNumberish,
      to: string,
      deadline: BigNumberish,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<BigNumber>;

    tradeStake(overrides?: CallOverrides): Promise<BigNumber>;

    transferOwnership(
      newOwner: string,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<BigNumber>;
  };

  populateTransaction: {
    OSD_PRICE(overrides?: CallOverrides): Promise<PopulatedTransaction>;

    decreasePosition(
      _collateralToken: string,
      _indexToken: string,
      _account: string,
      arg3: boolean,
      arg4: BigNumberish,
      _notionalDelta: BigNumberish,
      arg6: string,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<PopulatedTransaction>;

    future(overrides?: CallOverrides): Promise<PopulatedTransaction>;

    increasePosition(
      _collateralToken: string,
      _indexToken: string,
      _account: string,
      arg3: boolean,
      _notionalDelta: BigNumberish,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<PopulatedTransaction>;

    liquidatePosition(
      _collateralToken: string,
      _indexToken: string,
      _account: string,
      _isLong: boolean,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<PopulatedTransaction>;

    osd(overrides?: CallOverrides): Promise<PopulatedTransaction>;

    owner(overrides?: CallOverrides): Promise<PopulatedTransaction>;

    priceFeed(overrides?: CallOverrides): Promise<PopulatedTransaction>;

    renounceOwnership(
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<PopulatedTransaction>;

    setCaller(
      _caller: string,
      _approve: boolean,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<PopulatedTransaction>;

    swap(overrides?: CallOverrides): Promise<PopulatedTransaction>;

    swapIn(
      tokenIn: string,
      tokenOut: string,
      amountIn: BigNumberish,
      arg3: BigNumberish,
      to: string,
      deadline: BigNumberish,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<PopulatedTransaction>;

    swapOut(
      tokenIn: string,
      tokenOut: string,
      arg2: BigNumberish,
      amountOut: BigNumberish,
      to: string,
      deadline: BigNumberish,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<PopulatedTransaction>;

    tradeStake(overrides?: CallOverrides): Promise<PopulatedTransaction>;

    transferOwnership(
      newOwner: string,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<PopulatedTransaction>;
  };
}