#!/usr/bin/env python3
"""
Clawclick Graduation Test — GRADSB2 — ETH Sepolia
===================================================
v2/v3 wallets, blocking 0.001 ETH buys, slow and steady till graduation.
maxTx/maxWallet disabled. 1 ETH target MCAP, 0.01 ETH activation.

Usage:
    cd /Users/zcsmacpro/VscProjects/claw-click
    python3 scripts/buy_to_graduation.py
"""

import time
import sys
import threading
from web3 import Web3
from eth_account import Account

# ─── Mode selection ───────────────────────────────────────────────────────
SLOW_MODE = "--slow" in sys.argv  # blocking 1-by-1 buys
# Usage: python3 scripts/buy_to_graduation.py --slow

# ─── Config ───────────────────────────────────────────────────────────────
RPC_URL        = "https://ethereum-sepolia-rpc.publicnode.com"
FUNDER_PK      = "0x1f25b7e48ab70078f5b05ad4b214240f0caa8642a741f72a22c8732492c5a509"
NUM_WALLETS    = 50
FUND_AMOUNT    = Web3.to_wei(0.05, "ether")   # small — 0.01 ETH activation

# ─── Fresh deploy (DeployAndActivate, 1 ETH activation) ───
HOOK_ADDR      = "0x7d8F6Dc04F3F9FbF12BEEc6A33713768F1F7eac8"
FACTORY_ADDR   = "0xbb95ff721F645e386a094605A73D78e8CF334d32"
ROUTER_ADDR    = "0xAEf33Ed49f3aa308F8698AcB5cD01166Ae7fE62c"
TOKEN_ADDR     = "0x12Dc0b779fD060D0fd38fCc6a52A5B614Cf0D652"
POOL_ID        = bytes.fromhex("6b28a2d1b5b2fd7f47017be96d9c665abe8c2c632b46e336eed7e3a3ea2e33c7")

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
START_MCAP_WEI   = int(1 * 10**18)    # targetMcap = 1 ETH
BUY_ETH_AMOUNT   = Web3.to_wei(0.005, "ether")  # small buys to avoid blowing past epochs

# ─── ABIs ─────────────────────────────────────────────────────────────────
ROUTER_ABI = [{"type":"function","name":"buy","inputs":[{"name":"key","type":"tuple","components":[{"name":"currency0","type":"address"},{"name":"currency1","type":"address"},{"name":"fee","type":"uint24"},{"name":"tickSpacing","type":"int24"},{"name":"hooks","type":"address"}]},{"name":"ethAmount","type":"uint256"}],"outputs":[{"name":"delta","type":"int256"}],"stateMutability":"payable"}]
HOOK_ABI = [
    {"type":"function","name":"getCurrentEpoch","inputs":[{"name":"poolId","type":"bytes32"}],"outputs":[{"name":"epoch","type":"uint256"}],"stateMutability":"view"},
    {"type":"function","name":"getCurrentLimits","inputs":[{"name":"poolId","type":"bytes32"}],"outputs":[{"name":"maxTx","type":"uint256"},{"name":"maxWallet","type":"uint256"}],"stateMutability":"view"},
    {"type":"function","name":"getCurrentTax","inputs":[{"name":"poolId","type":"bytes32"}],"outputs":[{"name":"taxBps","type":"uint256"}],"stateMutability":"view"},
    {"type":"function","name":"isGraduated","inputs":[{"name":"poolId","type":"bytes32"}],"outputs":[{"name":"graduated","type":"bool"}],"stateMutability":"view"},
    {"type":"function","name":"beneficiaryFeesETH","inputs":[{"name":"","type":"address"}],"outputs":[{"name":"","type":"uint256"}],"stateMutability":"view"},
    {"type":"function","name":"platformFeesETH","inputs":[],"outputs":[{"name":"","type":"uint256"}],"stateMutability":"view"},
    {"type":"function","name":"beneficiaryFeesToken","inputs":[{"name":"","type":"address"},{"name":"","type":"address"}],"outputs":[{"name":"","type":"uint256"}],"stateMutability":"view"},
    {"type":"function","name":"platformFeesToken","inputs":[{"name":"","type":"address"}],"outputs":[{"name":"","type":"uint256"}],"stateMutability":"view"},
]
ERC20_ABI = [{"type":"function","name":"balanceOf","inputs":[{"name":"account","type":"address"}],"outputs":[{"name":"","type":"uint256"}],"stateMutability":"view"}]
FACTORY_ABI = [
    {"type":"function","name":"repositionByEpoch","inputs":[{"name":"key","type":"tuple","components":[{"name":"currency0","type":"address"},{"name":"currency1","type":"address"},{"name":"fee","type":"uint24"},{"name":"tickSpacing","type":"int24"},{"name":"hooks","type":"address"}]}],"outputs":[],"stateMutability":"nonpayable"},
    {"type":"function","name":"lastRepositionedEpoch","inputs":[{"name":"","type":"bytes32"}],"outputs":[{"name":"","type":"uint256"}],"stateMutability":"view"},
    {"type":"function","name":"needsReposition","inputs":[{"name":"","type":"bytes32"}],"outputs":[{"name":"needed","type":"bool"},{"name":"currentEpoch","type":"uint256"},{"name":"lastEpoch","type":"uint256"}],"stateMutability":"view"},
]

