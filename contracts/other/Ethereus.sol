// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

contract Ethereus is ERC20Upgradeable, OwnableUpgradeable {
    address public gameDiamond;

    function initialize(address _gameDiamond) public initializer {
        __ERC20_init("Ethereus", "ERS");
        __Ownable_init();
        gameDiamond = _gameDiamond;
    }

    function setAddresses(address _gameDiamond) external onlyOwner {
        gameDiamond = _gameDiamond;
    }

    function mint(address _account, uint256 _amount) external {
        require(msg.sender == gameDiamond, "Ethereus: restricted");
        _mint(_account, _amount);
    }

    function burnFrom(address _account, uint256 _amount) external {
        require(msg.sender == gameDiamond, "Ethereus: restricted");
        _burn(_account, _amount);
    }

    function transfer(address, uint256) public override returns (bool) {
        revert("non transferable");
    }

    function transferFrom(
        address,
        address,
        uint256
    ) public override returns (bool) {
        revert("non transferable");
    }
}
