#!/usr/bin/env python3
"""Debug why buys are reverting on the new GRAD2 token."""
from web3 import Web3

w3 = Web3(Web3.HTTPProvider('https://ethereum-sepolia-rpc.publicnode.com'))
acct = w3.eth.account.from_key(Web3.keccak(text='clawclick-test-wallet-0-sepolia-v2').hex())

ROUTER = '0xd7A33b9d611BE5FBd8d6C547e04784b850B96C13'
TOKEN  = '0xFDb092609EEadfD84B29Da48269A3f2f46C6C534'
HOOK   = '0xb170D92e87527d7eDD861B960Fbb8F5E20fB2Ac8'
POOL_ID = bytes.fromhex('e57176a4c2058a08143dc94ac7d0c1b6b250d42a0b2c297061c19dd506d2afb3')

POOL_KEY = (
    '0x0000000000000000000000000000000000000000',
    TOKEN, 0x800000, 200, HOOK
)

ROUTER_ABI = [{
    'type': 'function', 'name': 'buy',
    'inputs': [
        {'name': 'key', 'type': 'tuple', 'components': [
            {'name': 'currency0', 'type': 'address'},
            {'name': 'currency1', 'type': 'address'},
            {'name': 'fee', 'type': 'uint24'},
            {'name': 'tickSpacing', 'type': 'int24'},
            {'name': 'hooks', 'type': 'address'},
        ]},
        {'name': 'ethAmount', 'type': 'uint256'},
    ],
    'outputs': [{'name': 'delta', 'type': 'int256'}],
    'stateMutability': 'payable',
}]

HOOK_ABI = [
    {'type': 'function', 'name': 'getCurrentEpoch',
     'inputs': [{'name': 'poolId', 'type': 'bytes32'}],
     'outputs': [{'name': 'epoch', 'type': 'uint256'}],
     'stateMutability': 'view'},
    {'type': 'function', 'name': 'getCurrentLimits',
     'inputs': [{'name': 'poolId', 'type': 'bytes32'}],
     'outputs': [{'name': 'maxTx', 'type': 'uint256'}, {'name': 'maxWallet', 'type': 'uint256'}],
     'stateMutability': 'view'},
    {'type': 'function', 'name': 'getCurrentTax',
     'inputs': [{'name': 'poolId', 'type': 'bytes32'}],
     'outputs': [{'name': 'taxBps', 'type': 'uint256'}],
     'stateMutability': 'view'},
    {'type': 'function', 'name': 'isGraduated',
     'inputs': [{'name': 'poolId', 'type': 'bytes32'}],
     'outputs': [{'name': 'graduated', 'type': 'bool'}],
     'stateMutability': 'view'},
]

ERC20_ABI = [
    {'type': 'function', 'name': 'balanceOf',
     'inputs': [{'name': 'account', 'type': 'address'}],
     'outputs': [{'name': '', 'type': 'uint256'}],
     'stateMutability': 'view'},
]

router = w3.eth.contract(address=Web3.to_checksum_address(ROUTER), abi=ROUTER_ABI)
hook = w3.eth.contract(address=Web3.to_checksum_address(HOOK), abi=HOOK_ABI)
token = w3.eth.contract(address=Web3.to_checksum_address(TOKEN), abi=ERC20_ABI)

print(f"Wallet: {acct.address}")
print(f"ETH bal: {Web3.from_wei(w3.eth.get_balance(acct.address), 'ether'):.6f}")
print(f"Token bal: {token.functions.balanceOf(acct.address).call()}")

epoch = hook.functions.getCurrentEpoch(POOL_ID).call()
maxTx, maxW = hook.functions.getCurrentLimits(POOL_ID).call()
tax = hook.functions.getCurrentTax(POOL_ID).call()
grad = hook.functions.isGraduated(POOL_ID).call()
print(f"Epoch: {epoch}, Tax: {tax}, MaxTx: {maxTx}, MaxW: {maxW}, Grad: {grad}")

# Try eth_call to get revert reason
buy_eth = w3.to_wei(0.0005, 'ether')
print(f"\nTrying buy with {Web3.from_wei(buy_eth, 'ether')} ETH...")
try:
    result = router.functions.buy(POOL_KEY, buy_eth).call({
        'from': acct.address,
        'value': buy_eth,
    })
    print(f"Call succeeded: {result}")
except Exception as e:
    print(f"Revert: {e}")

# Try with a tiny amount
buy_eth2 = w3.to_wei(0.00001, 'ether')
print(f"\nTrying buy with {Web3.from_wei(buy_eth2, 'ether')} ETH...")
try:
    result = router.functions.buy(POOL_KEY, buy_eth2).call({
        'from': acct.address,
        'value': buy_eth2,
    })
    print(f"Call succeeded: {result}")
except Exception as e:
    print(f"Revert: {e}")
