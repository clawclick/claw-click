// SimpleAgentNFTidRegistry Contract Configuration

export const NFTID_REGISTRY_ADDRESS = {
  sepolia: '0x81ae37d31C488094bf292ebEb15C6eCfcD9Fad7D' as const,
  base: '0xd1C127c68D45ed264ce5251342A47f1C47F39dcF' as const,  // V2 FIXED: Uses getAgent() not agentByNFT mapping
} as const

export const NFTID_REGISTRY_ABI = [
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_clawdNFT",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "_birthCertificate",
        "type": "address"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "nftidTokenId",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "tokenAddress",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "linker",
        "type": "address"
      }
    ],
    "name": "NFTidLinked",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "nftidTokenId",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "tokenAddress",
        "type": "address"
      }
    ],
    "name": "NFTidUnlinked",
    "type": "event"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "nftidTokenId",
        "type": "uint256"
      }
    ],
    "name": "getTokenForNFTid",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "tokenAddress",
        "type": "address"
      }
    ],
    "name": "getNFTidForToken",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "tokenAddress",
        "type": "address"
      }
    ],
    "name": "isTokenLinked",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "nftidTokenId",
        "type": "uint256"
      }
    ],
    "name": "isNFTidLinked",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "nftidTokenId",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "tokenAddress",
        "type": "address"
      }
    ],
    "name": "linkNFTid",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "nftidTokenId",
        "type": "uint256"
      }
    ],
    "name": "unlinkNFTid",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const
