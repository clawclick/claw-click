// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script} from "forge-std/Script.sol";
import {console2} from "forge-std/console2.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title TransferOwnership
 * @notice Transfer ownership of all Clawclick ecosystem contracts to multisig SAFE
 * @dev Run on Base Mainnet with deployer private key
 * 
 * Usage:
 *   forge script script/transferownership.s.sol:TransferOwnership \
 *     --rpc-url $ALCHEMY_API_BASE \
 *     --private-key $MAINNET_DEPLOYER_PK \
 *     --broadcast \
 *     --verify
 * 
 * Transfers ownership to: 0xFf7549B06E68186C91a6737bc0f0CDE1245e349b (SAFE)
 */
contract TransferOwnership is Script {
    // ═══════════════════════════════════════════════════════════════════════════
    // CONFIGURATION
    // ═══════════════════════════════════════════════════════════════════════════
    
    /// @notice New owner (multisig SAFE)
    address constant NEW_OWNER = 0xFf7549B06E68186C91a6737bc0f0CDE1245e349b;
    
    /// @notice Base Mainnet contract addresses (from latest deployment)
    address constant CONFIG = 0x18b89e491d8f12d2be6D2A8e945dF4D93F1247a7;
    address constant HOOK = 0x8265be7eb9D7e40c1FAb6CBd8DBc626b31A0aac8;
    address constant FACTORY = 0xF5979D0fEEd05CEcb94cf62B76FE7E9aB40c6b4a;
    address constant BOOTSTRAP_ETH = 0xE2649737D3005c511a27DF6388871a12bE0a2d30;
    address constant BIRTH_CERT = 0x6E9B093FdD12eC34ce358bd70CF59EeCb5D1A95B;
    address constant MEMORY_STORAGE = 0x81ae37d31C488094bf292ebEb15C6eCfcD9Fad7D;
    address constant LAUNCH_BUNDLER = 0x1AF3b3Cd703Ff59D18A295f669Ad9B7051707268;
    
    // ═══════════════════════════════════════════════════════════════════════════
    // MAIN
    // ═══════════════════════════════════════════════════════════════════════════
    
    function run() external {
        console2.log("\n");
        console2.log("================================================================");
        console2.log("  CLAWCLICK OWNERSHIP TRANSFER");
        console2.log("  Base Mainnet -> Multisig SAFE");
        console2.log("================================================================");
        console2.log("");
        
        console2.log("New Owner (SAFE):", NEW_OWNER);
        console2.log("");
        
        // Verify we're on Base Mainnet (chain ID 8453)
        require(block.chainid == 8453, "WRONG NETWORK! Must be Base Mainnet (8453)");
        console2.log("Network: Base Mainnet (Chain ID: 8453)");
        console2.log("");
        
        uint256 deployerPrivateKey = vm.envUint("MAINNET_DEPLOYER_PK");
        address deployer = vm.addr(deployerPrivateKey);
        
        console2.log("Deployer:", deployer);
        console2.log("Balance:", deployer.balance / 1e18, "ETH");
        console2.log("");
        
        require(deployer.balance > 0.01 ether, "Insufficient ETH for gas");
        
        // ═══════ STEP 1: Check current ownership ═══════
        console2.log("================================================================");
        console2.log("  CHECKING CURRENT OWNERSHIP");
        console2.log("================================================================");
        console2.log("");
        
        _checkOwnership("Config", CONFIG, deployer);
        _checkOwnership("Hook", HOOK, deployer);
        _checkOwnership("Factory", FACTORY, deployer);
        _checkOwnership("BootstrapETH", BOOTSTRAP_ETH, deployer);
        _checkOwnership("BirthCert", BIRTH_CERT, deployer);
        _checkOwnership("MemoryStorage", MEMORY_STORAGE, deployer);
        _checkOwnership("LaunchBundler", LAUNCH_BUNDLER, deployer);
        
        console2.log("");
        
        // ═══════ STEP 2: Transfer ownership ═══════
        console2.log("================================================================");
        console2.log("  TRANSFERRING OWNERSHIP");
        console2.log("================================================================");
        console2.log("");
        
        vm.startBroadcast(deployerPrivateKey);
        
        _transferOwnership("Config", CONFIG);
        _transferOwnership("Hook", HOOK);
        _transferOwnership("Factory", FACTORY);
        _transferOwnership("BootstrapETH", BOOTSTRAP_ETH);
        _transferOwnership("BirthCert", BIRTH_CERT);
        _transferOwnership("MemoryStorage", MEMORY_STORAGE);
        _transferOwnership("LaunchBundler", LAUNCH_BUNDLER);
        
        vm.stopBroadcast();
        
        console2.log("");
        
        // ═══════ STEP 3: Verify new ownership ═══════
        console2.log("================================================================");
        console2.log("  VERIFYING NEW OWNERSHIP");
        console2.log("================================================================");
        console2.log("");
        
        _verifyOwnership("Config", CONFIG);
        _verifyOwnership("Hook", HOOK);
        _verifyOwnership("Factory", FACTORY);
        _verifyOwnership("BootstrapETH", BOOTSTRAP_ETH);
        _verifyOwnership("BirthCert", BIRTH_CERT);
        _verifyOwnership("MemoryStorage", MEMORY_STORAGE);
        _verifyOwnership("LaunchBundler", LAUNCH_BUNDLER);
        
        console2.log("");
        console2.log("================================================================");
        console2.log("  OWNERSHIP TRANSFER COMPLETE!");
        console2.log("  All contracts now owned by SAFE:", NEW_OWNER);
        console2.log("================================================================");
        console2.log("");
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // HELPERS
    // ═══════════════════════════════════════════════════════════════════════════
    
    function _checkOwnership(
        string memory name,
        address contractAddr,
        address expectedOwner
    ) internal view {
        try Ownable(contractAddr).owner() returns (address currentOwner) {
            console2.log(name, ":", contractAddr);
            console2.log("  Current Owner:", currentOwner);
            
            if (currentOwner == expectedOwner) {
                console2.log("  Status: YOU ARE OWNER (will transfer)");
            } else if (currentOwner == NEW_OWNER) {
                console2.log("  Status: ALREADY OWNED BY SAFE (skip)");
            } else {
                console2.log("  Status: OWNED BY DIFFERENT ADDRESS (cannot transfer)");
            }
            console2.log("");
        } catch {
            console2.log(name, ":", contractAddr);
            console2.log("  ERROR: Not Ownable or contract does not exist");
            console2.log("");
        }
    }
    
    function _transferOwnership(string memory name, address contractAddr) internal {
        try Ownable(contractAddr).owner() returns (address currentOwner) {
            if (currentOwner == NEW_OWNER) {
                console2.log(name, ": SKIP (already owned by SAFE)");
                return;
            }
            
            console2.log(name, ": Transferring...");
            Ownable(contractAddr).transferOwnership(NEW_OWNER);
            console2.log(name, ": SUCCESS");
        } catch {
            console2.log(name, ": FAILED (not Ownable or error)");
        }
    }
    
    function _verifyOwnership(string memory name, address contractAddr) internal view {
        try Ownable(contractAddr).owner() returns (address currentOwner) {
            console2.log(name, ":", contractAddr);
            console2.log("  Owner:", currentOwner);
            
            if (currentOwner == NEW_OWNER) {
                console2.log("  Status: VERIFIED (owned by SAFE)");
            } else {
                console2.log("  Status: WARNING - Not owned by SAFE!");
            }
            console2.log("");
        } catch {
            console2.log(name, ":", contractAddr);
            console2.log("  ERROR: Failed to verify");
            console2.log("");
        }
    }
}
