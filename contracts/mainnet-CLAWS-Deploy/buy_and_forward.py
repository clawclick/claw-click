#!/usr/bin/env python3
"""
Sequential buy script for CLAWS token using Uniswap V4
Buys with 24 wallets and forwards to cold storage
"""

from web3 import Web3
from eth_account import Account
import json
import time

# Configuration
RPC_URL = "https://ethereum-sepolia-rpc.publicnode.com"
TOKEN_ADDRESS = "0xA601F2Ab2A3798A515Dff19267Fc988E5e680C00"
POOL_MANAGER = "0xE03A1074c86CFeDd5C142C4F04F1a1536e203543"
FACTORY_ADDRESS = "0xAB936490488A16e134c531c30B6866D009a8dF2e"

# Wallet generation (same mnemonic as Foundry script)
MNEMONIC = "test test test test test test test test test test test junk"

# Buy amount per wallet
BUY_AMOUNT = Web3.to_wei(0.0204, 'ether')

# Cold storage addresses
COLD_STORAGE = [
    "0x27E030789043ef2Cf70F458018c85019b6A23399",
    "0x12AfE6d1386e8a9c678EcD2498e084D5848686db",
    "0x8299920cb9E3309Ff54153f98bE26A2D70f75e06",
    "0x7FfB51DcE75e1E389Fd10a18b53F88DEC8349ee9",
    "0xb7e57eB5cAF62b6175E36B3e637D5d0ef61a33c3",
    "0x7573b935A8aaEAbE90557883400Ed703f588cfbB",
    "0x1c42Cfad4DD004Af8D09c477274ff120Be591524",
    "0xDab5b76aE9729Ece81634d352E6Cd40b2DB01842",
    "0x9bbDcAd877E7B974a5266D8b29Cf48138231a65f",
    "0xe3cE63F4E736FF8D36aa0A7C64307b17790238B2",
    "0x8859Cd97D2953979BcCAEAde311A4f636b7901f7",
    "0x70c4522Afdbd0c243d1906FAAE6B197c30f4534F",
    "0x33f27Eb7282a432f892E70b04f76442CC364Ed7f",
    "0x290FEded52A84ce5F704cA6e2480c94Ed58080A4",
    "0xaf1edf3C7eFdA75D3C9973210043CC3FFb65a9aD",
    "0xE7FC64b19C11f24CE1aF35BC83Ad2dD3A4070B74",
    "0xa85Ea3ce7135F61E6e9b8Ccc7f24bb54C2861375",
    "0xfDFfbF4b934A3868826AD86e9F3Fbe5e4B419A23",
    "0x519679809164d7d5F9171405B562d4b8C67F9249",
    "0xfA696e24Ffce748B30E26c3C047A0dC3FbeCe824",
    "0xbE26eE9A06d36d50970106aA80E151118Ff0A169",
    "0xfcddBFc144283B3aaA721Bc5f554e23226f481a2",
    "0x49867915fBb071B4F7f5B50cfa7dF4B94EA15A40",
    "0x97e92fBB0cBE1d497De769E229EBE7E4ab6BD3fD"
]

# Connect to Sepolia
w3 = Web3(Web3.HTTPProvider(RPC_URL))
print(f"Connected to Sepolia: {w3.is_connected()}")
print(f"Chain ID: {w3.eth.chain_id}")

# ERC20 ABI (minimal)
ERC20_ABI = json.loads('[{"constant":true,"inputs":[{"name":"_owner","type":"address"}],"name":"balanceOf","outputs":[{"name":"balance","type":"uint256"}],"type":"function"},{"constant":false,"inputs":[{"name":"_to","type":"address"},{"name":"_value","type":"uint256"}],"name":"transfer","outputs":[{"name":"","type":"bool"}],"type":"function"}]')

# PoolManager swap ABI (simplified)
POOL_MANAGER_ABI = json.loads('[{"inputs":[{"components":[{"internalType":"Currency","name":"currency0","type":"address"},{"internalType":"Currency","name":"currency1","type":"address"},{"internalType":"uint24","name":"fee","type":"uint24"},{"internalType":"int24","name":"tickSpacing","type":"int24"},{"internalType":"contract IHooks","name":"hooks","type":"address"}],"internalType":"struct PoolKey","name":"key","type":"tuple"},{"components":[{"internalType":"bool","name":"zeroForOne","type":"bool"},{"internalType":"int256","name":"amountSpecified","type":"int256"},{"internalType":"uint160","name":"sqrtPriceLimitX96","type":"uint160"}],"internalType":"struct IPoolManager.SwapParams","name":"params","type":"tuple"},{"internalType":"bytes","name":"hookData","type":"bytes"}],"name":"swap","outputs":[{"internalType":"BalanceDelta","name":"","type":"int256"}],"stateMutability":"payable","type":"function"}]')

token = w3.eth.contract(address=Web3.to_checksum_address(TOKEN_ADDRESS), abi=ERC20_ABI)
pool_manager = w3.eth.contract(address=Web3.to_checksum_address(POOL_MANAGER), abi=POOL_MANAGER_ABI)

# Derive wallets from mnemonic
Account.enable_unaudited_hdwallet_features()

