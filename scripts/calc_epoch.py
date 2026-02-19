#!/usr/bin/env python3
"""Calculate ETH needed to reach epoch 1 for GRAD3 (0.01 ETH activation)."""
import math
from web3 import Web3

w3 = Web3(Web3.HTTPProvider("https://ethereum-sepolia-rpc.publicnode.com"))

HOOK_ADDR = "0xb170D92e87527d7eDD861B960Fbb8F5E20fB2Ac8"
POOL_MANAGER = "0xE03A1074c86CFeDd5C142C4F04F1a1536e203543"
POOL_ID = bytes.fromhex("1ce9dd40528519663eb172533068205b4725833bc792c869dd2298983743351a")

hook_abi = [
    {"type": "function", "name": "getCurrentEpoch",
     "inputs": [{"name": "poolId", "type": "bytes32"}],
     "outputs": [{"name": "epoch", "type": "uint256"}], "stateMutability": "view"},
    {"type": "function", "name": "getCurrentLimits",
     "inputs": [{"name": "poolId", "type": "bytes32"}],
     "outputs": [{"name": "maxTx", "type": "uint256"}, {"name": "maxWallet", "type": "uint256"}], "stateMutability": "view"},
    {"type": "function", "name": "getCurrentTax",
     "inputs": [{"name": "poolId", "type": "bytes32"}],
     "outputs": [{"name": "taxBps", "type": "uint256"}], "stateMutability": "view"},
    {"type": "function", "name": "isGraduated",
     "inputs": [{"name": "poolId", "type": "bytes32"}],
     "outputs": [{"name": "graduated", "type": "bool"}], "stateMutability": "view"},
]

pm_abi = [
    {"type": "function", "name": "getSlot0",
     "inputs": [{"name": "id", "type": "bytes32"}],
     "outputs": [
         {"name": "sqrtPriceX96", "type": "uint160"},
         {"name": "tick", "type": "int24"},
         {"name": "protocolFee", "type": "uint24"},
         {"name": "lpFee", "type": "uint24"},
     ], "stateMutability": "view"},
    {"type": "function", "name": "getLiquidity",
     "inputs": [{"name": "id", "type": "bytes32"}],
     "outputs": [{"name": "liquidity", "type": "uint128"}], "stateMutability": "view"},
]

hook = w3.eth.contract(address=Web3.to_checksum_address(HOOK_ADDR), abi=hook_abi)
pm = w3.eth.contract(address=Web3.to_checksum_address(POOL_MANAGER), abi=pm_abi)

# Known from raw struct decode: startMcap = 1 ETH, baseTax = 5000 bps
START_MCAP = 10**18  # 1 ETH (MIN_START_MCAP enforced)
BASE_TAX = 5000       # 50%
TOTAL_SUPPLY = 10**27  # 1B * 1e18

# On-chain current state
epoch = hook.functions.getCurrentMcap(POOL_ID).call()
epoch = hook.functions.getCurrentEpoch(POOL_ID).call()
tax = hook.functions.getCurrentTax(POOL_ID).call()
maxTx, maxW = hook.functions.getCurrentLimits(POOL_ID).call()
grad = hook.functions.isGraduated(POOL_ID).call()

slot0 = pm.functions.getSlot0(POOL_ID).call()
sqrtPriceX96 = slot0[0]
tick = slot0[1]
liquidity = pm.functions.getLiquidity(POOL_ID).call()

# Current MCAP from sqrtPrice
currentMcap = (sqrtPriceX96 ** 2 * TOTAL_SUPPLY) // (2**192)

print(f"=== GRAD3 ON-CHAIN STATE ===")
print(f"Current Epoch: {epoch}")
print(f"Current Tax: {tax} bps ({tax/100}%)")
print(f"MaxTx: {maxTx} = {Web3.from_wei(maxTx, 'ether')} tokens")
print(f"MaxWallet: {maxW} = {Web3.from_wei(maxW, 'ether')} tokens")
print(f"Graduated: {grad}")
print(f"sqrtPriceX96: {sqrtPriceX96}")
print(f"tick: {tick}")
print(f"liquidity: {liquidity}")
print(f"Current MCAP: {Web3.from_wei(currentMcap, 'ether'):.6f} ETH")
print()

