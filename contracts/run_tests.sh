#!/bin/bash

# Deep Sea Engine v4 - Comprehensive Test Runner
# Executes all critical tests and generates reports

set -e  # Exit on error

echo "═══════════════════════════════════════════════════════════════════════════"
echo "🧪 DEEP SEA ENGINE V4 - COMPREHENSIVE TEST SUITE"
echo "═══════════════════════════════════════════════════════════════════════════"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Create output directory
mkdir -p test_results

echo "1️⃣  Building contracts..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
forge build 2>&1 | tee test_results/build.log
if [ ${PIPESTATUS[0]} -eq 0 ]; then
    echo -e "${GREEN}✅ Build successful${NC}\n"
else
    echo -e "${RED}❌ Build failed${NC}\n"
    exit 1
fi

echo "2️⃣  Checking code formatting..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
forge fmt --check 2>&1 | tee test_results/fmt.log
if [ ${PIPESTATUS[0]} -eq 0 ]; then
    echo -e "${GREEN}✅ Formatting check passed${NC}\n"
else
    echo -e "${YELLOW}⚠️  Formatting issues found (non-critical)${NC}\n"
fi

echo "3️⃣  Inspecting storage layout..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Hook storage layout:" > test_results/storage_layout.log
forge inspect ClawclickHook_V4 storage-layout >> test_results/storage_layout.log 2>&1
echo -e "${GREEN}✅ Storage layout saved to test_results/storage_layout.log${NC}\n"

echo "4️⃣  Running Unit Tests (Exact Input/Output)..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
forge test --match-test "test_ExactInputSwap|test_ExactOutputSwap" -vvvv 2>&1 | tee test_results/exact_swap_tests.log
if [ ${PIPESTATUS[0]} -eq 0 ]; then
    echo -e "${GREEN}✅ Exact input/output tests PASSED${NC}\n"
else
    echo -e "${RED}❌ Exact input/output tests FAILED${NC}\n"
    exit 1
fi

echo "5️⃣  Running Fee Separation Tests..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
forge test --match-test "test_BuySwap_ETHFees|test_SellSwap_TokenFees" -vvvv 2>&1 | tee test_results/fee_separation_tests.log
if [ ${PIPESTATUS[0]} -eq 0 ]; then
    echo -e "${GREEN}✅ Fee separation tests PASSED${NC}\n"
else
    echo -e "${RED}❌ Fee separation tests FAILED${NC}\n"
    exit 1
fi

echo "6️⃣  Running Double Fee Invariant Tests..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
forge test --match-test "test_DoubleFeeInvariant" -vvvv 2>&1 | tee test_results/double_fee_tests.log
if [ ${PIPESTATUS[0]} -eq 0 ]; then
    echo -e "${GREEN}✅ Double fee invariant tests PASSED${NC}\n"
else
    echo -e "${RED}❌ Double fee invariant tests FAILED${NC}\n"
    exit 1
fi

echo "7️⃣  Running Graduation Edge Case Tests..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
forge test --match-test "test_GraduationEdgeCase" -vvvv 2>&1 | tee test_results/graduation_tests.log
if [ ${PIPESTATUS[0]} -eq 0 ]; then
    echo -e "${GREEN}✅ Graduation edge case tests PASSED${NC}\n"
else
    echo -e "${RED}❌ Graduation edge case tests FAILED${NC}\n"
    exit 1
fi

echo "8️⃣  Running Growth Ratio Fuzz Tests..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
forge test --match-test "test_FuzzGrowthRatio|test_GrowthRatioBoundaries" -vvvv 2>&1 | tee test_results/fuzz_tests.log
if [ ${PIPESTATUS[0]} -eq 0 ]; then
    echo -e "${GREEN}✅ Growth ratio fuzz tests PASSED${NC}\n"
else
    echo -e "${RED}❌ Growth ratio fuzz tests FAILED${NC}\n"
    exit 1
fi

echo "9️⃣  Running Reentrancy Tests..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
forge test --match-test "test_Reentrancy" -vvvv 2>&1 | tee test_results/reentrancy_tests.log
if [ ${PIPESTATUS[0]} -eq 0 ]; then
    echo -e "${GREEN}✅ Reentrancy tests PASSED${NC}\n"
else
    echo -e "${RED}❌ Reentrancy tests FAILED${NC}\n"
    exit 1
fi

echo "🔟  Running LP Locker Tests..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
forge test --match-contract ClawclickLPLockerTest -vvvv 2>&1 | tee test_results/locker_tests.log
if [ ${PIPESTATUS[0]} -eq 0 ]; then
    echo -e "${GREEN}✅ LP Locker tests PASSED${NC}\n"
else
    echo -e "${RED}❌ LP Locker tests FAILED${NC}\n"
    exit 1
fi

echo "1️⃣1️⃣  Running ALL Tests..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
forge test -vvvv 2>&1 | tee test_results/all_tests.log
if [ ${PIPESTATUS[0]} -eq 0 ]; then
    echo -e "${GREEN}✅ ALL tests PASSED${NC}\n"
else
    echo -e "${RED}❌ Some tests FAILED${NC}\n"
    exit 1
fi

echo "1️⃣2️⃣  Generating Gas Snapshot..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
forge snapshot 2>&1 | tee test_results/gas_snapshot.log
cp .gas-snapshot test_results/gas_snapshot.txt 2>/dev/null || true
echo -e "${GREEN}✅ Gas snapshot saved${NC}\n"

echo "1️⃣3️⃣  Generating Gas Report..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
forge test --gas-report 2>&1 | tee test_results/gas_report.log
echo -e "${GREEN}✅ Gas report saved${NC}\n"

echo "═══════════════════════════════════════════════════════════════════════════"
echo -e "${GREEN}✅✅✅ ALL TESTS PASSED ✅✅✅${NC}"
echo "═══════════════════════════════════════════════════════════════════════════"
echo ""
echo "📊 Test Results Summary:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Build log:              test_results/build.log"
echo "Storage layout:         test_results/storage_layout.log"
echo "Exact swap tests:       test_results/exact_swap_tests.log"
echo "Fee separation tests:   test_results/fee_separation_tests.log"
echo "Double fee tests:       test_results/double_fee_tests.log"
echo "Graduation tests:       test_results/graduation_tests.log"
echo "Fuzz tests:             test_results/fuzz_tests.log"
echo "Reentrancy tests:       test_results/reentrancy_tests.log"
echo "LP Locker tests:        test_results/locker_tests.log"
echo "All tests:              test_results/all_tests.log"
echo "Gas snapshot:           test_results/gas_snapshot.txt"
echo "Gas report:             test_results/gas_report.log"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🎯 Next Steps:"
echo "  1. Review test_results/ directory"
echo "  2. Verify all logs show expected behavior"
echo "  3. Check gas report is within limits"
echo "  4. Proceed to manual review if all pass"
echo ""
echo "═══════════════════════════════════════════════════════════════════════════"
