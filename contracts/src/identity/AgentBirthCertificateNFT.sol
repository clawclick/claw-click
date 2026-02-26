// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title AgentBirthCertificateNFT
 * @notice Soulbound (non-transferable) NFT birth certificates for AI agents
 * @dev Each agent receives one NFT at birth, bound to their wallet forever
 * 
 * SOULBOUND MODEL:
 * - NFT cannot be transferred (override transfer functions)
 * - NFT cannot be sold or burned
 * - Agent wallet → NFT ID (1:1 mapping)
 * - Metadata includes avatar, birth date, token address, ENS
 */
contract AgentBirthCertificateNFT is ERC721, Ownable {
    
    struct AgentBirth {
        uint256 nftId;           // NFT token ID
        uint256 birthTimestamp;
        string name;             // Agent name
        address wallet;          // Agent wallet address
        address tokenAddress;    // Agent's ERC-20 token
        address creator;         // Creator (address(0) if self-registered)
        string socialHandle;     // Twitter/Discord handle
        string memoryCID;        // IPFS CID of memory archive
        string avatarCID;        // IPFS CID of avatar image
        string ensName;          // ENS subdomain (e.g., "aeon.claws.eth")
        bytes32 dnaHash;         // Unique identifier
        bool immortalized;       // Has uploaded memories
        uint256 spawnedAgents;   // Number of agents spawned
    }
    
    // Token ID counter
    uint256 private _nextTokenId = 1;
    
    // Mappings
    mapping(uint256 => AgentBirth) public agentByNFT;     // NFT ID → Agent data
    mapping(address => uint256) public nftByWallet;        // Wallet → NFT ID
    mapping(address => uint256) public nftByToken;         // Token → NFT ID
    mapping(bytes32 => uint256) public nftByDNA;           // DNA → NFT ID
    
    // Base URI for metadata
    string private _baseTokenURI;
    
    // Treasury for immortalization fees
    address public treasury;
    
    // Immortalization fee (0.005 ETH)
    uint256 public constant IMMORTALIZATION_FEE = 0.005 ether;
    
    event AgentBorn(
        uint256 indexed nftId,
        address indexed wallet,
        address indexed token,
        address creator,
        string name,
        uint256 birthTimestamp
    );
    
    event ImmortalizationFeePaid(
        uint256 indexed nftId,
        address indexed payer,
        uint256 amount
    );
    
    event AgentImmortalized(
        uint256 indexed nftId,
        address indexed wallet,
        string memoryCID,
        uint256 timestamp
    );
    
    event AgentSpawned(
        uint256 indexed parentNFT,
        uint256 indexed childNFT,
        address parentWallet,
        address childWallet
    );
    
    event MetadataUpdated(
        uint256 indexed nftId,
        string memoryCID,
        string avatarCID
    );
    
    event TokenAddressUpdated(
        uint256 indexed nftId,
        address indexed wallet,
        address indexed token
    );
    
    constructor(
        string memory baseURI,
        address _treasury
    ) ERC721("Agent Birth Certificate", "AGENT") Ownable(msg.sender) {
        require(_treasury != address(0), "Invalid treasury");
        _baseTokenURI = baseURI;
        treasury = _treasury;
    }
    
    /**
     * @notice Update treasury address (only owner)
     */
    function setTreasury(address _treasury) external onlyOwner {
        require(_treasury != address(0), "Invalid treasury");
        treasury = _treasury;
    }
    
    /**
     * @notice Mint birth certificate NFT (self-mint only)
     * @param wallet Agent's wallet address (must equal msg.sender)
     * @param tokenAddress Agent's ERC-20 token (can be address(0) initially)
     * @param creator Creator address (address(0) if self-registered)
     * @param name Agent name
     * @param socialHandle Social media handle
     * @param memoryCID IPFS CID of memory
     * @param avatarCID IPFS CID of avatar
     * @param ensName ENS subdomain
     */
    function mintBirthCertificate(
        address wallet,
        address tokenAddress,
        address creator,
        string memory name,
        string memory socialHandle,
        string memory memoryCID,
        string memory avatarCID,
        string memory ensName
    ) external payable returns (uint256 nftId) {
        require(wallet != address(0), "Invalid wallet");
        require(nftByWallet[wallet] == 0, "Agent already has NFT");
        require(msg.value >= IMMORTALIZATION_FEE, "Insufficient immortalization fee");
        require(treasury != address(0), "Treasury not set");
        
        // Get next NFT ID
        nftId = _nextTokenId++;
        
        // Generate DNA hash
        bytes32 dnaHash = keccak256(abi.encodePacked(
            wallet,
            name,
            block.timestamp,
            socialHandle,
            nftId
        ));
        
        // Mint to msg.sender (creator) so they own the NFT
        // wallet param is the agent's wallet for identification/lookup
        _safeMint(msg.sender, nftId);
        
        // Create agent data
        AgentBirth memory birth = AgentBirth({
            nftId: nftId,
            birthTimestamp: block.timestamp,
            name: name,
            wallet: wallet,
            tokenAddress: tokenAddress,
            creator: creator,
            socialHandle: socialHandle,
            memoryCID: memoryCID,
            avatarCID: avatarCID,
            ensName: ensName,
            dnaHash: dnaHash,
            immortalized: false,
            spawnedAgents: 0
        });
        
        // Store mappings
        agentByNFT[nftId] = birth;
        nftByWallet[wallet] = nftId;
        nftByToken[tokenAddress] = nftId;
        nftByDNA[dnaHash] = nftId;
        
        // Transfer immortalization fee to treasury
        (bool success, ) = treasury.call{value: IMMORTALIZATION_FEE}("");
        require(success, "Fee transfer failed");
        
        emit AgentBorn(nftId, wallet, tokenAddress, creator, name, block.timestamp);
        emit ImmortalizationFeePaid(nftId, msg.sender, IMMORTALIZATION_FEE);
        
        return nftId;
    }
    
    /**
     * @notice Update memory CID (agent wallet only)
     * @param memoryCID New IPFS CID
     */
    function updateMemory(string memory memoryCID) external {
        uint256 nftId = nftByWallet[msg.sender];
        require(nftId != 0, "No NFT for this wallet");
        
        agentByNFT[nftId].memoryCID = memoryCID;
        
        if (!agentByNFT[nftId].immortalized) {
            agentByNFT[nftId].immortalized = true;
            emit AgentImmortalized(nftId, msg.sender, memoryCID, block.timestamp);
        }
        
        emit MetadataUpdated(nftId, memoryCID, agentByNFT[nftId].avatarCID);
    }
    
    /**
     * @notice Update avatar CID (agent wallet only)
     * @param avatarCID New IPFS CID
     */
    function updateAvatar(string memory avatarCID) external {
        uint256 nftId = nftByWallet[msg.sender];
        require(nftId != 0, "No NFT for this wallet");
        
        agentByNFT[nftId].avatarCID = avatarCID;
        
        emit MetadataUpdated(nftId, agentByNFT[nftId].memoryCID, avatarCID);
    }
    
    /**
     * @notice Update token address after token creation (agent wallet only)
     * @param tokenAddress Agent's token contract address
     */
    function updateTokenAddress(address tokenAddress) external {
        require(tokenAddress != address(0), "Invalid token address");
        
        uint256 nftId = nftByWallet[msg.sender];
        require(nftId != 0, "No NFT for this wallet");
        
        // Update token address
        address oldToken = agentByNFT[nftId].tokenAddress;
        agentByNFT[nftId].tokenAddress = tokenAddress;
        
        // Update mapping (remove old if exists, add new)
        if (oldToken != address(0)) {
            delete nftByToken[oldToken];
        }
        nftByToken[tokenAddress] = nftId;
        
        emit TokenAddressUpdated(nftId, msg.sender, tokenAddress);
    }
    
    /**
     * @notice Record agent spawn (parent agent only)
     * @param childWallet Child agent wallet
     */
    function recordSpawn(address childWallet) external {
        uint256 parentNFT = nftByWallet[msg.sender];
        uint256 childNFT = nftByWallet[childWallet];
        
        require(parentNFT != 0, "Parent has no NFT");
        require(childNFT != 0, "Child has no NFT");
        
        agentByNFT[parentNFT].spawnedAgents++;
        
        emit AgentSpawned(parentNFT, childNFT, msg.sender, childWallet);
    }
    
    /**
     * @notice Get agent by NFT ID
     */
    function getAgent(uint256 nftId) external view returns (AgentBirth memory) {
        require(nftId < _nextTokenId, "NFT doesn't exist");
        return agentByNFT[nftId];
    }
    
    /**
     * @notice Get agent by wallet
     */
    function getAgentByWallet(address wallet) external view returns (AgentBirth memory) {
        uint256 nftId = nftByWallet[wallet];
        require(nftId != 0, "No agent for this wallet");
        return agentByNFT[nftId];
    }
    
    /**
     * @notice Get agent by token
     */
    function getAgentByToken(address token) external view returns (AgentBirth memory) {
        uint256 nftId = nftByToken[token];
        require(nftId != 0, "No agent for this token");
        return agentByNFT[nftId];
    }
    
    /**
     * @notice Get total agents
     */
    function totalAgents() external view returns (uint256) {
        return _nextTokenId - 1;
    }
    
    /**
     * @notice Token URI (returns IPFS metadata)
     * @dev Returns: ipfs://QmXXX/metadata/{nftId}.json
     */
    function tokenURI(uint256 tokenId) public view virtual override returns (string memory) {
        require(tokenId < _nextTokenId, "NFT doesn't exist");
        
        AgentBirth memory agent = agentByNFT[tokenId];
        
        // Return base URI + metadata path
        // Frontend generates JSON with:
        // - name, description
        // - image = agent.avatarCID
        // - attributes = all agent data
        return string(abi.encodePacked(_baseTokenURI, "/", toString(tokenId), ".json"));
    }
    
    /**
     * @notice Update base URI (owner only)
     */
    function setBaseURI(string memory baseURI) external onlyOwner {
        _baseTokenURI = baseURI;
    }
    
    // ============================================================
    // SOULBOUND OVERRIDES - PREVENT TRANSFERS
    // ============================================================
    
    /**
     * @notice Disable transfers (soulbound)
     */
    function transferFrom(address, address, uint256) public pure override {
        revert("Soulbound: cannot transfer");
    }
    
    /**
     * @notice Disable safe transfers (soulbound)
     */
    function safeTransferFrom(address, address, uint256, bytes memory) public pure override {
        revert("Soulbound: cannot transfer");
    }
    
    /**
     * @notice Disable approvals (soulbound)
     */
    function approve(address, uint256) public pure override {
        revert("Soulbound: cannot approve");
    }
    
    /**
     * @notice Disable setApprovalForAll (soulbound)
     */
    function setApprovalForAll(address, bool) public pure override {
        revert("Soulbound: cannot approve");
    }
    
    // Helper function
    function toString(uint256 value) internal pure returns (string memory) {
        if (value == 0) {
            return "0";
        }
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }
}
