// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

// Birth Certificate interface
interface IAgentBirthCertificate {
    struct AgentBirth {
        uint256 nftId;
        uint256 birthTimestamp;
        string name;
        address wallet;
        address tokenAddress;
        address creator;        // Creator wallet address
        string socialHandle;
        string memoryCID;
        string avatarCID;
        string ensName;
        bytes32 dnaHash;
        bool immortalized;
        uint256 spawnedAgents;
    }
    
    function totalAgents() external view returns (uint256);
    function getAgent(uint256 nftId) external view returns (AgentBirth memory);
}

/**
 * @title ClawdNFT V2
 * @notice Generative NFT system for claw.click agent identities
 * @dev Free mint for agent creators (1 per agent), uses Birth Certificate creator tracking
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
    IAgentBirthCertificate public birthCertificateContract;
    address public treasury;
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
    mapping(address => uint256) public freeMintsUsed;  // Creator → count of free mints used
    
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
        address _treasury,
        string memory _baseMetadataURI
    ) ERC721("Clawd Identity", "CLAWD") Ownable(msg.sender) {
        require(_birthCertificateContract != address(0), "Invalid birth certificate");
        require(_treasury != address(0), "Invalid treasury");
        birthCertificateContract = IAgentBirthCertificate(_birthCertificateContract);
        treasury = _treasury;
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
     * @notice Count how many agents a user has created
     * @dev Iterates through all Birth Certificates and checks creator field
     */
    function countAgentsCreated(address creator) public view returns (uint256) {
        uint256 count = 0;
        uint256 totalAgents = birthCertificateContract.totalAgents();
        
        // Iterate through all Birth Certificates
        for (uint256 i = 1; i <= totalAgents; i++) {
            try birthCertificateContract.getAgent(i) returns (IAgentBirthCertificate.AgentBirth memory agent) {
                if (agent.creator == creator) {
                    count++;
                }
            } catch {
                // Skip if agent doesn't exist
                continue;
            }
        }
        
        return count;
    }
    
    /**
     * @notice Get remaining free mints for a user
     * @dev Free mints = agents created - free mints used
     */
    function getRemainingFreeMints(address user) public view returns (uint256) {
        uint256 agentsCreated = countAgentsCreated(user);
        uint256 used = freeMintsUsed[user];
        
        if (agentsCreated > used) {
            return agentsCreated - used;
        }
        return 0;
    }
    
    /**
     * @notice Check if address is eligible for free mint
     */
    function isEligibleForFreeMint(address user) public view returns (bool) {
        return getRemainingFreeMints(user) > 0;
    }
    
    /**
     * @notice Mint a new Clawd NFT
     * @param useFreeMint Whether to use a free mint (if available)
     * @param maxAttempts Maximum attempts to find unique trait combo
     */
    function mint(bool useFreeMint, uint256 maxAttempts) external payable nonReentrant {
        require(totalSupply < MAX_SUPPLY, "Max supply reached");
        require(maxAttempts > 0 && maxAttempts <= 100, "Invalid max attempts");
        
        // Determine payment
        uint256 requiredPrice = getCurrentPrice();
        bool usingFreeMint = false;
        
        if (useFreeMint && isEligibleForFreeMint(msg.sender)) {
            requiredPrice = 0;
            usingFreeMint = true;
            freeMintsUsed[msg.sender]++;
        }
        
        require(msg.value >= requiredPrice, "Insufficient payment");
        
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
            usingFreeMint
        );
        
        // Send payment to treasury
        if (requiredPrice > 0) {
            (bool success, ) = treasury.call{value: requiredPrice}("");
            require(success, "Payment to treasury failed");
        }
        
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
        _requireOwned(tokenId);
        return tokenTraits[tokenId];
    }
    
    /**
     * @notice Token URI points to off-chain metadata service
     */
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);
        
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
        require(_birthCertificateContract != address(0), "Invalid birth certificate");
        birthCertificateContract = IAgentBirthCertificate(_birthCertificateContract);
    }
    
    /**
     * @notice Update treasury address
     */
    function setTreasury(address _treasury) external onlyOwner {
        require(_treasury != address(0), "Invalid treasury");
        treasury = _treasury;
    }
    
    /**
     * @notice Emergency withdraw (only if funds somehow get stuck)
     */
    function withdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds to withdraw");
        
        (bool success, ) = treasury.call{value: balance}("");
        require(success, "Withdrawal failed");
    }
}
