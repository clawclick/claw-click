#!/usr/bin/env python3
"""
Clawclick Graduation Test — ETH Sepolia
========================================
Rotates through 10 wallets, each buying maxTx per epoch.
Tracks fees before/after graduation.

Usage:
    cd /Users/zcsmacpro/VscProjects/claw-click
    python3 scripts/buy_to_graduation.py
"""

import os, sys, time, json
from pathlib import Path
from web3 import Web3
from eth_account import Account

# ─── Config ───────────────────────────────────────────────────────────────
RPC_URL        = "https://ethereum-sepolia-rpc.publicnode.com"
FUNDER_PK      = "0x1f25b7e48ab70078f5b05ad4b214240f0caa8642a741f72a22c8732492c5a509"
NUM_WALLETS    = 10
FUND_AMOUNT    = Web3.to_wei(0.5, "ether")  # 0.5 ETH per wallet

# Deployed addresses from DeployAndActivate
HOOK_ADDR      = "0xb170D92e87527d7eDD861B960Fbb8F5E20fB2Ac8"
FACTORY_ADDR   = "0x31489435Dac5789FE98f2843044dF83eF1643757"
ROUTER_ADDR    = "0xd7A33b9d611BE5FBd8d6C547e04784b850B96C13"
TOKEN_ADDR     = "0x086a0f6D37719906bAd0D5721a997142EF9C9863"
POOL_MANAGER   = "0xE03A1074c86CFeDd5C142C4F04F1a1536e203543"
POOL_ID        = bytes.fromhex("05a2248473e067ce7c06a0c11de9af3b6f3c0137883e5435cb5d479f626fb12b")

# PoolKey tuple for router.buy()
POOL_KEY = (
    "0x0000000000000000000000000000000000000000",  # currency0 = ETH
    TOKEN_ADDR,                                      # currency1 = token
    0x800000,                                        # fee = dynamic
    200,                                             # tickSpacing
    HOOK_ADDR,                                       # hooks
)

# ─── ABIs (minimal) ──────────────────────────────────────────────────────
ROUTER_ABI = [
    {
        "type": "function",
        "name": "buy",
        "inputs": [
            {"name": "key", "type": "tuple", "components": [
                {"name": "currency0", "type": "address"},
                {"name": "currency1", "type": "address"},
                {"name": "fee", "type": "uint24"},
                {"name": "tickSpacing", "type": "int24"},
                {"name": "hooks", "type": "address"},
            ]},
            {"name": "ethAmount", "type": "uint256"},
        ],
        "outputs": [{"name": "delta", "type": "int256"}],
        "stateMutability": "payable",
    }
]

HOOK_ABI = [
    {"type": "function", "name": "getCurrentEpoch",
     "inputs": [{"name": "poolId", "type": "bytes32"}],
     "outputs": [{"name": "epoch", "type": "uint256"}],
     "stateMutability": "view"},
    {"type": "function", "name": "getCurrentLimits",
     "inputs": [{"name": "poolId", "type": "bytes32"}],
     "outputs": [{"name": "maxTx", "type": "uint256"}, {"name": "maxWallet", "type": "uint256"}],
     "stateMutability": "view"},
    {"type": "function", "name": "getCurrentTax",
     "inputs": [{"name": "poolId", "type": "bytes32"}],
     "outputs": [{"name": "taxBps", "type": "uint256"}],
     "stateMutability": "view"},
    {"type": "function", "name": "isGraduated",
     "inputs": [{"name": "poolId", "type": "bytes32"}],
     "outputs": [{"name": "graduated", "type": "bool"}],
     "stateMutability": "view"},
    {"type": "function", "name": "beneficiaryFeesETH",
     "inputs": [{"name": "", "type": "address"}],
     "outputs": [{"name": "", "type": "uint256"}],
     "stateMutability": "view"},
    {"type": "function", "name": "platformFeesETH",
     "inputs": [],
     "outputs": [{"name": "", "type": "uint256"}],
     "stateMutability": "view"},
    {"type": "function", "name": "beneficiaryFeesToken",
     "inputs": [{"name": "", "type": "address"}, {"name": "", "type": "address"}],
     "outputs": [{"name": "", "type": "uint256"}],
     "stateMutability": "view"},
    {"type": "function", "name": "platformFeesToken",
     "inputs": [{"name": "", "type": "address"}],
     "outputs": [{"name": "", "type": "uint256"}],
     "stateMutability": "view"},
]

