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

interface ITradeStakeUpdaterInterface extends ethers.utils.Interface {
  functions: {
    "decreasePosition(address,address,address,bool,uint256,uint256,address)": FunctionFragment;
    "increasePosition(address,address,address,bool,uint256)": FunctionFragment;
    "liquidatePosition(address,address,address,bool)": FunctionFragment;
    "swapIn(address,address,uint256,uint256,address,uint256)": FunctionFragment;
    "swapOut(address,address,uint256,uint256,address,uint256)": FunctionFragment;
  };

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
  encodeFunctionData(
    functionFragment: "increasePosition",
    values: [string, string, string, boolean, BigNumberish]
  ): string;
  encodeFunctionData(
    functionFragment: "liquidatePosition",
    values: [string, string, string, boolean]
  ): string;
  encodeFunctionData(
    functionFragment: "swapIn",
    values: [string, string, BigNumberish, BigNumberish, string, BigNumberish]
  ): string;
  encodeFunctionData(
    functionFragment: "swapOut",
    values: [string, string, BigNumberish, BigNumberish, string, BigNumberish]
  ): string;

  decodeFunctionResult(
    functionFragment: "decreasePosition",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "increasePosition",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "liquidatePosition",
    data: BytesLike
  ): Result;
  decodeFunctionResult(functionFragment: "swapIn", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "swapOut", data: BytesLike): Result;

  events: {};
}

export class ITradeStakeUpdater extends BaseContract {
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

  interface: ITradeStakeUpdaterInterface;

  functions: {
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
  };

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

  callStatic: {
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
  };

  filters: {};

  estimateGas: {
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
  };

  populateTransaction: {
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
  };
}
