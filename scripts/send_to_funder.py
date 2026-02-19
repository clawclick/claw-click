#!/usr/bin/env python3
"""Send 0.3 ETH from up to 4 test wallets (>0.5 ETH) to the funder."""
from web3 import Web3
from eth_account import Account

w3 = Web3(Web3.HTTPProvider("https://ethereum-sepolia-rpc.publicnode.com", request_kwargs={"timeout": 30}))
funder = "0x009c0E4b9C0C83487FB2608CA97b1A1526c786fA"
sent = 0
rich = []

# First scan all wallets for balances >0.5 ETH
print("Scanning wallets...")
for i in range(50):
    seed = "v2" if i < 10 else "v3"
    pk = Web3.keccak(text=f"clawclick-test-wallet-{i}-sepolia-{seed}").hex()
    acct = Account.from_key(pk)
    try:
        bal = w3.eth.get_balance(acct.address)
    except Exception as e:
        print(f"  w{i}: RPC error, skipping")
        continue
    if bal > Web3.to_wei(0.5, "ether"):
        rich.append((i, acct, bal))
        print(f"  w{i}: {Web3.from_wei(bal, 'ether'):.4f} ETH  ***")
    if len(rich) >= 4:
        break

print(f"\nFound {len(rich)} wallets with >0.5 ETH. Sending 0.3 ETH each...\n")

for i, acct, bal in rich:
    print(f"w{i}: sending 0.3 ETH...")
    try:
        tx = {
            "to": funder,
            "value": Web3.to_wei(0.3, "ether"),
            "gas": 21000,
            "gasPrice": int(w3.eth.gas_price * 1.2),
            "nonce": w3.eth.get_transaction_count(acct.address),
            "chainId": 11155111,
        }
        signed = acct.sign_transaction(tx)
        h = w3.eth.send_raw_transaction(signed.raw_transaction)
        r = w3.eth.wait_for_transaction_receipt(h, timeout=60)
        print(f"  -> sent 0.3 ETH, status={r['status']}")
        sent += 1
    except Exception as e:
        print(f"  -> FAILED: {str(e)[:80]}")

print(f"\nDone. Sent from {sent} wallets.")
print(f"Funder balance: {Web3.from_wei(w3.eth.get_balance(funder), 'ether'):.4f} ETH")
