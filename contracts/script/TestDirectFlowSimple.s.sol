// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script} from "forge-std/Script.sol";
import {console2} from "forge-std/console2.sol";
import {IPoolManager} from "v4-core/src/interfaces/IPoolManager.sol";
import {PoolKey} from "v4-core/src/types/PoolKey.sol";
import {PoolId, PoolIdLibrary} from "v4-core/src/types/PoolId.sol";
import {Currency} from "v4-core/src/types/Currency.sol";
import {IClawclickFactory} from "../src/interfaces/IClawclickFactory.sol";
import {FixedPoint96} from "v4-core/src/libraries/FixedPoint96.sol";
import {FullMath} from "v4-core/src/libraries/FullMath.sol";
import {StateLibrary} from "v4-core/src/libraries/StateLibrary.sol";

contract TestDirectFlowSimple is Script {
    using PoolIdLibrary for PoolKey;
    using StateLibrary for IPoolManager;

    address constant FACTORY = 0x488626C043513F3ad48d1437bd0b04FB040947C5;
    address constant POOL_MANAGER = 0xE03A1074c86CFeDd5C142C4F04F1a1536e203543;
    address constant DEV_WALLET = 0x3472a51BAf1814B59bf7ac55C8CBA679189Bf0e7;
    
    uint256 constant TOTAL_SUPPLY = 1_000_000_000 * 1e18;
    
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);
        
        console2.log("=== DIRECT FLOW TEST ===");
        
        IClawclickFactory factory = IClawclickFactory(FACTORY);
        IPoolManager poolManager = IPoolManager(POOL_MANAGER);
        
        uint256 targetMcapETH = 3 ether;
        uint256 bootstrapETH = 0.001 ether;
        
        console2.log("Target MCAP:", targetMcapETH);
        console2.log("Bootstrap:", bootstrapETH);
        
        uint16[5] memory percentages;
        address[5] memory wallets;
        
        IClawclickFactory.CreateParams memory params = IClawclickFactory.CreateParams({
            name: "Direct Test",
            symbol: "DTEST",
            beneficiary: DEV_WALLET,
            agentWallet: address(0),
            targetMcapETH: targetMcapETH,
            feeSplit: IClawclickFactory.FeeSplit({
                wallets: wallets,
                percentages: percentages,
                count: 0
            }),
            launchType: IClawclickFactory.LaunchType.DIRECT
        });
        
        (address token, PoolId poolId) = factory.createLaunch{value: bootstrapETH}(params);
        
        console2.log("Token:");
        console2.logAddress(token);
        console2.log("PoolId:");
        console2.logBytes32(PoolId.unwrap(poolId));
        
        vm.stopBroadcast();
        
        // Verify
        IClawclickFactory.LaunchInfo memory info = factory.launchByToken(token);
        IClawclickFactory.PoolState memory state = factory.poolStates(poolId);
        (uint160 sqrtPriceX96,,,) = poolManager.getSlot0(poolId);
        
        uint256 currentMCAP = _calculateMCAP(sqrtPriceX96);
        
        console2.log("\n=== VERIFICATION ===");
        console2.log("LaunchType:", uint(info.launchType));
        console2.log("Hook address:");
        console2.logAddress(address(info.poolKey.hooks));
        console2.log("Pool fee:", info.poolKey.fee);
        console2.log("GraduationMCAP:", state.graduationMCAP);
        console2.log("Current MCAP:", currentMCAP);
        console2.log("Target MCAP:", targetMcapETH);
        
        bool hookIsZero = address(info.poolKey.hooks) == address(0);
        bool feeIs100 = info.poolKey.fee == 100;
        bool typeIsDirect = uint(info.launchType) == 0;
        bool gradIsZero = state.graduationMCAP == 0;
        
        uint256 mcapDiff = currentMCAP > targetMcapETH 
            ? currentMCAP - targetMcapETH 
            : targetMcapETH - currentMCAP;
        uint256 mcapDiffBps = (mcapDiff * 10000) / targetMcapETH;
        bool mcapMatches = mcapDiffBps < 100; // Within 1%
        
        console2.log("\nChecks:");
        console2.log("Hook is zero:", hookIsZero);
        console2.log("Fee is 100:", feeIs100);
        console2.log("Type is DIRECT:", typeIsDirect);
        console2.log("GradMCAP is 0:", gradIsZero);
        console2.log("MCAP matches:", mcapMatches);
        console2.log("MCAP diff (bps):", mcapDiffBps);
        
        console2.log("\nPositions:");
        for (uint i = 0; i < 5; i++) {
            if (state.positionMinted[i]) {
                console2.log("Position", i);
                console2.log("TokenId:", state.positionTokenIds[i]);
            }
        }
        
        bool allPassed = hookIsZero && feeIs100 && typeIsDirect && gradIsZero && mcapMatches;
        
        if (!allPassed) {
            revert("Verification failed");
        }
        
        console2.log("\n=== ALL CHECKS PASSED ===");
        console2.log("Explorer:");
        console2.logAddress(token);
    }
    
    function _calculateMCAP(uint160 sqrtPriceX96) internal pure returns (uint256) {
        uint256 Q96 = FixedPoint96.Q96;
        uint256 intermediate = FullMath.mulDiv(TOTAL_SUPPLY, Q96, sqrtPriceX96);
        return FullMath.mulDiv(intermediate, Q96, sqrtPriceX96);
    }
}
