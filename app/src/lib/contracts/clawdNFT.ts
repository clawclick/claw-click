// ClawdNFT (NFTid) Contract Configuration

export const CLAWD_NFT_ADDRESS = {
  sepolia: '0x6c4618080761925A6D92526c0AA443eF03a92C96' as const,
  base: '0x86d7d293DD9bFE25CA3CAF4Cb09f8d2c266823E0' as const,  // V2 - Fixed free mint logic
} as const

export const CLAWD_NFT_ABI = [
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_birthCertificateContract",
        "type": "address"
      },
      {
        "internalType": "string",
        "name": "_baseMetadataURI",
        "type": "string"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "inputs": [],
    "name": "MAX_SUPPLY",
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
    "inputs": [],
    "name": "TIER1_PRICE",
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
    "inputs": [],
    "name": "TIER2_PRICE",
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
    "inputs": [],
    "name": "TIER3_PRICE",
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
    "inputs": [],
    "name": "totalSupply",
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
    "inputs": [],
    "name": "getCurrentPrice",
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
        "name": "user",
        "type": "address"
      }
    ],
    "name": "isEligibleForFreeMint",
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
        "internalType": "address",
        "name": "creator",
        "type": "address"
      }
    ],
    "name": "countAgentsCreated",
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
        "name": "user",
        "type": "address"
      }
    ],
    "name": "getRemainingFreeMints",
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
        "internalType": "bool",
        "name": "useFreeMint",
        "type": "bool"
      },
      {
        "internalType": "uint256",
        "name": "maxAttempts",
        "type": "uint256"
      }
    ],
    "name": "mint",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "tokenId",
        "type": "uint256"
      }
    ],
    "name": "getTraits",
    "outputs": [
      {
        "components": [
          {
            "internalType": "uint8",
            "name": "aura",
            "type": "uint8"
          },
          {
            "internalType": "uint8",
            "name": "background",
            "type": "uint8"
          },
          {
            "internalType": "uint8",
            "name": "core",
            "type": "uint8"
          },
          {
            "internalType": "uint8",
            "name": "eyes",
            "type": "uint8"
          },
          {
            "internalType": "uint8",
            "name": "overlay",
            "type": "uint8"
          }
        ],
        "internalType": "struct ClawdNFT.Traits",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "tokenId",
        "type": "uint256"
      }
    ],
    "name": "tokenURI",
    "outputs": [
      {
        "internalType": "string",
        "name": "",
        "type": "string"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "tokenId",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "minter",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint8",
        "name": "aura",
        "type": "uint8"
      },
      {
        "indexed": false,
        "internalType": "uint8",
        "name": "background",
        "type": "uint8"
      },
      {
        "indexed": false,
        "internalType": "uint8",
        "name": "core",
        "type": "uint8"
      },
      {
        "indexed": false,
        "internalType": "uint8",
        "name": "eyes",
        "type": "uint8"
      },
      {
        "indexed": false,
        "internalType": "uint8",
        "name": "overlay",
        "type": "uint8"
      },
      {
        "indexed": false,
        "internalType": "bool",
        "name": "freeMint",
        "type": "bool"
      }
    ],
    "name": "Minted",
    "type": "event"
  }
] as const

// Trait layer names
export const TRAIT_LAYERS = ['aura', 'background', 'core', 'eyes', 'overlay'] as const

// Price tiers
export const PRICE_TIERS = {
  tier1: { supply: 4000, price: '0.0015', usd: 3 },
  tier2: { supply: 7000, price: '0.003', usd: 6 },
  tier3: { supply: 10000, price: '0.0045', usd: 9 },
} as const
