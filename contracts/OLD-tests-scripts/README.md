# OLD Tests & Scripts Archive

## ⚠️ DO NOT USE FOR MAINNET DEPLOYMENT

This folder contains **archived test and deployment scripts** that were used during development. These files are kept for historical reference only.

---

## 📁 Contents

### `/script/` - Old deployment scripts
- Various deployment attempts and iterations
- Mixed deployment/test scripts
- Not organized for mainnet deployment

### `/test/` - Old test files
- Development test suites
- Some may be outdated
- Not comprehensive for mainnet verification

### Scattered files:
- `test-deploy-token.js` - Old Node.js test script
- `deploy-test-token.sh` - Old shell deployment script
- `SEPOLIA_*_ABI.json` - Sepolia testnet deployment artifacts
- `_fix_*.py` - Python helper scripts (unused)

---

## ✅ Use This Instead

For mainnet deployment, use the clean structure at repo root:

```
contracts/
├── mainnet-deploy/     # 5-step deployment (USE THIS)
├── mainnet-wire/       # 4-step configuration (USE THIS)
└── mainnet-tests/      # Comprehensive tests (USE THIS)
```

See `MAINNET_DEPLOYMENT_GUIDE.md` at repo root for complete instructions.

---

## 🚫 Why Not Use These Files?

1. **Scattered organization** - Hard to follow deployment order
2. **Mixed purposes** - Tests mixed with deployment scripts
3. **Incomplete** - Missing BootstrapETH deployment
4. **No SAFE integration** - Missing exemption and ownership transfer
5. **Outdated** - May not reflect latest contract changes

---

## 📚 Reference Only

These files are kept for:
- Historical reference
- Understanding development process
- Comparing old vs new approaches
- Debugging if needed

**DO NOT use for mainnet deployment. Use mainnet-* folders instead.**

---

Last archived: February 24, 2026
Reason: Repository cleanup - mainnet-ready structure created
