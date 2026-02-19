#!/usr/bin/env python3
from web3 import Web3
from eth_account import Account

RPC_URL = "https://ethereum-sepolia-rpc.publicnode.com"
FUNDER = "0x009c0E4b9C0C83487FB2608CA97b1A1526c786fA"
SEEDS = ["v2", "v3", "v4"]
WALLETS_PER_SEED = 50
RESERVE_ETH = 0.002
MIN_SEND_ETH = 0.0003

w3 = Web3(Web3.HTTPProvider(RPC_URL, request_kwargs={"timeout": 12}))
assert w3.is_connected(), "RPC connection failed"

reserve_wei = Web3.to_wei(RESERVE_ETH, "ether")
min_send_wei = Web3.to_wei(MIN_SEND_ETH, "ether")

print(f"Funder: {FUNDER}")
start_balance = w3.eth.get_balance(FUNDER)
print(f"Funder start balance: {Web3.from_wei(start_balance, 'ether'):.6f} ETH")
print()

sent = 0
total_sent = 0
checked = 0
errors = 0
gas_price = int(w3.eth.gas_price * 1.2)

for seed in SEEDS:
    for index in range(WALLETS_PER_SEED):
        checked += 1
        private_key = Web3.keccak(text=f"clawclick-test-wallet-{index}-sepolia-{seed}").hex()
        account = Account.from_key(private_key)

        try:
            balance = w3.eth.get_balance(account.address)
        except Exception as exc:
            print(f"skip {seed}:{index:02d} rpc error: {str(exc)[:90]}")
            continue

        if balance <= reserve_wei + min_send_wei:
            continue

        value = balance - reserve_wei

        try:
            tx = {
                "to": FUNDER,
                "value": value,
                "gas": 21000,
                "gasPrice": gas_price,
                "nonce": w3.eth.get_transaction_count(account.address),
                "chainId": 11155111,
            }
            signed = account.sign_transaction(tx)
            w3.eth.send_raw_transaction(signed.raw_transaction)
            sent += 1
            total_sent += value
        except Exception as exc:
            errors += 1
            print(f"fail {seed}:{index:02d} {account.address}: {str(exc)[:120]}")

print()
print(f"Checked wallets: {checked}")
print(f"Submitted sweep tx: {sent}")
print(f"Total swept: {Web3.from_wei(total_sent, 'ether'):.6f} ETH")
print(f"Errors: {errors}")
print("Waiting 10s for mempool inclusion...")
import time
time.sleep(10)
end_balance = w3.eth.get_balance(FUNDER)
print(f"Funder end balance: {Web3.from_wei(end_balance, 'ether'):.6f} ETH")
