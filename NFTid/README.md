# NFTid System

## Contracts

### AgentNFTidRegistry
On-chain registry for linking NFTid tokens to agent wallets with proper access control.

**Access Control:**
- `linkNFTid()`: Caller must own the NFTid AND be either:
  - The agent creator (from birth certificate)
  - The agent wallet itself
- `unlinkNFTid()`: Same as link
- `unlinkAgent()`: NFTid owner, agent creator, or agent wallet

## Deployment (Sepolia)

### Current Deployment
- **ClawdNFT**: `0x6c4618080761925A6D92526c0AA443eF03a92C96`
- **BirthCertificate**: `0x4003CbFD62B0b4BAbBdad714e472fCb8D1f03132`
- **AgentNFTidRegistry** (old): `0x6E9B093FdD12eC34ce358bd70CF59EeCb5D1A95B`

### Redeploy Registry (with access control)

```bash
cd NFTid

# Deploy
forge create contracts/AgentNFTidRegistry.sol:AgentNFTidRegistry \
  --rpc-url https://ethereum-sepolia-rpc.publicnode.com \
  --private-key $PRIVATE_KEY \
  --constructor-args "0x6c4618080761925A6D92526c0AA443eF03a92C96" "0x4003CbFD62B0b4BAbBdad714e472fCb8D1f03132" \
  --broadcast \
  --verify \
  --etherscan-api-key 69U9FKJK6A46748RA94DYBRJSQCHC8191C
```

### Update Frontend
After deployment, update `app/src/lib/contracts/nftidRegistry.ts` with new address.

## Free Mint Issue

The free mint is failing because the wallet may not have a Birth Certificate NFT. To debug:

1. Check if wallet has Birth Certificate:
   ```
   Cast call <BirthCertificate> "balanceOf(address)" <yourWallet> --rpc-url https://ethereum-sepolia-rpc.publicnode.com
   ```

2. Check if wallet has used free mint:
   ```
   Cast call <ClawdNFT> "hasUsedFreeMint(address)" <yourWallet> --rpc-url https://ethereum-sepolia-rpc.publicnode.com
   ```

3. Check eligibility:
   ```
   Cast call <ClawdNFT> "isEligibleForFreeMint(address)" <yourWallet> --rpc-url https://ethereum-sepolia-rpc.publicnode.com
   ```

If `balanceOf` returns 0, the wallet needs to create an agent first to get a Birth Certificate.
