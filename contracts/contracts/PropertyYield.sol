// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title PropertyYield — Passive PROP earnings for property owners
/// @notice Property NFT holders earn PROP tokens over time, claimable per-property
interface IPropToken {
    function mint(address to, uint256 amount) external;
}

contract PropertyYield is Ownable, ReentrancyGuard {
    IERC721 public immutable propertyNFT;
    IPropToken public immutable propToken;

    /// @notice PROP tokens earned per second per property (in wei)
    uint256 public yieldRate;

    /// @notice tokenId => timestamp of last yield claim
    mapping(uint256 => uint256) public lastClaimed;

    /// @notice tokenId => timestamp when yield tracking started
    mapping(uint256 => uint256) public yieldStartTime;

    event YieldClaimed(uint256 indexed tokenId, address indexed owner, uint256 amount);
    event YieldRateUpdated(uint256 newRate);
    event PropertyRegistered(uint256 indexed tokenId);

    constructor(
        address _propertyNFT,
        address _propToken,
        uint256 _yieldRate
    ) Ownable(msg.sender) {
        propertyNFT = IERC721(_propertyNFT);
        propToken = IPropToken(_propToken);
        yieldRate = _yieldRate;
    }

    /// @notice Register a property for yield tracking (called after minting)
    function registerProperty(uint256 tokenId) external onlyOwner {
        require(yieldStartTime[tokenId] == 0, "Already registered");
        yieldStartTime[tokenId] = block.timestamp;
        lastClaimed[tokenId] = block.timestamp;
        emit PropertyRegistered(tokenId);
    }

    /// @notice Calculate pending yield for a property
    function pendingYield(uint256 tokenId) public view returns (uint256) {
        if (yieldStartTime[tokenId] == 0) return 0;

        uint256 lastTime = lastClaimed[tokenId];
        uint256 elapsed = block.timestamp - lastTime;
        return elapsed * yieldRate;
    }

    /// @notice Claim accumulated yield for a property (only current owner)
    function claimYield(uint256 tokenId) external nonReentrant {
        require(propertyNFT.ownerOf(tokenId) == msg.sender, "Not property owner");
        require(yieldStartTime[tokenId] != 0, "Property not registered");

        uint256 amount = pendingYield(tokenId);
        require(amount > 0, "No yield to claim");

        lastClaimed[tokenId] = block.timestamp;

        propToken.mint(msg.sender, amount);

        emit YieldClaimed(tokenId, msg.sender, amount);
    }

    /// @notice Claim yield for multiple properties at once
    function batchClaimYield(uint256[] calldata tokenIds) external nonReentrant {
        uint256 totalAmount = 0;

        for (uint256 i = 0; i < tokenIds.length; i++) {
            uint256 tokenId = tokenIds[i];
            require(propertyNFT.ownerOf(tokenId) == msg.sender, "Not property owner");
            require(yieldStartTime[tokenId] != 0, "Property not registered");

            uint256 amount = pendingYield(tokenId);
            if (amount > 0) {
                lastClaimed[tokenId] = block.timestamp;
                totalAmount += amount;
                emit YieldClaimed(tokenId, msg.sender, amount);
            }
        }

        require(totalAmount > 0, "No yield to claim");
        propToken.mint(msg.sender, totalAmount);
    }

    /// @notice Update yield rate (admin only)
    function setYieldRate(uint256 _yieldRate) external onlyOwner {
        yieldRate = _yieldRate;
        emit YieldRateUpdated(_yieldRate);
    }
}
