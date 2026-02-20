# ✅ DEPLOYMENT CHECKLIST

Use this checklist to track your deployment progress.

## 🔐 PREREQUISITES

- [ ] **Sepolia ETH** - At least 0.5 ETH in deployer wallet
  - Get from: https://sepoliafaucet.com
  - Wallet address: __________________
  - Balance confirmed: _____ ETH

- [ ] **Infura Account**
  - Project created: ✓ / ✗
  - Project ID: __________________
  - WebSocket tested: ✓ / ✗

- [ ] **Database**
  - Type: PostgreSQL / Supabase / Other: __________
  - Connection string obtained: ✓ / ✗
  - Database created: ✓ / ✗

- [ ] **Etherscan API Key**
  - API key obtained: ✓ / ✗
  - Key: __________________

---

## 📦 STEP 1: CONTRACT DEPLOYMENT

- [ ] **Compile contracts**
  ```bash
  cd contracts && forge build
  ```
  Result: Success / Failed

- [ ] **Run tests**
  ```bash
  forge test
  ```
  Result: _____ tests passed

- [ ] **Deploy to Sepolia**
  ```bash
  forge script script/deploy/DeployProduction.s.sol \
    --rpc-url $SEPOLIA_RPC_URL \
    --private-key $PRIVATE_KEY \
    --broadcast \
    --verify \
    -vvvv
  ```

- [ ] **Save deployed addresses**
  - Config: 0x____________________
  - Hook: 0x____________________
  - Factory: 0x____________________

- [ ] **Verify contracts on Etherscan**
  - Config verified: ✓ / ✗
  - Hook verified: ✓ / ✗
  - Factory verified: ✓ / ✗

---

## 🗄️ STEP 2: BACKEND SETUP

- [ ] **Install dependencies**
  ```bash
  cd backend && npm install
  ```

- [ ] **Configure environment**
  - Copied .env.example to .env: ✓ / ✗
  - Added INFURA_PROJECT_ID: ✓ / ✗
  - Added DATABASE_URL: ✓ / ✗
  - Added FACTORY_ADDRESS: ✓ / ✗
  - Added HOOK_ADDRESS: ✓ / ✗

- [ ] **Initialize database**
  ```bash
  npm run db:migrate
  ```
  Result: Success / Failed

- [ ] **Start API server**
  ```bash
  npm run dev
  ```
  Status: Running on port: _____

- [ ] **Start event indexer**
  ```bash
  npm run indexer
  ```
  Status: Running / Not Running

- [ ] **Test API**
  ```bash
  curl http://localhost:3001/health
  ```
  Response: {"status":"healthy"} ✓ / ✗

---

## 🎨 STEP 3: FRONTEND INTEGRATION

- [ ] **Update contract addresses**
  - Edited app/src/config/contracts.ts: ✓ / ✗
  - Factory address updated: ✓ / ✗
  - Hook address updated: ✓ / ✗
  - Config address updated: ✓ / ✗

- [ ] **Copy ABIs**
  ```bash
  cp out/ClawclickFactory.sol/ClawclickFactory.json ../app/src/abis/
  cp out/ClawclickHook_V4.sol/ClawclickHook.json ../app/src/abis/
  cp out/ClawclickToken.sol/ClawclickToken.json ../app/src/abis/
  ```
  Result: Success / Failed

- [ ] **Configure environment**
  - Created app/.env.local: ✓ / ✗
  - Added NEXT_PUBLIC_INFURA_PROJECT_ID: ✓ / ✗
  - Added NEXT_PUBLIC_API_URL: ✓ / ✗
  - Added NEXT_PUBLIC_CHAIN_ID: ✓ / ✗

- [ ] **Start frontend**
  ```bash
  cd app && npm run dev
  ```
  Status: Running on port: _____

---

## 🧪 STEP 4: TESTING

### Test 1: Launch Token
- [ ] Navigate to http://localhost:3000
- [ ] Connect wallet (MetaMask on Sepolia)
- [ ] Fill launch form
  - Name: "Test Token"
  - Symbol: "TEST"
  - Target MCAP: 2 ETH
- [ ] Submit transaction
- [ ] Transaction confirmed: ✓ / ✗
- [ ] Token appears in feed (within 10 sec): ✓ / ✗
- [ ] Stats boxes updated: ✓ / ✗

### Test 2: Trade Token
- [ ] Navigate to token page
- [ ] Buy tokens (0.01 ETH)
- [ ] Transaction confirmed: ✓ / ✗
- [ ] Volume updated: ✓ / ✗
- [ ] Swap appears in recent activity: ✓ / ✗

### Test 3: API Verification
- [ ] GET /api/stats returns data: ✓ / ✗
- [ ] GET /api/tokens returns test token: ✓ / ✗
- [ ] GET /api/token/:address returns details: ✓ / ✗

---

## 📊 STEP 5: MONITORING

- [ ] **Indexer logs**
  - Events being captured: ✓ / ✗
  - No errors in logs: ✓ / ✗

- [ ] **API logs**
  - Requests being served: ✓ / ✗
  - No 500 errors: ✓ / ✗

- [ ] **Database**
  - Tokens table populated: ✓ / ✗
  - Swaps table populated: ✓ / ✗
  - Stats table updating: ✓ / ✗

---

## ✅ FINAL CHECKS

- [ ] All services running
  - API server: ✓ / ✗
  - Event indexer: ✓ / ✗
  - Frontend: ✓ / ✗

- [ ] All tests passed
  - Launch test: ✓ / ✗
  - Trade test: ✓ / ✗
  - API test: ✓ / ✗

- [ ] Etherscan verification
  - All contracts verified: ✓ / ✗
  - Links work: ✓ / ✗

---

## 🐛 ISSUES ENCOUNTERED

Document any issues here:

1. ________________________________________________

2. ________________________________________________

3. ________________________________________________

---

## 📝 NOTES

Additional notes or observations:

_____________________________________________________

_____________________________________________________

_____________________________________________________

---

**Deployment completed:** _____ / _____ / _____

**Deployed by:** _____________________

**Time taken:** _____ hours
