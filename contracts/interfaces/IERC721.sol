// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

interface IERC721 {
    function ownerOf(uint256 _tokenId) external view returns (address);

    function safeTransferFrom(
        address from,
        address to,
        uint256 tokenId
    ) external;

    function totalSupply() external view returns (uint256);
}