ERC20_ABI = [
    {"type": "function", "name": "balanceOf",
     "inputs": [{"name": "account", "type": "address"}],
     "outputs": [{"name": "", "type": "uint256"}],
     "stateMutability": "view"},
]

# ─── Setup ────────────────────────────────────────────────────────────────
w3 = Web3(Web3.HTTPProvider(RPC_URL))
assert w3.is_connected(), "Cannot connect to RPC"

funder = Account.from_key(FUNDER_PK)
router = w3.eth.contract(address=Web3.to_checksum_address(ROUTER_ADDR), abi=ROUTER_ABI)
hook   = w3.eth.contract(address=Web3.to_checksum_address(HOOK_ADDR), abi=HOOK_ABI)
token  = w3.eth.contract(address=Web3.to_checksum_address(TOKEN_ADDR), abi=ERC20_ABI)

# Beneficiary = deployer (same as funder in our deployment)
BENEFICIARY = funder.address


def get_fees():
    """Return dict of all accumulated fees."""
    b_eth = hook.functions.beneficiaryFeesETH(BENEFICIARY).call()
    p_eth = hook.functions.platformFeesETH().call()
    b_tok = hook.functions.beneficiaryFeesToken(BENEFICIARY, TOKEN_ADDR).call()
    p_tok = hook.functions.platformFeesToken(TOKEN_ADDR).call()
    return {
        "beneficiary_eth": b_eth,
        "platform_eth": p_eth,
        "beneficiary_tok": b_tok,
        "platform_tok": p_tok,
        "total_eth": b_eth + p_eth,
        "total_tok": b_tok + p_tok,
    }


def get_state():
    """Return epoch, tax, limits, graduated."""
    epoch = hook.functions.getCurrentEpoch(POOL_ID).call()
    tax = hook.functions.getCurrentTax(POOL_ID).call()
    maxTx, maxW = hook.functions.getCurrentLimits(POOL_ID).call()
    grad = hook.functions.isGraduated(POOL_ID).call()
    return epoch, tax, maxTx, maxW, grad


def print_state(label=""):
    epoch, tax, maxTx, maxW, grad = get_state()
    fees = get_fees()
    print(f"\n{'='*60}")
    print(f"  {label}")
    print(f"{'='*60}")
    print(f"  Epoch       : {epoch}")
    print(f"  Tax (bps)   : {tax}")
    print(f"  MaxTx       : {Web3.from_wei(maxTx, 'ether'):.4f} tokens (raw: {maxTx})")
    print(f"  MaxWallet   : {Web3.from_wei(maxW, 'ether'):.4f} tokens (raw: {maxW})")
    print(f"  Graduated   : {grad}")
    print(f"  --- Fees ---")
    print(f"  Beneficiary ETH : {Web3.from_wei(fees['beneficiary_eth'], 'ether'):.6f}")
    print(f"  Platform ETH    : {Web3.from_wei(fees['platform_eth'], 'ether'):.6f}")
    print(f"  Total ETH fees  : {Web3.from_wei(fees['total_eth'], 'ether'):.6f}")
    print(f"  Beneficiary Tok : {fees['beneficiary_tok']}")
    print(f"  Platform Tok    : {fees['platform_tok']}")
    print(f"{'='*60}\n")
    return grad


def send_tx(acct, to, value=0, data=b"", gas=500_000):
    """Sign and send a transaction, wait for receipt."""
    nonce = w3.eth.get_transaction_count(acct.address)
    # Get current gas price
    gas_price = w3.eth.gas_price
    # Add 20% buffer
    gas_price = int(gas_price * 1.2)

    tx = {
        "to": to,
        "value": value,
        "gas": gas,
        "gasPrice": gas_price,
        "nonce": nonce,
        "chainId": 11155111,
        "data": data,
    }
    signed = acct.sign_transaction(tx)
    tx_hash = w3.eth.send_raw_transaction(signed.raw_transaction)
    receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)
    return receipt


