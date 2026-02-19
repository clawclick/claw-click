#!/usr/bin/env python3
"""Recover ALL ETH: sweep wallets + drain contract balances + claim fees."""
import time
from web3 import Web3
from eth_account import Account

RPCS = [
    "https://ethereum-sepolia-rpc.publicnode.com",
    "https://rpc.sepolia.org",
    "https://sepolia.drpc.org",
    "https://rpc2.sepolia.org",
]
FUNDER = "0x009c0E4b9C0C83487FB2608CA97b1A1526c786fA"
FUNDER_PK = "0x1f25b7e48ab70078f5b05ad4b214240f0caa8642a741f72a22c8732492c5a509"

# All known deployed contracts across ALL deployments
FACTORIES = [
    "0x6658702F5070fF4a0f6C4507101EA485839511bb",  # latest
    "0x39534bF4cF9363CC38F1c30086042faD855E27e3",  # v2
    "0x31489435Dac5789FE98f2843044dF83eF1643757",  # v1/fast
    "0x2880B65401A52ac2f4eCbEB4186833877B9D994B",  # check_reposition
    "0x27E517356f79c11beD4CCE28c949Ef468EF7aE78",  # old 05_NewToken
]
HOOKS = [
    "0x9d5427a454Be43eF29343CBB6F51040C25262AC8",  # latest
    "0x1971e39Ba258Ad1507e31E0bac74b29037bDAaC8",  # v2
    "0xb170D92e87527d7eDD861B960Fbb8F5E20fB2Ac8",  # v1/fast
    "0x3C51C9F9050cab3E48329A13f43d97fB5793aaC8",  # check_reposition
    "0x9b7120E546428B64556bfFEA0B245aAcD8de6aC8",  # old
]
ROUTERS = [
    "0xA2e24f402bfB4eDb641B023d44de02e4263B4337",  # latest
    "0x88Bf059C2E305C03208d10427c273093815a968B",  # v2
    "0xd7A33b9d611BE5FBd8d6C547e04784b850B96C13",  # v1/fast
]

SEEDS = ["v2", "v3", "v4"]
WALLETS_PER_SEED = 50
RESERVE_WEI = Web3.to_wei(0.0005, "ether")
MIN_SEND_WEI = Web3.to_wei(0.0002, "ether")

w3 = None
for rpc in RPCS:
    try:
        _w3 = Web3(Web3.HTTPProvider(rpc, request_kwargs={"timeout": 8}))
        if _w3.is_connected():
            w3 = _w3
            print(f"Connected to {rpc}")
            break
    except:
        continue
assert w3 is not None, "All RPCs failed"

funder_acct = Account.from_key(FUNDER_PK)
gas_price = int(w3.eth.gas_price * 1.2)

print(f"Funder: {FUNDER}")
start_bal = w3.eth.get_balance(FUNDER)
print(f"Start balance: {Web3.from_wei(start_bal, 'ether'):.6f} ETH")
print()

# ── 1. Check all contract balances ──────────────────────────────────────
print("=== CONTRACT BALANCES ===")
total_contract_eth = 0
for label, addrs in [("Factory", FACTORIES), ("Hook", HOOKS), ("Router", ROUTERS)]:
    for addr in addrs:
        try:
            bal = w3.eth.get_balance(Web3.to_checksum_address(addr))
            if bal > 0:
                eth = Web3.from_wei(bal, 'ether')
                total_contract_eth += bal
                print(f"  {label} {addr[:10]}... = {eth:.6f} ETH")
        except Exception as e:
            print(f"  {label} {addr[:10]}... ERROR: {str(e)[:60]}")
print(f"  Total in contracts: {Web3.from_wei(total_contract_eth, 'ether'):.6f} ETH")
print()

# ── 2. Try claimPlatformFeesETH on hooks (treasury = deployer) ─────────
print("=== CLAIMING HOOK FEES ===")
CLAIM_PLATFORM_ABI = [{"type":"function","name":"claimPlatformFeesETH","inputs":[],"outputs":[],"stateMutability":"nonpayable"}]
CLAIM_BENEFICIARY_ABI = [{"type":"function","name":"claimBeneficiaryFeesETH","inputs":[{"name":"beneficiary","type":"address"}],"outputs":[],"stateMutability":"nonpayable"}]
PLATFORM_FEES_ABI = [{"type":"function","name":"platformFeesETH","inputs":[],"outputs":[{"name":"","type":"uint256"}],"stateMutability":"view"}]
BENEFICIARY_FEES_ABI = [{"type":"function","name":"beneficiaryFeesETH","inputs":[{"name":"","type":"address"}],"outputs":[{"name":"","type":"uint256"}],"stateMutability":"view"}]

