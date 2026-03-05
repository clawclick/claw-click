// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title ClawdNFT
 * @notice Generative NFT system for claw.click agent identities
 * @dev Uses blockhash randomness, prevents duplicate trait combinations
 */
contract ClawdNFT is ERC721, Ownable, ReentrancyGuard {
    // Constants
    uint256 public constant MAX_SUPPLY = 10000;
    uint256 public constant TIER1_PRICE = 0.0015 ether; // ~$3
    uint256 public constant TIER2_PRICE = 0.003 ether;  // ~$6
    uint256 public constant TIER3_PRICE = 0.0045 ether; // ~$9
    uint256 public constant TIER1_END = 4000;
    uint256 public constant TIER2_END = 7000;
    
    // State
    uint256 public totalSupply;
    address public birthCertificateContract;
    string public baseMetadataURI;
    
    // Traits: [aura, background, core, eyes, overlay]
    struct Traits {
        uint8 aura;
        uint8 background;
        uint8 core;
        uint8 eyes;
        uint8 overlay;
    }
    
    // Storage
    mapping(uint256 => Traits) public tokenTraits;
    mapping(bytes32 => bool) public usedTraitCombinations;
    mapping(address => bool) public hasUsedFreeMint;
    
    // Events
    event Minted(
        uint256 indexed tokenId,
        address indexed minter,
        uint8 aura,
        uint8 background,
        uint8 core,
        uint8 eyes,
        uint8 overlay,
        bool freeMint
    );
    
    constructor(
        address _birthCertificateContract,
        string memory _baseMetadataURI
    ) ERC721("Clawd Identity", "CLAWD") {
        birthCertificateContract = _birthCertificateContract;
        baseMetadataURI = _baseMetadataURI;
    }
    
    /**
     * @notice Get current mint price based on supply
     */
    function getCurrentPrice() public view returns (uint256) {
        if (totalSupply < TIER1_END) return TIER1_PRICE;
        if (totalSupply < TIER2_END) return TIER2_PRICE;
        return TIER3_PRICE;
    }
    
    /**
     * @notice Check if address is eligible for free mint
     */
    function isEligibleForFreeMint(address user) public view returns (bool) {
        if (hasUsedFreeMint[user]) return false;
        
        // Check if user holds BirthCertificate NFT
        try IERC721(birthCertificateContract).balanceOf(user) returns (uint256 balance) {
            return balance > 0;
        } catch {
            return false;
        }
    }
    
    /**
     * @notice Mint a new Clawd NFT
     * @param maxAttempts Maximum attempts to find unique trait combo (prevent infinite loops)
     */
    function mint(uint256 maxAttempts) external payable nonReentrant {
        require(totalSupply < MAX_SUPPLY, "Max supply reached");
        require(maxAttempts > 0 && maxAttempts <= 100, "Invalid max attempts");
        
        // Check payment
        bool eligibleForFreeMint = isEligibleForFreeMint(msg.sender);
        uint256 requiredPrice = eligibleForFreeMint ? 0 : getCurrentPrice();
        require(msg.value >= requiredPrice, "Insufficient payment");
        
        // Mark free mint as used
        if (eligibleForFreeMint) {
            hasUsedFreeMint[msg.sender] = true;
        }
        
        // Generate unique traits
        Traits memory traits = _generateUniqueTraits(maxAttempts);
        
        // Mint token
        uint256 tokenId = totalSupply;
        totalSupply++;
        
        tokenTraits[tokenId] = traits;
        _safeMint(msg.sender, tokenId);
        
        emit Minted(
            tokenId,
            msg.sender,
            traits.aura,
            traits.background,
            traits.core,
            traits.eyes,
            traits.overlay,
            eligibleForFreeMint
        );
        
        // Refund excess payment
        if (msg.value > requiredPrice) {
            (bool success, ) = msg.sender.call{value: msg.value - requiredPrice}("");
            require(success, "Refund failed");
        }
    }
    
    /**
     * @notice Generate unique trait combination
     * @dev Uses blockhash for randomness, prevents duplicates
     */
    function _generateUniqueTraits(uint256 maxAttempts) internal returns (Traits memory) {
        uint256 attempts = 0;
        
        while (attempts < maxAttempts) {
            // Generate random seed from blockhash
            uint256 randomSeed = uint256(
                keccak256(
                    abi.encodePacked(
                        blockhash(block.number - 1),
                        msg.sender,
                        totalSupply,
                        attempts,
                        block.timestamp
                    )
                )
            );
            
            // Extract trait indices from seed
            Traits memory traits = Traits({
                aura: uint8(randomSeed % 10),
                background: uint8((randomSeed / 10) % 10),
                core: uint8((randomSeed / 100) % 10),
                eyes: uint8((randomSeed / 1000) % 9),
                overlay: uint8((randomSeed / 10000) % 9)
            });
            
            // Check if combination is unique
            bytes32 traitHash = _hashTraits(traits);
            if (!usedTraitCombinations[traitHash]) {
                usedTraitCombinations[traitHash] = true;
                return traits;
            }
            
            attempts++;
        }
        
        revert("Could not generate unique traits");
    }
    
    /**
     * @notice Hash trait combination for uniqueness check
     */
    function _hashTraits(Traits memory traits) internal pure returns (bytes32) {
        return keccak256(
            abi.encodePacked(
                traits.aura,
                traits.background,
                traits.core,
                traits.eyes,
                traits.overlay
            )
        );
    }
    
    /**
     * @notice Get traits for a token
     */
    function getTraits(uint256 tokenId) external view returns (Traits memory) {
        require(_exists(tokenId), "Token does not exist");
        return tokenTraits[tokenId];
    }
    
    /**
     * @notice Token URI points to off-chain metadata service
     */
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(_exists(tokenId), "Token does not exist");
        
        return string(
            abi.encodePacked(
                baseMetadataURI,
                "/",
                Strings.toString(tokenId)
            )
        );
    }
    
    /**
     * @notice Update base metadata URI
     */
    function setBaseMetadataURI(string memory _baseMetadataURI) external onlyOwner {
        baseMetadataURI = _baseMetadataURI;
    }
    
    /**
     * @notice Update BirthCertificate contract address
     */
    function setBirthCertificateContract(address _birthCertificateContract) external onlyOwner {
        birthCertificateContract = _birthCertificateContract;
    }
    
    /**
     * @notice Withdraw collected funds
     */
    function withdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds to withdraw");
        
        (bool success, ) = owner().call{value: balance}("");
        require(success, "Withdrawal failed");
    }
}