def fund_wallets(wallets):
    """Send FUND_AMOUNT ETH from funder to each wallet."""
    print(f"\n--- Funding {len(wallets)} wallets with {Web3.from_wei(FUND_AMOUNT, 'ether')} ETH each ---")
    for i, wallet in enumerate(wallets):
        bal = w3.eth.get_balance(wallet.address)
        if bal >= FUND_AMOUNT:
            print(f"  Wallet {i}: {wallet.address[:10]}... already funded ({Web3.from_wei(bal, 'ether'):.4f} ETH)")
            continue
        receipt = send_tx(funder, wallet.address, value=FUND_AMOUNT, gas=21_000)
        status = "OK" if receipt["status"] == 1 else "FAIL"
        print(f"  Wallet {i}: {wallet.address[:10]}... funded {status} (tx: {receipt['transactionHash'].hex()[:16]}...)")
    print()


def buy_with_wallet(wallet, eth_amount):
    """Execute router.buy() from wallet."""
    tx_data = router.functions.buy(POOL_KEY, eth_amount).build_transaction({
        "from": wallet.address,
        "value": eth_amount,
        "gas": 800_000,
        "gasPrice": int(w3.eth.gas_price * 1.2),
        "nonce": w3.eth.get_transaction_count(wallet.address),
        "chainId": 11155111,
    })
    signed = wallet.sign_transaction(tx_data)
    tx_hash = w3.eth.send_raw_transaction(signed.raw_transaction)
    receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)
    return receipt


def calculate_buy_amount(maxTx_tokens):
    """
    Convert maxTx (in tokens) to an ETH amount.
    At 1 ETH MCAP with 1B supply: 1 token = 1e-9 ETH.
    But we need to account for tax eating into the swap.
    We'll use a conservative fraction of maxTx equivalent in ETH.
    
    Simple approach: just use a small fixed ETH amount that stays under limits.
    The hook checks token output vs maxWallet, not ETH input.
    So we need ETH amount small enough that tokens received < maxTx.
    
    At ~1 ETH MCAP: price ≈ 1e-9 ETH/token, 1 ETH buys ~1B tokens
    maxTx = 0.1% * 1B = 1M tokens = 0.001 ETH worth
    But half is taken as tax at epoch 0, so ~0.5M tokens per 0.001 ETH
    
    Let's be safe and buy 80% of what maxTx allows in ETH terms.
    price_eth_per_token ≈ MCAP / totalSupply
    maxTx_in_eth ≈ maxTx * price_eth_per_token
    """
    # We'll estimate conservatively: buy 0.0005 ETH at epoch 0
    # and scale up as maxTx grows
    # maxTx is in token units (e.g. 1e24 = 1M tokens at 18 decimals)
    # price per token in ETH = mcap / supply ≈ 1/1e9 = 1e-9 at start
    # But we don't know exact price from here. Let's just use fraction of wallet balance
    # Actually, maxTx tokens * (currentMcap / totalSupply) = maxTx ETH value
    # We don't have mcap directly but can estimate from maxTx growth
    
    # Base: at epoch 0, maxTx ≈ 1e24 tokens, price ≈ 1e-9 ETH/token
    # So maxTx in ETH ≈ 1e24 * 1e-9 = 1e15 wei = 0.001 ETH
    # As mcap grows 2x, maxTx grows 2x, price grows 2x, so ETH value grows 4x
    
    # Simple: maxTx * (mcap / supply). We know supply = 1e27.
    # mcap ≈ maxTx * supply / (BASE_LIMIT_BPS * growthRatio)... too circular.
    
    # Just use small amounts and let failures tell us:
    # Epoch 0: 0.0008 ETH (conservative, under 0.001 ETH worth)
    # We'll scale based on epoch.
    
    # Actually, let's derive from maxTx directly:
    # maxTx tokens = BASE_LIMIT_BPS/BPS * growthRatio * totalSupply
    # growthRatio = mcap/startMcap
    # mcap = totalSupply * pricePerToken
    # So maxTx = 0.001 * mcap/startMcap * totalSupply
    # And maxTx_ethValue = maxTx * pricePerToken = maxTx * mcap/totalSupply
    # = 0.001 * (mcap/startMcap) * mcap
    # = 0.001 * mcap^2 / startMcap
    
    # This is getting circular. Let's just be practical:
    # maxTx in raw token units. We know totalSupply = 1e27.
    # limitBps = maxTx * BPS / totalSupply (in BPS)
    # growthRatio = limitBps / BASE_LIMIT_BPS = limitBps / 10
    # So mcap = startMcap * growthRatio = 1 ETH * (limitBps / 10)
    # price_per_token = mcap / totalSupply (in ETH)
    # maxTx_in_eth = maxTx * price_per_token
    
    TOTAL_SUPPLY = 10**27
    BPS = 10000
    BASE_LIMIT_BPS = 10
    START_MCAP = 10**18  # 1 ETH
    
    limit_bps = (maxTx_tokens * BPS) // TOTAL_SUPPLY
    if limit_bps < BASE_LIMIT_BPS:
        limit_bps = BASE_LIMIT_BPS
    growth_ratio = limit_bps * BPS // BASE_LIMIT_BPS  # scaled by BPS
    mcap = START_MCAP * growth_ratio // BPS
    price_per_token = mcap * 10**18 // TOTAL_SUPPLY  # in wei per token (scaled by 1e18)
    
    max_eth = maxTx_tokens * price_per_token // 10**18
    
    # Use 70% of max to account for tax + slippage
    buy_eth = max_eth * 70 // 100
    
    # Floor at MIN_SWAP_AMOUNT (1e14 = 0.0001 ETH)
    if buy_eth < 10**14:
        buy_eth = 10**14
    
    return buy_eth


