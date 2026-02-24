#!/usr/bin/env python3
"""Fix MP_01-04 test files and LiveTest/FullFlowLiveTest tickSpacing."""
import os, re

BASE = "/Users/zcsmacpro/VscProjects/claw-click/contracts"

# ─── MP_01: Replace BASE_TAX_BPS with getStartingTax ───
p = os.path.join(BASE, "script/tests/MP_01_ConfigTest.sol")
with open(p) as f:
    txt = f.read()

# Test 8 references config.BASE_TAX_BPS() — replace with getStartingTax(1 ether)
txt = txt.replace(
    '''    /// @notice TEST 8: Base tax = 50%
    function test_BaseTax() public view {
        uint256 baseTax = config.BASE_TAX_BPS();
        assertEq(baseTax, 5000, "Base tax not 5000 bps");
        assertEq((baseTax * 100) / config.BPS(), 50, "Base tax not 50%");
        console2.log("[PASS] Base tax = 50% (5000 bps)");
    }''',
    '''    /// @notice TEST 8: Base tax = 50% for 1 ETH MCAP
    function test_BaseTax() public view {
        uint256 baseTax = config.getStartingTax(1 ether);
        assertEq(baseTax, 5000, "Base tax not 5000 bps for 1 ETH");
        assertEq((baseTax * 100) / config.BPS(), 50, "Base tax not 50%");
        console2.log("[PASS] Base tax = 50% (5000 bps) for 1 ETH MCAP");
    }'''
)

with open(p, 'w') as f:
    f.write(txt)
print("  Fixed: MP_01_ConfigTest.sol")

# ─── MP_02: Fix factory constructor (add BootstrapETH as 5th arg) ───
p = os.path.join(BASE, "script/tests/MP_02_PositionMathTest.sol")
with open(p) as f:
    txt = f.read()

# Add BootstrapETH import
if "BootstrapETH" not in txt:
    txt = txt.replace(
        'import {IPositionManager} from "v4-periphery/src/interfaces/IPositionManager.sol";',
        'import {IPositionManager} from "v4-periphery/src/interfaces/IPositionManager.sol";\nimport "../../src/utils/BootstrapETH.sol";'
    )

# Fix factory constructor: 5 args -> 6 args
txt = txt.replace(
    '''        factory = new ClawclickFactory(
            config,
            poolManager,
            hook,
            address(positionManager),
            owner
        );''',
    '''        factory = new ClawclickFactory(
            config,
            poolManager,
            hook,
            address(positionManager),
            BootstrapETH(payable(address(0))),
            owner
        );'''
)

with open(p, 'w') as f:
    f.write(txt)
print("  Fixed: MP_02_PositionMathTest.sol")

# ─── MP_03: Fix factory constructor + remove getFee/isPremium ───
p = os.path.join(BASE, "script/tests/MP_03_LaunchTest.sol")
with open(p) as f:
    txt = f.read()

# Add BootstrapETH import
if "BootstrapETH" not in txt:
    txt = txt.replace(
        'import {IPositionManager} from "v4-periphery/src/interfaces/IPositionManager.sol";',
        'import {IPositionManager} from "v4-periphery/src/interfaces/IPositionManager.sol";\nimport "../../src/utils/BootstrapETH.sol";'
    )

# Fix factory constructor
txt = txt.replace(
    '''        factory = new ClawclickFactory(
            config,
            IPoolManager(mockPoolManager),
            hook,
            mockPositionManager,
            owner
        );''',
    '''        factory = new ClawclickFactory(
            config,
            IPoolManager(mockPoolManager),
            hook,
            mockPositionManager,
            BootstrapETH(payable(address(0))),
            owner
        );'''
)

# Fix test_ValidLaunchWithBootstrap: remove getFee call
txt = txt.replace(
    '''        uint256 minBootstrap = config.MIN_BOOTSTRAP_ETH();
        uint256 launchFee = factory.getFee(false);
        uint256 totalRequired = minBootstrap + launchFee;
        
        console2.log("  Min bootstrap:", minBootstrap);
        console2.log("  Launch fee:", launchFee);
        console2.log("  Total required:", totalRequired);''',
    '''        uint256 minBootstrap = config.MIN_BOOTSTRAP_ETH();
        
        console2.log("  Min bootstrap:", minBootstrap);'''
)

# Fix LaunchInfo isPremium reference in test 9
txt = txt.replace(
    '''        console2.log("  - isPremium");''',
    '''        // isPremium removed from LaunchInfo'''
)

# Fix test_LaunchFeeTiers: remove getFee calls
txt = txt.replace(
    '''    /// @notice TEST 16: Launch fee tiers
    function test_LaunchFeeTiers() public view {
        console2.log("=== LAUNCH FEE TIERS TEST ===");
        
        uint256 microFee = factory.getFee(false);
        uint256 premiumFee = factory.getFee(true);
        
        console2.log("  Micro tier:", microFee);
        console2.log("  Premium tier:", premiumFee);
        
        assertTrue(premiumFee > microFee, "Premium not higher than micro");
        
        console2.log("[PASS] Fee tiers work correctly");
    }''',
    '''    /// @notice TEST 16: Bootstrap fee
    function test_BootstrapFee() public view {
        console2.log("=== BOOTSTRAP FEE TEST ===");
        
        uint256 minBootstrap = config.MIN_BOOTSTRAP_ETH();
        console2.log("  Bootstrap minimum:", minBootstrap);
        
        assertEq(minBootstrap, 0.001 ether, "Min bootstrap incorrect");
        
        console2.log("[PASS] Bootstrap fee correct");
    }'''
)

with open(p, 'w') as f:
    f.write(txt)
print("  Fixed: MP_03_LaunchTest.sol")

# ─── MP_04: Replace BASE_TAX_BPS with literal 5000 or getStartingTax ───
p = os.path.join(BASE, "script/tests/MP_04_EpochTrackingTest.sol")
with open(p) as f:
    txt = f.read()

# Test 3 references config.BASE_TAX_BPS()
txt = txt.replace(
    'uint256 baseTax = config.BASE_TAX_BPS();  // 5000 = 50%',
    'uint256 baseTax = config.getStartingTax(1 ether);  // 5000 = 50% for 1 ETH'
)

with open(p, 'w') as f:
    f.write(txt)
print("  Fixed: MP_04_EpochTrackingTest.sol")

# ─── FullFlowLiveTest.s.sol: tickSpacing 200 -> 60 ───
p = os.path.join(BASE, "script/FullFlowLiveTest.s.sol")
with open(p) as f:
    txt = f.read()
txt = txt.replace('tickSpacing: 200', 'tickSpacing: 60')
with open(p, 'w') as f:
    f.write(txt)
print("  Fixed: FullFlowLiveTest.s.sol (tickSpacing 200->60)")

# ─── LiveTest.s.sol: tickSpacing 200 -> 60 ───
p = os.path.join(BASE, "script/LiveTest.s.sol")
with open(p) as f:
    txt = f.read()
txt = txt.replace('tickSpacing: 200', 'tickSpacing: 60')
with open(p, 'w') as f:
    f.write(txt)
print("  Fixed: LiveTest.s.sol (tickSpacing 200->60)")

print("\nAll fixes applied!")