nonce = w3.eth.get_transaction_count(FUNDER)
for hook_addr in HOOKS:
    cs = Web3.to_checksum_address(hook_addr)
    try:
        # Check platform fees
        h = w3.eth.contract(address=cs, abi=PLATFORM_FEES_ABI)
        pf = h.functions.platformFeesETH().call()
        if pf > 0:
            print(f"  Hook {hook_addr[:10]}... platformFees={Web3.from_wei(pf,'ether'):.6f} ETH - claiming...")
            hc = w3.eth.contract(address=cs, abi=CLAIM_PLATFORM_ABI)
            tx = hc.functions.claimPlatformFeesETH().build_transaction({
                "from": FUNDER, "gas": 100000, "gasPrice": gas_price,
                "nonce": nonce, "chainId": 11155111,
            })
            signed = funder_acct.sign_transaction(tx)
            w3.eth.send_raw_transaction(signed.raw_transaction)
            nonce += 1
            print(f"    Sent claim tx")
    except Exception as e:
        if "NoFeesToClaim" not in str(e) and "revert" not in str(e).lower():
            print(f"  Hook {hook_addr[:10]}... platform claim error: {str(e)[:80]}")

    try:
        # Check beneficiary fees (deployer is beneficiary)
        h2 = w3.eth.contract(address=cs, abi=BENEFICIARY_FEES_ABI)
        bf = h2.functions.beneficiaryFeesETH(Web3.to_checksum_address(FUNDER)).call()
        if bf > 0:
            print(f"  Hook {hook_addr[:10]}... beneficiaryFees={Web3.from_wei(bf,'ether'):.6f} ETH - claiming...")
            hc2 = w3.eth.contract(address=cs, abi=CLAIM_BENEFICIARY_ABI)
            tx = hc2.functions.claimBeneficiaryFeesETH(Web3.to_checksum_address(FUNDER)).build_transaction({
                "from": FUNDER, "gas": 100000, "gasPrice": gas_price,
                "nonce": nonce, "chainId": 11155111,
            })
            signed = funder_acct.sign_transaction(tx)
            w3.eth.send_raw_transaction(signed.raw_transaction)
            nonce += 1
            print(f"    Sent claim tx")
    except Exception as e:
        if "NoFeesToClaim" not in str(e) and "revert" not in str(e).lower():
            print(f"  Hook {hook_addr[:10]}... beneficiary claim error: {str(e)[:80]}")
print()

# ── 3. Sweep all wallets ───────────────────────────────────────────────
print("=== SWEEPING WALLETS ===")
sent = 0
total_swept = 0
for seed in SEEDS:
    for i in range(WALLETS_PER_SEED):
        pk = Web3.keccak(text=f"clawclick-test-wallet-{i}-sepolia-{seed}").hex()
        acct = Account.from_key(pk)
        try:
            bal = w3.eth.get_balance(acct.address)
        except:
            continue
        if bal <= RESERVE_WEI + MIN_SEND_WEI:
            continue
        value = bal - RESERVE_WEI
        try:
            tx = {
                "to": FUNDER, "value": value, "gas": 21000,
                "gasPrice": gas_price,
                "nonce": w3.eth.get_transaction_count(acct.address),
                "chainId": 11155111,
            }
            signed = acct.sign_transaction(tx)
            w3.eth.send_raw_transaction(signed.raw_transaction)
            sent += 1
            total_swept += value
        except Exception as e:
            print(f"  fail {seed}:{i:02d} {str(e)[:80]}")

print(f"  Swept {sent} wallets, {Web3.from_wei(total_swept, 'ether'):.6f} ETH")
print()

# ── 4. Wait and report ────────────────────────────────────────────────
print("Waiting 12s for confirmations...")
time.sleep(12)
end_bal = w3.eth.get_balance(FUNDER)
print(f"\nFinal deployer balance: {Web3.from_wei(end_bal, 'ether'):.6f} ETH")
print(f"Net recovered: {Web3.from_wei(end_bal - start_bal, 'ether'):.6f} ETH")
