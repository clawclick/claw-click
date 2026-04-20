// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IPoolManager} from "v4-core/src/interfaces/IPoolManager.sol";
import {PoolKey} from "v4-core/src/types/PoolKey.sol";
import {PoolId, PoolIdLibrary} from "v4-core/src/types/PoolId.sol";
import {Currency} from "v4-core/src/types/Currency.sol";
import {TickMath} from "v4-core/src/libraries/TickMath.sol";
import {IHooks} from "v4-core/src/interfaces/IHooks.sol";
import {LiquidityAmounts} from "v4-periphery/src/libraries/LiquidityAmounts.sol";

import {ClawclickToken} from "./ClawclickToken.sol";
import {ClawclickConfig} from "./ClawclickConfig.sol";
import {ClawclickHook} from "./ClawclickHook_V4.sol";
import {BootstrapETH} from "../utils/BootstrapETH.sol";
import {PriceMath} from "../libraries/PriceMath.sol";

contract ClawclickFactoryCore is Ownable, ReentrancyGuard {
    using PoolIdLibrary for PoolKey;

    uint256 public constant TOTAL_SUPPLY = 1_000_000_000 * 1e18;
    uint256 public constant BPS = 10000;
    uint256 public constant MIN_TARGET_MCAP = 1 ether;
    uint256 public constant MAX_TARGET_MCAP = 10 ether;

    enum LaunchType { DIRECT, AGENT }

    struct FeeSplit {
        address[5] wallets;
        uint16[5] percentages;
        uint8 count;
    }

    struct LaunchInfo {
        address token;
        address beneficiary;
        address agentWallet;
        address creator;
        PoolId poolId;
        PoolKey poolKey;
        uint256 targetMcapETH;
        uint256 createdAt;
        uint256 createdBlock;
        string name;
        string symbol;
        FeeSplit feeSplit;
        LaunchType launchType;
    }

    struct CreateParams {
        string name;
        string symbol;
        address beneficiary;
        address agentWallet;
        uint256 targetMcapETH;
        FeeSplit feeSplit;
        LaunchType launchType;
    }

    struct PoolState {
        address token;
        address beneficiary;
        uint256 startingMCAP;
        uint256 graduationMCAP;
        uint256 totalSupply;
        uint256[5] positionTokenIds;
        bool[5] positionMinted;
        bool[5] positionRetired;
        uint256 recycledETH;
        bool activated;
        bool graduated;
    }

    ClawclickConfig public immutable config;
    IPoolManager public immutable poolManager;
    ClawclickHook public immutable hook;
    address public immutable positionManager;
    BootstrapETH public immutable bootstrapETH;
    address public helper;

    uint256 public totalLaunches;
    mapping(address => LaunchInfo) internal _launchByToken;
    mapping(PoolId => LaunchInfo) internal _launchByPoolId;
    mapping(PoolId => PoolState) public poolStates;
    mapping(uint256 => PoolId) public tokenIdToPoolId;
    address[] public allTokens;

    event TokenLaunched(
        address indexed token,
        address indexed beneficiary,
        address indexed creator,
        PoolId poolId,
        uint256 targetMcapETH,
        uint160 sqrtPriceX96,
        string name,
        string symbol,
        LaunchType launchType
    );

    constructor(
        ClawclickConfig _config,
        IPoolManager _poolManager,
        ClawclickHook _hook,
        address _positionManager,
        BootstrapETH _bootstrapETH,
        address _owner
    ) Ownable(_owner) {
        config = _config;
        poolManager = _poolManager;
        hook = _hook;
        positionManager = _positionManager;
        bootstrapETH = _bootstrapETH;
    }

    function setHelper(address _helper) external onlyOwner {
        helper = _helper;
    }

    function createLaunch(CreateParams calldata params) 
        external 
        payable 
        nonReentrant
        returns (address token, PoolId poolId) 
    {
        if (config.paused()) revert("Paused");
        
        uint256 minBootstrap = config.MIN_BOOTSTRAP_ETH();
        uint256 bootstrapAmount;
        
        if (msg.value >= minBootstrap) {
            bootstrapAmount = msg.value;
        } else {
            if (address(bootstrapETH) != address(0) && bootstrapETH.isEligible(msg.sender)) {
                bool success = bootstrapETH.requestBootstrap(msg.sender, minBootstrap);
                require(success, "Bootstrap failed");
                bootstrapAmount = minBootstrap;
            } else {
                revert("Insufficient bootstrap");
            }
        }
        
        require(bytes(params.name).length > 0 && bytes(params.name).length <= 32, "Invalid name");
        require(bytes(params.symbol).length > 0 && bytes(params.symbol).length <= 10, "Invalid symbol");
        require(params.beneficiary != address(0), "Zero beneficiary");
        require(params.targetMcapETH >= MIN_TARGET_MCAP && params.targetMcapETH <= MAX_TARGET_MCAP, "Invalid MCAP");
        
        token = address(new ClawclickToken(
            params.name,
            params.symbol,
            address(this),
            params.beneficiary,
            params.agentWallet
        ));
        
        PoolKey memory key = _createPoolKey(token, params.launchType);
        uint160 sqrtPriceX96 = PriceMath.calculateSqrtPrice(params.targetMcapETH, TOTAL_SUPPLY, key.tickSpacing);
        poolId = key.toId();
        
        poolManager.initialize(key, sqrtPriceX96);
        
        if (params.launchType == LaunchType.AGENT) {
            hook.registerLaunch(key, token, params.beneficiary, params.targetMcapETH, sqrtPriceX96);
        }
        
        PoolState memory poolState = PoolState({
            token: token,
            beneficiary: params.beneficiary,
            startingMCAP: params.targetMcapETH,
            graduationMCAP: params.targetMcapETH * config.POSITION_MCAP_MULTIPLIER(),
            totalSupply: TOTAL_SUPPLY,
            positionTokenIds: [uint256(0), 0, 0, 0, 0],
            positionMinted: [false, false, false, false, false],
            positionRetired: [false, false, false, false, false],
            recycledETH: bootstrapAmount,
            activated: true,
            graduated: false
        });
        poolStates[poolId] = poolState;
        
        LaunchInfo memory info = LaunchInfo({
            token: token,
            beneficiary: params.beneficiary,
            agentWallet: params.agentWallet,
            creator: msg.sender,
            poolId: poolId,
            poolKey: key,
            targetMcapETH: params.targetMcapETH,
            createdAt: block.timestamp,
            createdBlock: block.number,
            name: params.name,
            symbol: params.symbol,
            feeSplit: params.feeSplit,
            launchType: params.launchType
        });
        
        _launchByToken[token] = info;
        _launchByPoolId[poolId] = info;
        allTokens.push(token);
        totalLaunches++;
        
        emit TokenLaunched(
            token,
            params.beneficiary,
            msg.sender,
            poolId,
            params.targetMcapETH,
            sqrtPriceX96,
            params.name,
            params.symbol,
            params.launchType
        );
        
        return (token, poolId);
    }

    function _createPoolKey(address token, LaunchType launchType) internal view returns (PoolKey memory) {
        Currency currency0 = Currency.wrap(address(0));
        Currency currency1 = Currency.wrap(token);
        
        if (launchType == LaunchType.DIRECT) {
            return PoolKey({
                currency0: currency0,
                currency1: currency1,
                fee: 10000,
                tickSpacing: 200,
                hooks: IHooks(address(0))
            });
        } else {
            return PoolKey({
                currency0: currency0,
                currency1: currency1,
                fee: 0x800000,
                tickSpacing: 60,
                hooks: IHooks(address(hook))
            });
        }
    }

    function launchByToken(address token) external view returns (LaunchInfo memory) {
        return _launchByToken[token];
    }
    
    function launchByPoolId(PoolId poolId) external view returns (LaunchInfo memory) {
        return _launchByPoolId[poolId];
    }

    function isDirectLaunch(PoolId poolId) external view returns (bool) {
        return _launchByPoolId[poolId].launchType == LaunchType.DIRECT;
    }

    function getPoolState(PoolId poolId) external view returns (
        address token,
        address beneficiary,
        uint256 startingMCAP,
        uint256 graduationMCAP,
        uint256 totalSupply,
        uint256 recycledETH,
        bool activated,
        bool graduated
    ) {
        PoolState storage state = poolStates[poolId];
        return (
            state.token,
            state.beneficiary,
            state.startingMCAP,
            state.graduationMCAP,
            state.totalSupply,
            state.recycledETH,
            state.activated,
            state.graduated
        );
    }

    function getPoolFlags(PoolId poolId) external view returns (
        uint256[5] memory positionTokenIds,
        bool[5] memory positionMinted,
        bool[5] memory positionRetired
    ) {
        PoolState storage state = poolStates[poolId];
        return (state.positionTokenIds, state.positionMinted, state.positionRetired);
    }

    function getLaunchInfo(PoolId poolId) external view returns (
        address token,
        PoolKey memory poolKey,
        address beneficiary,
        address creator,
        uint256 targetMcapETH,
        uint256 createdAt,
        string memory name,
        string memory symbol
    ) {
        LaunchInfo storage info = _launchByPoolId[poolId];
        return (
            info.token,
            info.poolKey,
            info.beneficiary,
            info.creator,
            info.targetMcapETH,
            info.createdAt,
            info.name,
            info.symbol
        );
    }

    function getPoolIdForPosition(uint256 tokenId) external view returns (PoolId) {
        return tokenIdToPoolId[tokenId];
    }

    function clearRecycledETH(PoolId poolId) external {
        require(msg.sender == helper, "Only helper");
        uint256 amount = poolStates[poolId].recycledETH;
        poolStates[poolId].recycledETH = 0;
        if (amount > 0) {
            (bool success,) = helper.call{value: amount}("");
            require(success, "ETH transfer failed");
        }
    }

    function addRecycledETH(PoolId poolId, uint256 amount) external {
        require(msg.sender == helper, "Only helper");
        poolStates[poolId].recycledETH += amount;
    }

    function storePositionTokenId(PoolId poolId, uint256 positionIndex, uint256 tokenId) external {
        require(msg.sender == helper, "Only helper");
        poolStates[poolId].positionTokenIds[positionIndex] = tokenId;
        poolStates[poolId].positionMinted[positionIndex] = true;
        tokenIdToPoolId[tokenId] = poolId;
    }

    function markPositionRetired(PoolId poolId, uint256 positionIndex) external {
        require(msg.sender == helper, "Only helper");
        poolStates[poolId].positionRetired[positionIndex] = true;
    }

    receive() external payable {}
}
