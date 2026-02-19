#!/usr/bin/env python3
"""Quick MCAP checker for Clawclick token on Sepolia."""
from web3 import Web3
import time

w3 = Web3(Web3.HTTPProvider('https://ethereum-sepolia-rpc.publicnode.com'))

HOOK_ADDR      = "0x7d8F6Dc04F3F9FbF12BEEc6A33713768F1F7eac8"
FACTORY_ADDR   = "0xbb95ff721F645e386a094605A73D78e8CF334d32"
ROUTER_ADDR    = "0xAEf33Ed49f3aa308F8698AcB5cD01166Ae7fE62c"
TOKEN_ADDR     = "0x12Dc0b779fD060D0fd38fCc6a52A5B614Cf0D652"
POOL_ID        = bytes.fromhex("6b28a2d1b5b2fd7f47017be96d9c665abe8c2c632b46e336eed7e3a3ea2e33c7")

TOTAL_SUPPLY = 10**27
BPS = 10000
BASE_LIMIT_BPS = 10  # 0.1%
START_MCAP = 10**18  # 1 ETH


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

    # NEW
    {"type": "function", "name": "getCurrentMcap",
     "inputs": [{"name": "poolId", "type": "bytes32"}],
     "outputs": [{"name": "mcap", "type": "uint256"}], "stateMutability": "view"},
]


hook = w3.eth.contract(address=Web3.to_checksum_address(HOOK_ADDR), abi=[
    {'type': 'function', 'name': 'getCurrentEpoch',
     'inputs': [{'name': 'poolId', 'type': 'bytes32'}],
     'outputs': [{'name': 'epoch', 'type': 'uint256'}],
     'stateMutability': 'view'},
    {'type': 'function', 'name': 'getCurrentLimits',
     'inputs': [{'name': 'poolId', 'type': 'bytes32'}],
     'outputs': [{'name': 'maxTx', 'type': 'uint256'}, {'name': 'maxWallet', 'type': 'uint256'}],
     'stateMutability': 'view'},
         {"type": "function", "name": "getCurrentMcap",
     "inputs": [{"name": "poolId", "type": "bytes32"}],
     "outputs": [{"name": "mcap", "type": "uint256"}], "stateMutability": "view"},
    {'type': 'function', 'name': 'getCurrentTax',
     'inputs': [{'name': 'poolId', 'type': 'bytes32'}],
     'outputs': [{'name': 'taxBps', 'type': 'uint256'}],
     'stateMutability': 'view'},
    {'type': 'function', 'name': 'isGraduated',
     'inputs': [{'name': 'poolId', 'type': 'bytes32'}],
     'outputs': [{'name': 'graduated', 'type': 'bool'}],
     'stateMutability': 'view'},
    {'type': 'function', 'name': 'beneficiaryFeesETH',
     'inputs': [{'name': '', 'type': 'address'}],
     'outputs': [{'name': '', 'type': 'uint256'}],
     'stateMutability': 'view'},
    {'type': 'function', 'name': 'platformFeesETH',
     'inputs': [],
     'outputs': [{'name': '', 'type': 'uint256'}],
     'stateMutability': 'view'},
])

mcap = hook.functions.getCurrentMcap(POOL_ID).call()
print(f'Current MCAP (wei): {mcap}')
epoch = hook.functions.getCurrentEpoch(POOL_ID).call()
print(f'Current epoch: {epoch}')
maxTx, maxW = hook.functions.getCurrentLimits(POOL_ID).call()
print(f'MaxTx: {Web3.from_wei(maxTx, "ether"):.2f} tokens')
tax = hook.functions.getCurrentTax(POOL_ID).call()
print(f'Tax: {tax} bps ({tax/100:.1f}%)')
grad = hook.functions.isGraduated(POOL_ID).call()
print(f'Graduated: {grad}')

b_eth = hook.functions.beneficiaryFeesETH('0x009c0E4b9C0C83487FB2608CA97b1A1526c786fA').call()
p_eth = hook.functions.platformFeesETH().call()

print(f'Epoch        : {epoch}')
print(f'Tax (bps)    : {tax}  ({tax/100:.1f}%)')
print(f'MaxTx        : {Web3.from_wei(maxTx, "ether"):.2f} tokens')
print(f'MaxWallet    : {Web3.from_wei(maxW, "ether"):.2f} tokens')
print(f'MCAP         : {Web3.from_wei(mcap, "ether"):.6f} ETH')
print(f'Graduated    : {grad}')
print(f'Fees (ETH)   : beneficiary={Web3.from_wei(b_eth,"ether"):.6f}  platform={Web3.from_wei(p_eth,"ether"):.6f}  total={Web3.from_wei(b_eth+p_eth,"ether"):.6f}')
print()
time.sleep(1)  # just to ensure clear separation from previous prints
next_epoch_mcap = START_MCAP * (2 ** (epoch + 1))
print(f'Next epoch at: {Web3.from_wei(next_epoch_mcap, "ether"):.1f} ETH MCAP')
if next_epoch_mcap > 0:
    print(f'Progress     : {mcap * 100 // next_epoch_mcap}% to epoch {epoch+1}')
print(f'Graduation at: 16.0 ETH MCAP')
print(f'Overall prog : {mcap * 100 // (START_MCAP * 16)}% to graduation')
