// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title AgentLaunchBundler
 * @notice Bundles createLaunch + mintBirthCertificate into a single transaction
 * @dev Users sign ONE tx instead of two. The bundler forwards ETH to each contract:
 *      - bootstrapETH → ClawclickFactory.createLaunch()
 *      - 0.005 ETH    → AgentBirthCertificateNFT.mintBirthCertificate()
 *
 * Deploy: forge create src/AgentLaunchBundler.sol:AgentLaunchBundler \
 *           --constructor-args <factory> <birthCert>
 */

interface IClawclickFactory {
    struct FeeSplit {
        address[5] wallets;
        uint16[5] percentages;
        uint8 count;
    }

    struct CreateParams {
        string name;
        string symbol;
        address beneficiary;
        address agentWallet;
        uint256 targetMcapETH;
        FeeSplit feeSplit;
        uint8 launchType;
    }

    function createLaunch(CreateParams calldata params) external payable returns (address token, bytes32 poolId);
}

interface IAgentBirthCertificateNFT {
    function mintBirthCertificate(
        address wallet,
        address tokenAddress,
        address creator,
        string memory name,
        string memory socialHandle,
        string memory memoryCID,
        string memory avatarCID,
        string memory ensName
    ) external payable returns (uint256 nftId);

    function IMMORTALIZATION_FEE() external view returns (uint256);
}

contract AgentLaunchBundler {
    IClawclickFactory public immutable factory;
    IAgentBirthCertificateNFT public immutable birthCert;

    event AgentLaunchBundled(
        address indexed token,
        uint256 indexed nftId,
        bytes32 poolId,
        address indexed creator,
        address agentWallet
    );

    /// @notice ERC721 receiver — accept position NFTs minted by factory/PositionManager
    function onERC721Received(address, address, uint256, bytes calldata) external pure returns (bytes4) {
        return this.onERC721Received.selector;
    }

    error InsufficientETH(uint256 sent, uint256 required);
    error LaunchFailed();
    error MintFailed();
    error RefundFailed();

    constructor(address _factory, address _birthCert) {
        factory = IClawclickFactory(_factory);
        birthCert = IAgentBirthCertificateNFT(_birthCert);
    }

    /**
     * @notice Launch token + mint birth certificate in one transaction
     * @param launchParams  Parameters for ClawclickFactory.createLaunch()
     * @param agentWallet   Agent wallet address (receives the soulbound NFT)
     * @param creator       Creator address (stored in NFT metadata)
     * @param agentName     Agent display name (for NFT)
     * @param socialHandle  Social media handle (optional, pass "" if none)
     * @param memoryCID     IPFS CID of memory archive (optional, pass "" if none)
     * @param avatarCID     IPFS CID of avatar image (optional, pass "" if none)
     * @param ensName       ENS subdomain (optional, pass "" if none)
     *
     * @dev msg.value must cover bootstrapETH + IMMORTALIZATION_FEE (0.005 ETH).
     *      bootstrapETH = msg.value - IMMORTALIZATION_FEE
     *      Any excess after both calls is refunded to msg.sender.
     */
    function launchAndMint(
        IClawclickFactory.CreateParams calldata launchParams,
        address agentWallet,
        address creator,
        string calldata agentName,
        string calldata socialHandle,
        string calldata memoryCID,
        string calldata avatarCID,
        string calldata ensName
    ) external payable returns (address token, bytes32 poolId, uint256 nftId) {
        uint256 immortalizationFee = birthCert.IMMORTALIZATION_FEE();

        if (msg.value < immortalizationFee) {
            revert InsufficientETH(msg.value, immortalizationFee);
        }

        uint256 bootstrapETH = msg.value - immortalizationFee;

        // Step 1: Create token launch (forward bootstrap ETH)
        (token, poolId) = factory.createLaunch{value: bootstrapETH}(launchParams);
        if (token == address(0)) revert LaunchFailed();

        // Step 2: Mint birth certificate (forward immortalization fee)
        nftId = birthCert.mintBirthCertificate{value: immortalizationFee}(
            agentWallet,
            token,
            creator,
            agentName,
            socialHandle,
            memoryCID,
            avatarCID,
            ensName
        );
        if (nftId == 0) revert MintFailed();

        emit AgentLaunchBundled(token, nftId, poolId, creator, agentWallet);

        // Refund any dust (e.g. if factory returned excess)
        uint256 remaining = address(this).balance;
        if (remaining > 0) {
            (bool ok, ) = msg.sender.call{value: remaining}("");
            if (!ok) revert RefundFailed();
        }
    }

    /// @notice Allow receiving ETH refunds from factory/birthCert
    receive() external payable {}
}
