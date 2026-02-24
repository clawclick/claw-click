// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";

contract VerifyHookAddress is Script {
    function run() external view {
        address hookAddr = 0xAb2380d35272b863CD2fbDcbfB2C088A0339E287;
        
        // Required flags from mining
        uint160 requiredFlags = 976951045657229538584396746088179420853990064128;
        
        // Check validation
        bool valid = (uint160(hookAddr) & requiredFlags) == requiredFlags;
        
        console2.log("Hook Address:", hookAddr);
        console2.log("Address as uint160:", uint160(hookAddr));
        console2.log("Required Flags:", requiredFlags);
        console2.log("Address & Flags:", uint160(hookAddr) & requiredFlags);
        console2.log("Valid:", valid);
        
        // Show binary representation of top bits
        uint160 addrInt = uint160(hookAddr);
        console2.log("");
        console2.log("Top 16 bits of address:");
        console2.log("Bit 159 (beforeInitialize):", (addrInt >> 159) & 1);
        console2.log("Bit 158 (afterInitialize):", (addrInt >> 158) & 1);
        console2.log("Bit 157 (beforeAddLiquidity):", (addrInt >> 157) & 1);
        console2.log("Bit 156 (afterAddLiquidity):", (addrInt >> 156) & 1);
        console2.log("Bit 155 (beforeRemoveLiquidity):", (addrInt >> 155) & 1);
        console2.log("Bit 154 (afterRemoveLiquidity):", (addrInt >> 154) & 1);
        console2.log("Bit 153 (beforeSwap):", (addrInt >> 153) & 1);
        console2.log("Bit 152 (afterSwap):", (addrInt >> 152) & 1);
        console2.log("Bit 151 (beforeDonate):", (addrInt >> 151) & 1);
        console2.log("Bit 150 (afterDonate):", (addrInt >> 150) & 1);
        console2.log("Bit 149 (beforeSwapReturnDelta):", (addrInt >> 149) & 1);
        console2.log("Bit 148 (afterSwapReturnDelta):", (addrInt >> 148) & 1);
        console2.log("Bit 147 (afterAddLiquidityReturnDelta):", (addrInt >> 147) & 1);
        console2.log("Bit 146 (afterRemoveLiquidityReturnDelta):", (addrInt >> 146) & 1);
    }
}
