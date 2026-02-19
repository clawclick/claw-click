#!/usr/bin/env python3
"""Check if reposition has fired during epoch transitions."""
from web3 import Web3

w3 = Web3(Web3.HTTPProvider('https://ethereum-sepolia-rpc.publicnode.com'))

HOOK_ADDR    = '0x3C51C9F9050cab3E48329A13f43d97fB5793aaC8'
FACTORY_ADDR = '0x2880B65401A52ac2f4eCbEB4186833877B9D994B'
POOL_ID      = bytes.fromhex('2627f4a9f13e422c3cbb8a9a630215044486e774c6c93c82498d277f8496dad5')

factory = w3.eth.contract(address=Web3.to_checksum_address(FACTORY_ADDR), abi=[
    {'type':'function','name':'lastRepositionedEpoch','inputs':[{'name':'','type':'bytes32'}],'outputs':[{'name':'','type':'uint256'}],'stateMutability':'view'},
    {'type':'function','name':'needsReposition','inputs':[{'name':'','type':'bytes32'}],'outputs':[{'name':'needed','type':'bool'},{'name':'currentEpoch','type':'uint256'},{'name':'lastEpoch','type':'uint256'}],'stateMutability':'view'},
    {'type':'function','name':'positionTokenId','inputs':[{'name':'','type':'bytes32'}],'outputs':[{'name':'','type':'uint256'}],'stateMutability':'view'},
])
hook = w3.eth.contract(address=Web3.to_checksum_address(HOOK_ADDR), abi=[
    {'type':'function','name':'getCurrentEpoch','inputs':[{'name':'poolId','type':'bytes32'}],'outputs':[{'name':'epoch','type':'uint256'}],'stateMutability':'view'},
    {'type':'function','name':'getCurrentMcap','inputs':[{'name':'poolId','type':'bytes32'}],'outputs':[{'name':'mcap','type':'uint256'}],'stateMutability':'view'},
])

epoch = hook.functions.getCurrentEpoch(POOL_ID).call()
mcap = hook.functions.getCurrentMcap(POOL_ID).call()
last_repo = factory.functions.lastRepositionedEpoch(POOL_ID).call()
needed, cur_ep, last_ep = factory.functions.needsReposition(POOL_ID).call()
nft_id = factory.functions.positionTokenId(POOL_ID).call()

print(f'Current epoch:           {epoch}')
print(f'MCAP:                    {Web3.from_wei(mcap, "ether"):.6f} ETH')
print(f'Last repositioned epoch: {last_repo}')
print(f'Needs reposition:        {needed}  (current={cur_ep}, last={last_ep})')
print(f'Current LP NFT ID:       {nft_id}')

if last_repo > 0:
    print(f'\n=> Reposition HAS fired (repositioned up to epoch {last_repo})')
else:
    print(f'\n=> Reposition has NOT fired yet (still on initial position)')

if needed:
    print(f'=> Reposition is PENDING — next swap should trigger it')
