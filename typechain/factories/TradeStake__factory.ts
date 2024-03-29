/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */

import { Signer, utils, Contract, ContractFactory, Overrides } from "ethers";
import { Provider, TransactionRequest } from "@ethersproject/providers";
import type { TradeStake, TradeStakeInterface } from "../TradeStake";

const _abi = [
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
    inputs: [
      {
        internalType: "address",
        name: "_account",
        type: "address",
      },
    ],
    name: "getUserTradeInfo",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
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
    inputs: [
      {
        internalType: "address",
        name: "_account",
        type: "address",
      },
    ],
    name: "pending",
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
    name: "renounceOwnership",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "rewardInfo",
    outputs: [
      {
        internalType: "contract IERC20",
        name: "rewardToken",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "paidOut",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "rewardPerUnit",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "totalReward",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "startTime",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "endTime",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    name: "rewardInfoSlotMap",
    outputs: [
      {
        internalType: "uint256",
        name: "slotScore",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "rewardPerUnit",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "rewardPerUnit",
        type: "uint256",
      },
    ],
    name: "setRewardPerUnit",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "_rewardToken",
        type: "address",
      },
    ],
    name: "setRewardToken",
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
    name: "setUpdater",
    outputs: [],
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
  {
    inputs: [
      {
        internalType: "address",
        name: "_account",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "_score",
        type: "uint256",
      },
    ],
    name: "updateScore",
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
    name: "updaters",
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
    inputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    name: "userInfo",
    outputs: [
      {
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "beginSlotCursor",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "rewardSlotCursor",
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
        name: "",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    name: "userInfoSlotMap",
    outputs: [
      {
        internalType: "uint256",
        name: "slotScore",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "withdraw",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
];

const _bytecode =
  "0x608060405234801561001057600080fd5b5061001a3361001f565b61006f565b600080546001600160a01b038381166001600160a01b0319831681178455604051919092169283917f8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e09190a35050565b610b6c8061007e6000396000f3fe608060405234801561001057600080fd5b50600436106100f55760003560e01c8063690b2cc011610097578063c9f6707211610066578063c9f670721461026a578063da79d95f146102c8578063f2fde38b146102db578063fbaa0f37146102ee57600080fd5b8063690b2cc0146101f8578063715018a6146102345780638aee81271461023c5780638da5cb5b1461024f57600080fd5b806354a055c1116100d357806354a055c1146101665780635eebea20146101995780636390c4ce146101ba57806365d97724146101e557600080fd5b80631959a002146100fa5780631a153391146101495780633ccfd60b1461015e575b600080fd5b610129610108366004610996565b60076020526000908152604090208054600182015460029092015490919083565b604080519384526020840192909252908201526060015b60405180910390f35b61015c6101573660046109c6565b61032c565b005b61015c61038a565b610189610174366004610996565b600a6020526000908152604090205460ff1681565b6040519015158152602001610140565b6101ac6101a7366004610996565b6104e2565b604051908152602001610140565b6101ac6101c83660046109fd565b600860209081526000928352604080842090915290825290205481565b61015c6101f33660046109fd565b6105ec565b61021f610206366004610a27565b6009602052600090815260409020805460019091015482565b60408051928352602083019190915201610140565b61015c610714565b61015c61024a366004610996565b61074a565b6000546040516001600160a01b039091168152602001610140565b600154600254600354600454600554600654610291956001600160a01b0316949392919086565b604080516001600160a01b0390971687526020870195909552938501929092526060840152608083015260a082015260c001610140565b61015c6102d6366004610a27565b600355565b61015c6102e9366004610996565b6107a3565b6103016102fc366004610996565b61083b565b60408051958652602086019490945292840191909152606083015260ff16608082015260a001610140565b6000546001600160a01b0316331461035f5760405162461bcd60e51b815260040161035690610a40565b60405180910390fd5b6001600160a01b03919091166000908152600a60205260409020805460ff1916911515919091179055565b33600061039a6201518042610a8b565b6001600160a01b0383166000908152600760205260409020600281015491925090156104dd5760028101546000905b83811015610462576001600160a01b038516600090815260086020908152604080832084845282528083206009909252909120541561043f57600082815260096020526040812080548354600190920154909161042591610aad565b61042f9190610a8b565b905061043b8185610aca565b9350505b61044a826001610aca565b6002850155508061045a81610add565b9150506103c9565b5060015460405163a9059cbb60e01b81526001600160a01b038681166004830152602482018490529091169063a9059cbb906044016020604051808303816000875af11580156104b6573d6000803e3d6000fd5b505050506040513d601f19601f820116820180604052508101906104da9190610af6565b50505b505050565b6000806104f26201518042610a8b565b6001600160a01b038416600090815260076020908152604080832081516060810183528154815260018201549381019390935260020154908201819052929350919003610543575060009392505050565b60408101516000905b838110156105e3576001600160a01b038616600090815260086020908152604080832084845282528083208151808401835290548152848452600990925290912054156105d05760008281526009602052604081208054835160019092015490916105b691610aad565b6105c09190610a8b565b90506105cc8185610aca565b9350505b50806105db81610add565b91505061054c565b50949350505050565b336000908152600a602052604090205460ff166106395760405162461bcd60e51b815260206004820152600b60248201526a37b7363caab83230ba32b960a91b6044820152606401610356565b60035415610710576001600160a01b0382166000908152600760205260408120906106676201518042610a8b565b905081600101546000036106845760018201819055600282018190555b60008181526009602052604081206001015490036106b2576003546000828152600960205260409020600101555b6001600160a01b0384166000908152600860209081526040808320848452909152812080548592906106e5908490610aca565b909155505060008181526009602052604081208054859290610708908490610aca565b909155505050505b5050565b6000546001600160a01b0316331461073e5760405162461bcd60e51b815260040161035690610a40565b610748600061092a565b565b6000546001600160a01b031633146107745760405162461bcd60e51b815260040161035690610a40565b6001546001600160a01b03166107a057600180546001600160a01b0319166001600160a01b0383161790555b50565b6000546001600160a01b031633146107cd5760405162461bcd60e51b815260040161035690610a40565b6001600160a01b0381166108325760405162461bcd60e51b815260206004820152602660248201527f4f776e61626c653a206e6577206f776e657220697320746865207a65726f206160448201526564647265737360d01b6064820152608401610356565b6107a08161092a565b6000808080808061084f6201518042610a8b565b9050600061085c886104e2565b60008381526009602090815260408083208151808301835281548152600191820154818501526001600160a01b03808f16865260088552838620898752855283862084518087018652905481529254845163313ce56760e01b81529451979850919692959491169263313ce56792600480830193928290030181865afa1580156108ea573d6000803e3d6000fd5b505050506040513d601f19601f8201168201806040525081019061090e9190610b13565b92519151600354929c909b509199509297509095509350505050565b600080546001600160a01b038381166001600160a01b0319831681178455604051919092169283917f8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e09190a35050565b80356001600160a01b038116811461099157600080fd5b919050565b6000602082840312156109a857600080fd5b6109b18261097a565b9392505050565b80151581146107a057600080fd5b600080604083850312156109d957600080fd5b6109e28361097a565b915060208301356109f2816109b8565b809150509250929050565b60008060408385031215610a1057600080fd5b610a198361097a565b946020939093013593505050565b600060208284031215610a3957600080fd5b5035919050565b6020808252818101527f4f776e61626c653a2063616c6c6572206973206e6f7420746865206f776e6572604082015260600190565b634e487b7160e01b600052601160045260246000fd5b600082610aa857634e487b7160e01b600052601260045260246000fd5b500490565b8082028115828204841417610ac457610ac4610a75565b92915050565b80820180821115610ac457610ac4610a75565b600060018201610aef57610aef610a75565b5060010190565b600060208284031215610b0857600080fd5b81516109b1816109b8565b600060208284031215610b2557600080fd5b815160ff811681146109b157600080fdfea26469706673582212206dd5da454c193be8476406716ff1623a442d5d4cbe54d83ec850f54d4de667bd64736f6c63430008110033";

export class TradeStake__factory extends ContractFactory {
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
  ): Promise<TradeStake> {
    return super.deploy(overrides || {}) as Promise<TradeStake>;
  }
  getDeployTransaction(
    overrides?: Overrides & { from?: string | Promise<string> }
  ): TransactionRequest {
    return super.getDeployTransaction(overrides || {});
  }
  attach(address: string): TradeStake {
    return super.attach(address) as TradeStake;
  }
  connect(signer: Signer): TradeStake__factory {
    return super.connect(signer) as TradeStake__factory;
  }
  static readonly bytecode = _bytecode;
  static readonly abi = _abi;
  static createInterface(): TradeStakeInterface {
    return new utils.Interface(_abi) as TradeStakeInterface;
  }
  static connect(
    address: string,
    signerOrProvider: Signer | Provider
  ): TradeStake {
    return new Contract(address, _abi, signerOrProvider) as TradeStake;
  }
}
