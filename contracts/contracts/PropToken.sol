// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title PropToken — ERC-20 currency for the PropChain marketplace
/// @notice Used to buy/sell property NFTs and distribute yield rewards
contract PropToken is ERC20, Ownable {
    constructor() ERC20("PropToken", "PROP") Ownable(msg.sender) {
        _mint(msg.sender, 10_000_000 * 10 ** decimals());
    }

    /// @notice Owner can mint additional tokens (for yield distribution, etc.)
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
}
