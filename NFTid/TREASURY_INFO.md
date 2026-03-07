# NFTid Treasury Configuration

## Current Treasury Address

**Sepolia Testnet**: `0xFf7549B06E68186C91a6737bc0f0CDE1245e349b`

All mint fees from the ClawdNFT contract are sent to this address.

## How It Works

When users mint an NFTid (paid mint):
1. They send ETH to the ClawdNFT contract
2. The contract immediately forwards the mint fee to the treasury address
3. Any excess payment is refunded to the minter

**Contract Code** (from `ClawdNFT.sol`):
```solidity
// Send payment to treasury
if (requiredPrice > 0) {
    (bool success, ) = treasury.call{value: requiredPrice}("");
    require(success, "Payment to treasury failed");
}
```

## Verify Treasury Address

You can verify the treasury address on-chain:

```bash
# Using cast (Foundry)
cast call 0x6c4618080761925A6D92526c0AA443eF03a92C96 "treasury()(address)" --rpc-url https://sepolia.infura.io/v3/YOUR_KEY
```

Or view it on Etherscan:
https://sepolia.etherscan.io/address/0x6c4618080761925A6D92526c0AA443eF03a92C96#readContract

Click "Read Contract" → Find `treasury` function

## Updating Treasury Address

Only the contract owner can update the treasury address:

```solidity
function setTreasury(address _treasury) external onlyOwner {
    require(_treasury != address(0), "Invalid treasury");
    treasury = _treasury;
}
```

**Owner Address**: `0x958fC4d5688F7e7425EEa770F54d5126a46A9104` (deployer wallet)

## Pricing Tiers

- **Tier 1** (0-4,000): 0.0015 ETH (~$3)
- **Tier 2** (4,001-7,000): 0.003 ETH (~$6)
- **Tier 3** (7,001-10,000): 0.0045 ETH (~$9)

All fees go to the treasury address.

## Free Mints

Free mints (for Birth Certificate holders) send 0 ETH, so nothing goes to the treasury.

## Emergency Withdraw

If any funds get stuck in the contract (shouldn't happen), the owner can call:

```solidity
function withdraw() external onlyOwner {
    uint256 balance = address(this).balance;
    require(balance > 0, "No funds to withdraw");
    
    (bool success, ) = treasury.call{value: balance}("");
    require(success, "Withdrawal failed");
}
```

This sends any stuck funds to the treasury.

---

**Next Steps**:
- Verify `0xFf7549B06E68186C91a6737bc0f0CDE1245e349b` is your Safe address
- If not, call `setTreasury(newAddress)` as contract owner to update it
- For mainnet deployment, set treasury to your Base mainnet Safe
