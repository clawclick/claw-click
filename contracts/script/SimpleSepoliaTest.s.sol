// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "forge-std/console.sol";

import {IPoolManager} from "v4-core/src/interfaces/IPoolManager.sol";
import {IUnlockCallback} from "v4-core/src/interfaces/callback/IUnlockCallback.sol";
import {PoolKey} from "v4-core/src/types/PoolKey.sol";
import {Currency, CurrencyLibrary} from "v4-core/src/types/Currency.sol";
import {PoolId, PoolIdLibrary} from "v4-core/src/types/PoolId.sol";
import {BalanceDelta} from "v4-core/src/types/BalanceDelta.sol";
import {IHooks} from "v4-core/src/interfaces/IHooks.sol";
import {TickMath} from "v4-core/src/libraries/TickMath.sol";

import {ClawclickFactory} from "../src/core/ClawclickFactory.sol";
import {ClawclickHook} from "../src/core/ClawclickHook.sol";
import {ClawclickConfig} from "../src/core/ClawclickConfig.sol";
import {ClawclickLPLocker} from "../src/core/ClawclickLPLocker.sol";
import {ClawclickToken} from "../src/core/ClawclickToken.sol";

/**
 * @title Simple Sepolia Test
 * @notice Test deployment WITHOUT CREATE2 - just verify functionality
 * @dev We'll use manual CREATE2 mining in a separate step for production
 */
