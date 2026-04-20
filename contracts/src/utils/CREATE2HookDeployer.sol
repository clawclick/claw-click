// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ClawclickHook} from "../core/ClawclickHook_V4.sol";
import {ClawclickConfig} from "../core/ClawclickConfig.sol";
import {IPoolManager} from "v4-core/src/interfaces/IPoolManager.sol";

contract CREATE2HookDeployer {
    event HookDeployed(address hook, bytes32 salt, uint160 flags);
    
    function deployHook(
        address poolManager,
        address config,
        bytes32 salt
    ) external returns (address) {
        ClawclickHook hook = new ClawclickHook{salt: salt}(
            IPoolManager(poolManager),
            ClawclickConfig(config)
        );
        
        uint160 flags = uint160(address(hook));
        emit HookDeployed(address(hook), salt, flags);
        
        return address(hook);
    }
    
    function computeAddress(
        address poolManager,
        address config,
        bytes32 salt,
        address deployer
    ) external view returns (address) {
        bytes32 initCodeHash = keccak256(abi.encodePacked(
            type(ClawclickHook).creationCode,
            abi.encode(poolManager, config)
        ));
        
        return address(uint160(uint256(keccak256(abi.encodePacked(
            bytes1(0xff),
            deployer,
            salt,
            initCodeHash
        )))));
    }
}
