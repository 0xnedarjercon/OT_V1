/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */

import { Signer, utils, Contract, ContractFactory, Overrides } from "ethers";
import { Provider, TransactionRequest } from "@ethersproject/providers";
import type {
  VariableBorrowRouterReader,
  VariableBorrowRouterReaderInterface,
} from "../VariableBorrowRouterReader";

const _abi = [
  {
    inputs: [
      {
        internalType: "address",
        name: "borrowStake",
        type: "address",
      },
      {
        internalType: "address",
        name: "account",
        type: "address",
      },
      {
        internalType: "address[]",
        name: "tokens",
        type: "address[]",
      },
    ],
    name: "bulkBorrowStakeInfo",
    outputs: [
      {
        internalType: "uint256[]",
        name: "accountYeilds",
        type: "uint256[]",
      },
      {
        internalType: "uint256[]",
        name: "dayStaked",
        type: "uint256[]",
      },
      {
        internalType: "address[]",
        name: "rewardTokens",
        type: "address[]",
      },
      {
        internalType: "uint8[]",
        name: "rewardTokensDecimal",
        type: "uint8[]",
      },
      {
        internalType: "uint256[]",
        name: "rewardTokenPrices",
        type: "uint256[]",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
];

const _bytecode =
  "0x608060405234801561001057600080fd5b50610810806100206000396000f3fe608060405234801561001057600080fd5b506004361061002b5760003560e01c80635de04fa614610030575b600080fd5b61004361003e36600461051d565b61005d565b604051610054959493929190610644565b60405180910390f35b6060806060806060855167ffffffffffffffff81111561007f5761007f610507565b6040519080825280602002602001820160405280156100a8578160200160208202803683370190505b509450855167ffffffffffffffff8111156100c5576100c5610507565b6040519080825280602002602001820160405280156100ee578160200160208202803683370190505b509350855167ffffffffffffffff81111561010b5761010b610507565b604051908082528060200260200182016040528015610134578160200160208202803683370190505b509250855167ffffffffffffffff81111561015157610151610507565b60405190808252806020026020018201604052801561017a578160200160208202803683370190505b509150855167ffffffffffffffff81111561019757610197610507565b6040519080825280602002602001820160405280156101c0578160200160208202803683370190505b50905060005b86518110156104d357886001600160a01b0316636b0916958883815181106101f0576101f0610704565b60200260200101518a6040518363ffffffff1660e01b815260040161022b9291906001600160a01b0392831681529116602082015260400190565b606060405180830381865afa158015610248573d6000803e3d6000fd5b505050506040513d601f19601f8201168201806040525081019061026c919061071a565b88848151811061027e5761027e610704565b6020026020010188858151811061029757610297610704565b602002602001018886815181106102b0576102b0610704565b60200260200101836001600160a01b03166001600160a01b0316815250838152508381525050505060006001600160a01b03168482815181106102f5576102f5610704565b60200260200101516001600160a01b0316146104c15783818151811061031d5761031d610704565b60200260200101516001600160a01b031663313ce5676040518163ffffffff1660e01b8152600401602060405180830381865afa158015610362573d6000803e3d6000fd5b505050506040513d601f19601f820116820180604052508101906103869190610753565b83828151811061039857610398610704565b602002602001019060ff16908160ff1681525050886001600160a01b0316637dc0d1d06040518163ffffffff1660e01b8152600401602060405180830381865afa1580156103ea573d6000803e3d6000fd5b505050506040513d601f19601f8201168201806040525081019061040e919061077d565b6001600160a01b03166341976e0985838151811061042e5761042e610704565b60200260200101516040518263ffffffff1660e01b815260040161046191906001600160a01b0391909116815260200190565b602060405180830381865afa15801561047e573d6000803e3d6000fd5b505050506040513d601f19601f820116820180604052508101906104a2919061079a565b8282815181106104b4576104b4610704565b6020026020010181815250505b806104cb816107b3565b9150506101c6565b50939792965093509350565b6001600160a01b03811681146104f457600080fd5b50565b8035610502816104df565b919050565b634e487b7160e01b600052604160045260246000fd5b60008060006060848603121561053257600080fd5b833561053d816104df565b925060208481013561054e816104df565b9250604085013567ffffffffffffffff8082111561056b57600080fd5b818701915087601f83011261057f57600080fd5b81358181111561059157610591610507565b8060051b604051601f19603f830116810181811085821117156105b6576105b6610507565b60405291825284820192508381018501918a8311156105d457600080fd5b938501935b828510156105f9576105ea856104f7565b845293850193928501926105d9565b8096505050505050509250925092565b600081518084526020808501945080840160005b838110156106395781518752958201959082019060010161061d565b509495945050505050565b60a08152600061065760a0830188610609565b60208382038185015261066a8289610609565b8481036040860152875180825282890193509082019060005b818110156106a85784516001600160a01b031683529383019391830191600101610683565b50508481036060860152865180825290820192508187019060005b818110156106e257825160ff16855293830193918301916001016106c3565b5050505082810360808401526106f88185610609565b98975050505050505050565b634e487b7160e01b600052603260045260246000fd5b60008060006060848603121561072f57600080fd5b83519250602084015191506040840151610748816104df565b809150509250925092565b60006020828403121561076557600080fd5b815160ff8116811461077657600080fd5b9392505050565b60006020828403121561078f57600080fd5b8151610776816104df565b6000602082840312156107ac57600080fd5b5051919050565b6000600182016107d357634e487b7160e01b600052601160045260246000fd5b506001019056fea2646970667358221220aa9bb6433130f05660a36aed8b22b52adb4127208e7b4a39d7892eb47e068d5064736f6c63430008110033";

export class VariableBorrowRouterReader__factory extends ContractFactory {
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
    overrides?: Overrides & { from?: string | Promise<string> }
  ): Promise<VariableBorrowRouterReader> {
    return super.deploy(overrides || {}) as Promise<VariableBorrowRouterReader>;
  }
  getDeployTransaction(
    overrides?: Overrides & { from?: string | Promise<string> }
  ): TransactionRequest {
    return super.getDeployTransaction(overrides || {});
  }
  attach(address: string): VariableBorrowRouterReader {
    return super.attach(address) as VariableBorrowRouterReader;
  }
  connect(signer: Signer): VariableBorrowRouterReader__factory {
    return super.connect(signer) as VariableBorrowRouterReader__factory;
  }
  static readonly bytecode = _bytecode;
  static readonly abi = _abi;
  static createInterface(): VariableBorrowRouterReaderInterface {
    return new utils.Interface(_abi) as VariableBorrowRouterReaderInterface;
  }
  static connect(
    address: string,
    signerOrProvider: Signer | Provider
  ): VariableBorrowRouterReader {
    return new Contract(
      address,
      _abi,
      signerOrProvider
    ) as VariableBorrowRouterReader;
  }
}