# ─── Setup ────────────────────────────────────────────────────────────────
w3 = Web3(Web3.HTTPProvider(RPC_URL))
assert w3.is_connected(), "Cannot connect to RPC"

funder = Account.from_key(FUNDER_PK)
router  = w3.eth.contract(address=Web3.to_checksum_address(ROUTER_ADDR), abi=ROUTER_ABI)
hook    = w3.eth.contract(address=Web3.to_checksum_address(HOOK_ADDR), abi=HOOK_ABI)
token   = w3.eth.contract(address=Web3.to_checksum_address(TOKEN_ADDR), abi=ERC20_ABI)
factory = w3.eth.contract(address=Web3.to_checksum_address(FACTORY_ADDR), abi=FACTORY_ABI)
BENEFICIARY = funder.address
KEEPER_STOP_EVENT = threading.Event()


# ─── Helpers ──────────────────────────────────────────────────────────────

def do_reposition():
    """Call Factory.repositionByEpoch() when Factory reports tick-proximity need."""
    needed, cur_ep, last_ep = factory.functions.needsReposition(POOL_ID).call()
    if not needed:
        return False
    print(f"  >>> REPOSITIONING (tick near edge) [epoch={cur_ep}, lastRepo={last_ep}] ...")
    try:
        tx_data = factory.functions.repositionByEpoch(POOL_KEY).build_transaction({
            "from": funder.address,
            "gas": 1_000_000,
            "gasPrice": int(w3.eth.gas_price * 1.2),
            "nonce": w3.eth.get_transaction_count(funder.address),
            "chainId": 11155111,
        })
        signed = funder.sign_transaction(tx_data)
        tx_hash = w3.eth.send_raw_transaction(signed.raw_transaction)
        receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)
        if receipt["status"] == 1:
            print(f"  >>> REPOSITION OK  gas={receipt['gasUsed']}")
            return True
        else:
            print(f"  >>> REPOSITION REVERTED")
            return False
    except Exception as e:
        print(f"  >>> REPOSITION FAILED: {str(e)[:100]}")
        return False


def reposition_keeper_loop(poll_seconds=0.75):
    """Background keeper: continuously checks tick-proximity and repositions automatically."""
    while not KEEPER_STOP_EVENT.is_set():
        try:
            do_reposition()
        except Exception as e:
            print(f"  >>> KEEPER ERROR: {str(e)[:100]}")
        KEEPER_STOP_EVENT.wait(poll_seconds)


def is_reposition_needed():
    """Cheap view check used to throttle buys near LP range edges."""
    try:
        needed, _, _ = factory.functions.needsReposition(POOL_ID).call()
        return needed
    except Exception:
        return False

