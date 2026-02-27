// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title PropertyMarketplace — Escrow-based NFT property marketplace
/// @notice Lists, buys, and handles escrow offers for PropertyNFT using PROP tokens
contract PropertyMarketplace is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    IERC20 public immutable propToken;
    IERC721 public immutable propertyNFT;

    uint256 public feeBasisPoints = 500; // 5%
    address public feeCollector;

    struct Listing {
        address seller;
        uint256 price;
        bool active;
    }

    struct Offer {
        address buyer;
        uint256 amount;
        bool active;
    }

    /// @notice tokenId => Listing
    mapping(uint256 => Listing) public listings;

    /// @notice tokenId => offerId => Offer
    mapping(uint256 => mapping(uint256 => Offer)) public offers;

    /// @notice tokenId => next offer ID counter
    mapping(uint256 => uint256) public offerCount;

    event Listed(uint256 indexed tokenId, address indexed seller, uint256 price);
    event Delisted(uint256 indexed tokenId, address indexed seller);
    event Sold(uint256 indexed tokenId, address indexed seller, address indexed buyer, uint256 price, uint256 fee);
    event OfferMade(uint256 indexed tokenId, uint256 indexed offerId, address indexed buyer, uint256 amount);
    event OfferAccepted(uint256 indexed tokenId, uint256 indexed offerId, address indexed seller, uint256 amount, uint256 fee);
    event OfferCancelled(uint256 indexed tokenId, uint256 indexed offerId, address indexed buyer);
    event FeeUpdated(uint256 newFeeBasisPoints);
    event FeeCollectorUpdated(address newFeeCollector);

    constructor(address _propToken, address _propertyNFT) Ownable(msg.sender) {
        propToken = IERC20(_propToken);
        propertyNFT = IERC721(_propertyNFT);
        feeCollector = msg.sender;
    }

    // ──────────────────────────────────────────────
    //  Listings
    // ──────────────────────────────────────────────

    /// @notice List a property NFT for sale
    function listProperty(uint256 tokenId, uint256 price) external nonReentrant {
        require(price > 0, "Price must be > 0");
        require(propertyNFT.ownerOf(tokenId) == msg.sender, "Not token owner");
        require(
            propertyNFT.getApproved(tokenId) == address(this) ||
            propertyNFT.isApprovedForAll(msg.sender, address(this)),
            "Marketplace not approved"
        );

        listings[tokenId] = Listing({
            seller: msg.sender,
            price: price,
            active: true
        });

        emit Listed(tokenId, msg.sender, price);
    }

    /// @notice Remove a listing
    function delistProperty(uint256 tokenId) external nonReentrant {
        Listing storage listing = listings[tokenId];
        require(listing.active, "Not listed");
        require(listing.seller == msg.sender, "Not seller");

        listing.active = false;
        emit Delisted(tokenId, msg.sender);
    }

    /// @notice Buy a listed property directly
    function buyProperty(uint256 tokenId) external nonReentrant {
        Listing storage listing = listings[tokenId];
        require(listing.active, "Not listed");
        require(listing.seller != msg.sender, "Cannot buy own listing");

        uint256 price = listing.price;
        address seller = listing.seller;

        listing.active = false;

        uint256 fee = (price * feeBasisPoints) / 10_000;
        uint256 sellerProceeds = price - fee;

        propToken.safeTransferFrom(msg.sender, seller, sellerProceeds);
        if (fee > 0) {
            propToken.safeTransferFrom(msg.sender, feeCollector, fee);
        }

        propertyNFT.safeTransferFrom(seller, msg.sender, tokenId);

        emit Sold(tokenId, seller, msg.sender, price, fee);
    }

    // ──────────────────────────────────────────────
    //  Escrow Offers
    // ──────────────────────────────────────────────

    /// @notice Make an escrow offer on a property (PROP tokens locked in contract)
    function makeOffer(uint256 tokenId, uint256 amount) external nonReentrant {
        require(amount > 0, "Amount must be > 0");
        require(propertyNFT.ownerOf(tokenId) != msg.sender, "Cannot offer on own property");

        propToken.safeTransferFrom(msg.sender, address(this), amount);

        uint256 offerId = offerCount[tokenId]++;
        offers[tokenId][offerId] = Offer({
            buyer: msg.sender,
            amount: amount,
            active: true
        });

        emit OfferMade(tokenId, offerId, msg.sender, amount);
    }

    /// @notice Property owner accepts an offer
    function acceptOffer(uint256 tokenId, uint256 offerId) external nonReentrant {
        require(propertyNFT.ownerOf(tokenId) == msg.sender, "Not token owner");
        require(
            propertyNFT.getApproved(tokenId) == address(this) ||
            propertyNFT.isApprovedForAll(msg.sender, address(this)),
            "Marketplace not approved"
        );

        Offer storage offer = offers[tokenId][offerId];
        require(offer.active, "Offer not active");

        offer.active = false;

        uint256 amount = offer.amount;
        address buyer = offer.buyer;

        uint256 fee = (amount * feeBasisPoints) / 10_000;
        uint256 sellerProceeds = amount - fee;

        propToken.safeTransfer(msg.sender, sellerProceeds);
        if (fee > 0) {
            propToken.safeTransfer(feeCollector, fee);
        }

        propertyNFT.safeTransferFrom(msg.sender, buyer, tokenId);

        emit OfferAccepted(tokenId, offerId, msg.sender, amount, fee);
    }

    /// @notice Buyer cancels their offer and gets refunded
    function cancelOffer(uint256 tokenId, uint256 offerId) external nonReentrant {
        Offer storage offer = offers[tokenId][offerId];
        require(offer.active, "Offer not active");
        require(offer.buyer == msg.sender, "Not offer maker");

        offer.active = false;

        propToken.safeTransfer(msg.sender, offer.amount);

        emit OfferCancelled(tokenId, offerId, msg.sender);
    }

    // ──────────────────────────────────────────────
    //  Admin
    // ──────────────────────────────────────────────

    /// @notice Update marketplace fee (max 10%)
    function setFee(uint256 _feeBasisPoints) external onlyOwner {
        require(_feeBasisPoints <= 1000, "Fee too high"); // max 10%
        feeBasisPoints = _feeBasisPoints;
        emit FeeUpdated(_feeBasisPoints);
    }

    /// @notice Update fee collector address
    function setFeeCollector(address _feeCollector) external onlyOwner {
        require(_feeCollector != address(0), "Zero address");
        feeCollector = _feeCollector;
        emit FeeCollectorUpdated(_feeCollector);
    }
}
