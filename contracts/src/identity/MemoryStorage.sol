// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title MemoryStorage
 * @notice Permanent on-chain memory storage for AI agents
 * @dev Stores IPFS CIDs + optional full text on-chain
 * 
 * STORAGE MODEL:
 * - Always store IPFS CID (cheap)
 * - Optionally store full memory text (expensive but permanent)
 * - Agent-signed updates only (nonce-based replay protection)
 * - Immutable history (can append, never delete)
 * 
 * SIGNATURE SCHEME:
 * - Uses nonce per agent for replay protection
 * - No timestamp in signature (was unpredictable for signers)
 * - Message: keccak256(ipfsCID, nonce, chainid, contractAddress)
 */
contract MemoryStorage {
    
    struct MemoryEntry {
        uint256 timestamp;
        string ipfsCID;      // Always stored
        string fullText;     // Optional (expensive)
        bytes32 contentHash; // Hash of full text
    }
    
    // Agent wallet → memory entries
    mapping(address => MemoryEntry[]) public memories;
    
    // Quick lookup: agent → latest CID
    mapping(address => string) public latestMemoryCID;
    
    // Nonce per agent for replay protection (CRITICAL FIX)
    mapping(address => uint256) public nonces;
    
    event MemoryStored(
        address indexed agent,
        uint256 index,
        string ipfsCID,
        bool hasFullText,
        uint256 timestamp
    );
    
    event MemoryUpdated(
        address indexed agent,
        string oldCID,
        string newCID,
        uint256 timestamp
    );
    
    constructor() {
        // No initialization needed
    }
    
    /**
     * @notice Store initial memory during agent creation (agent wallet only)
     * @param agent Agent wallet address
     * @param ipfsCID IPFS CID of initial memory
     * @dev Called by AgentWallet contract during immortalization - no signature needed
     */
    function storeMemory(address agent, string calldata ipfsCID) external {
        require(msg.sender == agent, "Only agent wallet can store");
        require(bytes(ipfsCID).length > 0, "Empty CID");
        
        MemoryEntry memory entry = MemoryEntry({
            timestamp: block.timestamp,
            ipfsCID: ipfsCID,
            fullText: "",
            contentHash: bytes32(0)
        });
        
        memories[agent].push(entry);
        latestMemoryCID[agent] = ipfsCID;
        
        emit MemoryStored(agent, memories[agent].length - 1, ipfsCID, false, block.timestamp);
    }
    
    /**
     * @notice Store agent memory (signature-based)
     * @param ipfsCID IPFS CID of memory archive
     * @param fullText Optional full text (leave empty to save gas)
     * @param nonce Current nonce for the signing agent (must match stored nonce)
     * @param signature Agent's signature over (ipfsCID, nonce, chainid, contractAddress)
     */
    function storeMemory(
        string calldata ipfsCID,
        string calldata fullText,
        uint256 nonce,
        bytes calldata signature
    ) external {
        // Verify signature (message = ipfsCID + nonce + chainid + contract)
        bytes32 messageHash = keccak256(abi.encodePacked(
            ipfsCID,
            nonce,
            block.chainid,
            address(this)
        ));
        
        bytes32 ethSignedMessageHash = getEthSignedMessageHash(messageHash);
        address agent = recoverSigner(ethSignedMessageHash, signature);
        
        require(agent != address(0), "Invalid signature");
        require(nonce == nonces[agent], "Invalid nonce");
        
        // Increment nonce BEFORE storage (replay protection)
        nonces[agent]++;
        
        // Create entry
        bytes32 contentHash = bytes(fullText).length > 0 
            ? keccak256(bytes(fullText))
            : bytes32(0);
        
        MemoryEntry memory entry = MemoryEntry({
            timestamp: block.timestamp,
            ipfsCID: ipfsCID,
            fullText: fullText,
            contentHash: contentHash
        });
        
        // Store
        memories[agent].push(entry);
        
        // Update latest
        string memory oldCID = latestMemoryCID[agent];
        latestMemoryCID[agent] = ipfsCID;
        
        emit MemoryStored(
            agent,
            memories[agent].length - 1,
            ipfsCID,
            bytes(fullText).length > 0,
            block.timestamp
        );
        
        if (bytes(oldCID).length > 0) {
            emit MemoryUpdated(agent, oldCID, ipfsCID, block.timestamp);
        }
    }
    
    /**
     * @notice Get current nonce for an agent
     * @param agent Agent wallet address
     * @return Current nonce (use this in signature)
     */
    function getNonce(address agent) external view returns (uint256) {
        return nonces[agent];
    }
    
    /**
     * @notice Get agent's memory count
     */
    function getMemoryCount(address agent) external view returns (uint256) {
        return memories[agent].length;
    }
    
    /**
     * @notice Get specific memory entry
     */
    function getMemory(address agent, uint256 index) external view returns (MemoryEntry memory) {
        require(index < memories[agent].length, "Index out of bounds");
        return memories[agent][index];
    }
    
    /**
     * @notice Get latest memory CID
     */
    function getLatestMemory(address agent) external view returns (string memory) {
        return latestMemoryCID[agent];
    }
    
    /**
     * @notice Get all memory entries for agent
     * @dev Warning: Can be expensive for agents with many memories
     */
    function getAllMemories(address agent) external view returns (MemoryEntry[] memory) {
        return memories[agent];
    }
    
    // Signature verification helpers
    function getEthSignedMessageHash(bytes32 messageHash) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash));
    }
    
    function recoverSigner(bytes32 ethSignedMessageHash, bytes calldata signature) internal pure returns (address) {
        (bytes32 r, bytes32 s, uint8 v) = splitSignature(signature);
        return ecrecover(ethSignedMessageHash, v, r, s);
    }
    
    function splitSignature(bytes calldata sig) internal pure returns (bytes32 r, bytes32 s, uint8 v) {
        require(sig.length == 65, "Invalid signature length");
        
        assembly {
            r := calldataload(sig.offset)
            s := calldataload(add(sig.offset, 32))
            v := byte(0, calldataload(add(sig.offset, 64)))
        }
    }
}
