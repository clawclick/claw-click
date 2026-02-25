// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IPoolManager} from "v4-core/src/interfaces/IPoolManager.sol";
import {PoolKey} from "v4-core/src/types/PoolKey.sol";
import {PoolId, PoolIdLibrary} from "v4-core/src/types/PoolId.sol";
import {Currency} from "v4-core/src/types/Currency.sol";
import {TickMath} from "v4-core/src/libraries/TickMath.sol";
import {StateLibrary} from "v4-core/src/libraries/StateLibrary.sol";
import {IPositionManager} from "v4-periphery/src/interfaces/IPositionManager.sol";
import {Actions} from "v4-periphery/src/libraries/Actions.sol";
import {IAllowanceTransfer} from "permit2/src/interfaces/IAllowanceTransfer.sol";
import {LiquidityAmounts} from "v4-periphery/src/libraries/LiquidityAmounts.sol";

import {ClawclickToken} from "./ClawclickToken.sol";
import {ClawclickConfig} from "./ClawclickConfig.sol";
import {ClawclickHook} from "./ClawclickHook_V4.sol";
import {IClawclickFactoryCore} from "../interfaces/IClawclickFactoryCore.sol";
import {PriceMath} from "../libraries/PriceMath.sol";

contract ClawclickFactoryHelper is ReentrancyGuard {
    using PoolIdLibrary for PoolKey;
    using StateLibrary for IPoolManager;

    uint256 public constant BPS = 10000;
    address public constant PERMIT2 = 0x000000000022D473030F116dDEE9F6B43aC78BA3;

    IClawclickFactoryCore public immutable factoryCore;
    ClawclickConfig public immutable config;
    IPoolManager public immutable poolManager;
    ClawclickHook public immutable hook;
    address public immutable positionManager;

    constructor(
        address _factoryCore,
        ClawclickConfig _config,
        IPoolManager _poolManager,
        ClawclickHook _hook,
        address _positionManager
    ) {
        factoryCore = IClawclickFactoryCore(_factoryCore);
        config = _config;
        poolManager = _poolManager;
        hook = _hook;
        positionManager = _positionManager;
    }

    function mintNextPosition(PoolId poolId, uint256 positionIndex) external nonReentrant {
        (,, uint256 startingMCAP,, uint256 totalSupply, uint256 recycledETH,,) = factoryCore.getPoolState(poolId);
        (, bool[5] memory minted,) = factoryCore.getPoolFlags(poolId);
        require(!minted[positionIndex], "Already minted");
        
        (int24[5] memory tickLowers, int24[5] memory tickUppers, uint256[5] memory allocations) = 
            PriceMath.calculatePositionRanges(startingMCAP, totalSupply);
        
        (, PoolKey memory poolKey,,,,,,) = factoryCore.getLaunchInfo(poolId);
        
        (uint160 curSqrtPrice,,,) = poolManager.getSlot0(poolId);
        uint160 sqrtLower = TickMath.getSqrtPriceAtTick(tickLowers[positionIndex]);
        uint160 sqrtUpper = TickMath.getSqrtPriceAtTick(tickUppers[positionIndex]);
        
        uint128 liq = LiquidityAmounts.getLiquidityForAmounts(
            curSqrtPrice, sqrtLower, sqrtUpper, recycledETH, allocations[positionIndex]
        );
        require(liq > 0, "Position liquidity still 0 at current price");
        
        factoryCore.clearRecycledETH(poolId);
        
        uint256 tokenId = _mintPositionViaManager(
            poolKey,
            tickLowers[positionIndex],
            tickUppers[positionIndex],
            allocations[positionIndex],
            recycledETH
        );
        
        factoryCore.storePositionTokenId(poolId, positionIndex, tokenId);
    }

    function retireOldPosition(PoolId poolId, uint256 positionIndex) external nonReentrant {
        require(msg.sender == address(hook), "Only hook");
        
        (uint256[5] memory posTokenIds,,) = factoryCore.getPoolFlags(poolId);
        uint256 tokenId = posTokenIds[positionIndex];
        require(tokenId != 0, "Invalid token ID");
        
        (uint256 ethRecovered, uint256 tokensRecovered) = _withdrawPositionViaManager(tokenId);
        factoryCore.addRecycledETH(poolId, ethRecovered);
        factoryCore.markPositionRetired(poolId, positionIndex);
    }

    function collectFeesFromPosition(PoolId poolId, uint256 positionIndex) external nonReentrant {
        (uint256[5] memory posTokenIds, bool[5] memory minted, bool[5] memory retired) = factoryCore.getPoolFlags(poolId);
        require(minted[positionIndex], "Position not minted");
        require(!retired[positionIndex], "Position retired");
        
        uint256 tokenId = posTokenIds[positionIndex];
        require(tokenId != 0, "No position");
        
        (address token, PoolKey memory poolKey, address beneficiary, address creator,,,,) = factoryCore.getLaunchInfo(poolId);
        
        uint256 ethBefore = address(this).balance;
        uint256 tokenBefore = ClawclickToken(token).balanceOf(address(this));
        
        bytes memory actions = abi.encodePacked(
            uint8(Actions.DECREASE_LIQUIDITY),
            uint8(Actions.CLOSE_CURRENCY),
            uint8(Actions.CLOSE_CURRENCY)
        );
        
        bytes[] memory params = new bytes[](3);
        params[0] = abi.encode(tokenId, uint256(0), uint128(0), uint128(0), bytes(""));
        params[1] = abi.encode(poolKey.currency0);
        params[2] = abi.encode(poolKey.currency1);
        
        bytes memory unlockData = abi.encode(actions, params);
        IPositionManager(positionManager).modifyLiquidities(unlockData, block.timestamp + 1 hours);
        
        uint256 ethGained = address(this).balance - ethBefore;
        uint256 tokenGained = ClawclickToken(token).balanceOf(address(this)) - tokenBefore;
        
        if (ethGained > 0) {
            uint256 beneficiaryETH = (ethGained * 7000) / BPS;
            uint256 platformETH = ethGained - beneficiaryETH;
            
            if (platformETH > 0) {
                (bool ok,) = config.treasury().call{value: platformETH}("");
                require(ok, "Platform ETH transfer failed");
            }
            if (beneficiaryETH > 0) {
                (bool ok,) = beneficiary.call{value: beneficiaryETH}("");
                require(ok, "Beneficiary ETH transfer failed");
            }
        }
        
        if (tokenGained > 0) {
            uint256 beneficiaryTokens = (tokenGained * 7000) / BPS;
            uint256 platformTokens = tokenGained - beneficiaryTokens;
            
            if (platformTokens > 0) {
                ClawclickToken(token).transfer(config.treasury(), platformTokens);
            }
            if (beneficiaryTokens > 0) {
                ClawclickToken(token).transfer(beneficiary, beneficiaryTokens);
            }
        }
    }

    function _mintPositionViaManager(
        PoolKey memory key,
        int24 tickLower,
        int24 tickUpper,
        uint256 tokenAmount,
        uint256 ethAmount
    ) internal returns (uint256 tokenId) {
        address token = Currency.unwrap(key.currency1);
        
        (uint160 sqrtPriceX96,,,) = poolManager.getSlot0(key.toId());
        uint160 sqrtPriceLowerX96 = TickMath.getSqrtPriceAtTick(tickLower);
        uint160 sqrtPriceUpperX96 = TickMath.getSqrtPriceAtTick(tickUpper);
        
        uint128 liquidity = LiquidityAmounts.getLiquidityForAmounts(
            sqrtPriceX96,
            sqrtPriceLowerX96,
            sqrtPriceUpperX96,
            ethAmount,
            tokenAmount
        );
        
        require(liquidity > 0, "Liquidity must be > 0");
        
        ClawclickToken(token).approve(PERMIT2, tokenAmount);
        IAllowanceTransfer(PERMIT2).approve(
            token,
            positionManager,
            type(uint160).max,
            type(uint48).max
        );
        
        bytes memory actions = abi.encodePacked(
            uint8(Actions.MINT_POSITION),
            uint8(Actions.CLOSE_CURRENCY),
            uint8(Actions.CLOSE_CURRENCY)
        );
        
        bytes[] memory params = new bytes[](3);
        params[0] = abi.encode(
            key,
            tickLower,
            tickUpper,
            uint256(liquidity),
            uint128(ethAmount),
            uint128(tokenAmount),
            address(this),
            bytes("")
        );
        params[1] = abi.encode(key.currency0);
        params[2] = abi.encode(key.currency1);
        
        bytes memory unlockData = abi.encode(actions, params);
        IPositionManager(positionManager).modifyLiquidities{value: ethAmount}(unlockData, block.timestamp + 1 hours);
        
        tokenId = IPositionManager(positionManager).nextTokenId() - 1;
    }

    function _withdrawPositionViaManager(uint256 tokenId) internal returns (uint256 ethAmount, uint256 tokenAmount) {
        uint128 liquidity = IPositionManager(positionManager).getPositionLiquidity(tokenId);
        require(liquidity > 0, "No liquidity");
        
        PoolId poolId = factoryCore.getPoolIdForPosition(tokenId);
        (, PoolKey memory key,,,,,,) = factoryCore.getLaunchInfo(poolId);
        
        uint256 ethBefore = address(this).balance;
        address token = Currency.unwrap(key.currency1);
        uint256 tokenBefore = ClawclickToken(token).balanceOf(address(this));
        
        bytes memory actions = abi.encodePacked(
            uint8(Actions.DECREASE_LIQUIDITY),
            uint8(Actions.BURN_POSITION),
            uint8(Actions.CLOSE_CURRENCY),
            uint8(Actions.CLOSE_CURRENCY)
        );
        
        bytes[] memory params = new bytes[](4);
        params[0] = abi.encode(tokenId, uint256(liquidity), uint128(0), uint128(0), bytes(""));
        params[1] = abi.encode(tokenId, uint128(0), uint128(0), bytes(""));
        params[2] = abi.encode(key.currency0);
        params[3] = abi.encode(key.currency1);
        
        bytes memory unlockData = abi.encode(actions, params);
        IPositionManager(positionManager).modifyLiquidities(unlockData, block.timestamp + 1 hours);
        
        ethAmount = address(this).balance - ethBefore;
        tokenAmount = ClawclickToken(token).balanceOf(address(this)) - tokenBefore;
    }

    receive() external payable {}
}
