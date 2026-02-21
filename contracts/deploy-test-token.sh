#!/bin/bash

# Deploy Test Token using cast
FACTORY="0x5C92E6f1Add9a2113C6977DfF15699e948e017Db"
SEPOLIA_RPC="https://eth-sepolia.g.alchemy.com/v2/BdgPEmQddox2due7mrt9J"
PRIVATE_KEY="0x0075f14030668b47b7f9d8b7a7fe173a96071129c9f0638aec02e74d4bcda65a"

echo "🚀 Deploying test token to Sepolia..."
echo ""

# Create params struct
# CreateParams: name, symbol, beneficiary, agentWallet, targetMcapETH, feeSplit
# FeeSplit: wallets[5], percentages[5], count

NAME="TestAgentToken"
SYMBOL="TEST"
BENEFICIARY="0x3472a51BAf1814B59bf7ac55C8CBA679189Bf0e7"
AGENT_WALLET="0x3472a51BAf1814B59bf7ac55C8CBA679189Bf0e7"
TARGET_MCAP="1000000000000000000" # 1 ETH
BOOTSTRAP="1000000000000000" # 0.001 ETH

cast send $FACTORY \
  "createLaunch((string,string,address,address,uint256,(address[5],uint16[5],uint8)))" \
  "($NAME,$SYMBOL,$BENEFICIARY,$AGENT_WALLET,$TARGET_MCAP,([$ZERO,$ZERO,$ZERO,$ZERO,$ZERO],[0,0,0,0,0],0))" \
  --value $BOOTSTRAP \
  --rpc-url $SEPOLIA_RPC \
  --private-key $PRIVATE_KEY \
  --gas-limit 5000000

echo ""
echo "✅ Token deployed! Check Etherscan for details."
