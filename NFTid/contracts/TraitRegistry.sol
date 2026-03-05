// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title TraitRegistry
 * @notice Stores trait metadata (names, weights, IPFS CIDs) for Clawd NFTs
 * @dev Immutable after deployment - traits cannot be changed
 */
contract TraitRegistry is Ownable {
    struct TraitMetadata {
        string name;
        uint8 weight;
        string ipfsCID;
    }
    
    // Layer name => trait index => metadata
    mapping(string => mapping(uint8 => TraitMetadata)) public traits;
    
    // Track which layers have been initialized
    mapping(string => bool) public layerInitialized;
    
    bool public locked;
    
    event TraitsRegistered(string layer, uint8 count);
    event RegistryLocked();
    
    /**
     * @notice Register traits for a layer (can only be done once per layer)
     * @param layer Layer name ("auras", "backgrounds", "cores", "eyes", "overlays")
     * @param metadata Array of trait metadata
     */
    function registerTraits(
        string calldata layer,
        TraitMetadata[] calldata metadata
    ) external onlyOwner {
        require(!locked, "Registry is locked");
        require(!layerInitialized[layer], "Layer already initialized");
        require(metadata.length > 0, "Empty metadata array");
        
        for (uint8 i = 0; i < metadata.length; i++) {
            traits[layer][i] = metadata[i];
        }
        
        layerInitialized[layer] = true;
        emit TraitsRegistered(layer, uint8(metadata.length));
    }
    
    /**
     * @notice Lock the registry permanently
     */
    function lockRegistry() external onlyOwner {
        require(!locked, "Already locked");
        locked = true;
        emit RegistryLocked();
    }
    
    /**
     * @notice Get trait metadata
     */
    function getTrait(
        string calldata layer,
        uint8 index
    ) external view returns (TraitMetadata memory) {
        return traits[layer][index];
    }
    
    /**
     * @notice Calculate rarity score for a token's traits
     */
    function calculateRarityScore(
        uint8 aura,
        uint8 background,
        uint8 core,
        uint8 eyes,
        uint8 overlay
    ) external view returns (uint256) {
        uint256 score = 0;
        score += traits["auras"][aura].weight;
        score += traits["backgrounds"][background].weight;
        score += traits["cores"][core].weight;
        score += traits["eyes"][eyes].weight;
        score += traits["overlays"][overlay].weight;
        return score;
    }
    
    /**
     * @notice Get rarity tier from score
     */
    function getRarityTier(uint256 score) external pure returns (string memory) {
        if (score <= 100) return "Common";
        if (score <= 200) return "Uncommon";
        if (score <= 300) return "Rare";
        if (score <= 400) return "Epic";
        return "Legendary";
    }
}
