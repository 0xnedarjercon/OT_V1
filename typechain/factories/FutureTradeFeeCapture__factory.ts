/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */

import { Signer, utils, Contract, ContractFactory, Overrides } from "ethers";
import { Provider, TransactionRequest } from "@ethersproject/providers";
import type {
  FutureTradeFeeCapture,
  FutureTradeFeeCaptureInterface,
} from "../FutureTradeFeeCapture";

const _abi = [
  {
    inputs: [
      {
        internalType: "address",
        name: "_feeTo",
        type: "address",
      },
    ],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    inputs: [],
    name: "feeTo",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "reserveToken",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
      {
        internalType: "address",
        name: "from",
        type: "address",
      },
    ],
    name: "settleFutureProfit",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
];

const _bytecode =
  "0x608060405234801561001057600080fd5b5060405161051038038061051083398101604081905261002f91610054565b600080546001600160a01b0319166001600160a01b0392909216919091179055610084565b60006020828403121561006657600080fd5b81516001600160a01b038116811461007d57600080fd5b9392505050565b61047d806100936000396000f3fe608060405234801561001057600080fd5b50600436106100365760003560e01c8063017e7e581461003b578063f2744fd11461006a575b600080fd5b60005461004e906001600160a01b031681565b6040516001600160a01b03909116815260200160405180910390f35b61007d610078366004610376565b61007f565b005b60005461009b906001600160a01b0385811691849116856100a0565b505050565b604080516001600160a01b0385811660248301528416604482015260648082018490528251808303909101815260849091019091526020810180516001600160e01b03166323b872dd60e01b1790526100fa908590610100565b50505050565b6000610155826040518060400160405280602081526020017f5361666545524332303a206c6f772d6c6576656c2063616c6c206661696c6564815250856001600160a01b03166101d79092919063ffffffff16565b80519091501561009b578080602001905181019061017391906103b2565b61009b5760405162461bcd60e51b815260206004820152602a60248201527f5361666545524332303a204552433230206f7065726174696f6e20646964206e6044820152691bdd081cdd58d8d9595960b21b60648201526084015b60405180910390fd5b60606101e684846000856101f0565b90505b9392505050565b6060824710156102515760405162461bcd60e51b815260206004820152602660248201527f416464726573733a20696e73756666696369656e742062616c616e636520666f6044820152651c8818d85b1b60d21b60648201526084016101ce565b6001600160a01b0385163b6102a85760405162461bcd60e51b815260206004820152601d60248201527f416464726573733a2063616c6c20746f206e6f6e2d636f6e747261637400000060448201526064016101ce565b600080866001600160a01b031685876040516102c491906103f8565b60006040518083038185875af1925050503d8060008114610301576040519150601f19603f3d011682016040523d82523d6000602084013e610306565b606091505b5091509150610316828286610321565b979650505050505050565b606083156103305750816101e9565b8251156103405782518084602001fd5b8160405162461bcd60e51b81526004016101ce9190610414565b80356001600160a01b038116811461037157600080fd5b919050565b60008060006060848603121561038b57600080fd5b6103948461035a565b9250602084013591506103a96040850161035a565b90509250925092565b6000602082840312156103c457600080fd5b815180151581146101e957600080fd5b60005b838110156103ef5781810151838201526020016103d7565b50506000910152565b6000825161040a8184602087016103d4565b9190910192915050565b60208152600082518060208401526104338160408501602087016103d4565b601f01601f1916919091016040019291505056fea2646970667358221220d9edd9211dc70baf9025fa813deb07f0767a9ce915ba7197538d9af4b0ca97f764736f6c63430008110033";

export class FutureTradeFeeCapture__factory extends ContractFactory {
  constructor(
    ...args: [signer: Signer] | ConstructorParameters<typeof ContractFactory>
  ) {
    if (args.length === 1) {
      super(_abi, _bytecode, args[0]);
    } else {
      super(...args);
    }
  }

  deploy(
    _feeTo: string,
    overrides?: Overrides & { from?: string | Promise<string> }
  ): Promise<FutureTradeFeeCapture> {
    return super.deploy(
      _feeTo,
      overrides || {}
    ) as Promise<FutureTradeFeeCapture>;
  }
  getDeployTransaction(
    _feeTo: string,
    overrides?: Overrides & { from?: string | Promise<string> }
  ): TransactionRequest {
    return super.getDeployTransaction(_feeTo, overrides || {});
  }
  attach(address: string): FutureTradeFeeCapture {
    return super.attach(address) as FutureTradeFeeCapture;
  }
  connect(signer: Signer): FutureTradeFeeCapture__factory {
    return super.connect(signer) as FutureTradeFeeCapture__factory;
  }
  static readonly bytecode = _bytecode;
  static readonly abi = _abi;
  static createInterface(): FutureTradeFeeCaptureInterface {
    return new utils.Interface(_abi) as FutureTradeFeeCaptureInterface;
  }
  static connect(
    address: string,
    signerOrProvider: Signer | Provider
  ): FutureTradeFeeCapture {
    return new Contract(
      address,
      _abi,
      signerOrProvider
    ) as FutureTradeFeeCapture;
  }
}