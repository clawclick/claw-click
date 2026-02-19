#!/usr/bin/env python3
"""Check ETH + token balances for all 50 wallets and funder."""
from web3 import Web3
from eth_account import Account

w3 = Web3(Web3.HTTPProvider('https://ethereum-sepolia-rpc.publicnode.com'))
FUNDER_PK = "0x1f25b7e48ab70078f5b05ad4b214240f0caa8642a741f72a22c8732492c5a509"
TOKEN_ADDR = "0x086a0f6D37719906bAd0D5721a997142EF9C9863"
HOOK_ADDR = "0xb170D92e87527d7eDD861B960Fbb8F5E20fB2Ac8"
POOL_ID = bytes.fromhex('05a2248473e067ce7c06a0c11de9af3b6f3c0137883e5435cb5d479f626fb12b')

funder = Account.from_key(FUNDER_PK)
token = w3.eth.contract(address=Web3.to_checksum_address(TOKEN_ADDR), abi=[
    {"type": "function", "name": "balanceOf",
     "inputs": [{"name": "account", "type": "address"}],
     "outputs": [{"name": "", "type": "uint256"}],
     "stateMutability": "view"},
])
hook = w3.eth.contract(address=Web3.to_checksum_address(HOOK_ADDR), abi=[
    {"type": "function", "name": "getCurrentLimits",
     "inputs": [{"name": "poolId", "type": "bytes32"}],
     "outputs": [{"name": "maxTx", "type": "uint256"}, {"name": "maxWallet", "type": "uint256"}],
     "stateMutability": "view"},
    {"type": "function", "name": "getCurrentEpoch",
     "inputs": [{"name": "poolId", "type": "bytes32"}],
     "outputs": [{"name": "epoch", "type": "uint256"}],
     "stateMutability": "view"},
])

NUM_WALLETS = 50
wallets = []
for i in range(NUM_WALLETS):
    if i < 10:
        pk = Web3.keccak(text=f"clawclick-test-wallet-{i}-sepolia-v2").hex()
    else:
        pk = Web3.keccak(text=f"clawclick-test-wallet-{i}-sepolia-v3").hex()
    wallets.append(Account.from_key(pk))

total_eth = 0
total_tokens = 0

print(f"Funder: {funder.address}")
funder_bal = w3.eth.get_balance(funder.address)
print(f"  ETH: {Web3.from_wei(funder_bal, 'ether'):.6f}")
print()

maxTx, maxW = hook.functions.getCurrentLimits(POOL_ID).call()
epoch = hook.functions.getCurrentEpoch(POOL_ID).call()
print(f"Epoch: {epoch}  MaxWallet: {Web3.from_wei(maxW, 'ether'):.2f} tokens")
print()

print(f"{'Wallet':>8}  {'ETH':>12}  {'Tokens':>14}  {'Room':>14}")
print("-" * 55)

for i, w in enumerate(wallets):
    eth = w3.eth.get_balance(w.address)
    tok = token.functions.balanceOf(w.address).call()
    room = maxW - tok if maxW > tok else 0
    total_eth += eth
    total_tokens += tok
    if eth > 10**14 or tok > 0:
        print(f"  w{i:2d}    {Web3.from_wei(eth, 'ether'):>12.6f}  {Web3.from_wei(tok, 'ether'):>14.2f}  {Web3.from_wei(room, 'ether'):>14.2f}")

print("-" * 55)
print(f"  TOTAL  {Web3.from_wei(total_eth, 'ether'):>12.6f}  {Web3.from_wei(total_tokens, 'ether'):>14.2f}")
print(f"  + Funder: {Web3.from_wei(funder_bal, 'ether'):.6f}")
print(f"  = Grand total ETH: {Web3.from_wei(total_eth + funder_bal, 'ether'):.6f}")
