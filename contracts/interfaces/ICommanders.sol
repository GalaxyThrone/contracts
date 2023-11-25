// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

interface ICommanders {
    struct Commander {
        uint faction;
        string name;
        uint EXP;
        bool[10] Traits;
    }

    function mint(
        address _account,
        uint256 _commanderId,
        uint _factionId
    ) external returns (uint256);

    function setUri(string calldata __uri) external;

    function setAddresses(address _gameDiamond) external;

    function getCommanderStats(
        uint256 _commanderId
    ) external view returns (Commander memory);

    function tokenURI(uint256 _tokenId) external view returns (string memory);

    function updateCommander(
        uint256 _commanderId,
        uint _newEXP,
        bool[10] calldata _newTraits
    ) external;
}
