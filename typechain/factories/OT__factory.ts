/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */

import { Signer, utils, Contract, ContractFactory, Overrides } from "ethers";
import { Provider, TransactionRequest } from "@ethersproject/providers";
import type { OT, OTInterface } from "../OT";

const _abi = [
  {
    inputs: [
      {
        internalType: "string",
        name: "name",
        type: "string",
      },
      {
        internalType: "string",
        name: "symbol",
        type: "string",
      },
    ],
    stateMutability: "nonpayable",
    type: "constructor",
  },
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
  "0x60806040523480156200001157600080fd5b5060405162000f3938038062000f39833981016040819052620000349162000297565b818160036200004483826200038f565b5060046200005382826200038f565b505050620000706200006a6200008f60201b60201c565b62000093565b62000087336a52b7d2dcc80cd2e4000000620000e5565b505062000483565b3390565b600580546001600160a01b038381166001600160a01b0319831681179093556040519116919082907f8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e090600090a35050565b6001600160a01b038216620001405760405162461bcd60e51b815260206004820152601f60248201527f45524332303a206d696e7420746f20746865207a65726f206164647265737300604482015260640160405180910390fd5b80600260008282546200015491906200045b565b90915550506001600160a01b03821660009081526020819052604081208054839290620001839084906200045b565b90915550506040518181526001600160a01b038316906000907fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef9060200160405180910390a35050565b505050565b634e487b7160e01b600052604160045260246000fd5b600082601f830112620001fa57600080fd5b81516001600160401b0380821115620002175762000217620001d2565b604051601f8301601f19908116603f01168101908282118183101715620002425762000242620001d2565b816040528381526020925086838588010111156200025f57600080fd5b600091505b8382101562000283578582018301518183018401529082019062000264565b600093810190920192909252949350505050565b60008060408385031215620002ab57600080fd5b82516001600160401b0380821115620002c357600080fd5b620002d186838701620001e8565b93506020850151915080821115620002e857600080fd5b50620002f785828601620001e8565b9150509250929050565b600181811c908216806200031657607f821691505b6020821081036200033757634e487b7160e01b600052602260045260246000fd5b50919050565b601f821115620001cd57600081815260208120601f850160051c81016020861015620003665750805b601f850160051c820191505b81811015620003875782815560010162000372565b505050505050565b81516001600160401b03811115620003ab57620003ab620001d2565b620003c381620003bc845462000301565b846200033d565b602080601f831160018114620003fb5760008415620003e25750858301515b600019600386901b1c1916600185901b17855562000387565b600085815260208120601f198616915b828110156200042c578886015182559484019460019091019084016200040b565b50858210156200044b5787850151600019600388901b60f8161c191681555b5050505050600190811b01905550565b808201808211156200047d57634e487b7160e01b600052601160045260246000fd5b92915050565b610aa680620004936000396000f3fe608060405234801561001057600080fd5b50600436106100f55760003560e01c8063715018a611610097578063a9059cbb11610066578063a9059cbb146101eb578063dd62ed3e146101fe578063f2fde38b14610211578063f46eccc41461022457600080fd5b8063715018a6146101ab5780638da5cb5b146101b557806395d89b41146101d0578063a457c2d7146101d857600080fd5b806323b872dd116100d357806323b872dd1461014d578063313ce56714610160578063395093511461016f57806370a082311461018257600080fd5b806306fdde03146100fa578063095ea7b31461011857806318160ddd1461013b575b600080fd5b610102610247565b60405161010f91906108f0565b60405180910390f35b61012b61012636600461095a565b6102d9565b604051901515815260200161010f565b6002545b60405190815260200161010f565b61012b61015b366004610984565b6102f3565b6040516012815260200161010f565b61012b61017d36600461095a565b610317565b61013f6101903660046109c0565b6001600160a01b031660009081526020819052604090205490565b6101b3610339565b005b6005546040516001600160a01b03909116815260200161010f565b6101026103a4565b61012b6101e636600461095a565b6103b3565b61012b6101f936600461095a565b61042e565b61013f61020c3660046109e2565b61043c565b6101b361021f3660046109c0565b610467565b61012b6102323660046109c0565b60066020526000908152604090205460ff1681565b60606003805461025690610a15565b80601f016020809104026020016040519081016040528092919081815260200182805461028290610a15565b80156102cf5780601f106102a4576101008083540402835291602001916102cf565b820191906000526020600020905b8154815290600101906020018083116102b257829003601f168201915b5050505050905090565b6000336102e7818585610532565b60019150505b92915050565b600033610301858285610656565b61030c8585856106d0565b506001949350505050565b6000336102e781858561032a838361043c565b6103349190610a4f565b610532565b6005546001600160a01b031633146103985760405162461bcd60e51b815260206004820181905260248201527f4f776e61626c653a2063616c6c6572206973206e6f7420746865206f776e657260448201526064015b60405180910390fd5b6103a2600061089e565b565b60606004805461025690610a15565b600033816103c1828661043c565b9050838110156104215760405162461bcd60e51b815260206004820152602560248201527f45524332303a2064656372656173656420616c6c6f77616e63652062656c6f77604482015264207a65726f60d81b606482015260840161038f565b61030c8286868403610532565b6000336102e78185856106d0565b6001600160a01b03918216600090815260016020908152604080832093909416825291909152205490565b6005546001600160a01b031633146104c15760405162461bcd60e51b815260206004820181905260248201527f4f776e61626c653a2063616c6c6572206973206e6f7420746865206f776e6572604482015260640161038f565b6001600160a01b0381166105265760405162461bcd60e51b815260206004820152602660248201527f4f776e61626c653a206e6577206f776e657220697320746865207a65726f206160448201526564647265737360d01b606482015260840161038f565b61052f8161089e565b50565b6001600160a01b0383166105945760405162461bcd60e51b8152602060048201526024808201527f45524332303a20617070726f76652066726f6d20746865207a65726f206164646044820152637265737360e01b606482015260840161038f565b6001600160a01b0382166105f55760405162461bcd60e51b815260206004820152602260248201527f45524332303a20617070726f766520746f20746865207a65726f206164647265604482015261737360f01b606482015260840161038f565b6001600160a01b0383811660008181526001602090815260408083209487168084529482529182902085905590518481527f8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925910160405180910390a3505050565b6000610662848461043c565b905060001981146106ca57818110156106bd5760405162461bcd60e51b815260206004820152601d60248201527f45524332303a20696e73756666696369656e7420616c6c6f77616e6365000000604482015260640161038f565b6106ca8484848403610532565b50505050565b6001600160a01b0383166107345760405162461bcd60e51b815260206004820152602560248201527f45524332303a207472616e736665722066726f6d20746865207a65726f206164604482015264647265737360d81b606482015260840161038f565b6001600160a01b0382166107965760405162461bcd60e51b815260206004820152602360248201527f45524332303a207472616e7366657220746f20746865207a65726f206164647260448201526265737360e81b606482015260840161038f565b6001600160a01b0383166000908152602081905260409020548181101561080e5760405162461bcd60e51b815260206004820152602660248201527f45524332303a207472616e7366657220616d6f756e7420657863656564732062604482015265616c616e636560d01b606482015260840161038f565b6001600160a01b03808516600090815260208190526040808220858503905591851681529081208054849290610845908490610a4f565b92505081905550826001600160a01b0316846001600160a01b03167fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef8460405161089191815260200190565b60405180910390a36106ca565b600580546001600160a01b038381166001600160a01b0319831681179093556040519116919082907f8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e090600090a35050565b600060208083528351808285015260005b8181101561091d57858101830151858201604001528201610901565b506000604082860101526040601f19601f8301168501019250505092915050565b80356001600160a01b038116811461095557600080fd5b919050565b6000806040838503121561096d57600080fd5b6109768361093e565b946020939093013593505050565b60008060006060848603121561099957600080fd5b6109a28461093e565b92506109b06020850161093e565b9150604084013590509250925092565b6000602082840312156109d257600080fd5b6109db8261093e565b9392505050565b600080604083850312156109f557600080fd5b6109fe8361093e565b9150610a0c6020840161093e565b90509250929050565b600181811c90821680610a2957607f821691505b602082108103610a4957634e487b7160e01b600052602260045260246000fd5b50919050565b808201808211156102ed57634e487b7160e01b600052601160045260246000fdfea264697066735822122090629d49415717f5a489447daf413a05197c7771de32e1af28f5297af1c5dc5964736f6c63430008110033";

export class OT__factory extends ContractFactory {
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
    name: string,
    symbol: string,
    overrides?: Overrides & { from?: string | Promise<string> }
  ): Promise<OT> {
    return super.deploy(name, symbol, overrides || {}) as Promise<OT>;
  }
  getDeployTransaction(
    name: string,
    symbol: string,
    overrides?: Overrides & { from?: string | Promise<string> }
  ): TransactionRequest {
    return super.getDeployTransaction(name, symbol, overrides || {});
  }
  attach(address: string): OT {
    return super.attach(address) as OT;
  }
  connect(signer: Signer): OT__factory {
    return super.connect(signer) as OT__factory;
  }
  static readonly bytecode = _bytecode;
  static readonly abi = _abi;
  static createInterface(): OTInterface {
    return new utils.Interface(_abi) as OTInterface;
  }
  static connect(address: string, signerOrProvider: Signer | Provider): OT {
    return new Contract(address, _abi, signerOrProvider) as OT;
  }
}