contract SimpleSepoliaTest is Script, IUnlockCallback {
    using PoolIdLibrary for PoolKey;
    using CurrencyLibrary for Currency;
    
    address constant POOL_MANAGER = 0xC36e6A145A1eF688068E30877B19b857BeB9E450;
    address constant DEPLOYER = 0x3472a51BAf1814B59bf7ac55C8CBA679189Bf0e7;
    
    ClawclickConfig public config;
    ClawclickHook public hook;
    ClawclickLPLocker public locker;
    ClawclickFactory public factory;
    ClawclickToken public token;
    
    PoolKey public poolKey;
    PoolId public poolId;
    IPoolManager public poolManager;
    
    function run() external {
        console.log("===========================================");
        console.log("  CLAWCLICK V4 - SEPOLIA TEST");
        console.log("===========================================");
        console.log("");
        console.log("NOTE: Using regular deployment (not CREATE2)");
        console.log("Hook address may not have perfect flags");
        console.log("");
        
        vm.startBroadcast();
        poolManager = IPoolManager(POOL_MANAGER);
        
        _deploy();
        _createToken();
        _testGenesis();
        _testBuys();
        _testFees();
        _summary();
        
        vm.stopBroadcast();
    }
    
    function _deploy() internal {
        console.log("=== DEPLOY ===");
        console.log("");
        
        // Config
        console.log("Config...");
        config = new ClawclickConfig(DEPLOYER, DEPLOYER);
        console.log("  %s", address(config));
        
        // Hook (regular deployment)
        console.log("Hook...");
        hook = new ClawclickHook(IPoolManager(POOL_MANAGER), config);
        uint160 flags = uint160(address(hook)) & 0x7FFF;
        console.log("  %s", address(hook));
        console.log("  Flags: %s (need 10952 for production)", flags);
        
        // LPLocker
        console.log("LPLocker...");
        locker = new ClawclickLPLocker(POOL_MANAGER, address(hook));
        console.log("  %s", address(locker));
        
        // Factory
        console.log("Factory...");
        factory = new ClawclickFactory(config, IPoolManager(POOL_MANAGER), hook, locker, DEPLOYER);
        console.log("  %s", address(factory));
        
        // Register
        console.log("Registering...");
        config.setFactory(address(factory));
        console.log("  OK");
        console.log("");
    }
    
    function _createToken() internal {
        console.log("=== CREATE TOKEN ===");
        console.log("");
        
        (address tokenAddr, PoolId pid) = factory.createLaunch{value: 0.0003 ether}(
            ClawclickFactory.CreateParams({
                name: "ClawTest",
                symbol: "CTEST",
                beneficiary: DEPLOYER,
                agentWallet: address(0),
                isPremium: false
            })
        );
        
        token = ClawclickToken(tokenAddr);
        poolId = pid;
        
        console.log("Token: %s", address(token));
        console.log("Supply: %s", token.totalSupply() / 1e18);
        
        address ethAddr = address(0);
        (Currency c0, Currency c1) = ethAddr < tokenAddr
            ? (Currency.wrap(ethAddr), Currency.wrap(tokenAddr))
            : (Currency.wrap(tokenAddr), Currency.wrap(ethAddr));
        
        poolKey = PoolKey({
            currency0: c0,
            currency1: c1,
            fee: 0x800000,
            tickSpacing: 200,
            hooks: IHooks(address(hook))
        });
        
        console.log("Pool created");
        console.log("");
    }
    
    function _testGenesis() internal {
        console.log("=== GENESIS BUY (1 ETH) ===");
        console.log("");
        
        uint256 tBefore = token.balanceOf(DEPLOYER);
        uint256 eBefore = DEPLOYER.balance;
        
        poolManager.unlock(abi.encode(1 ether));
        
        uint256 tokensRx = token.balanceOf(DEPLOYER) - tBefore;
        uint256 ethSpent = eBefore - DEPLOYER.balance;
        
        console.log("ETH spent: %s", ethSpent / 1e18);
        console.log("Tokens received: %s M", tokensRx / 1e24);
        console.log("Allocation: %s%%", (tokensRx * 100) / token.totalSupply());
        
        _logState("Post-Genesis");
    }
    
    function _testBuys() internal {
        console.log("=== ADDITIONAL BUYS ===");
        console.log("");
        
        console.log("Buy 2: 0.4 ETH");
        _tryBuy(0.4 ether);
        
        console.log("Buy 3: 0.6 ETH (anti-snipe test)");
        _tryBuy(0.6 ether);
        
        console.log("Buy 4: 0.3 ETH");
        _tryBuy(0.3 ether);
        
        console.log("");
        _logState("After Buys");
    }
    
    function _tryBuy(uint256 amt) internal {
        uint256 tBefore = token.balanceOf(DEPLOYER);
        
        try poolManager.unlock(abi.encode(amt)) {
            uint256 rx = token.balanceOf(DEPLOYER) - tBefore;
            console.log("  SUCCESS - %s tokens", rx / 1e18);
        } catch Error(string memory reason) {
            console.log("  FAILED: %s", reason);
        } catch {
            console.log("  FAILED (no reason)");
        }
    }
    
    function _testFees() internal {
        console.log("=== CLAIM FEES ===");
        console.log("");
        
        uint256 before = DEPLOYER.balance;
        
        try hook.claimBeneficiaryFees() {
            uint256 claimed = DEPLOYER.balance - before;
            console.log("Claimed: %s ETH", claimed / 1e18);
        } catch Error(string memory reason) {
            console.log("Failed: %s", reason);
        } catch {
            console.log("Failed (no reason)");
        }
        console.log("");
    }
    
    function _logState(string memory label) internal view {
        console.log("");
        console.log("--- %s ---", label);
        
        (uint256 sold, , uint256 buys, uint256 benFee, uint256 platFee, uint256 vol) = hook.getLaunchState(poolId);
        
        uint256 mc;
        try hook.getMarketCap(poolKey) returns (uint256 _mc) { mc = _mc; } catch {}
        
        console.log("MC:       %s ETH", mc / 1e18);
        console.log("Buys:     %s", buys);
        console.log("Volume:   %s ETH", vol / 1e18);
        console.log("Sold:     %s M", sold / 1e24);
        console.log("BenFee:   %s ETH", benFee / 1e18);
        console.log("PlatFee:  %s ETH", platFee / 1e18);
        console.log("");
    }
    
    function _summary() internal view {
        console.log("===========================================");
        console.log("  TEST COMPLETE!");
        console.log("===========================================");
        console.log("");
        console.log("Deployed Addresses:");
        console.log("  Config:   %s", address(config));
        console.log("  Hook:     %s", address(hook));
        console.log("  Factory:  %s", address(factory));
        console.log("  Token:    %s", address(token));
        console.log("");
        console.log("Verify on Etherscan:");
        console.log("  https://sepolia.etherscan.io/address/%s", address(hook));
        console.log("  https://sepolia.etherscan.io/address/%s", address(factory));
        console.log("  https://sepolia.etherscan.io/address/%s", address(token));
        console.log("");
    }
    
    // IUnlockCallback
    function unlockCallback(bytes calldata data) external returns (bytes memory) {
        require(msg.sender == address(poolManager));
        
        uint256 ethAmount = abi.decode(data, (uint256));
        
        BalanceDelta delta = poolManager.swap(
            poolKey,
            IPoolManager.SwapParams({
                zeroForOne: true,
                amountSpecified: -int256(ethAmount),
                sqrtPriceLimitX96: TickMath.MIN_SQRT_PRICE + 1
            }),
            ""
        );
        
        if (delta.amount0() < 0) {
            poolManager.settle{value: uint256(-int256(delta.amount0()))}();
        }
        
        if (delta.amount1() > 0) {
            poolManager.take(poolKey.currency1, address(this), uint256(int256(delta.amount1())));
        }
        
        return "";
    }
    
    receive() external payable {}
}
