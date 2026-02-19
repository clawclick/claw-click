#!/usr/bin/env python3
"""
Clawclick Graduation Test — ETH Sepolia (PIPELINED)
===================================================
Faster version: does NOT wait for each tx receipt.
- Fire-and-forget sends
- Tracks pending txs per wallet (at most 1 pending per wallet to avoid nonce gaps)
- Polls receipts in the background and updates totals / balances when mined
- Drains pending txs before final summaries so balances/fees are correct

Usage:
    cd /Users/zcsmacpro/VscProjects/claw-click
    python3 scripts/buy_to_graduation.py
"""

import time
from collections import deque
from web3 import Web3
from eth_account import Account

# ─── Config ───────────────────────────────────────────────────────────────
RPC_URL        = "https://ethereum-sepolia-rpc.publicnode.com"
FUNDER_PK      = "0x1f25b7e48ab70078f5b05ad4b214240f0caa8642a741f72a22c8732492c5a509"
NUM_WALLETS    = 50
FUND_AMOUNT    = Web3.to_wei(0.15, "ether")

HOOK_ADDR      = "0xb170D92e87527d7eDD861B960Fbb8F5E20fB2Ac8"
FACTORY_ADDR   = "0x31489435Dac5789FE98f2843044dF83eF1643757"
ROUTER_ADDR    = "0xd7A33b9d611BE5FBd8d6C547e04784b850B96C13"
TOKEN_ADDR     = "0x086a0f6D37719906bAd0D5721a997142EF9C9863"
POOL_MANAGER   = "0xE03A1074c86CFeDd5C142C4F04F1a1536e203543"
POOL_ID        = bytes.fromhex("05a2248473e067ce7c06a0c11de9af3b6f3c0137883e5435cb5d479f626fb12b")

POOL_KEY = (
    "0x0000000000000000000000000000000000000000",
    TOKEN_ADDR,
    0x800000,
    200,
    HOOK_ADDR,
)

TOTAL_SUPPLY     = 10**27
BPS              = 10000
BASE_LIMIT_BPS   = 10
START_MCAP_WEI   = 10**18
GRADUATION_EPOCH = 4

# Pipelining knobs
PIPELINE_DEPTH   = 30      # max pending buy txs globally
POLL_INTERVAL    = 0.75    # seconds between receipt polls
RECEIPT_BATCH    = 120     # max pending receipts to check per poll tick
MAX_PENDING_AGE  = 180     # seconds; consider replacement if older (optional)

# ─── ABIs ────────────────────────────────────────────────────────────────
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

class NonceBook:
    """Local nonce cache to avoid RPC getTransactionCount on every send."""
    def __init__(self):
        self._nonces = {}

    def init(self, addr: str):
        addr = Web3.to_checksum_address(addr)
        if addr not in self._nonces:
            self._nonces[addr] = w3.eth.get_transaction_count(addr, "pending")
        return self._nonces[addr]

    def next(self, addr: str) -> int:
        addr = Web3.to_checksum_address(addr)
        if addr not in self._nonces:
            self.init(addr)
        n = self._nonces[addr]
        self._nonces[addr] += 1
        return n

nonce_book = NonceBook()

def gas_price(mult=1.2) -> int:
    return int(w3.eth.gas_price * mult)

def get_fees():
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
    epoch = hook.functions.getCurrentEpoch(POOL_ID).call()
    tax = hook.functions.getCurrentTax(POOL_ID).call()
    maxTx, maxW = hook.functions.getCurrentLimits(POOL_ID).call()
    grad = hook.functions.isGraduated(POOL_ID).call()
    return epoch, tax, maxTx, maxW, grad

def estimate_mcap_wei(maxTx_tokens):
    limit_bps = (maxTx_tokens * BPS) // TOTAL_SUPPLY
    if limit_bps < BASE_LIMIT_BPS:
        limit_bps = BASE_LIMIT_BPS
    growth_ratio = limit_bps * BPS // BASE_LIMIT_BPS
    return START_MCAP_WEI * growth_ratio // BPS

def tokens_to_eth(token_amount, maxTx_tokens):
    mcap = estimate_mcap_wei(maxTx_tokens)
    return token_amount * mcap // TOTAL_SUPPLY

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

def sign_and_send(acct, tx: dict):
    signed = acct.sign_transaction(tx)
    return w3.eth.send_raw_transaction(signed.raw_transaction)

def send_value_tx_no_wait(acct, to, value=0, gas=21_000):
    nonce = nonce_book.next(acct.address)
    tx = {
        "to": Web3.to_checksum_address(to),
        "value": value,
        "gas": gas,
        "gasPrice": gas_price(1.2),
        "nonce": nonce,
        "chainId": 11155111,
    }
    return sign_and_send(acct, tx)

