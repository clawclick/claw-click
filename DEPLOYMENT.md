# 🚀 Claw.Click Deployment Guide

Complete deployment guide for Sepolia testnet.

## ✅ Prerequisites Checklist

Before deploying, ensure you have:

- [ ] Sepolia ETH (at least 0.5 ETH) - Get from https://sepoliafaucet.com
- [ ] Infura Project ID - Create at https://infura.io
- [ ] Alchemy API Key (optional backup) - Create at https://alchemy.com
- [ ] PostgreSQL database (local or Supabase)
- [ ] Etherscan API key (for verification) - Get from https://etherscan.io/myapikey

---

## 📋 Step-by-Step Deployment

### PART 1: Deploy Smart Contracts

**1. Setup Contract Environment**

```bash
cd contracts
cp .env.example .env
```

Edit `.env`:
```bash
PRIVATE_KEY=your_private_key_here
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_ID
ETHERSCAN_API_KEY=your_etherscan_api_key
```

**2. Compile Contracts**

```bash
forge build
```

Verify compilation succeeds with no errors.

**3. Run Tests**

```bash
forge test
```

Ensure all tests pass.

**4. Deploy to Sepolia**

```bash
forge script script/deploy/DeployProduction.s.sol \
  --rpc-url $SEPOLIA_RPC_URL \
  --private-key $PRIVATE_KEY \
  --broadcast \
  --verify \
  --etherscan-api-key $ETHERSCAN_API_KEY \
  -vvvv
```

**IMPORTANT:** Save the contract addresses from the output!

Example output:
```
Config: 0x1234...
Hook: 0x5678...
Factory: 0x9abc...
```

---

### PART 2: Setup Backend

**1. Install Dependencies**

```bash
cd ../backend
npm install
```

**2. Setup Environment**

```bash
cp .env.example .env
```

Edit `.env` with the deployed contract addresses:
```bash
# From deployment output
FACTORY_ADDRESS=0x...
HOOK_ADDRESS=0x...
CONFIG_ADDRESS=0x...

# RPC
INFURA_PROJECT_ID=your_project_id

# Database (example for Supabase)
DATABASE_URL=postgresql://user:pass@host:5432/database

# Server
PORT=3001
NODE_ENV=production
```

**3. Initialize Database**

```bash
npm run db:migrate
```

You should see:
```
✅ Database schema created successfully!
```

**4. Start Services**

**Terminal 1: API Server**
```bash
npm run dev
```

**Terminal 2: Event Indexer**
```bash
npm run indexer
```

**5. Verify Backend**

Test the API:
```bash
curl http://localhost:3001/health
# Should return: {"status":"healthy","timestamp":"..."}

curl http://localhost:3001/api/stats
# Should return stats object
```

---

### PART 3: Update Frontend

**1. Update Contract Addresses**

Edit `app/src/config/contracts.ts`:

```typescript
export const CONTRACTS = {
  sepolia: {
    chainId: 11155111,
    factory: '0x...', // Your deployed factory address
    hook: '0x...',    // Your deployed hook address
    config: '0x...',  // Your deployed config address
    poolManager: '0xE03A1074c86CFeDd5C142C4F04F1a1536e203543',
    positionManager: '0x429ba70129df741B2Ca2a85BC3A2a3328e5c09b4',
    rpcUrl: `https://sepolia.infura.io/v3/${process.env.NEXT_PUBLIC_INFURA_PROJECT_ID}`
  }
}
```

**2. Copy ABIs**

```bash
# From contracts directory
cd ../contracts
cp out/ClawclickFactory.sol/ClawclickFactory.json ../app/src/abis/
cp out/ClawclickHook_V4.sol/ClawclickHook.json ../app/src/abis/
cp out/ClawclickToken.sol/ClawclickToken.json ../app/src/abis/
```

**3. Update Frontend Environment**

Edit `app/.env.local`:
```bash
NEXT_PUBLIC_INFURA_PROJECT_ID=your_infura_id
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_CHAIN_ID=11155111
```

**4. Restart Frontend**

```bash
cd ../app
npm run dev
```

---

## 🧪 Testing

### Test 1: Launch a Token

1. Go to http://localhost:3000
2. Connect your wallet (MetaMask on Sepolia)
3. Fill in token details:
   - Name: "Test Token"
   - Symbol: "TEST"
   - Target MCAP: 2 ETH
4. Click "Launch Token"
5. Approve transaction in MetaMask

**Expected Results:**
- Transaction succeeds
- Token appears in "New Tokens" feed within 5-10 seconds
- Stats boxes update (Total Tokens increases)
- Token page loads with details

### Test 2: Trade a Token

1. Navigate to your test token page
2. Buy some tokens (e.g., 0.01 ETH worth)
3. Approve transaction

**Expected Results:**
- Transaction succeeds
- Volume increases on token page
- 24h Volume stat updates
- Recent swaps show your trade

### Test 3: Check API

```bash
# Get all tokens
curl http://localhost:3001/api/tokens

# Get your token
curl http://localhost:3001/api/token/0xYOUR_TOKEN_ADDRESS

# Get platform stats
curl http://localhost:3001/api/stats
```

---

## 🔍 Verification

### Verify Contracts on Etherscan

If auto-verification failed during deployment:

```bash
forge verify-contract CONTRACT_ADDRESS \
  src/core/ClawclickFactory.sol:ClawclickFactory \
  --chain sepolia \
  --etherscan-api-key $ETHERSCAN_API_KEY \
  --constructor-args $(cast abi-encode "constructor(address,address,address,address,address,address)" CONFIG_ADDRESS POOL_MANAGER HOOK_ADDRESS POSITION_MANAGER BOOTSTRAP_ETH_ADDRESS DEPLOYER_ADDRESS)
```

Repeat for Hook and Config contracts.

---

## 🐛 Troubleshooting

### "Insufficient funds for gas"
- Check your Sepolia ETH balance
- Get more from https://sepoliafaucet.com

### "Hook mining failed"
- This is rare but can happen
- Run deployment script again (it will mine a new salt)

### "Events not showing up"
- Check indexer is running (`npm run indexer`)
- Verify FACTORY_ADDRESS and HOOK_ADDRESS in backend/.env
- Check Infura project ID is correct
- Look for errors in indexer terminal

### "API returns 500 error"
- Check database connection (DATABASE_URL)
- Run migrations: `npm run db:migrate`
- Check API server logs for errors

### "Frontend can't connect to wallet"
- Ensure MetaMask is on Sepolia network
- Check NEXT_PUBLIC_CHAIN_ID=11155111 in .env.local
- Clear browser cache and reload

---

## 📊 Production Checklist

Before going live:

- [ ] All contracts verified on Etherscan
- [ ] Database backups configured
- [ ] API server running on production server (not localhost)
- [ ] Frontend deployed to Vercel/production
- [ ] Environment variables secured (not in git)
- [ ] Monitoring/alerting set up
- [ ] Rate limiting configured on API
- [ ] CORS properly configured for production domain

---

## 🆘 Support

If you encounter issues:

1. Check logs (indexer + API server)
2. Verify all environment variables are set
3. Ensure all services are running
4. Check Sepolia block explorer for contract interactions
5. Review this guide step-by-step

---

**🦞 Good luck with your deployment!**
