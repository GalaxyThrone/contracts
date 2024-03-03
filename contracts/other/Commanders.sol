// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721EnumerableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts/utils/Base64.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract Commanders is ERC721EnumerableUpgradeable, OwnableUpgradeable {
    address public gameDiamond;

    struct Commander {
        uint faction;
        string name;
        uint EXP;
        bool[10] Traits;
    }

    mapping(uint256 => Commander) public CommandersData;

    // Nested mapping for predefined commanders
    mapping(uint => mapping(uint => Commander)) private presetCommanders;

    // Mapping for deployed Commanders
    mapping(uint => bool) private commanderDeploymentStatus;

    string private _uri;

    modifier onlyGameDiamond() {
        require(msg.sender == gameDiamond, "Commanders: restricted");
        _;
    }

    function _presetCommander(
        uint _factionId,
        uint _commanderId
    ) private view returns (Commander memory) {
        require(
            _factionId <= 3 && _commanderId < 4,
            "Invalid faction or commander ID"
        );
        return presetCommanders[_factionId][_commanderId];
    }

    function checkCommanderDeployStatus(
        uint _commanderId
    ) public view returns (bool) {
        return commanderDeploymentStatus[_commanderId];
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId
    ) internal override {
        super._beforeTokenTransfer(from, to, tokenId);

        require(
            !checkCommanderDeployStatus(tokenId),
            "Commanders: Commander is deployed"
        );
    }

    function unDeployCommander(uint _commanderId) external onlyGameDiamond {
        commanderDeploymentStatus[_commanderId] = false;
    }

    function mint(
        address _account,
        uint256 _commanderId,
        uint _factionId
    ) external onlyGameDiamond returns (uint256) {
        require(_commanderId > 0 && _commanderId < 4, "Invalid commander ID");

        uint nftId = totalSupply() + 1;
        Commander memory newCommander = _presetCommander(
            _factionId,
            _commanderId
        );
        CommandersData[_commanderId] = newCommander;
        _safeMint(_account, nftId);
        commanderDeploymentStatus[nftId] = true;
        return _commanderId;
    }

    function initialize(address _gameDiamond) public initializer {
        __ERC721_init("Commanders", "COM");
        __Ownable_init();
        gameDiamond = _gameDiamond;

        // Initalize preset commanders for the Cybertorians

        presetCommanders[0][0] = Commander(
            0,
            "Commander Vektrix",
            0,
            [
                false,
                true,
                false,
                false,
                false,
                false,
                false,
                false,
                false,
                false
            ]
        );
        presetCommanders[0][1] = Commander(
            0,
            "Commander Seraphel",
            0,
            [
                true,
                false,
                false,
                false,
                false,
                false,
                false,
                false,
                false,
                false
            ]
        );
        presetCommanders[0][2] = Commander(
            0,
            "Commander Nova",
            0,
            [
                false,
                false,
                true,
                false,
                false,
                false,
                false,
                false,
                false,
                false
            ]
        );

        // Initialize preset commanders for The Naxians
        presetCommanders[1][0] = Commander(
            1,
            "Commander Korgath",
            0,
            [
                true,
                false,
                false,
                false,
                false,
                false,
                false,
                false,
                false,
                false
            ]
        );
        presetCommanders[1][1] = Commander(
            1,
            "Commander Lunara",
            0,
            [
                false,
                true,
                false,
                false,
                false,
                false,
                false,
                false,
                false,
                false
            ]
        );
        presetCommanders[1][2] = Commander(
            1,
            "Commander Rexar",
            0,
            [
                false,
                false,
                true,
                false,
                false,
                false,
                false,
                false,
                false,
                false
            ]
        );

        // Initialize preset commanders for The Netharim
        presetCommanders[2][0] = Commander(
            2,
            "Commander Zethos",
            0,
            [
                true,
                false,
                false,
                false,
                false,
                false,
                false,
                false,
                false,
                false
            ]
        );
        presetCommanders[2][1] = Commander(
            2,
            "Commander Illari",
            0,
            [
                false,
                true,
                false,
                false,
                false,
                false,
                false,
                false,
                false,
                false
            ]
        );
        presetCommanders[2][2] = Commander(
            2,
            "Commander Raelon",
            0,
            [
                false,
                false,
                true,
                false,
                false,
                false,
                false,
                false,
                false,
                false
            ]
        );

        // Initialize preset commanders for The Xantheans
        presetCommanders[3][0] = Commander(
            3,
            "Commander Sylas",
            0,
            [
                true,
                false,
                false,
                false,
                false,
                false,
                false,
                false,
                false,
                false
            ]
        );
        presetCommanders[3][1] = Commander(
            3,
            "Commander Lyria",
            0,
            [
                false,
                true,
                false,
                false,
                false,
                false,
                false,
                false,
                false,
                false
            ]
        );
        presetCommanders[3][2] = Commander(
            3,
            "Commander Phaelon",
            0,
            [
                false,
                false,
                true,
                false,
                false,
                false,
                false,
                false,
                false,
                false
            ]
        );
    }

    function setUri(string calldata __uri) external onlyOwner {
        _uri = __uri;
    }

    function _baseURI() internal view override returns (string memory) {
        return _uri;
    }

    function setAddresses(address _gameDiamond) external onlyOwner {
        gameDiamond = _gameDiamond;
    }

    function getCommanderStats(
        uint256 _commanderId
    ) public view returns (Commander memory) {
        return CommandersData[_commanderId];
    }

    function tokenURI(
        uint256 _tokenId
    ) public view override returns (string memory) {
        Commander memory commanderAttributes = CommandersData[_tokenId];

        string memory json = Base64.encode(
            bytes(
                string(
                    abi.encodePacked(
                        '{ "description": "Commander", ',
                        '"attributes": [ ',
                        '{"trait_type": "Name", "value": "',
                        commanderAttributes.name,
                        '"}, ',
                        '{"trait_type": "Faction", "value": ',
                        Strings.toString(commanderAttributes.faction),
                        "}, ",
                        '{"trait_type": "Experience", "value": ',
                        Strings.toString(commanderAttributes.EXP),
                        "}, ",
                        // Add more attributes based on Commander's struct
                        "]}"
                    )
                )
            )
        );

        string memory output = string(
            abi.encodePacked("data:application/json;base64,", json)
        );

        return output;
    }

    function updateCommander(
        uint256 _commanderId,
        uint _newEXP,
        bool[10] calldata _newTraits
    ) external onlyGameDiamond {
        Commander storage commander = CommandersData[_commanderId];
        commander.EXP = _newEXP;

        for (uint i = 0; i < _newTraits.length; ++i) {
            commander.Traits[i] = _newTraits[i];
        }
    }
}