def get_fees():
    b_eth = hook.functions.beneficiaryFeesETH(BENEFICIARY).call()
    p_eth = hook.functions.platformFeesETH().call()
    b_tok = hook.functions.beneficiaryFeesToken(BENEFICIARY, TOKEN_ADDR).call()
    p_tok = hook.functions.platformFeesToken(TOKEN_ADDR).call()
    return {"beneficiary_eth": b_eth, "platform_eth": p_eth,
            "beneficiary_tok": b_tok, "platform_tok": p_tok,
            "total_eth": b_eth + p_eth, "total_tok": b_tok + p_tok}

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
    print(f"  Est. MCAP   : {Web3.from_wei(mcap, 'ether'):.6f} ETH")
    print(f"  MaxTx       : {Web3.from_wei(maxTx, 'ether'):.2f} tokens")
    print(f"  MaxWallet   : {Web3.from_wei(maxW, 'ether'):.2f} tokens")
    print(f"  Graduated   : {grad}")
    print(f"  Fees ETH    : ben={Web3.from_wei(fees['beneficiary_eth'],'ether'):.6f} plat={Web3.from_wei(fees['platform_eth'],'ether'):.6f}")
    print(f"{'='*60}\n")
    return grad

def send_tx(acct, to, value=0, data=b"", gas=500_000, nonce=None):
    if nonce is None:
        nonce = w3.eth.get_transaction_count(acct.address)
    tx = {"to": to, "value": value, "gas": gas,
          "gasPrice": int(w3.eth.gas_price * 1.2),
          "nonce": nonce, "chainId": 11155111, "data": data}
    signed = acct.sign_transaction(tx)
    tx_hash = w3.eth.send_raw_transaction(signed.raw_transaction)
    # return tx_hash
    # return w3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)

def fund_wallets(wallets):
    """Fund wallets from funder. Uses fire-and-forget for speed."""
    print(f"\n--- Funding {len(wallets)} wallets with {Web3.from_wei(FUND_AMOUNT, 'ether')} ETH each ---")
    need_funding = []
    for i, w in enumerate(wallets):
        bal = w3.eth.get_balance(w.address)
        print(f"  w{i}: balance={Web3.from_wei(bal,'ether'):.4f} ETH", end="")
        if bal < FUND_AMOUNT // 2:
            need_funding.append((i, w))
        elif i < 5:
            print(f"  w{i}: already {Web3.from_wei(bal,'ether'):.4f} ETH")

    if not need_funding:
        print("  All wallets already funded")
        return

    funder_bal = w3.eth.get_balance(funder.address)
    total_needed = len(need_funding) * FUND_AMOUNT
    print(f"  Need to fund {len(need_funding)} wallets, total={Web3.from_wei(total_needed,'ether'):.4f} ETH")
    print(f"  Funder balance: {Web3.from_wei(funder_bal,'ether'):.4f} ETH")

    if funder_bal < total_needed + Web3.to_wei(0.01, "ether"):
        # Try to pull ETH from old funded wallets (v2/v3 seeds)
        print("  Funder low — pulling ETH from old wallets...")
        for seed_ver in ["v2", "v3"]:
            for j in range(50):
                old_pk = Web3.keccak(text=f"clawclick-test-wallet-{j}-sepolia-{seed_ver}").hex()
                old_acct = Account.from_key(old_pk)
                old_bal = w3.eth.get_balance(old_acct.address)
                if old_bal > Web3.to_wei(0.01, "ether"):
                    send_amt = old_bal - Web3.to_wei(0.002, "ether")
                    try:
                        send_tx(old_acct, funder.address, value=send_amt, gas=21_000)
                        print(f"    Pulled {Web3.from_wei(send_amt,'ether'):.4f} from old w{j}-{seed_ver}")
                    except:
                        pass
        funder_bal = w3.eth.get_balance(funder.address)
        print(f"  Funder balance after pull: {Web3.from_wei(funder_bal,'ether'):.4f} ETH")

    funded = 0
    nonce = w3.eth.get_transaction_count(funder.address)
    for i, w in need_funding:
        try:
            send_tx(funder, w.address, value=FUND_AMOUNT, gas=21_000, nonce=nonce)
            nonce += 1
            time.sleep(0.2)  # small delay to avoid overwhelming the RPC
            funded += 1
            if funded <= 10 or funded % 10 == 0:
                print(f"  w{i} funded")
        except Exception as e:
            err = str(e)
            if "already known" in err or "nonce too low" in err:
                time.sleep(1)
            else:
                print(f"  w{i} fund error: {err[:60]}")
        time.sleep(0.2)
    print(f"  Funded {funded} wallets\n")

