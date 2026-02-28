#!/bin/bash
# Verify all contracts on both chains

echo "=========================================="
echo "VERIFYING SEPOLIA CONTRACTS"
echo "=========================================="

# Sepolia addresses
SEPOLIA_CONFIG="0xD1D3059569548cB51FF26Eb65Eb45dd13AD2Bf50"
SEPOLIA_HOOK="0x64f7cC79F599efBc8e95978520c5092Ef8DE2AC8"
SEPOLIA_FACTORY="0xcBcbCC12664F3eE4D20b3F49554BBE55fD7d9746"
SEPOLIA_BOOTSTRAP="0xe3893b4c3a210571d04561714eFDAd34F80Bc232"
SEPOLIA_BIRTHCERT="0x4003CbFD62B0b4BAbBdad714e472fCb8D1f03132"
SEPOLIA_MEMORY="0x833FF145e104198793e62593a1dfD4633066B416"
SEPOLIA_BUNDLER="0x8112c14406C0f38C56f13A709498ddEd446a5b7b"

SEPOLIA_RPC="https://eth-sepolia.g.alchemy.com/v2/BdgPEmQddox2due7mrt9J"
ETHERSCAN_KEY="69U9FKJK6A46748RA94DYBRJSQCHC8191C"

# Pool Manager and Position Manager (Sepolia)
SEPOLIA_POOL_MANAGER="0xE03A1074c86CFeDd5C142C4F04F1a1536e203543"
SEPOLIA_POSITION_MANAGER="0x429ba70129df741B2Ca2a85BC3A2a3328e5c09b4"
SEPOLIA_TREASURY="0x3472a51BAf1814B59bf7ac55C8CBA679189Bf0e7"

echo "1. Verifying ClawclickConfig..."
forge verify-contract $SEPOLIA_CONFIG src/core/ClawclickConfig.sol:ClawclickConfig \
  --chain-id 11155111 \
  --etherscan-api-key $ETHERSCAN_KEY \
  --constructor-args $(cast abi-encode "constructor(address,address)" $SEPOLIA_TREASURY $SEPOLIA_TREASURY) \
  --watch

echo "2. Verifying ClawclickHook..."
forge verify-contract $SEPOLIA_HOOK src/core/ClawclickHook_V4.sol:ClawclickHook \
  --chain-id 11155111 \
  --etherscan-api-key $ETHERSCAN_KEY \
  --constructor-args $(cast abi-encode "constructor(address,address)" $SEPOLIA_POOL_MANAGER $SEPOLIA_CONFIG) \
  --watch

echo "3. Verifying BootstrapETH..."
forge verify-contract $SEPOLIA_BOOTSTRAP src/utils/BootstrapETH.sol:BootstrapETH \
  --chain-id 11155111 \
  --etherscan-api-key $ETHERSCAN_KEY \
  --constructor-args $(cast abi-encode "constructor(address)" $SEPOLIA_FACTORY) \
  --watch

echo "4. Verifying ClawclickFactory..."
forge verify-contract $SEPOLIA_FACTORY src/core/ClawclickFactory.sol:ClawclickFactory \
  --chain-id 11155111 \
  --etherscan-api-key $ETHERSCAN_KEY \
  --constructor-args $(cast abi-encode "constructor(address,address,address,address,address,address)" $SEPOLIA_CONFIG $SEPOLIA_POOL_MANAGER $SEPOLIA_HOOK $SEPOLIA_POSITION_MANAGER $SEPOLIA_BOOTSTRAP $SEPOLIA_TREASURY) \
  --watch

echo "5. Verifying AgentBirthCertificateNFT..."
forge verify-contract $SEPOLIA_BIRTHCERT src/identity/AgentBirthCertificateNFT.sol:AgentBirthCertificateNFT \
  --chain-id 11155111 \
  --etherscan-api-key $ETHERSCAN_KEY \
  --constructor-args $(cast abi-encode "constructor(string,address)" "https://api.claw.click/metadata/" $SEPOLIA_TREASURY) \
  --watch

echo "6. Verifying MemoryStorage..."
forge verify-contract $SEPOLIA_MEMORY src/identity/MemoryStorage.sol:MemoryStorage \
  --chain-id 11155111 \
  --etherscan-api-key $ETHERSCAN_KEY \
  --watch

echo "7. Verifying AgentLaunchBundler..."
forge verify-contract $SEPOLIA_BUNDLER src/bundler/AgentLaunchBundler.sol:AgentLaunchBundler \
  --chain-id 11155111 \
  --etherscan-api-key $ETHERSCAN_KEY \
  --constructor-args $(cast abi-encode "constructor(address,address)" $SEPOLIA_FACTORY $SEPOLIA_BIRTHCERT) \
  --watch

