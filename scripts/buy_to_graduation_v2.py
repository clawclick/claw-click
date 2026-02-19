#!/usr/bin/env python3
"""
Clawclick Graduation Test — ETH Sepolia
========================================
Rotates through wallets, sizing each buy to remaining maxWallet room.
Generates enough wallets to create sufficient buying pressure for graduation.
Tracks fees before / after graduation.

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
NUM_WALLETS    = 50          # More wallets = more buying capacity per epoch
FUND_AMOUNT    = Web3.to_wei(0.15, "ether")  # 0.15 ETH per wallet

# Deployed addresses from DeployAndActivate
HOOK_ADDR      = "0x1971e39Ba258Ad1507e31E0bac74b29037bDAaC8"
FACTORY_ADDR   = "0x39534bF4cF9363CC38F1c30086042faD855E27e3"
ROUTER_ADDR    = "0x88Bf059C2E305C03208d10427c273093815a968B"
TOKEN_ADDR     = "0xC15d38Cd6b679597937bf5e3509f57e9a1774304"
POOL_ID        = bytes.fromhex("af88924f3d6242493312575ca4a44a8fcc29a482640ff15af2089bf5632811b5")

# PoolKey tuple for router.buy()
POOL_KEY = (
    "0x0000000000000000000000000000000000000000",  # currency0 = ETH
    TOKEN_ADDR,                                      # currency1 = token
    0x800000,                                        # fee = dynamic
    200,                                             # tickSpacing
    HOOK_ADDR,                                       # hooks
)

# Constants matching the contract
TOTAL_SUPPLY     = 10**27       # 1 billion tokens (18 decimals)
BPS              = 10000
BASE_LIMIT_BPS   = 10           # 0.1%
START_MCAP_WEI   = 10**18       # 1 ETH
GRADUATION_EPOCH = 4            # 16x MCAP

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

BENEFICIARY = funder.address


# ─── Helpers ──────────────────────────────────────────────────────────────

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


def estimate_mcap_wei(maxTx_tokens):
    """Estimate current MCAP in wei from maxTx value."""
    limit_bps = (maxTx_tokens * BPS) // TOTAL_SUPPLY
    if limit_bps < BASE_LIMIT_BPS:
        limit_bps = BASE_LIMIT_BPS
    growth_ratio = limit_bps * BPS // BASE_LIMIT_BPS  # scaled by BPS
    mcap = START_MCAP_WEI * growth_ratio // BPS
    return mcap


def tokens_to_eth(token_amount, maxTx_tokens):
    """Convert a token amount to approximate ETH value at current price."""
    mcap = estimate_mcap_wei(maxTx_tokens)
    eth_value = token_amount * mcap // TOTAL_SUPPLY
    return eth_value


def print_state(label=""):
    epoch, tax, maxTx, maxW, grad = get_state()
    fees = get_fees()
    mcap = estimate_mcap_wei(maxTx)
    print(f"\n{'='*60}")
    print(f"  {label}")
    print(f"{'='*60}")
    print(f"  Epoch       : {epoch}")
    print(f"  Tax (bps)   : {tax}")
    print(f"  Est. MCAP   : {Web3.from_wei(mcap, 'ether'):.4f} ETH")
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
    gas_price = int(w3.eth.gas_price * 1.2)
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
    """Send FUND_AMOUNT ETH from funder to each wallet that needs it."""
    print(f"\n--- Funding {len(wallets)} wallets with {Web3.from_wei(FUND_AMOUNT, 'ether')} ETH each ---")
    funded = 0
    for i, wallet in enumerate(wallets):
        bal = w3.eth.get_balance(wallet.address)
        if bal >= FUND_AMOUNT // 2:
            if i < 10 or i == len(wallets) - 1:
                print(f"  Wallet {i}: {wallet.address[:10]}... already funded ({Web3.from_wei(bal, 'ether'):.4f} ETH)")
            continue
        try:
            receipt = send_tx(funder, wallet.address, value=FUND_AMOUNT, gas=21_000)
            status = "OK" if receipt["status"] == 1 else "FAIL"
            funded += 1
            if funded <= 10 or funded % 10 == 0:
                print(f"  Wallet {i}: {wallet.address[:10]}... funded {status}")
        except Exception as e:
            err = str(e)
            if "already known" in err or "nonce too low" in err:
                print(f"  Wallet {i}: {wallet.address[:10]}... tx pending/done, skipping")
                time.sleep(1)
            else:
                print(f"  Wallet {i}: {wallet.address[:10]}... fund error: {err[:60]}")
        time.sleep(0.3)
    if funded > 10:
        print(f"  ... funded {funded} wallets total")
    elif funded == 0:
        print(f"  All wallets already funded")
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


def calculate_buy_amount(wallet_address, maxTx_tokens, maxWallet_tokens):
    """
    Determine how much ETH this wallet should buy.
    Sizes based on remaining room under maxWallet to avoid ExceedsMaxWallet.
    Returns ETH in wei, or 0 if wallet should be skipped.
    """
    current_balance = token.functions.balanceOf(wallet_address).call()
    remaining_room = maxWallet_tokens - current_balance if maxWallet_tokens > current_balance else 0

    if remaining_room == 0:
        return 0

    # Can only buy min(maxTx, remaining_room) tokens in this tx
    buy_tokens = min(maxTx_tokens, remaining_room)

    # Skip if remaining room is < 5% of maxTx (not worth gas)
    if buy_tokens < maxTx_tokens // 20:
        return 0

    # Convert token amount to ETH value at estimated price
    eth_value = tokens_to_eth(buy_tokens, maxTx_tokens)

    # Safety margin: buy 60% of estimate to avoid overshooting
    # (tax takes a chunk, plus price impact in concentrated LP)
    buy_eth = eth_value * 60 // 100

    # Floor at reasonable minimum
    MIN_BUY = 5 * 10**13  # 0.00005 ETH
    if buy_eth < MIN_BUY:
        buy_eth = MIN_BUY

    return buy_eth


# ─── Main ─────────────────────────────────────────────────────────────────

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

    # Generate wallets from deterministic keys
    # First 10 reuse the old seed to preserve funded/token-holding wallets
    wallets = []
    for i in range(NUM_WALLETS):
        if i < 10:
            pk = Web3.keccak(text=f"clawclick-test-wallet-{i}-sepolia-v2").hex()
        else:
            pk = Web3.keccak(text=f"clawclick-test-wallet-{i}-sepolia-v3").hex()
        acct = Account.from_key(pk)
        wallets.append(acct)

    print(f"  Generated {NUM_WALLETS} wallets")
    for i in range(min(5, NUM_WALLETS)):
        print(f"    Wallet {i}: {wallets[i].address}")
    if NUM_WALLETS > 5:
        print(f"    ... and {NUM_WALLETS - 5} more")
    print()

    # Print initial state
    print_state("INITIAL STATE")

    # Fund wallets
    fund_wallets(wallets)

    # ─── Buy loop: rotate wallets until graduation ────────────────
    total_buys = 0
    total_eth_spent = 0
    last_epoch = -1
    graduated = False
    consecutive_skips = 0

    fees_before = get_fees()
    print(f"Fees before trading: {Web3.from_wei(fees_before['total_eth'], 'ether'):.6f} ETH")

    max_iterations = 2000
    iteration = 0
    wallet_idx = 0

    while not graduated and iteration < max_iterations:
        iteration += 1

        # Re-query state
        epoch, tax, maxTx, maxW, graduated = get_state()

        if graduated:
            print(f"\n*** GRADUATED at buy #{total_buys}! ***")
            break

        if epoch != last_epoch:
            print(f"\n{'─'*50}")
            print(f"  EPOCH {epoch} (tax={tax} bps)")
            mcap = estimate_mcap_wei(maxTx)
            print(f"  Est. MCAP   : {Web3.from_wei(mcap, 'ether'):.4f} ETH")
            print(f"  MaxTx       : {Web3.from_wei(maxTx, 'ether'):.2f} tokens")
            print(f"  MaxWallet   : {Web3.from_wei(maxW, 'ether'):.2f} tokens")
            print(f"{'─'*50}")
            last_epoch = epoch
            consecutive_skips = 0

        wallet = wallets[wallet_idx % NUM_WALLETS]
        wid = wallet_idx % NUM_WALLETS

        # Calculate buy amount considering remaining maxWallet room
        buy_eth = calculate_buy_amount(wallet.address, maxTx, maxW)

        if buy_eth == 0:
            consecutive_skips += 1
            wallet_idx += 1

            # If ALL wallets are full, we're stuck until epoch changes
            if consecutive_skips >= NUM_WALLETS:
                print(f"\n  All {NUM_WALLETS} wallets at maxWallet limit.")

                # Check if epoch changed (MCAP may have moved from accumulated buys)
                epoch2, _, maxTx2, maxW2, grad2 = get_state()
                if grad2:
                    graduated = True
                    break

                if epoch2 > epoch:
                    print(f"  Epoch advanced to {epoch2}! Continuing...")
                    consecutive_skips = 0
                    continue

                # Try tiny fills to squeeze remaining room
                print("  Attempting tiny fills for remaining room...")
                any_success = False
                for w_retry in range(NUM_WALLETS):
                    rw = wallets[w_retry]
                    rbal = token.functions.balanceOf(rw.address).call()
                    rroom = maxW - rbal if maxW > rbal else 0
                    if rroom > 0:
                        tiny_eth = tokens_to_eth(rroom, maxTx) * 40 // 100
                        if tiny_eth < 5 * 10**13:
                            tiny_eth = 5 * 10**13
                        wb = w3.eth.get_balance(rw.address)
                        if wb < tiny_eth + Web3.to_wei(0.005, "ether"):
                            continue
                        try:
                            receipt = buy_with_wallet(rw, tiny_eth)
                            if receipt["status"] == 1:
                                any_success = True
                                total_buys += 1
                                total_eth_spent += tiny_eth
                                nbal = token.functions.balanceOf(rw.address).call()
                                print(f"    Fill w{w_retry}: {Web3.from_wei(tiny_eth,'ether'):.6f} ETH → {Web3.from_wei(nbal,'ether'):.2f} tokens")
                            time.sleep(0.5)
                        except:
                            pass

                if not any_success:
                    print("  Cannot buy more with current wallets. Stopping.")
                    break

                # Reset and try again after tiny fills
                consecutive_skips = 0
            continue

        # Check wallet ETH balance
        wallet_bal = w3.eth.get_balance(wallet.address)
        gas_reserve = Web3.to_wei(0.005, "ether")
        if wallet_bal < buy_eth + gas_reserve:
            if wallet_bal > gas_reserve + 10**13:
                buy_eth = wallet_bal - gas_reserve
            else:
                consecutive_skips += 1
                wallet_idx += 1
                continue

        consecutive_skips = 0

        # Execute buy
        try:
                        # token_bal = token.functions.balanceOf(wallet.address).call()

            receipt = buy_with_wallet(wallet, buy_eth)
            gas_used = receipt["gasUsed"]
            status = "OK" if receipt["status"] == 1 else "REVERTED"

            token_bal = token.functions.balanceOf(wallet.address).call()

            print(f"  Buy #{total_buys:3d}: w{wid:2d} "
                  f"eth={Web3.from_wei(buy_eth, 'ether'):.6f} "
                  f"{status} gas={gas_used} "
                  f"tokBal={Web3.from_wei(token_bal, 'ether'):.2f}")

            if receipt["status"] == 1:
                total_buys += 1
                total_eth_spent += buy_eth
            else:
                # Reverted — try with smaller amount
                fallback_eth = buy_eth * 30 // 100
                if fallback_eth >= 5 * 10**13:
                    print(f"    Retrying w{wid} with {Web3.from_wei(fallback_eth,'ether'):.6f} ETH...")
                    try:
                        receipt2 = buy_with_wallet(wallet, fallback_eth)
                        if receipt2["status"] == 1:
                            total_buys += 1
                            total_eth_spent += fallback_eth
                            nbal = token.functions.balanceOf(wallet.address).call()
                            print(f"    Retry OK: tokBal={Web3.from_wei(nbal,'ether'):.2f}")
                    except Exception as e2:
                        print(f"    Retry also failed: {str(e2)[:60]}")

        except Exception as e:
            err = str(e)
            if len(err) > 100:
                err = err[:100] + "..."
            print(f"  Buy #{total_buys}: w{wid} EXCEPTION: {err}")

        wallet_idx += 1
        time.sleep(0.8)

    # ─── Summary ──────────────────────────────────────────────────
    fees_after_pregrad = get_fees()
    pre_grad_fees_eth = fees_after_pregrad["total_eth"] - fees_before["total_eth"]

    print(f"\n{'='*60}")
    print(f"  PRE-GRADUATION SUMMARY")
    print(f"{'='*60}")
    print(f"  Total buys       : {total_buys}")
    print(f"  Total ETH spent  : {Web3.from_wei(total_eth_spent, 'ether'):.6f}")
    print(f"  ETH fees earned  : {Web3.from_wei(pre_grad_fees_eth, 'ether'):.6f}")

    graduated = print_state("STATE AT END")

    if not graduated:
        print("Did not graduate within iteration limit.")

        # Print wallet summary
        print(f"\n  --- Wallet Summary ---")
        total_tokens = 0
        for i, w in enumerate(wallets):
            bal = token.functions.balanceOf(w.address).call()
            total_tokens += bal
            if bal > 0 and i < 15:
                eth = w3.eth.get_balance(w.address)
                print(f"  Wallet {i:2d}: {Web3.from_wei(bal, 'ether'):12.2f} tokens, {Web3.from_wei(eth, 'ether'):.4f} ETH")
        if any(token.functions.balanceOf(wallets[i].address).call() > 0 for i in range(15, NUM_WALLETS)):
            print(f"  ... more wallets have tokens")
        print(f"  Total tokens held : {Web3.from_wei(total_tokens, 'ether'):.2f}")
        print(f"  That's {total_tokens * 100 // TOTAL_SUPPLY}% of supply")
        return

    # ─── Post-graduation buys (should have 0 tax) ────────────────
    print("\n--- POST-GRADUATION BUYS (tax should be 0) ---")

    fees_pre_post = get_fees()

    for i in range(3):
        wallet = wallets[i % NUM_WALLETS]
        buy_eth = Web3.to_wei(0.001, "ether")

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
            print(f"  Wallet {i:2d}: {Web3.from_wei(bal, 'ether'):12.2f} tokens, {Web3.from_wei(eth, 'ether'):.4f} ETH")

    print(f"\n  Funder balance: {Web3.from_wei(w3.eth.get_balance(funder.address), 'ether'):.4f} ETH")
    print(f"{'='*60}")


if __name__ == "__main__":
    main()
