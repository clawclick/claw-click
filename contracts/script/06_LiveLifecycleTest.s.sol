// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";

import {IPoolManager} from "v4-core/src/interfaces/IPoolManager.sol";
import {IUnlockCallback} from "v4-core/src/interfaces/callback/IUnlockCallback.sol";
import {PoolKey} from "v4-core/src/types/PoolKey.sol";
import {PoolId} from "v4-core/src/types/PoolId.sol";
import {BalanceDelta} from "v4-core/src/types/BalanceDelta.sol";
import {SwapParams} from "v4-core/src/types/PoolOperation.sol";
import {Currency, CurrencyLibrary} from "v4-core/src/types/Currency.sol";

import "../src/core/ClawclickFactory.sol";
import "../src/core/ClawclickHook_V4.sol";
import "../src/core/ClawclickToken.sol";

contract LiveLifecycleTest is Script, IUnlockCallback {

    using CurrencyLibrary for Currency;

    IPoolManager constant poolManager =
        IPoolManager(0xE03A1074c86CFeDd5C142C4F04F1a1536e203543);

    PoolKey internal currentKey;
    SwapParams internal currentParams;
    address internal swapper;
    address internal tokenAddress;
    ClawclickHook internal hook;

    /*//////////////////////////////////////////////////////////////
                            ENTRY
    //////////////////////////////////////////////////////////////*/

    function run() external {

        uint256 pk = vm.envUint("PRIVATE_KEY");
        address factoryAddr = vm.envAddress("FACTORY");
        tokenAddress = vm.envAddress("TOKEN");

        ClawclickFactory factory = ClawclickFactory(factoryAddr);

        ClawclickFactory.LaunchInfo memory info =
            factory.getLaunchByToken(tokenAddress);

        currentKey = info.poolKey;

        hook = ClawclickHook(payable(address(currentKey.hooks)));

        vm.startBroadcast(pk);

        console2.log("========== PHASE 1 BUY ==========");
        _buy(1 ether);
        _printState();

        console2.log("========== PUMP ==========");
        _buy(2 ether);
        _printState();

        console2.log("========== FORCE GRADUATION ==========");
        _buy(8 ether);
        _printState();

        console2.log("========== SELL ==========");
        _sell(100_000 ether);
        _printState();

        vm.stopBroadcast();
    }

    /*//////////////////////////////////////////////////////////////
                                BUY
    //////////////////////////////////////////////////////////////*/

    function _buy(uint256 ethAmount) internal {

        currentParams = SwapParams({
            zeroForOne: true,
            amountSpecified: int256(ethAmount),
            sqrtPriceLimitX96: 4295128740
        });

        swapper = tx.origin;

        poolManager.unlock(abi.encode(ethAmount));
    }

    /*//////////////////////////////////////////////////////////////
                                SELL
    //////////////////////////////////////////////////////////////*/

    function _sell(uint256 tokenAmount) internal {

        ClawclickToken(tokenAddress)
            .approve(address(poolManager), tokenAmount);

        currentParams = SwapParams({
            zeroForOne: false,
            amountSpecified: int256(tokenAmount),
            sqrtPriceLimitX96:
                1461446703485210103287273052203988822378723970341
        });

        swapper = tx.origin;

        poolManager.unlock("");
    }

    /*//////////////////////////////////////////////////////////////
                            UNLOCK CALLBACK
    //////////////////////////////////////////////////////////////*/

    function unlockCallback(
        bytes calldata data
    ) external override returns (bytes memory) {

        require(msg.sender == address(poolManager), "Not PoolManager");

        uint256 ethValue =
            data.length > 0 ? abi.decode(data, (uint256)) : 0;

        BalanceDelta delta =
            poolManager.swap(currentKey, currentParams, "");

        if (currentParams.zeroForOne) {
            _settleBuy(delta, ethValue);
        } else {
            _settleSell(delta);
        }

        return abi.encode(delta);
    }

    /*//////////////////////////////////////////////////////////////
                            SETTLEMENT
    //////////////////////////////////////////////////////////////*/

    function _settleBuy(
        BalanceDelta delta,
        uint256 ethValue
    ) internal {

        int128 ethOwed = delta.amount0();
        int128 tokensOut = delta.amount1();

        if (ethOwed < 0) {
            uint256 pay = uint256(uint128(-ethOwed));
            poolManager.settle{value: pay}();

            if (ethValue > pay) {
                payable(swapper).transfer(ethValue - pay);
            }
        }

        if (tokensOut > 0) {
            poolManager.take(
                currentKey.currency1,
                swapper,
                uint256(uint128(tokensOut))
            );
        }
    }

    function _settleSell(
        BalanceDelta delta
    ) internal {

        int128 tokensOwed = delta.amount1();
        int128 ethOut = delta.amount0();

        if (tokensOwed < 0) {
            uint256 pay = uint256(uint128(-tokensOwed));
            ClawclickToken(
                Currency.unwrap(currentKey.currency1)
            ).transfer(address(poolManager), pay);

            poolManager.settle();
        }

        if (ethOut > 0) {
            poolManager.take(
                currentKey.currency0,
                swapper,
                uint256(uint128(ethOut))
            );
        }
    }

    /*//////////////////////////////////////////////////////////////
                            STATE PRINT
    //////////////////////////////////////////////////////////////*/

    function _printState() internal view {

        PoolId poolId = currentKey.toId();

        uint256 epoch = hook.getCurrentEpoch(poolId);
        uint256 tax = hook.getCurrentTax(poolId);
        bool graduated = hook.isGraduated(poolId);

        console2.log("Epoch:", epoch);
        console2.log("Tax BPS:", tax);
        console2.log("Graduated:", graduated);
        console2.log("-----------------------------");
    }

    receive() external payable {}
}