wallets = []
for i in range(24):
    account = Account.from_mnemonic(MNEMONIC, account_path=f"m/44'/60'/0'/0/{i}")
    wallets.append({
        'index': i + 1,
        'address': account.address,
        'private_key': account.key.hex(),
        'cold_storage': COLD_STORAGE[i]
    })
    print(f"Wallet {i+1}: {account.address}")

print(f"\n=== Starting Sequential Buys ===")
print(f"Token: {TOKEN_ADDRESS}")
print(f"Buy amount per wallet: {Web3.from_wei(BUY_AMOUNT, 'ether')} ETH")

# Get pool info from Factory
factory_abi = json.loads('[{"inputs":[{"internalType":"address","name":"token","type":"address"}],"name":"launchByToken","outputs":[{"components":[{"internalType":"address","name":"token","type":"address"},{"internalType":"address","name":"creator","type":"address"},{"internalType":"address","name":"beneficiary","type":"address"},{"internalType":"address","name":"agentWallet","type":"address"},{"internalType":"PoolId","name":"poolId","type":"bytes32"},{"components":[{"internalType":"Currency","name":"currency0","type":"address"},{"internalType":"Currency","name":"currency1","type":"address"},{"internalType":"uint24","name":"fee","type":"uint24"},{"internalType":"int24","name":"tickSpacing","type":"int24"},{"internalType":"contract IHooks","name":"hooks","type":"address"}],"internalType":"struct PoolKey","name":"poolKey","type":"tuple"}],"internalType":"struct ClawclickFactory.LaunchInfo","name":"","type":"tuple"}],"stateMutability":"view","type":"function"}]')
factory = w3.eth.contract(address=Web3.to_checksum_address(FACTORY_ADDRESS), abi=factory_abi)

launch_info = factory.functions.launchByToken(Web3.to_checksum_address(TOKEN_ADDRESS)).call()
pool_key = launch_info[5]  # poolKey is 6th element
print(f"Pool Key: {pool_key}")

# Execute buys
for wallet in wallets:
    print(f"\n--- Wallet {wallet['index']}: {wallet['address']} ---")
    
    # Check balance
    balance = w3.eth.get_balance(wallet['address'])
    print(f"ETH Balance: {Web3.from_wei(balance, 'ether')} ETH")
    
    if balance < BUY_AMOUNT:
        print(f"Insufficient balance, skipping")
        continue
    
    # Execute swap (ETH -> CLAWS)
    # For V4, we need to use unlock pattern - let's use direct transfer method instead
    # Actually, let's call swap via PoolManager
    
    try:
        # Prepare swap params
        swap_params = {
            'zeroForOne': True,  # ETH (currency0) -> CLAWS (currency1)
            'amountSpecified': -BUY_AMOUNT,  # Negative = exact input
            'sqrtPriceLimitX96': 0  # No limit
        }
        
        # Build transaction
        account = Account.from_key(wallet['private_key'])
        nonce = w3.eth.get_transaction_count(account.address)
        
        # Call swap
        tx = pool_manager.functions.swap(
            pool_key,
            (swap_params['zeroForOne'], swap_params['amountSpecified'], swap_params['sqrtPriceLimitX96']),
            b''  # No hook data
        ).build_transaction({
            'from': account.address,
            'value': BUY_AMOUNT,
            'gas': 500000,
            'gasPrice': w3.eth.gas_price,
            'nonce': nonce,
            'chainId': 11155111
        })
        
        # Sign and send
        signed_tx = account.sign_transaction(tx)
        tx_hash = w3.eth.send_raw_transaction(signed_tx.rawTransaction)
        print(f"Buy tx: {tx_hash.hex()}")
        
        # Wait for confirmation
        receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)
        print(f"Status: {'SUCCESS' if receipt['status'] == 1 else 'FAILED'}")
        
        if receipt['status'] != 1:
            print(f"Buy failed, skipping")
            continue
        
        # Check token balance
        time.sleep(2)
        token_balance = token.functions.balanceOf(account.address).call()
        print(f"CLAWS received: {Web3.from_wei(token_balance, 'ether')}")
        
        if token_balance > 0:
            # Transfer tokens to cold storage
            nonce = w3.eth.get_transaction_count(account.address)
            transfer_tx = token.functions.transfer(
                Web3.to_checksum_address(wallet['cold_storage']),
                token_balance
            ).build_transaction({
                'from': account.address,
                'gas': 100000,
                'gasPrice': w3.eth.gas_price,
                'nonce': nonce,
                'chainId': 11155111
            })
            
            signed_transfer = account.sign_transaction(transfer_tx)
            transfer_hash = w3.eth.send_raw_transaction(signed_transfer.rawTransaction)
            print(f"Transfer tx: {transfer_hash.hex()}")
            
            transfer_receipt = w3.eth.wait_for_transaction_receipt(transfer_hash, timeout=120)
            print(f"Transferred to cold storage: {wallet['cold_storage']}")
        
        # Wait 3 seconds before next buy
        if wallet['index'] < 24:
            print("Waiting 3 seconds...")
            time.sleep(3)
            
    except Exception as e:
        print(f"Error: {e}")
        continue

print("\n=== ALL BUYS COMPLETE ===")