def buy_with_wallet_no_wait(wallet, eth_amount):
    # v7-compatible ABI encoding
    data = router.encode_abi(
        fn_name="buy",
        args=[POOL_KEY, eth_amount]
    )

    nonce = nonce_book.next(wallet.address)

    tx = {
        "to": Web3.to_checksum_address(ROUTER_ADDR),
        "from": Web3.to_checksum_address(wallet.address),
        "value": eth_amount,
        "data": data,
        "gas": 800_000,
        "gasPrice": gas_price(1.2),
        "nonce": nonce,
        "chainId": 11155111,
    }

    return sign_and_send(wallet, tx)
    # Build tx, but set nonce/gas ourselves (faster + avoids extra RPC inside build_transaction)
    data = router.encodeABI(fn_name="buy", args=[POOL_KEY, eth_amount])
    nonce = nonce_book.next(wallet.address)
    tx = {
        "to": Web3.to_checksum_address(ROUTER_ADDR),
        "from": Web3.to_checksum_address(wallet.address),
        "value": eth_amount,
        "data": data,
        "gas": 800_000,
        "gasPrice": gas_price(1.2),
        "nonce": nonce,
        "chainId": 11155111,
    }
    return sign_and_send(wallet, tx)

def calculate_buy_amount(wallet_address, maxTx_tokens, maxWallet_tokens):
    current_balance = token.functions.balanceOf(wallet_address).call()
    remaining_room = maxWallet_tokens - current_balance if maxWallet_tokens > current_balance else 0
    if remaining_room == 0:
        return 0

    buy_tokens = min(maxTx_tokens, remaining_room)
    if buy_tokens < maxTx_tokens // 20:
        return 0

    eth_value = tokens_to_eth(buy_tokens, maxTx_tokens)
    buy_eth = eth_value * 60 // 100

    MIN_BUY = 5 * 10**13
    if buy_eth < MIN_BUY:
        buy_eth = MIN_BUY
    return buy_eth

def poll_receipts(pending_by_hash: dict, pending_queue: deque, mined_out: list):
    """
    Checks a bounded number of pending txs for receipts.
    pending_by_hash[txh] = meta dict
    pending_queue contains tx hashes to round-robin check
    mined_out collects mined metas (receipt attached)
    """
    checks = 0
    n = len(pending_queue)
    for _ in range(min(n, RECEIPT_BATCH)):
        txh = pending_queue.popleft()
        meta = pending_by_hash.get(txh)
        if meta is None:
            continue
        try:
            rcpt = w3.eth.get_transaction_receipt(txh)
            meta["receipt"] = rcpt
            mined_out.append(meta)
            del pending_by_hash[txh]
        except Exception:
            # still pending; requeue
            pending_queue.append(txh)
        checks += 1
    return checks

def drain_pending(pending_by_hash: dict, pending_queue: deque, timeout_s=180):
    start = time.time()
    mined = []
    while pending_by_hash and (time.time() - start) < timeout_s:
        poll_receipts(pending_by_hash, pending_queue, mined)
        if pending_by_hash:
            time.sleep(POLL_INTERVAL)
    return mined

# ─── Main ─────────────────────────────────────────────────────────────────

