#!/usr/bin/env python3
"""Diagnose GRADR2 pool state."""
from web3 import Web3
import math

w3 = Web3(Web3.HTTPProvider('https://ethereum-sepolia-rpc.publicnode.com'))

pool_manager = '0xE03A1074c86CFeDd5C142C4F04F1a1536e203543'
slot0_key = '0xb2c9ea6173a8d8add126532766cb8adf5631c1d949a219b91bc9ad5e60c4e1c4'
result = w3.eth.call({
    'to': pool_manager,
    'data': '0xf52ecf97' + slot0_key[2:]
})
val = int(result.hex(), 16)
sqrtPriceX96 = val & ((1 << 160) - 1)

tick_raw = (val >> 160) & 0xFFFFFF
if tick_raw >= (1 << 23):
    tick = tick_raw - (1 << 24)
else:
    tick = tick_raw

TOTAL_SUPPLY = 10**27
mcap = TOTAL_SUPPLY * (2**192) // (sqrtPriceX96 ** 2)
MIN_SQRT = 4295128739

print(f'sqrtPriceX96 : {sqrtPriceX96}')
print(f'MIN_SQRT     : {MIN_SQRT}')
print(f'tick         : {tick}')
print(f'At MIN_SQRT? : {sqrtPriceX96 <= MIN_SQRT + 10}')
print(f'MCAP wei     : {mcap}')
print(f'MCAP ETH     : {mcap / 10**18:.2f}')
print()

start_ratio = TOTAL_SUPPLY / (1 * 10**18)
start_tick = math.log(start_ratio) / math.log(1.0001)
print(f'Start tick (1 ETH MCAP)   : {start_tick:.0f}')
print(f'Ticks for 2x MCAP (1 epoch) : {math.log(2)/math.log(1.0001):.0f}')
print(f'Ticks for 16x MCAP (4 epoch): {math.log(16)/math.log(1.0001):.0f}')
print(f'Initial LP range +-200 ticks = only {1.0001**200 - 1:.2%} price movement')
print(f'Need {math.log(2)/math.log(1.0001):.0f} ticks for just 1 epoch doubling')