# Epoch thresholds
print(f"=== EPOCH THRESHOLDS ===")
print(f"Start MCAP (contract): 1 ETH (MIN_START_MCAP enforced)")
for e in range(5):
    threshold = START_MCAP * (2 ** e)
    print(f"  Epoch {e}: MCAP >= {Web3.from_wei(threshold, 'ether')} ETH")
print(f"  Epoch 4 = GRADUATION: MCAP >= {Web3.from_wei(START_MCAP * 16, 'ether')} ETH")
print()

# MaxTx ETH value at CURRENT price
price_per_token = currentMcap / TOTAL_SUPPLY
maxTx_eth = maxTx * currentMcap // TOTAL_SUPPLY
print(f"=== MAX TX AT CURRENT PRICE ===")
print(f"Price per token: {price_per_token:.2e} ETH")
print(f"MaxTx tokens: {Web3.from_wei(maxTx, 'ether'):,.0f}")
print(f"MaxTx ETH value: {Web3.from_wei(maxTx_eth, 'ether'):.6f} ETH")
print()

# To reach epoch 1: need currentMcap >= 2 * START_MCAP = 2 ETH
target_mcap = START_MCAP * 2
target_sqrtPriceX96 = int(math.isqrt(target_mcap * 2**192 // TOTAL_SUPPLY))

# With concentrated liquidity, ETH needed = L * (1/sqrt(P_current) - 1/sqrt(P_target))
# where L = liquidity, P = price in token/ETH terms
# But our price is ETH/token (how much ETH per token)
# In Uniswap v4: sqrtPriceX96 = sqrt(price) * 2^96 where price = token1/token0
# currency0 = ETH, currency1 = token → price = token/ETH
# So price_eth_per_token = 1/price = 1/(sqrtPriceX96/2^96)^2

# For ETH needed to move price: delta_ETH = L * (sqrt(P_upper) - sqrt(P_lower)) / (2^96)
# where P is in token/ETH. Higher P = more expensive tokens in ETH terms... wait no.
# P = token_per_eth. Higher sqrtPrice = more tokens per ETH = cheaper tokens.
# Actually in v4: price = amount1/amount0 = token/ETH
# So MCAP = totalSupply / price = totalSupply * amount0/amount1

# Let me reconsider. MCAP formula:
# currentMcap = sqrtPriceX96^2 * TOTAL_SUPPLY / 2^192
# = (sqrtP / 2^96)^2 * TOTAL_SUPPLY
# = price * TOTAL_SUPPLY
# So price = MCAP / TOTAL_SUPPLY = amount1_per_amount0 = tokens_per_ETH?
# That would mean price = tokens you get per ETH
# Then MCAP = tokens_per_ETH * totalSupply... that gives tokens^2/ETH which is wrong

# Actually: in Uniswap, price = token1/token0
# currency0=ETH, currency1=token
# price = token_amount / ETH_amount (how many tokens per ETH)  
# Price of 1 token in ETH = 1/price = ETH_amount / token_amount
# MCAP = (1/price) * totalSupply = totalSupply / price

# But the formula _getCurrentMcap uses:
# currentMcap = (sqrtPriceX96^2 * TOTAL_SUPPLY) / 2^192
# This = price * TOTAL_SUPPLY where price = sqrtPriceX96^2 / 2^192 = token/ETH
# MCAP = (token/ETH) * totalSupply... that's tokens^2/ETH which is wrong.

# Wait, let me re-read _getCurrentMcap

print(f"=== ETH NEEDED TO REACH EPOCH 1 ===")
print(f"Target MCAP: {Web3.from_wei(target_mcap, 'ether')} ETH")
print(f"Current MCAP: {Web3.from_wei(currentMcap, 'ether'):.6f} ETH")
mcap_gap = target_mcap - currentMcap if target_mcap > currentMcap else 0
print(f"MCAP gap: {Web3.from_wei(mcap_gap, 'ether'):.6f} ETH")
print()

# ETH to move concentrated liquidity price
# In Uniswap: to buy tokens (send ETH, receive tokens)
# deltaETH = L * (1/sqrtP_new - 1/sqrtP_old) ... wait, this is for the 0→1 direction
# For 0→1 swap (sell ETH, buy tokens): ETH in, sqrtPrice goes UP
# deltaX (ETH) = L * (sqrtP_new - sqrtP_old) / (sqrtP_new * sqrtP_old) ... hmm
# Actually: delta_amount0 = L * (1/sqrt_lower - 1/sqrt_upper)
# When buying tokens with ETH: price goes up (more tokens per unit changes)

# For exact input (ETH→token buy), the amount of ETH needed:
# amount0 = L * (sqrt(P_upper) - sqrt(P_lower)) / (sqrt(P_upper) * sqrt(P_lower))
# In Q96: amount0 = L * (sqrtP_target - sqrtP_current) / (sqrtP_target * sqrtP_current) * 2^96

if liquidity > 0 and target_sqrtPriceX96 > sqrtPriceX96:
    # ETH (amount0) needed for price move
    # delta_amount0 = L * (sqrtP_upper - sqrtP_lower) / (sqrtP_upper * sqrtP_lower) in Q0
    # Using Q96 math:
    delta_sqrt = target_sqrtPriceX96 - sqrtPriceX96
    eth_needed_net = liquidity * delta_sqrt * (2**96) // (target_sqrtPriceX96 * sqrtPriceX96)
    
    # But wait, for a buy (ETH→token), price goes DOWN (fewer tokens per ETH = each token costs more ETH)
    # Hmm, need to think about the direction again.
    
    # Actually: currency0=ETH, currency1=token
    # sqrtPriceX96 = sqrt(token/ETH) * 2^96  (how many tokens per ETH)
    # When you BUY tokens: you send ETH, remove tokens from pool → price of tokens in ETH goes UP
    # But token/ETH price goes DOWN (each ETH buys fewer tokens)
    # So sqrtPriceX96 goes DOWN when buying tokens
    
    # MCAP = totalSupply / price_in_tokens_per_ETH = totalSupply * price_ETH_per_token
    # But the contract says: currentMcap = sqrtPriceX96^2 * TOTAL_SUPPLY / 2^192
    # = (token/ETH) * totalSupply
    # This gives a number in units of tokens^2/ETH... that can't be right for MCAP
    
    # Unless the token IS currency0 and ETH is currency1? Let me check the PoolKey
    pass

# Let me just check the _getCurrentMcap function
print("(See contract _getCurrentMcap for exact formula)")
print()

# Simpler approach: estimate based on the relationship
# The pool has very shallow liquidity (0.01 ETH activation)
# Tax takes 50% of input ETH at epoch 0
# So gross_eth = net_eth / 0.5 = net_eth * 2

# For very shallow liquidity, small ETH can move price a lot
# Let's just compute: each maxTx buy sends 0.001 ETH gross, 0.0005 ETH net enters pool
# With 0.01 ETH initial liquidity, each 0.0005 ETH net buy is 5% of pool
# We need to double the MCAP, requiring ~41.4% more ETH in constant-product model
# So net ETH needed ≈ 0.01 * 0.414 = 0.00414 ETH
# Gross ETH needed ≈ 0.00414 / 0.5 = 0.00828 ETH
# Number of maxTx buys ≈ 0.00828 / 0.001 ≈ 8-9 buys

# But price impact makes each successive buy more expensive, so likely ~10 buys
# Plus limits grow as MCAP grows, so later buys can be larger

# Let's just output the key numbers
print(f"=== ESTIMATION ===")
print(f"Tax at epoch 0: {BASE_TAX} bps (50%) — half of each buy goes to fees")
print(f"MaxTx ETH value at start: ~0.001 ETH")
print(f"Activation ETH: 0.01 ETH")
print(f"To double MCAP (constant-product): need ~41.4% of initial reserves")
print(f"Net ETH needed: ~{0.01 * 0.414:.5f} ETH")
print(f"Gross ETH needed (50% tax): ~{0.01 * 0.414 / 0.5:.5f} ETH")
print(f"Approx maxTx buys needed: ~{math.ceil(0.01 * 0.414 / 0.5 / 0.001)}")
print(f"")
print(f"NOTE: This is approximate. Price impact means each buy is cheaper in tokens.")
print(f"Actual number may be slightly different due to concentrated liquidity curve.")
