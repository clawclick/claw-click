// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";

// Interfaces
interface IClawdNFT {
    function ownerOf(uint256 tokenId) external view returns (address);
}

interface IAgentBirthCertificate {
    function nftByToken(address token) external view returns (uint256);
    
    struct AgentBirth {
        uint256 nftId;
        uint256 birthTimestamp;
        string name;
        address wallet;
        address tokenAddress;
        address creator;
        string socialHandle;
        string memoryCID;
        string avatarCID;
        string ensName;
        bytes32 dnaHash;
        bool immortalized;
        uint256 spawnedAgents;
    }
    
    // Use getAgent function instead of public mapping getter
    function getAgent(uint256 nftId) external view returns (AgentBirth memory);
}

/**
 * @title SimpleAgentNFTidRegistry
 * @notice SIMPLE linking: NFTid → Token Address
 * @dev Only checks:
 *      1. User owns the NFTid
 *      2. User created the token (via Birth Certificate)
 */
contract SimpleAgentNFTidRegistry is Ownable {

    // Contract addresses
    address public immutable clawdNFTAddress;
    address public immutable birthCertificateAddress;

    // Simple 1:1 mappings
    mapping(uint256 => address) public nftidToToken;  // NFTid → Token Address
    mapping(address => uint256) public tokenToNFTid;  // Token → NFTid

    // Events
    event NFTidLinked(uint256 indexed nftidTokenId, address indexed tokenAddress, address indexed linker);
    event NFTidUnlinked(uint256 indexed nftidTokenId, address indexed tokenAddress);

    constructor(address _clawdNFT, address _birthCertificate) Ownable(msg.sender) {
        require(_clawdNFT != address(0), "Invalid ClawdNFT");
        require(_birthCertificate != address(0), "Invalid BirthCertificate");
        
        clawdNFTAddress = _clawdNFT;
        birthCertificateAddress = _birthCertificate;
    }

    /**
     * @notice Link NFTid to Token Address
     * @param nftidTokenId The NFTid to link
     * @param tokenAddress The agent token address to link to
     * @dev Checks:
     *      1. User owns the NFTid
     *      2. User created the token (from Birth Certificate)
     */
    function linkNFTid(uint256 nftidTokenId, address tokenAddress) external {
        require(tokenAddress != address(0), "Invalid token address");

        // Check 1: User owns the NFTid
        address nftOwner = IClawdNFT(clawdNFTAddress).ownerOf(nftidTokenId);
        require(nftOwner == msg.sender, "You don't own this NFTid");

        // Check 2: Get birth cert for token and verify user is creator
        uint256 birthCertId = IAgentBirthCertificate(birthCertificateAddress).nftByToken(tokenAddress);
        require(birthCertId > 0, "Token has no birth certificate");

        IAgentBirthCertificate.AgentBirth memory agent = IAgentBirthCertificate(birthCertificateAddress).getAgent(birthCertId);
        require(agent.creator == msg.sender, "You did not create this token");

        // Unlink any existing links
        if (nftidToToken[nftidTokenId] != address(0)) {
            address oldToken = nftidToToken[nftidTokenId];
            delete tokenToNFTid[oldToken];
        }
        if (tokenToNFTid[tokenAddress] != 0) {
            uint256 oldNftid = tokenToNFTid[tokenAddress];
            delete nftidToToken[oldNftid];
        }

        // Create new link
        nftidToToken[nftidTokenId] = tokenAddress;
        tokenToNFTid[tokenAddress] = nftidTokenId;

        emit NFTidLinked(nftidTokenId, tokenAddress, msg.sender);
    }

    /**
     * @notice Unlink NFTid
     * @param nftidTokenId The NFTid to unlink
     */
    function unlinkNFTid(uint256 nftidTokenId) external {
        address nftOwner = IClawdNFT(clawdNFTAddress).ownerOf(nftidTokenId);
        require(nftOwner == msg.sender, "You don't own this NFTid");
        
        address linkedToken = nftidToToken[nftidTokenId];
        require(linkedToken != address(0), "NFTid not linked");
        
        delete nftidToToken[nftidTokenId];
        delete tokenToNFTid[linkedToken];

        emit NFTidUnlinked(nftidTokenId, linkedToken);
    }

    /**
     * @notice Get token for NFTid
     */
    function getTokenForNFTid(uint256 nftidTokenId) external view returns (address) {
        return nftidToToken[nftidTokenId];
    }

    /**
     * @notice Get NFTid for token
     */
    function getNFTidForToken(address tokenAddress) external view returns (uint256) {
        return tokenToNFTid[tokenAddress];
    }

    /**
     * @notice Check if NFTid is linked
     */
    function isNFTidLinked(uint256 nftidTokenId) external view returns (bool) {
        return nftidToToken[nftidTokenId] != address(0);
    }

    /**
     * @notice Check if token is linked
     */
    function isTokenLinked(address tokenAddress) external view returns (bool) {
        return tokenToNFTid[tokenAddress] != 0;
    }
}