echo ""
echo "=========================================="
echo "VERIFYING BASE MAINNET CONTRACTS"
echo "=========================================="

# Base addresses
BASE_CONFIG="0x18b89e491d8f12d2be6D2A8e945dF4D93F1247a7"
BASE_HOOK="0x8265be7eb9D7e40c1FAb6CBd8DBc626b31A0aac8"
BASE_FACTORY="0xF5979D0fEEd05CEcb94cf62B76FE7E9aB40c6b4a"
BASE_BOOTSTRAP="0xE2649737D3005c511a27DF6388871a12bE0a2d30"
BASE_BIRTHCERT="0x6E9B093FdD12eC34ce358bd70CF59EeCb5D1A95B"
BASE_MEMORY="0x81ae37d31C488094bf292ebEb15C6eCfcD9Fad7D"
BASE_BUNDLER="0x1AF3b3Cd703Ff59D18A295f669Ad9B7051707268"

BASE_RPC="https://base-mainnet.g.alchemy.com/v2/BdgPEmQddox2due7mrt9J"

# Pool Manager and Position Manager (Base)
BASE_POOL_MANAGER="0x498581fF718922c3f8e6A244956aF099B2652b2b"
BASE_POSITION_MANAGER="0x7C5f5A4bBd8fD63184577525326123B519429bDc"
BASE_TREASURY="0xFf7549B06E68186C91a6737bc0f0CDE1245e349b"
BASE_DEPLOYER="0x958fC4d5688F7e7425EEa770F54d5126a46A9104"

echo "1. Verifying ClawclickConfig..."
forge verify-contract $BASE_CONFIG src/core/ClawclickConfig.sol:ClawclickConfig \
  --chain-id 8453 \
  --etherscan-api-key $ETHERSCAN_KEY \
  --constructor-args $(cast abi-encode "constructor(address,address)" $BASE_TREASURY $BASE_DEPLOYER) \
  --watch

echo "2. Verifying ClawclickHook..."
forge verify-contract $BASE_HOOK src/core/ClawclickHook_V4.sol:ClawclickHook \
  --chain-id 8453 \
  --etherscan-api-key $ETHERSCAN_KEY \
  --constructor-args $(cast abi-encode "constructor(address,address)" $BASE_POOL_MANAGER $BASE_CONFIG) \
  --watch

echo "3. Verifying BootstrapETH..."
forge verify-contract $BASE_BOOTSTRAP src/utils/BootstrapETH.sol:BootstrapETH \
  --chain-id 8453 \
  --etherscan-api-key $ETHERSCAN_KEY \
  --constructor-args $(cast abi-encode "constructor(address)" $BASE_FACTORY) \
  --watch

echo "4. Verifying ClawclickFactory..."
forge verify-contract $BASE_FACTORY src/core/ClawclickFactory.sol:ClawclickFactory \
  --chain-id 8453 \
  --etherscan-api-key $ETHERSCAN_KEY \
  --constructor-args $(cast abi-encode "constructor(address,address,address,address,address,address)" $BASE_CONFIG $BASE_POOL_MANAGER $BASE_HOOK $BASE_POSITION_MANAGER $BASE_BOOTSTRAP $BASE_DEPLOYER) \
  --watch

echo "5. Verifying AgentBirthCertificateNFT..."
forge verify-contract $BASE_BIRTHCERT src/identity/AgentBirthCertificateNFT.sol:AgentBirthCertificateNFT \
  --chain-id 8453 \
  --etherscan-api-key $ETHERSCAN_KEY \
  --constructor-args $(cast abi-encode "constructor(string,address)" "https://api.claw.click/metadata/" $BASE_TREASURY) \
  --watch

echo "6. Verifying MemoryStorage..."
forge verify-contract $BASE_MEMORY src/identity/MemoryStorage.sol:MemoryStorage \
  --chain-id 8453 \
  --etherscan-api-key $ETHERSCAN_KEY \
  --watch

echo "7. Verifying AgentLaunchBundler..."
forge verify-contract $BASE_BUNDLER src/bundler/AgentLaunchBundler.sol:AgentLaunchBundler \
  --chain-id 8453 \
  --etherscan-api-key $ETHERSCAN_KEY \
  --constructor-args $(cast abi-encode "constructor(address,address)" $BASE_FACTORY $BASE_BIRTHCERT) \
  --watch

echo ""
echo "=========================================="
echo "VERIFICATION COMPLETE!"
echo "=========================================="
