/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */

import { Signer, utils, Contract, ContractFactory, Overrides } from "ethers";
import { Provider, TransactionRequest } from "@ethersproject/providers";
import type { Osd, OsdInterface } from "../Osd";

const _abi = [
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "owner",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "spender",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "value",
        type: "uint256",
      },
    ],
    name: "Approval",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "previousOwner",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "newOwner",
        type: "address",
      },
    ],
    name: "OwnershipTransferred",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "from",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "to",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "value",
        type: "uint256",
      },
    ],
    name: "Transfer",
    type: "event",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "owner",
        type: "address",
      },
      {
        internalType: "address",
        name: "spender",
        type: "address",
      },
    ],
    name: "allowance",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "spender",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "approve",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "account",
        type: "address",
      },
    ],
    name: "balanceOf",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "account",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "burn",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "decimals",
    outputs: [
      {
        internalType: "uint8",
        name: "",
        type: "uint8",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "spender",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "subtractedValue",
        type: "uint256",
      },
    ],
    name: "decreaseAllowance",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "spender",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "addedValue",
        type: "uint256",
      },
    ],
    name: "increaseAllowance",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "to",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "mint",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    name: "minters",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "name",
    outputs: [
      {
        internalType: "string",
        name: "",
        type: "string",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "owner",
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
    inputs: [],
    name: "renounceOwnership",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "account",
        type: "address",
      },
      {
        internalType: "bool",
        name: "approved",
        type: "bool",
      },
    ],
    name: "setMinter",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "symbol",
    outputs: [
      {
        internalType: "string",
        name: "",
        type: "string",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalSupply",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "to",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "transfer",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "from",
        type: "address",
      },
      {
        internalType: "address",
        name: "to",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "transferFrom",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "newOwner",
        type: "address",
      },
    ],
    name: "transferOwnership",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
];

