// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/Base64.sol";

/// @title PropertyNFT — ERC-721 virtual property tokens
/// @notice Each token represents a virtual property with on-chain metadata
contract PropertyNFT is ERC721, ERC721Enumerable, Ownable {
    using Strings for uint256;

    struct Property {
        string name;
        string location;
        uint256 area; // in square meters
        uint256 mintPrice; // PROP tokens used to mint
    }

    uint256 private _nextTokenId;

    /// @notice On-chain metadata for each property
    mapping(uint256 => Property) public properties;

    event PropertyMinted(
        uint256 indexed tokenId,
        address indexed to,
        string name,
        string location,
        uint256 area,
        uint256 mintPrice
    );

    constructor() ERC721("PropChain Property", "PNFT") Ownable(msg.sender) {}

    /// @notice Admin mints a new property NFT
    function mintProperty(
        address to,
        string calldata name,
        string calldata location,
        uint256 area,
        uint256 mintPrice
    ) external onlyOwner returns (uint256) {
        uint256 tokenId = _nextTokenId++;
        _safeMint(to, tokenId);

        properties[tokenId] = Property({
            name: name,
            location: location,
            area: area,
            mintPrice: mintPrice
        });

        emit PropertyMinted(tokenId, to, name, location, area, mintPrice);
        return tokenId;
    }

    /// @notice Returns the total number of minted properties
    function totalProperties() external view returns (uint256) {
        return _nextTokenId;
    }

    /// @notice Returns full on-chain metadata as a data URI
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);

        Property memory prop = properties[tokenId];

        string memory json = string(
            abi.encodePacked(
                '{"name":"', prop.name,
                '","description":"Virtual property on PropChain","attributes":[',
                '{"trait_type":"Location","value":"', prop.location, '"},',
                '{"trait_type":"Area","display_type":"number","value":', prop.area.toString(), '},',
                '{"trait_type":"Mint Price","display_type":"number","value":', prop.mintPrice.toString(), '}',
                ']}'
            )
        );

        return string(abi.encodePacked("data:application/json;base64,", Base64.encode(bytes(json))));
    }

    // Required overrides for ERC721Enumerable
    function _update(address to, uint256 tokenId, address auth)
        internal
        override(ERC721, ERC721Enumerable)
        returns (address)
    {
        return super._update(to, tokenId, auth);
    }

    function _increaseBalance(address account, uint128 value)
        internal
        override(ERC721, ERC721Enumerable)
    {
        super._increaseBalance(account, value);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721Enumerable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
