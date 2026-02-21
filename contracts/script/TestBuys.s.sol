// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/core/ClawclickFactory.sol";
import "../test/TestSwapRouter.sol";
import {IPoolManager} from "v4-core/src/interfaces/IPoolManager.sol";
import {PoolKey} from "v4-core/src/types/PoolKey.sol";
import {PoolId, PoolIdLibrary} from "v4-core/src/types/PoolId.sol";
import {Currency} from "v4-core/src/types/Currency.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title TestBuys
 * @notice Fund 3 fresh wallets, execute small test buys from each on Sepolia.
 *         MaxTx for 1 ETH MCAP = 0.1% of supply = 1e24 tokens,
 *         so we use 0.001 ETH buys (~0.5e24 tokens after 50% tax).
 *
 * Usage:
 *   forge script script/TestBuys.s.sol \
 *     --rpc-url $ETH_SEPOLIA_RPC_URL --broadcast --via-ir -vvv
 */
contract TestBuys is Script {
    using PoolIdLibrary for PoolKey;

    // --- Deployed addresses from DeployAndActivate ---
    address constant FACTORY_ADDR = 0x00cE3F7e4701e5c0FC9798a3b8bA33C7d767068B;
    address constant ROUTER_ADDR  = 0xCE03f9aeD760f3F5C471C1A76Ff4a8F84743b795;
    address constant TOKEN_ADDR   = 0x6E0A27e0C01D767AE3f968D06fFF1B74DC3ed185;

    uint256 constant BUY_AMOUNT   = 0.001 ether;   // Small enough to stay under maxTx
    uint256 constant FUND_AMOUNT  = 0.003 ether;   // Enough for buy + gas

    function _getPoolKey() internal view returns (PoolKey memory) {
        ClawclickFactory factory = ClawclickFactory(payable(FACTORY_ADDR));
        ClawclickFactory.LaunchInfo memory info = factory.launchByToken(TOKEN_ADDR);
        return info.poolKey;
    }

    function _doBuy(PoolKey memory key, uint256 amt) internal {
        TestSwapRouter router = TestSwapRouter(payable(ROUTER_ADDR));
        router.buy{value: amt}(key, amt);
    }

    function run() external {
        uint256 deployerPk = vm.envUint("PRIVATE_KEY");
        address deployer   = vm.addr(deployerPk);

        // Deterministic fresh wallets (test-only keys, Sepolia only)
        uint256 pk1 = uint256(keccak256("clawclick_test_buyer_1"));
        uint256 pk2 = uint256(keccak256("clawclick_test_buyer_2"));
        uint256 pk3 = uint256(keccak256("clawclick_test_buyer_3"));
        address buyer1 = vm.addr(pk1);
        address buyer2 = vm.addr(pk2);
        address buyer3 = vm.addr(pk3);

        PoolKey memory key = _getPoolKey();
        IERC20 token = IERC20(TOKEN_ADDR);

        console2.log("=== FRESH WALLET TEST BUYS ===");
        console2.log("Deployer:", deployer);
        console2.log("Deployer balance:", deployer.balance);
        console2.log("Buyer 1:", buyer1);
        console2.log("Buyer 2:", buyer2);
        console2.log("Buyer 3:", buyer3);
        console2.log("");

        // ---- Step 1: Fund fresh wallets from deployer ----
        console2.log("--- FUNDING FRESH WALLETS ---");
        vm.startBroadcast(deployerPk);
        payable(buyer1).transfer(FUND_AMOUNT);
        payable(buyer2).transfer(FUND_AMOUNT);
        payable(buyer3).transfer(FUND_AMOUNT);
        vm.stopBroadcast();
        console2.log("Funded 3 wallets with", FUND_AMOUNT, "each");

        // ---- Step 2: Buy from Buyer 1 ----
        console2.log("");
        console2.log("--- BUY 1 from", buyer1, "---");
        vm.startBroadcast(pk1);
        _doBuy(key, BUY_AMOUNT);
        vm.stopBroadcast();
        uint256 bal1 = token.balanceOf(buyer1);
        console2.log("Buyer 1 tokens:", bal1);

        // ---- Step 3: Buy from Buyer 2 ----
        console2.log("");
        console2.log("--- BUY 2 from", buyer2, "---");
        vm.startBroadcast(pk2);
        _doBuy(key, BUY_AMOUNT);
        vm.stopBroadcast();
        uint256 bal2 = token.balanceOf(buyer2);
        console2.log("Buyer 2 tokens:", bal2);

        // ---- Step 4: Buy from Buyer 3 ----
        console2.log("");
        console2.log("--- BUY 3 from", buyer3, "---");
        vm.startBroadcast(pk3);
        _doBuy(key, BUY_AMOUNT);
        vm.stopBroadcast();
        uint256 bal3 = token.balanceOf(buyer3);
        console2.log("Buyer 3 tokens:", bal3);

        // ---- Summary ----
        console2.log("");
        console2.log("=== ALL 3 BUYS COMPLETE ===");
        console2.log("Buyer 1 tokens:", bal1);
        console2.log("Buyer 2 tokens:", bal2);
        console2.log("Buyer 3 tokens:", bal3);
        console2.log("Total ETH spent:", BUY_AMOUNT * 3);
        console2.log("");
        console2.log("Token:", TOKEN_ADDR);
        console2.log("https://sepolia.etherscan.io/address/", TOKEN_ADDR);
    }
}