const _bytecode =
  "0x60806040523480156200001157600080fd5b5060408051808201825260038082526213d4d160ea1b602080840182905284518086019095528285528401529091906200004c838262000179565b5060046200005b828262000179565b50505062000078620000726200007e60201b60201c565b62000082565b62000245565b3390565b600580546001600160a01b038381166001600160a01b0319831681179093556040519116919082907f8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e090600090a35050565b634e487b7160e01b600052604160045260246000fd5b600181811c90821680620000ff57607f821691505b6020821081036200012057634e487b7160e01b600052602260045260246000fd5b50919050565b601f8211156200017457600081815260208120601f850160051c810160208610156200014f5750805b601f850160051c820191505b8181101562000170578281556001016200015b565b5050505b505050565b81516001600160401b03811115620001955762000195620000d4565b620001ad81620001a68454620000ea565b8462000126565b602080601f831160018114620001e55760008415620001cc5750858301515b600019600386901b1c1916600185901b17855562000170565b600085815260208120601f198616915b828110156200021657888601518255948401946001909101908401620001f5565b5085821015620002355787850151600019600388901b60f8161c191681555b5050505050600190811b01905550565b610e6980620002556000396000f3fe608060405234801561001057600080fd5b50600436106101165760003560e01c80638da5cb5b116100a2578063a9059cbb11610071578063a9059cbb14610232578063cf456ae714610245578063dd62ed3e14610258578063f2fde38b1461026b578063f46eccc41461027e57600080fd5b80638da5cb5b146101e957806395d89b41146102045780639dc29fac1461020c578063a457c2d71461021f57600080fd5b8063313ce567116100e9578063313ce56714610181578063395093511461019057806340c10f19146101a357806370a08231146101b8578063715018a6146101e157600080fd5b806306fdde031461011b578063095ea7b31461013957806318160ddd1461015c57806323b872dd1461016e575b600080fd5b6101236102a1565b6040516101309190610c27565b60405180910390f35b61014c610147366004610c91565b610333565b6040519015158152602001610130565b6002545b604051908152602001610130565b61014c61017c366004610cbb565b61034d565b60405160128152602001610130565b61014c61019e366004610c91565b610371565b6101b66101b1366004610c91565b610393565b005b6101606101c6366004610cf7565b6001600160a01b031660009081526020819052604090205490565b6101b66103fb565b6005546040516001600160a01b039091168152602001610130565b610123610431565b6101b661021a366004610c91565b610440565b61014c61022d366004610c91565b61049f565b61014c610240366004610c91565b61051a565b6101b6610253366004610d19565b610528565b610160610266366004610d55565b61057d565b6101b6610279366004610cf7565b6105a8565b61014c61028c366004610cf7565b60066020526000908152604090205460ff1681565b6060600380546102b090610d88565b80601f01602080910402602001604051908101604052809291908181526020018280546102dc90610d88565b80156103295780601f106102fe57610100808354040283529160200191610329565b820191906000526020600020905b81548152906001019060200180831161030c57829003601f168201915b5050505050905090565b600033610341818585610643565b60019150505b92915050565b60003361035b858285610768565b6103668585856107e2565b506001949350505050565b600033610341818585610384838361057d565b61038e9190610dd8565b610643565b3360009081526006602052604090205460ff166103ed5760405162461bcd60e51b81526020600482015260136024820152722aa720aaaa2427a924ad22a22fa6a4a72a22a960691b60448201526064015b60405180910390fd5b6103f782826109b0565b5050565b6005546001600160a01b031633146104255760405162461bcd60e51b81526004016103e490610deb565b61042f6000610a8f565b565b6060600480546102b090610d88565b3360009081526006602052604090205460ff166104955760405162461bcd60e51b81526020600482015260136024820152722aa720aaaa2427a924ad22a22fa6a4a72a22a960691b60448201526064016103e4565b6103f78282610ae1565b600033816104ad828661057d565b90508381101561050d5760405162461bcd60e51b815260206004820152602560248201527f45524332303a2064656372656173656420616c6c6f77616e63652062656c6f77604482015264207a65726f60d81b60648201526084016103e4565b6103668286868403610643565b6000336103418185856107e2565b6005546001600160a01b031633146105525760405162461bcd60e51b81526004016103e490610deb565b6001600160a01b03919091166000908152600660205260409020805460ff1916911515919091179055565b6001600160a01b03918216600090815260016020908152604080832093909416825291909152205490565b6005546001600160a01b031633146105d25760405162461bcd60e51b81526004016103e490610deb565b6001600160a01b0381166106375760405162461bcd60e51b815260206004820152602660248201527f4f776e61626c653a206e6577206f776e657220697320746865207a65726f206160448201526564647265737360d01b60648201526084016103e4565b61064081610a8f565b50565b6001600160a01b0383166106a55760405162461bcd60e51b8152602060048201526024808201527f45524332303a20617070726f76652066726f6d20746865207a65726f206164646044820152637265737360e01b60648201526084016103e4565b6001600160a01b0382166107065760405162461bcd60e51b815260206004820152602260248201527f45524332303a20617070726f766520746f20746865207a65726f206164647265604482015261737360f01b60648201526084016103e4565b6001600160a01b0383811660008181526001602090815260408083209487168084529482529182902085905590518481527f8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b92591015b60405180910390a3505050565b6000610774848461057d565b905060001981146107dc57818110156107cf5760405162461bcd60e51b815260206004820152601d60248201527f45524332303a20696e73756666696369656e7420616c6c6f77616e636500000060448201526064016103e4565b6107dc8484848403610643565b50505050565b6001600160a01b0383166108465760405162461bcd60e51b815260206004820152602560248201527f45524332303a207472616e736665722066726f6d20746865207a65726f206164604482015264647265737360d81b60648201526084016103e4565b6001600160a01b0382166108a85760405162461bcd60e51b815260206004820152602360248201527f45524332303a207472616e7366657220746f20746865207a65726f206164647260448201526265737360e81b60648201526084016103e4565b6001600160a01b038316600090815260208190526040902054818110156109205760405162461bcd60e51b815260206004820152602660248201527f45524332303a207472616e7366657220616d6f756e7420657863656564732062604482015265616c616e636560d01b60648201526084016103e4565b6001600160a01b03808516600090815260208190526040808220858503905591851681529081208054849290610957908490610dd8565b92505081905550826001600160a01b0316846001600160a01b03167fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef846040516109a391815260200190565b60405180910390a36107dc565b6001600160a01b038216610a065760405162461bcd60e51b815260206004820152601f60248201527f45524332303a206d696e7420746f20746865207a65726f20616464726573730060448201526064016103e4565b8060026000828254610a189190610dd8565b90915550506001600160a01b03821660009081526020819052604081208054839290610a45908490610dd8565b90915550506040518181526001600160a01b038316906000907fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef9060200160405180910390a35050565b600580546001600160a01b038381166001600160a01b0319831681179093556040519116919082907f8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e090600090a35050565b6001600160a01b038216610b415760405162461bcd60e51b815260206004820152602160248201527f45524332303a206275726e2066726f6d20746865207a65726f206164647265736044820152607360f81b60648201526084016103e4565b6001600160a01b03821660009081526020819052604090205481811015610bb55760405162461bcd60e51b815260206004820152602260248201527f45524332303a206275726e20616d6f756e7420657863656564732062616c616e604482015261636560f01b60648201526084016103e4565b6001600160a01b0383166000908152602081905260408120838303905560028054849290610be4908490610e20565b90915550506040518281526000906001600160a01b038516907fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef9060200161075b565b600060208083528351808285015260005b81811015610c5457858101830151858201604001528201610c38565b506000604082860101526040601f19601f8301168501019250505092915050565b80356001600160a01b0381168114610c8c57600080fd5b919050565b60008060408385031215610ca457600080fd5b610cad83610c75565b946020939093013593505050565b600080600060608486031215610cd057600080fd5b610cd984610c75565b9250610ce760208501610c75565b9150604084013590509250925092565b600060208284031215610d0957600080fd5b610d1282610c75565b9392505050565b60008060408385031215610d2c57600080fd5b610d3583610c75565b915060208301358015158114610d4a57600080fd5b809150509250929050565b60008060408385031215610d6857600080fd5b610d7183610c75565b9150610d7f60208401610c75565b90509250929050565b600181811c90821680610d9c57607f821691505b602082108103610dbc57634e487b7160e01b600052602260045260246000fd5b50919050565b634e487b7160e01b600052601160045260246000fd5b8082018082111561034757610347610dc2565b6020808252818101527f4f776e61626c653a2063616c6c6572206973206e6f7420746865206f776e6572604082015260600190565b8181038181111561034757610347610dc256fea2646970667358221220e5dc78ccd7a91a7441dc22f81bfe50735dd7d3988c2ce02b22cda7e2fa62284e64736f6c63430008110033";

export class Osd__factory extends ContractFactory {
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
  ): Promise<Osd> {
    return super.deploy(overrides || {}) as Promise<Osd>;
  }
  getDeployTransaction(
    overrides?: Overrides & { from?: string | Promise<string> }
  ): TransactionRequest {
    return super.getDeployTransaction(overrides || {});
  }
  attach(address: string): Osd {
    return super.attach(address) as Osd;
  }
  connect(signer: Signer): Osd__factory {
    return super.connect(signer) as Osd__factory;
  }
  static readonly bytecode = _bytecode;
  static readonly abi = _abi;
  static createInterface(): OsdInterface {
    return new utils.Interface(_abi) as OsdInterface;
  }
  static connect(address: string, signerOrProvider: Signer | Provider): Osd {
    return new Contract(address, _abi, signerOrProvider) as Osd;
  }
}