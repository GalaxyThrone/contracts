// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

interface IResource {
    function mint(address _account, uint256 _amount) external;

    function transfer(address, uint256) external;

    function allowance(address owner, address spender)
        external
        returns (uint256);

    function transferFrom(
        address sender,
        address recipient,
        uint256 amount
    ) external returns (bool);
}