def send_buy(wallet, eth_amount):
    """Fire-and-forget buy. Returns tx_hash (no receipt wait)."""
    tx_data = router.functions.buy(POOL_KEY, eth_amount).build_transaction({
        "from": wallet.address,
        "value": eth_amount,
        "gas": 500_000,
        "gasPrice": int(w3.eth.gas_price * 1.2),
        "nonce": w3.eth.get_transaction_count(wallet.address),
        "chainId": 11155111,
    })
    signed = wallet.sign_transaction(tx_data)
    return w3.eth.send_raw_transaction(signed.raw_transaction)

def buy_with_wallet(wallet, eth_amount):
    """Blocking buy (for post-graduation test)."""
    tx_data = router.functions.buy(POOL_KEY, eth_amount).build_transaction({
        "from": wallet.address, "value": eth_amount, "gas": 500_000,
        "gasPrice": int(w3.eth.gas_price * 1.2),
        "nonce": w3.eth.get_transaction_count(wallet.address),
        "chainId": 11155111,
    })
    signed = wallet.sign_transaction(tx_data)
    tx_hash = w3.eth.send_raw_transaction(signed.raw_transaction)
    return w3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)

def calculate_buy_amount(wallet_address, maxTx_tokens, maxWallet_tokens, tax_bps):
    """
    Size buy to fill maxTx in ONE shot, accounting for tax.
    Checks current token balance to avoid exceeding maxWallet.
    """
    current_balance = token.functions.balanceOf(wallet_address).call()
    remaining_room = maxWallet_tokens - current_balance if maxWallet_tokens > current_balance else 0
    if remaining_room == 0:
        return 0

    target_tokens = min(maxTx_tokens, remaining_room)
    if target_tokens < maxTx_tokens // 10:
        return 0

    # Gross tokens needed pre-tax: gross * (1 - tax%) = target
    effective_tax = min(tax_bps, 9900)
    gross_tokens = target_tokens * BPS // (BPS - effective_tax)

    # Convert to ETH + 20% buffer for price impact
    eth_value = tokens_to_eth(gross_tokens, maxTx_tokens)
    buy_eth = eth_value * 120 // 100

    MIN_BUY = 10**13  # 0.00001 ETH
    return max(buy_eth, MIN_BUY)


# ─── Main ─────────────────────────────────────────────────────────────────