def main():
    print("=" * 60)
    print("  CLAWCLICK GRADUATION TEST — ETH Sepolia (PIPELINED)")
    print("=" * 60)
    print(f"  Funder  : {funder.address}")
    print(f"  Balance : {Web3.from_wei(w3.eth.get_balance(funder.address), 'ether'):.4f} ETH")
    print(f"  Router  : {ROUTER_ADDR}")
    print(f"  Hook    : {HOOK_ADDR}")
    print(f"  Token   : {TOKEN_ADDR}")
    print()

    # Generate wallets deterministically
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

    # Init nonce cache (pending) once
    nonce_book.init(funder.address)
    for w in wallets:
        nonce_book.init(w.address)

    print_state("INITIAL STATE")

    # ─── Funding (no receipt wait) ─────────────────────────────────────────
    print(f"\n--- Funding (no-wait) up to {NUM_WALLETS} wallets with {Web3.from_wei(FUND_AMOUNT, 'ether')} ETH each ---")
    fund_pending_by_hash = {}
    fund_pending_queue = deque()

    funded_sends = 0
    for i, w in enumerate(wallets):
        bal = w3.eth.get_balance(w.address)
        if bal >= FUND_AMOUNT // 2:
            if i < 10 or i == len(wallets) - 1:
                print(f"  Wallet {i}: {w.address[:10]}... already funded ({Web3.from_wei(bal, 'ether'):.4f} ETH)")
            continue
        try:
            txh = send_value_tx_no_wait(funder, w.address, value=FUND_AMOUNT, gas=21_000)
            fund_pending_by_hash[txh] = {"kind": "fund", "wid": i, "wallet": w, "sent": time.time(), "value": FUND_AMOUNT, "txh": txh}
            fund_pending_queue.append(txh)
            funded_sends += 1
            if funded_sends <= 10 or funded_sends % 10 == 0:
                print(f"  Wallet {i}: {w.address[:10]}... sent funding tx {txh.hex()[:10]}...")
        except Exception as e:
            print(f"  Wallet {i}: {w.address[:10]}... fund send error: {str(e)[:80]}")
        time.sleep(0.05)

    if fund_pending_by_hash:
        print(f"  Funding txs sent: {len(fund_pending_by_hash)} (polling until mined...)")
        mined = drain_pending(fund_pending_by_hash, fund_pending_queue, timeout_s=240)
        ok = sum(1 for m in mined if m["receipt"]["status"] == 1)
        fail = sum(1 for m in mined if m["receipt"]["status"] != 1)
        print(f"  Funding mined: OK={ok} FAIL={fail} still_pending={len(fund_pending_by_hash)}")
    else:
        print("  All wallets already funded (or none needed).")

    # ─── Buy loop (pipelined) ──────────────────────────────────────────────
    total_buys = 0
    total_eth_spent = 0

    fees_before = get_fees()
    print(f"\nFees before trading: {Web3.from_wei(fees_before['total_eth'], 'ether'):.6f} ETH")

    pending_by_hash = {}
    pending_queue = deque()
    pending_by_wallet = {}  # wid -> txh (at most 1 pending per wallet)

    last_epoch = -1
    graduated = False

    max_iterations = 30000
    iteration = 0
    wallet_idx = 0
    last_poll = 0.0

    while not graduated and iteration < max_iterations:
        iteration += 1

        # Poll receipts periodically (do not block on every iteration)
        now = time.time()
        mined = []
        if now - last_poll >= POLL_INTERVAL and pending_by_hash:
            poll_receipts(pending_by_hash, pending_queue, mined)
            last_poll = now

        # Process mined receipts: update stats, clear wallet pending flag, print mined outcomes
        for meta in mined:
            rcpt = meta["receipt"]
            wid = meta["wid"]
            txh = meta["txh"]
            if pending_by_wallet.get(wid) == txh:
                del pending_by_wallet[wid]

            status = "OK" if rcpt["status"] == 1 else "REVERTED"
            if meta["kind"] == "buy" and rcpt["status"] == 1:
                total_buys += 1
                total_eth_spent += meta["eth_amount"]

            # Balance check happens when mined (still fast; single call)
            if meta["kind"] == "buy":
                tok = token.functions.balanceOf(meta["wallet"].address).call()
                print(f"  Mined buy: w{wid:2d} {status} gas={rcpt['gasUsed']} tx={txh.hex()[:10]}... tokBal={Web3.from_wei(tok,'ether'):.2f}")

        # Re-query state occasionally (and when pipeline is light) to detect graduation
        if iteration % 25 == 0 or len(pending_by_hash) < 3:
            epoch, tax, maxTx, maxW, graduated = get_state()
            if epoch != last_epoch:
                print(f"\n{'─'*50}")
                print(f"  EPOCH {epoch} (tax={tax} bps)")
                mcap = estimate_mcap_wei(maxTx)
                print(f"  Est. MCAP   : {Web3.from_wei(mcap, 'ether'):.4f} ETH")
                print(f"  MaxTx       : {Web3.from_wei(maxTx, 'ether'):.2f} tokens")
                print(f"  MaxWallet   : {Web3.from_wei(maxW, 'ether'):.2f} tokens")
                print(f"{'─'*50}")
                last_epoch = epoch

            if graduated:
                print(f"\n*** GRADUATED (detected on-chain) after minedBuys={total_buys}, pending={len(pending_by_hash)} ***")
                break

        # Keep pipeline full
        if len(pending_by_hash) >= PIPELINE_DEPTH:
            time.sleep(0.05)
            continue

        # Choose next wallet
        wid = wallet_idx % NUM_WALLETS
        wallet = wallets[wid]
        wallet_idx += 1

        # Enforce 1 pending per wallet
        if wid in pending_by_wallet:
            continue

        # Need latest limits to size buys; refresh if not already defined in this loop
        try:
            epoch, tax, maxTx, maxW, graduated = get_state()
        except Exception:
            continue
        if graduated:
            print(f"\n*** GRADUATED (on send path) after minedBuys={total_buys}, pending={len(pending_by_hash)} ***")
            break

        buy_eth = calculate_buy_amount(wallet.address, maxTx, maxW)
        if buy_eth == 0:
            continue

        # Ensure wallet has ETH for buy + gas reserve
        wallet_bal = w3.eth.get_balance(wallet.address)
        gas_reserve = Web3.to_wei(0.005, "ether")
        if wallet_bal < buy_eth + gas_reserve:
            if wallet_bal > gas_reserve + 10**13:
                buy_eth = wallet_bal - gas_reserve
            else:
                continue

        # Send buy (no receipt wait)
        try:
            txh = buy_with_wallet_no_wait(wallet, buy_eth)
            pending_by_hash[txh] = {
                "kind": "buy",
                "wid": wid,
                "wallet": wallet,
                "sent": time.time(),
                "eth_amount": buy_eth,
                "txh": txh,
            }
            pending_queue.append(txh)
            pending_by_wallet[wid] = txh

            # Lightweight "sent" log (no balance yet)
            if (total_buys + len(pending_by_hash)) % 10 == 0:
                print(f"  Sent buys: mined={total_buys} pending={len(pending_by_hash)} (last: w{wid} {Web3.from_wei(buy_eth,'ether'):.6f} ETH tx={txh.hex()[:10]}...)")

        except Exception as e:
            # If send failed, roll back nonce cache for that wallet is non-trivial;
            # simplest is to re-init from pending nonce.
            nonce_book._nonces[Web3.to_checksum_address(wallet.address)] = w3.eth.get_transaction_count(wallet.address, "pending")
            print(f"  Send buy failed w{wid}: {str(e)[:100]}")

        time.sleep(0.02)

    # Drain remaining pending so summaries/balances are accurate
    if pending_by_hash:
        print(f"\n--- Draining pending txs ({len(pending_by_hash)}) for accurate summaries ---")
        mined = drain_pending(pending_by_hash, pending_queue, timeout_s=300)
        for meta in mined:
            rcpt = meta["receipt"]
            wid = meta["wid"]
            txh = meta["txh"]
            if pending_by_wallet.get(wid) == txh:
                del pending_by_wallet[wid]
            if meta["kind"] == "buy" and rcpt["status"] == 1:
                total_buys += 1
                total_eth_spent += meta["eth_amount"]
        print(f"  Pending remaining after drain: {len(pending_by_hash)}")

    # ─── Summary ──────────────────────────────────────────────────
    fees_after_pregrad = get_fees()
    pre_grad_fees_eth = fees_after_pregrad["total_eth"] - fees_before["total_eth"]

    print(f"\n{'='*60}")
    print(f"  PRE-GRADUATION SUMMARY")
    print(f"{'='*60}")
    print(f"  Total mined buys  : {total_buys}")
    print(f"  Total ETH spent   : {Web3.from_wei(total_eth_spent, 'ether'):.6f}")
    print(f"  ETH fees earned   : {Web3.from_wei(pre_grad_fees_eth, 'ether'):.6f}")

    graduated = print_state("STATE AT END")

    if not graduated:
        print("Did not graduate within iteration limit.")

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

    post_pending_by_hash = {}
    post_pending_queue = deque()

    for i in range(3):
        w = wallets[i % NUM_WALLETS]
        buy_eth = Web3.to_wei(0.001, "ether")
        try:
            txh = buy_with_wallet_no_wait(w, buy_eth)
            post_pending_by_hash[txh] = {"kind": "post", "wid": i, "wallet": w, "sent": time.time(), "eth_amount": buy_eth, "txh": txh}
            post_pending_queue.append(txh)
            print(f"  Sent post-grad buy #{i}: tx={txh.hex()[:10]}...")
        except Exception as e:
            nonce_book._nonces[Web3.to_checksum_address(w.address)] = w3.eth.get_transaction_count(w.address, "pending")
            print(f"  Post-grad send failed #{i}: {str(e)[:80]}")
        time.sleep(0.05)

    if post_pending_by_hash:
        mined = drain_pending(post_pending_by_hash, post_pending_queue, timeout_s=180)
        for m in mined:
            rcpt = m["receipt"]
            status = "OK" if rcpt["status"] == 1 else "REVERTED"
            print(f"  Mined post-grad: {status} gas={rcpt['gasUsed']} tx={m['txh'].hex()[:10]}...")

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
