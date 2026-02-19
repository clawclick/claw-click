// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/core/ClawclickConfig.sol";
import "../src/core/ClawclickHook_V4.sol";
import "../src/core/ClawclickFactory.sol";
import "../src/core/ClawclickToken.sol";
import "../src/utils/HookMiner.sol";
import {IPoolManager} from "v4-core/src/interfaces/IPoolManager.sol";
import {IPositionManager} from "v4-periphery/src/interfaces/IPositionManager.sol";
import {PoolKey} from "v4-core/src/types/PoolKey.sol";
import {PoolId, PoolIdLibrary} from "v4-core/src/types/PoolId.sol";
import {BalanceDelta} from "v4-core/src/types/BalanceDelta.sol";
import {Currency} from "v4-core/src/types/Currency.sol";
import {IHooks} from "v4-core/src/interfaces/IHooks.sol";
import {Hooks} from "v4-core/src/libraries/Hooks.sol";
import {StateLibrary} from "v4-core/src/libraries/StateLibrary.sol";
import {TickMath} from "v4-core/src/libraries/TickMath.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {TestSwapRouter} from "./TestSwapRouter.sol";

/**
 * @title BaseTest
 * @notice Shared harness for all Clawclick fork tests on Ethereum Sepolia
 * @dev Deploys Config → Hook (CREATE2 mined) → Factory → SwapRouter on an ETH Sepolia fork
 *
 * NEW SYSTEM (multi-position):
 *   - Pools are activated at launch with bootstrap ETH (no separate activation step)
 *   - No keeper/reposition system — multi-position management is automatic via hook
 *   - tickSpacing = 60 (was 200)
 *   - Starting epoch = 1 (was 0)
 *   - Universal 50% base tax for all MCAPs
 */
