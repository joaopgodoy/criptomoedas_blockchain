// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Pausable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract Ticket1155 is ERC1155, ERC1155Pausable, AccessControl {
    bytes32 public constant ROLE_ADMIN   = keccak256("ROLE_ADMIN");
    bytes32 public constant ROLE_CHECKER = keccak256("ROLE_CHECKER");

    string public name;
    string public symbol;

    constructor(string memory _name, string memory _symbol, string memory baseURI)
        ERC1155(baseURI)
    {
        name = _name;
        symbol = _symbol;

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ROLE_ADMIN, msg.sender);
    }

    // --- Admin ---
    function setURI(string memory newuri) external onlyRole(ROLE_ADMIN) {
        _setURI(newuri);
    }

    function pause() external onlyRole(ROLE_ADMIN) {
        _pause();
    }

    function unpause() external onlyRole(ROLE_ADMIN) {
        _unpause();
    }

    function mintTicket(address to, uint256 tokenId, uint256 amount, bytes memory data)
        external
        onlyRole(ROLE_ADMIN)
    {
        _mint(to, tokenId, amount, data);
    }

    function revokeOne(address holder, uint256 tokenId) external onlyRole(ROLE_ADMIN) {
        _burn(holder, tokenId, 1);
    }

    // --- Check-in ---
    function checkIn(address holder, uint256 tokenId) external onlyRole(ROLE_CHECKER) {
        _burn(holder, tokenId, 1);
    }

    // --- Overrides necessários ---
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC1155, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    // Resolve o diamante entre ERC1155 e ERC1155Pausable
    function _update(
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory values
    ) internal override(ERC1155, ERC1155Pausable) {
        super._update(from, to, ids, values);
    }

}