def main():
    print("=" * 60)
    print("  CLAWCLICK GRADUATION TEST — ETH Sepolia")
    print("=" * 60)
    print(f"  Funder  : {funder.address}")
    print(f"  Balance : {Web3.from_wei(w3.eth.get_balance(funder.address), 'ether'):.4f} ETH")
    print(f"  Router  : {ROUTER_ADDR}")
    print(f"  Hook    : {HOOK_ADDR}")
    print(f"  Token   : {TOKEN_ADDR}")
    print()

    # Generate 10 wallets from deterministic keys
    wallets = []
    for i in range(NUM_WALLETS):
        # Derive wallet from a seed + index
        pk = Web3.keccak(text=f"clawclick-test-wallet-{i}-sepolia-v2").hex()
        acct = Account.from_key(pk)
        wallets.append(acct)
        print(f"  Wallet {i}: {acct.address}")
    print()

    # Print initial state
    print_state("INITIAL STATE (post-activation)")

    # Fund wallets
    fund_wallets(wallets)

    # ─── Buy loop: rotate wallets until graduation ────────────────
    total_buys = 0
    total_eth_spent = 0
    last_epoch = -1
    graduated = False
    
    fees_before = get_fees()
    print(f"Fees before trading: {Web3.from_wei(fees_before['total_eth'], 'ether'):.6f} ETH")
    
    max_rounds = 200  # Safety cap
    wallet_idx = 0
    
    while not graduated and total_buys < max_rounds:
        epoch, tax, maxTx, maxW, graduated = get_state()
        
        if graduated:
            print(f"\n*** GRADUATED at buy #{total_buys}! ***")
            break
        
        if epoch != last_epoch:
            print(f"\n--- EPOCH {epoch} (tax={tax} bps) ---")
            print(f"  MaxTx     : {maxTx} ({Web3.from_wei(maxTx, 'ether'):.2f} tokens)")
            print(f"  MaxWallet : {maxW}")
            last_epoch = epoch
        
        # Calculate buy amount in ETH
        buy_eth = calculate_buy_amount(maxTx)
        
        wallet = wallets[wallet_idx % NUM_WALLETS]
        wallet_bal = w3.eth.get_balance(wallet.address)
        
        # Skip if wallet doesn't have enough ETH (need gas too)
        if wallet_bal < buy_eth + Web3.to_wei(0.01, "ether"):
            print(f"  Wallet {wallet_idx % NUM_WALLETS} ({wallet.address[:10]}...) low balance, skipping")
            wallet_idx += 1
            if wallet_idx >= NUM_WALLETS * 3:  # All wallets exhausted
                print("All wallets out of ETH!")
                break
            continue
        
        # Execute buy
        try:
            receipt = buy_with_wallet(wallet, buy_eth)
            gas_used = receipt["gasUsed"]
            status = "OK" if receipt["status"] == 1 else "REVERTED"
            
            token_bal = token.functions.balanceOf(wallet.address).call()
            
            print(f"  Buy #{total_buys}: wallet={wallet_idx % NUM_WALLETS} "
                  f"eth={Web3.from_wei(buy_eth, 'ether'):.6f} "
                  f"status={status} gas={gas_used} "
                  f"tokenBal={Web3.from_wei(token_bal, 'ether'):.2f}")
            
            if receipt["status"] == 1:
                total_buys += 1
                total_eth_spent += buy_eth
            else:
                print(f"    TX REVERTED — trying next wallet")
                
        except Exception as e:
            err = str(e)
            # Truncate long errors
            if len(err) > 120:
                err = err[:120] + "..."
            print(f"  Buy #{total_buys}: wallet={wallet_idx % NUM_WALLETS} EXCEPTION: {err}")
        
        wallet_idx += 1
        
        # Small delay to not spam RPC
        time.sleep(1)
    
    # ─── Post-graduation state ────────────────────────────────────
    fees_after_pregrad = get_fees()
    pre_grad_fees_eth = fees_after_pregrad["total_eth"] - fees_before["total_eth"]
    
    print(f"\n{'='*60}")
    print(f"  PRE-GRADUATION SUMMARY")
    print(f"{'='*60}")
    print(f"  Total buys       : {total_buys}")
    print(f"  Total ETH spent  : {Web3.from_wei(total_eth_spent, 'ether'):.6f}")
    print(f"  ETH fees earned  : {Web3.from_wei(pre_grad_fees_eth, 'ether'):.6f}")
    
    graduated = print_state("STATE AT GRADUATION")
    
    if not graduated:
        print("Did not graduate. Exiting.")
        return
    
    # ─── Post-graduation buys (should have 0 tax) ────────────────
    print("\n--- POST-GRADUATION BUYS (tax should be 0) ---")
    
    fees_pre_post = get_fees()
    
    # Do 3 post-graduation buys
    for i in range(3):
        wallet = wallets[i % NUM_WALLETS]
        buy_eth = Web3.to_wei(0.01, "ether")
        
        try:
            receipt = buy_with_wallet(wallet, buy_eth)
            status = "OK" if receipt["status"] == 1 else "REVERTED"
            print(f"  Post-grad buy #{i}: {status} gas={receipt['gasUsed']}")
        except Exception as e:
            print(f"  Post-grad buy #{i}: EXCEPTION: {str(e)[:80]}")
        
        time.sleep(1)
    
    fees_post = get_fees()
    post_grad_fees = fees_post["total_eth"] - fees_pre_post["total_eth"]
    
    print(f"\n{'='*60}")
    print(f"  FINAL SUMMARY")
    print(f"{'='*60}")
    print(f"  Pre-grad ETH fees  : {Web3.from_wei(pre_grad_fees_eth, 'ether'):.6f}")
    print(f"  Post-grad ETH fees : {Web3.from_wei(post_grad_fees, 'ether'):.6f} (should be 0)")
    print(f"  Total ETH fees     : {Web3.from_wei(fees_post['total_eth'], 'ether'):.6f}")
    print(f"  Beneficiary ETH    : {Web3.from_wei(fees_post['beneficiary_eth'], 'ether'):.6f}")
    print(f"  Platform ETH       : {Web3.from_wei(fees_post['platform_eth'], 'ether'):.6f}")
    print(f"  Beneficiary Tok    : {fees_post['beneficiary_tok']}")
    print(f"  Platform Tok       : {fees_post['platform_tok']}")
    
    # Wallet balances
    print(f"\n  --- Wallet Token Balances ---")
    for i, w in enumerate(wallets):
        bal = token.functions.balanceOf(w.address).call()
        eth = w3.eth.get_balance(w.address)
        if bal > 0 or eth > 10**15:
            print(f"  Wallet {i}: {Web3.from_wei(bal, 'ether'):.2f} tokens, {Web3.from_wei(eth, 'ether'):.4f} ETH")
    
    print(f"\n  Funder balance: {Web3.from_wei(w3.eth.get_balance(funder.address), 'ether'):.4f} ETH")
    print(f"{'='*60}")


if __name__ == "__main__":
    main()