abstract contract BaseTest is Test {
    using PoolIdLibrary for PoolKey;
    using StateLibrary for IPoolManager;

    /*//////////////////////////////////////////////////////////////
                      ETH SEPOLIA ADDRESSES
    //////////////////////////////////////////////////////////////*/

    address constant POOL_MANAGER = 0xE03A1074c86CFeDd5C142C4F04F1a1536e203543;
    address constant POSITION_MANAGER = 0x429ba70129df741B2Ca2a85BC3A2a3328e5c09b4;

    /*//////////////////////////////////////////////////////////////
                            TEST STATE
    //////////////////////////////////////////////////////////////*/

    ClawclickConfig public config;
    ClawclickHook public hook;
    ClawclickFactory public factory;
    TestSwapRouter public router;

    address public deployer;
    address public treasury;
    address public beneficiary;
    address public alice;
    address public bob;

    uint256 public constant TOTAL_SUPPLY = 1_000_000_000 * 1e18;

    /*//////////////////////////////////////////////////////////////
                              SETUP
    //////////////////////////////////////////////////////////////*/

    function setUp() public virtual {
        // Fork Ethereum Sepolia (where Uniswap v4 PoolManager is deployed)
        string memory rpc = vm.envString("ETH_SEPOLIA_RPC_URL");
        vm.createSelectFork(rpc);

        // Label actors
        deployer = makeAddr("deployer");
        treasury = makeAddr("treasury");
        beneficiary = makeAddr("beneficiary");
        alice = makeAddr("alice");
        bob = makeAddr("bob");

        // Fund actors
        vm.deal(deployer, 100 ether);
        vm.deal(alice, 100 ether);
        vm.deal(bob, 100 ether);

        // 1. Deploy Config
        vm.startPrank(deployer);
        config = new ClawclickConfig(treasury, deployer);
        vm.stopPrank();

        // 2. Deploy Hook via CREATE2 with correct permission flags
        // Hook must be deployed from the test contract (no prank) so CREATE2
        // deployer = address(this) matches HookMiner prediction
        _deployHook();

        // 3. Deploy Factory + wire config (as deployer/owner)
        vm.startPrank(deployer);
        factory = new ClawclickFactory(
            config,
            IPoolManager(POOL_MANAGER),
            hook,
            POSITION_MANAGER,
            deployer
        );

        // 4. Wire Factory into Config
        config.setFactory(address(factory));
        vm.stopPrank();

        // 5. Deploy swap router for tests
        router = new TestSwapRouter(IPoolManager(POOL_MANAGER));
        vm.deal(address(router), 50 ether);
    }

    /*//////////////////////////////////////////////////////////////
                          HOOK DEPLOYMENT
    //////////////////////////////////////////////////////////////*/

    function _deployHook() internal {
        // Required permission flags
        Hooks.Permissions memory perms = Hooks.Permissions({
            beforeInitialize: true,
            afterInitialize: false,
            beforeAddLiquidity: true,
            afterAddLiquidity: false,
            beforeRemoveLiquidity: true,
            afterRemoveLiquidity: false,
            beforeSwap: true,
            afterSwap: true,
            beforeDonate: false,
            afterDonate: false,
            beforeSwapReturnDelta: true,
            afterSwapReturnDelta: false,
            afterAddLiquidityReturnDelta: false,
            afterRemoveLiquidityReturnDelta: false
        });

        uint160 requiredFlags = _encodePermissions(perms);

        bytes memory creationCode = type(ClawclickHook).creationCode;
        bytes memory constructorArgs = abi.encode(POOL_MANAGER, address(config));

        (address predicted, bytes32 salt) = HookMiner.find(
            address(this),
            requiredFlags,
            creationCode,
            constructorArgs
        );

        // Deploy using the mined salt
        hook = new ClawclickHook{salt: salt}(
            IPoolManager(POOL_MANAGER),
            config
        );

        require(address(hook) == predicted, "Hook address mismatch");
    }

    function _encodePermissions(Hooks.Permissions memory perms) internal pure returns (uint160) {
        return uint160(
            (perms.beforeInitialize ? 1 << 13 : 0) |
            (perms.afterInitialize ? 1 << 12 : 0) |
            (perms.beforeAddLiquidity ? 1 << 11 : 0) |
            (perms.afterAddLiquidity ? 1 << 10 : 0) |
            (perms.beforeRemoveLiquidity ? 1 << 9 : 0) |
            (perms.afterRemoveLiquidity ? 1 << 8 : 0) |
            (perms.beforeSwap ? 1 << 7 : 0) |
            (perms.afterSwap ? 1 << 6 : 0) |
            (perms.beforeDonate ? 1 << 5 : 0) |
            (perms.afterDonate ? 1 << 4 : 0) |
            (perms.beforeSwapReturnDelta ? 1 << 3 : 0) |
            (perms.afterSwapReturnDelta ? 1 << 2 : 0) |
            (perms.afterAddLiquidityReturnDelta ? 1 << 1 : 0) |
            (perms.afterRemoveLiquidityReturnDelta ? 1 << 0 : 0)
        );
    }

    /*//////////////////////////////////////////////////////////////
                          HELPERS
    //////////////////////////////////////////////////////////////*/

    /// @notice Create a launch (pool activated at launch with bootstrap ETH)
    /// @dev New system: createLaunch requires fee + bootstrap ETH together.
    ///      We send 0.1 ETH bootstrap for deeper initial liquidity (factory uses all excess above fee).
    function _createLaunch(
        uint256 targetMcapETH,
        address _beneficiary
    ) internal returns (address token, PoolId poolId, PoolKey memory key) {
        uint256 fee = factory.getFee(false);
        uint256 bootstrapETH = 0.1 ether;  // Deeper liquidity to avoid maxWallet issues
        uint256 totalRequired = fee + bootstrapETH;

        ClawclickFactory.CreateParams memory params = ClawclickFactory.CreateParams({
            name: "Test Token",
            symbol: "TEST",
            beneficiary: _beneficiary,
            agentWallet: _beneficiary,
            isPremium: false,
            targetMcapETH: targetMcapETH
        });
        (token, poolId) = factory.createLaunch{value: totalRequired}(params);
        key = _buildPoolKey(token);
    }

    /// @notice Create a launch with custom name/symbol
    function _createLaunchNamed(
        string memory name,
        string memory symbol,
        uint256 targetMcapETH,
        address _beneficiary
    ) internal returns (address token, PoolId poolId, PoolKey memory key) {
        uint256 fee = factory.getFee(false);
        uint256 bootstrapETH = 0.1 ether;  // Deeper liquidity to avoid maxWallet issues
        uint256 totalRequired = fee + bootstrapETH;

        ClawclickFactory.CreateParams memory params = ClawclickFactory.CreateParams({
            name: name,
            symbol: symbol,
            beneficiary: _beneficiary,
            agentWallet: _beneficiary,
            isPremium: false,
            targetMcapETH: targetMcapETH
        });
        (token, poolId) = factory.createLaunch{value: totalRequired}(params);
        key = _buildPoolKey(token);
    }

    /// @notice Build pool key for a token
    function _buildPoolKey(address token) internal view returns (PoolKey memory) {
        return PoolKey({
            currency0: Currency.wrap(address(0)),
            currency1: Currency.wrap(token),
            fee: 0x800000,
            tickSpacing: 60,  // New system uses tickSpacing=60
            hooks: IHooks(address(hook))
        });
    }

    /// @notice Execute a buy swap (ETH → Token) through the test router
    /// @dev After swap completes, auto-mints any pending positions (P2-P5)
    function _buy(PoolKey memory key, uint256 ethAmount) internal returns (BalanceDelta delta) {
        delta = router.buy{value: ethAmount}(key, ethAmount);
        _autoMintPositions(key);
    }

    /// @notice Buy from a fresh unique wallet (never reused) to avoid maxWallet issues
    /// @dev Creates a new address, funds it, buys, and stops prank. Perfect for volume simulation.
    uint256 private _freshWalletNonce;
    function _buyFromFreshWallet(PoolKey memory key, uint256 ethAmount) internal returns (BalanceDelta delta) {
        _freshWalletNonce++;
        address freshTrader = makeAddr(string(abi.encodePacked("fw", vm.toString(_freshWalletNonce))));
        vm.deal(freshTrader, ethAmount + 0.01 ether); // extra for gas
        vm.prank(freshTrader);
        delta = router.buy{value: ethAmount}(key, ethAmount);
        _autoMintPositions(key);
    }

    /// @notice Auto-mint any pending positions after a swap
    /// @dev Checks hook's poolProgress.currentPosition and mints unminted positions
    ///      Called after every swap to ensure positions are minted as the price progresses
    function _autoMintPositions(PoolKey memory key) internal {
        PoolId pid = key.toId();
        (uint256 currentPos,,,) = hook.poolProgress(pid);
        // positions 1..currentPos should be minted (factory index = position - 1)
        for (uint256 i = 0; i < currentPos && i < 5; i++) {
            try factory.mintNextPosition(pid, i) {} catch {}
        }
    }

    /// @notice Execute a sell swap (Token → ETH) through the test router
    function _sell(PoolKey memory key, address token, uint256 tokenAmount) internal returns (BalanceDelta delta) {
        IERC20(token).approve(address(router), tokenAmount);
        delta = router.sell(key, tokenAmount);
    }

    /// @notice Get current MCAP for a pool
    function _getCurrentMcap(PoolId poolId) internal view returns (uint256) {
        (uint160 sqrtPriceX96,,,) = IPoolManager(POOL_MANAGER).getSlot0(poolId);
        return _mcapFromSqrtPrice(sqrtPriceX96);
    }

    /// @notice Calculate MCAP from sqrtPrice  
    function _mcapFromSqrtPrice(uint160 sqrtPriceX96) internal pure returns (uint256) {
        uint256 intermediate = (TOTAL_SUPPLY * (1 << 96)) / uint256(sqrtPriceX96);
        return (intermediate * (1 << 96)) / uint256(sqrtPriceX96);
    }

    /// @notice Create launch — pool is already activated at creation
    /// @dev activationETH parameter kept for backward compat but ignored (bootstrap is automatic)
    function _createAndActivate(
        uint256 targetMcapETH,
        address _beneficiary,
        uint256 /* activationETH */
    ) internal returns (address token, PoolId poolId, PoolKey memory key) {
        (token, poolId, key) = _createLaunch(targetMcapETH, _beneficiary);
    }

    /// @notice Create launch with custom name — pool is already activated at creation
    function _createAndActivateNamed(
        string memory name,
        string memory symbol,
        uint256 targetMcapETH,
        address _beneficiary,
        uint256 /* activationETH */
    ) internal returns (address token, PoolId poolId, PoolKey memory key) {
        (token, poolId, key) = _createLaunchNamed(name, symbol, targetMcapETH, _beneficiary);
    }
}
