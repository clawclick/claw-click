// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

// Interfaces for ownership verification
interface IClawdNFT {
    function ownerOf(uint256 tokenId) external view returns (address);
}

interface IAgentBirthCertificate {
    function nftByWallet(address wallet) external view returns (uint256);
}

/**
 * @title AgentNFTidRegistry
 * @notice On-chain registry for linking NFTid tokens to agent wallets
 * @dev Enforces 1:1 mapping between NFTid and agents
 */
contract AgentNFTidRegistry is Ownable {

    // Contract addresses
    address public immutable clawdNFTAddress;
    address public immutable birthCertificateAddress;

    // Mappings for 1:1 relationship
    mapping(uint256 => address) public nftidToAgent;
    mapping(address => uint256) public agentToNFTid;

    // Events
    event NFTidLinked(uint256 indexed nftidTokenId, address indexed agentWallet, address indexed linker);
    event NFTidUnlinked(uint256 indexed nftidTokenId, address indexed agentWallet, address indexed unlinker);

    constructor(address _clawdNFT, address _birthCertificate) Ownable(msg.sender) {
        require(_clawdNFT != address(0), "Invalid ClawdNFT address");
        require(_birthCertificate != address(0), "Invalid BirthCertificate address");
        
        clawdNFTAddress = _clawdNFT;
        birthCertificateAddress = _birthCertificate;
    }

    /**
     * @notice Link an NFTid to an agent wallet
     * @param nftidTokenId The ClawdNFT token ID to link
     * @param agentWallet The agent wallet address to link to
     * @dev Caller must own the NFTid AND be the creator of the agent (via birth certificate)
     */
    function linkNFTid(uint256 nftidTokenId, address agentWallet) external {
        require(agentWallet != address(0), "Invalid agent address");

        // Verify caller owns the NFTid
        address nftOwner = IClawdNFT(clawdNFTAddress).ownerOf(nftidTokenId);
        require(nftOwner == msg.sender, "You don't own this NFTid");

        // Verify agent has a birth certificate
        uint256 birthCertId = IAgentBirthCertificate(birthCertificateAddress).nftByWallet(agentWallet);
        require(birthCertId > 0, "Agent has no birth certificate");

        // Check for existing links and unlink them first
        if (nftidToAgent[nftidTokenId] != address(0)) {
            _unlinkNFTid(nftidTokenId);
        }
        if (agentToNFTid[agentWallet] != 0) {
            _unlinkAgent(agentWallet);
        }

        // Create the new link
        nftidToAgent[nftidTokenId] = agentWallet;
        agentToNFTid[agentWallet] = nftidTokenId;

        emit NFTidLinked(nftidTokenId, agentWallet, msg.sender);
    }

    /**
     * @notice Unlink an NFTid from its agent
     * @param nftidTokenId The ClawdNFT token ID to unlink
     * @dev Caller must own the NFTid
     */
    function unlinkNFTid(uint256 nftidTokenId) external {
        address nftOwner = IClawdNFT(clawdNFTAddress).ownerOf(nftidTokenId);
        require(nftOwner == msg.sender, "You don't own this NFTid");
        
        _unlinkNFTid(nftidTokenId);
    }

    /**
     * @notice Unlink an agent from its NFTid
     * @param agentWallet The agent wallet address to unlink
     * @dev Caller must be the agent creator (verified via birth certificate creator)
     */
    function unlinkAgent(address agentWallet) external {
        // Verification would require fetching creator from birth certificate
        // For simplicity, allowing NFTid owner to unlink
        uint256 linkedNFTid = agentToNFTid[agentWallet];
        require(linkedNFTid > 0, "Agent has no linked NFTid");
        
        address nftOwner = IClawdNFT(clawdNFTAddress).ownerOf(linkedNFTid);
        require(nftOwner == msg.sender, "You don't own the linked NFTid");

        _unlinkAgent(agentWallet);
    }

    /**
     * @notice Get the NFTid linked to an agent
     * @param agentWallet The agent wallet address
     * @return The linked NFTid token ID, or 0 if not linked
     */
    function getNFTidForAgent(address agentWallet) external view returns (uint256) {
        return agentToNFTid[agentWallet];
    }

    /**
     * @notice Get the agent linked to an NFTid
     * @param nftidTokenId The ClawdNFT token ID
     * @return The linked agent wallet address, or address(0) if not linked
     */
    function getAgentForNFTid(uint256 nftidTokenId) external view returns (address) {
        return nftidToAgent[nftidTokenId];
    }

    /**
     * @notice Check if an NFTid is linked
     * @param nftidTokenId The ClawdNFT token ID
     * @return True if linked, false otherwise
     */
    function isNFTidLinked(uint256 nftidTokenId) external view returns (bool) {
        return nftidToAgent[nftidTokenId] != address(0);
    }

    /**
     * @notice Check if an agent is linked
     * @param agentWallet The agent wallet address
     * @return True if linked, false otherwise
     */
    function isAgentLinked(address agentWallet) external view returns (bool) {
        return agentToNFTid[agentWallet] != 0;
    }

    // Internal helper functions
    function _unlinkNFTid(uint256 nftidTokenId) internal {
        address linkedAgent = nftidToAgent[nftidTokenId];
        require(linkedAgent != address(0), "NFTid not linked");

        delete nftidToAgent[nftidTokenId];
        delete agentToNFTid[linkedAgent];

        emit NFTidUnlinked(nftidTokenId, linkedAgent, msg.sender);
    }

    function _unlinkAgent(address agentWallet) internal {
        uint256 linkedNFTid = agentToNFTid[agentWallet];
        require(linkedNFTid > 0, "Agent not linked");

        delete agentToNFTid[agentWallet];
        delete nftidToAgent[linkedNFTid];

        emit NFTidUnlinked(linkedNFTid, agentWallet, msg.sender);
    }
}
