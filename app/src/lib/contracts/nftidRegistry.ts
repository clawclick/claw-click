// SimpleAgentNFTidRegistry Contract Configuration

export const NFTID_REGISTRY_ADDRESS = {
  sepolia: '0x81ae37d31C488094bf292ebEb15C6eCfcD9Fad7D' as const,
  base: '0x515685B303BB79a991664F8a8DcA9B5369103371' as const,  // SIMPLE: NFTid → Token Address
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