def main():
    print("=" * 60)
    print("  CLAWCLICK GRADSB2 — 0.001 ETH buys — slow graduation")
    print("=" * 60)
    print(f"  Funder  : {funder.address}")
    print(f"  Balance : {Web3.from_wei(w3.eth.get_balance(funder.address), 'ether'):.4f} ETH")
    print(f"  Token   : {TOKEN_ADDR}")
    print()

    # Fresh wallets (v4 seed — no old token balances)
    # wallets = []
    # for i in range(NUM_WALLETS):
    #     pk = Web3.keccak(text=f"clawclick-test-wallet-{i}-sepolia-v4").hex()
    #     wallets.append(Account.from_key(pk))

    # print(f"  {NUM_WALLETS} fresh wallets (v4 seed)")
    # for i in range(3):
    #     print(f"    w{i}: {wallets[i].address}")
    # print()


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

    print_state("INITIAL STATE")
    # fund_wallets(wallets)

    print("  Starting background reposition keeper (tick-proximity based)...")
    keeper_thread = threading.Thread(target=reposition_keeper_loop, kwargs={"poll_seconds": 0.75}, daemon=True)
    keeper_thread.start()


    try:
        if SLOW_MODE:
            # ─── SLOW MODE: Blocking sequential buys ─────────────────
            print("  *** SLOW MODE: blocking 0.001 ETH buys, one at a time ***\n")
            total_buys = 0
            total_eth_spent = 0
            last_epoch = -1

            fees_before = get_fees()
            print(f"Fees before: {Web3.from_wei(fees_before['total_eth'], 'ether'):.6f} ETH\n")

            for iteration in range(5000):
                epoch, tax, maxTx, maxW, graduated = get_state()

                if graduated:
                    print(f"\n*** GRADUATED after {total_buys} buys! ***")
                    break

                if epoch != last_epoch:
                    mcap = estimate_mcap_wei(maxTx)
                    print(f"\n{'─'*50}")
                    print(f"  EPOCH {epoch} | tax={tax}bps | MCAP≈{Web3.from_wei(mcap,'ether'):.4f} ETH")
                    print(f"  buys={total_buys} | eth_spent={Web3.from_wei(total_eth_spent,'ether'):.6f}")
                    print(f"{'─'*50}")
                    last_epoch = epoch

                wid = iteration % NUM_WALLETS
                wallet = wallets[wid]
                buy_eth = BUY_ETH_AMOUNT

                # Pause buys while keeper handles edge reposition
                if is_reposition_needed():
                    print("  >>> EDGE NEAR: pausing buys for keeper reposition...")
                    wait_start = time.time()
                    while is_reposition_needed() and (time.time() - wait_start) < 45:
                        time.sleep(0.75)
                    if is_reposition_needed():
                        print("  >>> EDGE STILL NEAR: skipping this iteration")
                        continue
                    print("  >>> REPOSITION CLEARED: resuming buys")

                # Check wallet balance
                wallet_bal = w3.eth.get_balance(wallet.address)
                gas_reserve = Web3.to_wei(0.003, "ether")
                if wallet_bal < buy_eth + gas_reserve:
                    if wallet_bal > gas_reserve + 10**13:
                        buy_eth = wallet_bal - gas_reserve
                    else:
                        continue

                try:
                    receipt = buy_with_wallet(wallet, buy_eth)
                    if receipt["status"] == 1:
                        total_buys += 1
                        total_eth_spent += buy_eth
                        if total_buys <= 30 or total_buys % 10 == 0:
                            print(f"  + w{wid:2d} OK  {Web3.from_wei(buy_eth,'ether'):.6f} ETH  gas={receipt['gasUsed']}")
                    else:
                        print(f"  x w{wid:2d} REVERTED  {Web3.from_wei(buy_eth,'ether'):.6f} ETH")
                except Exception as e:
                    print(f"  !! w{wid:2d} fail: {str(e)[:80]}")

                time.sleep(0.5)  # slow pace

            # Summary for slow mode
            fees_after = get_fees()
            pre_grad_fees = fees_after["total_eth"] - fees_before["total_eth"]

            print(f"\n{'='*60}")
            print(f"  SUMMARY (SLOW MODE)")
            print(f"{'='*60}")
            print(f"  Total buys       : {total_buys}")
            print(f"  ETH spent        : {Web3.from_wei(total_eth_spent, 'ether'):.6f}")
            print(f"  ETH fees earned  : {Web3.from_wei(pre_grad_fees, 'ether'):.6f}")

            graduated = print_state("FINAL STATE")

            if graduated:
                print("\n--- POST-GRADUATION (tax should be 0) ---")
                fees_pre_post = get_fees()
                for i in range(3):
                    try:
                        r = buy_with_wallet(wallets[i], Web3.to_wei(0.0005, "ether"))
                        print(f"  Post-grad #{i}: {'OK' if r['status']==1 else 'REVERTED'} gas={r['gasUsed']}")
                    except Exception as e:
                        print(f"  Post-grad #{i}: {str(e)[:60]}")
                    time.sleep(1)
                fees_post = get_fees()
                post_fees = fees_post["total_eth"] - fees_pre_post["total_eth"]
                print(f"\n  Pre-grad fees  : {Web3.from_wei(pre_grad_fees,'ether'):.6f} ETH")
                print(f"  Post-grad fees : {Web3.from_wei(post_fees,'ether'):.6f} ETH (should be 0)")
                print(f"  Total fees     : {Web3.from_wei(fees_post['total_eth'],'ether'):.6f} ETH")
            return

        # ─── FAST MODE: Fire-and-forget buy loop ──────────────────────
        total_buys = 0
        total_eth_spent = 0
        total_sends = 0
        last_epoch = -1
        graduated = False
        consecutive_skips = 0
        pending = {}  # wid -> {"hash", "eth", "time"}

        def resolve_pending():
            nonlocal total_buys, total_eth_spent
            for wid_ in list(pending.keys()):
                info = pending[wid_]
                try:
                    receipt = w3.eth.get_transaction_receipt(info["hash"])
                    if receipt is not None:
                        if receipt["status"] == 1:
                            total_buys += 1
                            total_eth_spent += info["eth"]
                            print(f"  + w{wid_:2d} OK  {Web3.from_wei(info['eth'],'ether'):.6f} ETH  gas={receipt['gasUsed']}")
                        else:
                            print(f"  x w{wid_:2d} REVERTED  {Web3.from_wei(info['eth'],'ether'):.6f} ETH")
                        del pending[wid_]
                except Exception:
                    if time.time() - info["time"] > 120:
                        print(f"  ? w{wid_:2d} timed out")
                        del pending[wid_]

        fees_before = get_fees()
        print(f"Fees before: {Web3.from_wei(fees_before['total_eth'], 'ether'):.6f} ETH\n")

        wallet_idx = 0
        max_iterations = 5000

        for iteration in range(max_iterations):
            # Resolve pending every 5 iterations or when full
            if iteration % 5 == 0 or len(pending) >= NUM_WALLETS:
                resolve_pending()

            # Refresh state
            epoch, tax, maxTx, maxW, graduated = get_state()

            if graduated:
                resolve_pending()
                print(f"\n*** GRADUATED after {total_sends} sends, {total_buys} confirmed! ***")
                break

            if epoch != last_epoch:
            # Drain pending before announcing new epoch
                if pending:
                    time.sleep(3)
                    resolve_pending()
                epoch, tax, maxTx, maxW, graduated = get_state()
                if graduated:
                    print(f"\n*** GRADUATED! ***")
                    break
                mcap = estimate_mcap_wei(maxTx)
                print(f"\n{'─'*50}")
                print(f"  EPOCH {epoch} | tax={tax}bps | MCAP≈{Web3.from_wei(mcap,'ether'):.4f} ETH")
                print(f"  maxTx={Web3.from_wei(maxTx,'ether'):.2f} | maxW={Web3.from_wei(maxW,'ether'):.2f}")
                print(f"  buys={total_buys} | eth_spent={Web3.from_wei(total_eth_spent,'ether'):.6f}")
                print(f"{'─'*50}")
                last_epoch = epoch
                consecutive_skips = 0

            # Keep pending pressure lower so keeper can reposition before boundary exhaustion
            if len(pending) >= 4:
                time.sleep(0.5)
                resolve_pending()
                continue

            # Hard gate: stop adding fresh buy pressure while edge-reposition is needed
            if is_reposition_needed():
                print("  >>> EDGE NEAR: pausing new sends for keeper reposition...")
                wait_start = time.time()
                while is_reposition_needed() and (time.time() - wait_start) < 45:
                    resolve_pending()
                    time.sleep(0.75)
                if is_reposition_needed():
                    print("  >>> EDGE STILL NEAR: waiting another cycle")
                else:
                    print("  >>> REPOSITION CLEARED: resuming sends")
                continue

            wid = wallet_idx % NUM_WALLETS
            wallet = wallets[wid]

            # Skip if wallet has pending tx
            if wid in pending:
                try:
                    r = w3.eth.get_transaction_receipt(pending[wid]["hash"])
                    if r is not None:
                        if r["status"] == 1:
                            total_buys += 1
                            total_eth_spent += pending[wid]["eth"]
                        del pending[wid]
                    else:
                        wallet_idx += 1
                        consecutive_skips += 1
                        continue
                except:
                    wallet_idx += 1
                    consecutive_skips += 1
                    continue

            # Fixed 0.01 ETH buy (no maxTx/maxWallet limits)
            buy_eth = BUY_ETH_AMOUNT

            # Check wallet ETH balance
            wallet_bal = w3.eth.get_balance(wallet.address)
            gas_reserve = Web3.to_wei(0.003, "ether")
            if wallet_bal < buy_eth + gas_reserve:
                if wallet_bal > gas_reserve + 10**13:
                    buy_eth = wallet_bal - gas_reserve
                else:
                    consecutive_skips += 1
                    wallet_idx += 1
                    continue

            consecutive_skips = 0

            # Fire-and-forget
            try:
                tx_hash = send_buy(wallet, buy_eth)
                pending[wid] = {"hash": tx_hash, "eth": buy_eth, "time": time.time()}
                total_sends += 1
                if total_sends <= 30 or total_sends % 10 == 0:
                    print(f"  >> w{wid:2d} sent {Web3.from_wei(buy_eth,'ether'):.6f} ETH  (#{total_sends} pending={len(pending)})")
            except Exception as e:
                err = str(e)
                print(f"  !! w{wid:2d} fail: {err[:80]}")

            wallet_idx += 1
            time.sleep(0.1)  # minimal delay

        # Drain remaining
        if pending:
            print(f"\n  Draining {len(pending)} pending...")
            for _ in range(30):
                resolve_pending()
                if not pending:
                    break
                time.sleep(2)

        # ─── Summary ──────────────────────────────────────────────────
        fees_after = get_fees()
        pre_grad_fees = fees_after["total_eth"] - fees_before["total_eth"]

        print(f"\n{'='*60}")
        print(f"  SUMMARY")
        print(f"{'='*60}")
        print(f"  Total sends      : {total_sends}")
        print(f"  Confirmed buys   : {total_buys}")
        print(f"  ETH spent        : {Web3.from_wei(total_eth_spent, 'ether'):.6f}")
        print(f"  ETH fees earned  : {Web3.from_wei(pre_grad_fees, 'ether'):.6f}")

        graduated = print_state("FINAL STATE")

        if not graduated:
            print("Did not graduate.")
            total_tokens = 0
            for i, w in enumerate(wallets):
                bal = token.functions.balanceOf(w.address).call()
                total_tokens += bal
                if bal > 0 and i < 10:
                    print(f"  w{i:2d}: {Web3.from_wei(bal,'ether'):.2f} tokens")
            print(f"  Total tokens: {Web3.from_wei(total_tokens,'ether'):.2f} ({total_tokens*100//TOTAL_SUPPLY}% of supply)")
            return

        # Post-graduation buys
        print("\n--- POST-GRADUATION (tax should be 0) ---")
        fees_pre_post = get_fees()
        for i in range(3):
            try:
                r = buy_with_wallet(wallets[i], Web3.to_wei(0.0005, "ether"))
                print(f"  Post-grad #{i}: {'OK' if r['status']==1 else 'REVERTED'} gas={r['gasUsed']}")
            except Exception as e:
                print(f"  Post-grad #{i}: {str(e)[:60]}")
            time.sleep(1)

        fees_post = get_fees()
        post_fees = fees_post["total_eth"] - fees_pre_post["total_eth"]
        print(f"\n  Pre-grad fees  : {Web3.from_wei(pre_grad_fees,'ether'):.6f} ETH")
        print(f"  Post-grad fees : {Web3.from_wei(post_fees,'ether'):.6f} ETH (should be 0)")
        print(f"  Total fees     : {Web3.from_wei(fees_post['total_eth'],'ether'):.6f} ETH")
        print(f"{'='*60}")
    finally:
        KEEPER_STOP_EVENT.set()
        keeper_thread.join(timeout=2)


if __name__ == "__main__":
    main()
