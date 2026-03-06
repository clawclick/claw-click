// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../contracts/ClawdNFT.sol";
import "../contracts/TraitRegistry.sol";

contract MockBirthCertificate is ERC721 {
    constructor() ERC721("MockBirth", "BIRTH") {}
    
    function mint(address to, uint256 tokenId) external {
        _mint(to, tokenId);
    }
}

contract ClawdNFTTest is Test {
    ClawdNFT public nft;
    TraitRegistry public registry;
    MockBirthCertificate public birthCert;
    
    address public owner = address(1);
    address public user1 = address(2);
    address public user2 = address(3);
    
    function setUp() public {
        vm.startPrank(owner);
        
        // Deploy mock BirthCertificate
        birthCert = new MockBirthCertificate();
        
        // Deploy contracts
        registry = new TraitRegistry();
        nft = new ClawdNFT(
            address(birthCert),
            "https://api.claw.click/nftid/metadata"
        );
        
        vm.stopPrank();
    }
    
    function testMintWithPayment() public {
        vm.deal(user1, 1 ether);
        
        vm.prank(user1);
        nft.mint{value: 0.0015 ether}(10);
        
        assertEq(nft.totalSupply(), 1);
        assertEq(nft.ownerOf(0), user1);
    }
    
    function testFreeMint() public {
        // Give user1 a BirthCertificate
        vm.prank(owner);
        birthCert.mint(user1, 1);
        
        // User1 should be eligible for free mint
        assertTrue(nft.isEligibleForFreeMint(user1));
        
        // Mint for free
        vm.prank(user1);
        nft.mint(10);
        
        assertEq(nft.totalSupply(), 1);
        assertEq(nft.ownerOf(0), user1);
        
        // Should not be eligible anymore
        assertFalse(nft.isEligibleForFreeMint(user1));
    }
    
    function testTieredPricing() public {
        assertEq(nft.getCurrentPrice(), 0.0015 ether);
        
        // Mint 4000 tokens (end of tier 1)
        vm.deal(owner, 100 ether);
        vm.startPrank(owner);
        for (uint256 i = 0; i < 4000; i++) {
            nft.mint{value: 0.0015 ether}(10);
        }
        vm.stopPrank();
        
        // Price should now be tier 2
        assertEq(nft.getCurrentPrice(), 0.003 ether);
    }
    
    function testUniqueness() public {
        vm.deal(user1, 10 ether);
        vm.startPrank(user1);
        
        // Mint multiple tokens
        nft.mint{value: 0.0015 ether}(10);
        nft.mint{value: 0.0015 ether}(10);
        nft.mint{value: 0.0015 ether}(10);
        
        // Get traits for each token
        ClawdNFT.Traits memory traits0 = nft.getTraits(0);
        ClawdNFT.Traits memory traits1 = nft.getTraits(1);
        ClawdNFT.Traits memory traits2 = nft.getTraits(2);
        
        // At least one should be different
        bool allSame = (
            traits0.aura == traits1.aura &&
            traits0.background == traits1.background &&
            traits0.core == traits1.core &&
            traits0.eyes == traits1.eyes &&
            traits0.overlay == traits1.overlay &&
            traits1.aura == traits2.aura &&
            traits1.background == traits2.background &&
            traits1.core == traits2.core &&
            traits1.eyes == traits2.eyes &&
            traits1.overlay == traits2.overlay
        );
        
        assertFalse(allSame, "All tokens have identical traits");
        
        vm.stopPrank();
    }
    
    function testMaxSupply() public {
        vm.deal(owner, 1000 ether);
        
        // This would take too long in a real test, just verify the check exists
        vm.expectRevert("Max supply reached");
        
        vm.prank(owner);
        // Manually set totalSupply to max
        vm.store(
            address(nft),
            bytes32(uint256(3)), // totalSupply storage slot
            bytes32(uint256(10000))
        );
        nft.mint{value: 0.0015 ether}(10);
    }
}
