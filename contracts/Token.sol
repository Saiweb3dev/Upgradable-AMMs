// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title EnhancedToken
 * @dev An ERC20 token with additional features like minting, burning, and pausing.
 */
contract Token is ERC20, Ownable, Pausable {
    uint8 private _decimals;
    uint256 public constant MAX_SUPPLY = 1_000_000_000 * 10**18; // 1 billion tokens

    mapping(address => bool) public blacklisted;

    event Blacklisted(address indexed account);
    event UnBlacklisted(address indexed account);

    /**
     * @dev Constructor that gives msg.sender all of existing tokens.
     */
    constructor(string memory name, string memory symbol, uint8 decimalsValue, uint256 initialSupply) ERC20(name, symbol) {
        require(initialSupply <= MAX_SUPPLY, "Initial supply exceeds max supply");
        _decimals = decimalsValue;
        _mint(msg.sender, initialSupply);
    }

    /**
     * @dev Returns the number of decimals used to get its user representation.
     */
    function decimals() public view virtual override returns (uint8) {
        return _decimals;
    }

    /**
     * @dev Creates `amount` new tokens for `to`.
     *
     * Requirements:
     * - the caller must be the owner.
     * - the total supply after minting must not exceed MAX_SUPPLY.
     */
    function mint(address to, uint256 amount) public onlyOwner {
        require(totalSupply() + amount <= MAX_SUPPLY, "Minting would exceed max supply");
        _mint(to, amount);
    }

    /**
     * @dev Destroys `amount` tokens from the caller.
     */
    function burn(uint256 amount) public virtual {
        _burn(_msgSender(), amount);
    }

    /**
     * @dev Triggers stopped state.
     * Requirements:
     * - The contract must not be paused.
     */
    function pause() public onlyOwner {
        _pause();
    }

    /**
     * @dev Returns to normal state.
     * Requirements:
     * - The contract must be paused.
     */
    function unpause() public onlyOwner {
        _unpause();
    }

    /**
     * @dev Adds an account to the blacklist.
     */
    function blacklist(address account) public onlyOwner {
        blacklisted[account] = true;
        emit Blacklisted(account);
    }

    /**
     * @dev Removes an account from the blacklist.
     */
    function unBlacklist(address account) public onlyOwner {
        blacklisted[account] = false;
        emit UnBlacklisted(account);
    }

    /**
     * @dev Overrides the transfer function to check for blacklisted addresses and paused state.
     */
    function transfer(address recipient, uint256 amount) public virtual override whenNotPaused returns (bool) {
        require(!blacklisted[_msgSender()] && !blacklisted[recipient], "Blacklisted address");
        return super.transfer(recipient, amount);
    }

    /**
     * @dev Overrides the transferFrom function to check for blacklisted addresses and paused state.
     */
    function transferFrom(address sender, address recipient, uint256 amount) public virtual override whenNotPaused returns (bool) {
        require(!blacklisted[sender] && !blacklisted[recipient], "Blacklisted address");
        return super.transferFrom(sender, recipient, amount);
    }
}