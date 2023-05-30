// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import {AppStorage, Modifiers, CraftItem, SendTerraform, attackStatus, ShipType, Building} from "../libraries/AppStorage.sol";
import "../interfaces/IPlanets.sol";
import "../interfaces/IShips.sol";
import "../interfaces/IERC20.sol";
import "../interfaces/IERC721.sol";
import "../interfaces/IResource.sol";
import "../interfaces/IBuildings.sol";
import "./ShipsFacet.sol";
import "./BuildingsFacet.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AutomationCompatibleInterface.sol";

contract AllianceFacet is Modifiers {
    event allianceCreated(
        bytes32 indexed allianceName,
        address indexed allianceCreator,
        uint256 indexed timestamp
    );

    event invitedToAlliance(
        bytes32 indexed allianceName,
        address indexed playerAddress,
        uint256 indexed timestamp
    );

    event joinedAlliance(
        bytes32 indexed allianceName,
        address indexed playerAddress,
        uint256 indexed timestamp
    );

    event leavingAlliance(
        bytes32 indexed allianceName,
        address indexed playerAddress,
        uint256 indexed timestamp
    );

    event changedAllianceOwner(
        bytes32 indexed allianceName,
        address indexed newOwner,
        uint256 indexed timestamp
    );

    function createAlliance(bytes32 _allianceNameToCreate) external {
        require(
            !s.hasCreatedAlliance[msg.sender],
            "You can only create one alliance!"
        );
        require(
            s.allianceOwner[_allianceNameToCreate] == address(0),
            "alliance name is already taken!"
        );

        require(s.registered[msg.sender], "VRFFacet: not registered yet!");

        //@TODO minimum payment to disallow spam

        s.allianceOwner[_allianceNameToCreate] = msg.sender;
        s.allianceOfPlayer[msg.sender] = _allianceNameToCreate;

        s.membersAlliance[_allianceNameToCreate][
            s.allianceMemberCount[_allianceNameToCreate]
        ] = msg.sender;

        s.allianceMemberCount[_allianceNameToCreate] += 1;

        s.registeredAlliances[s.totalAllianceCount] = _allianceNameToCreate;
        s.totalAllianceCount += 1;
        s.hasCreatedAlliance[msg.sender] = true;
        emit allianceCreated(
            _allianceNameToCreate,
            msg.sender,
            block.timestamp
        );
    }

    function inviteToAlliance(address _memberInvited) external {
        require(s.allianceOwner[s.allianceOfPlayer[msg.sender]] == msg.sender);

        require(
            s.registered[_memberInvited],
            "address cannot be invited, not registered!"
        );
        s.isInvitedToAlliance[_memberInvited] = true;

        s.outstandingInvitations[_memberInvited].push(
            s.allianceOfPlayer[msg.sender]
        );

        emit invitedToAlliance(
            s.allianceOfPlayer[msg.sender],
            _memberInvited,
            block.timestamp
        );
    }

    function joinAlliance(bytes32 _allianceToJoin) external {
        require(
            s.isInvitedToAlliance[msg.sender] == true,
            "You are not invited to this alliance!"
        );

        s.allianceOfPlayer[msg.sender] = _allianceToJoin;
        delete s.isInvitedToAlliance[msg.sender];

        s.membersAlliance[_allianceToJoin][
            s.allianceMemberCount[_allianceToJoin]
        ] = msg.sender;

        s.allianceMemberCount[_allianceToJoin] += 1;

        _removeInvitation(msg.sender, _allianceToJoin);

        emit joinedAlliance(_allianceToJoin, msg.sender, block.timestamp);
    }

    function leaveAlliance() external {
        //owner cannot leave alliance without changing the owner
        require(s.allianceOwner[s.allianceOfPlayer[msg.sender]] != msg.sender);

        uint256 allianceMemberCount = s.allianceMemberCount[
            s.allianceOfPlayer[msg.sender]
        ];

        for (uint256 i = 0; i < allianceMemberCount; i++) {
            if (
                s.membersAlliance[s.allianceOfPlayer[msg.sender]][i] ==
                msg.sender
            ) {
                s.membersAlliance[s.allianceOfPlayer[msg.sender]][i] = s
                    .membersAlliance[s.allianceOfPlayer[msg.sender]][
                        allianceMemberCount - 1
                    ];
                break;
            }
        }

        delete s.membersAlliance[s.allianceOfPlayer[msg.sender]][
            allianceMemberCount - 1
        ];

        s.allianceMemberCount[s.allianceOfPlayer[msg.sender]] -= 1;

        emit leavingAlliance(
            s.allianceOfPlayer[msg.sender],
            msg.sender,
            block.timestamp
        );
        delete s.allianceOfPlayer[msg.sender];
    }

    function changeAllianceOwner(address _newAllianceOwner) external {
        require(
            s.allianceOwner[s.allianceOfPlayer[msg.sender]] == msg.sender,
            "only alliance owner!"
        );

        require(
            (s.allianceOfPlayer[_newAllianceOwner] ==
                s.allianceOfPlayer[msg.sender]),
            "can only make members to alliance Owners!"
        );
        s.allianceOwner[s.allianceOfPlayer[msg.sender]] = _newAllianceOwner;

        emit changedAllianceOwner(
            s.allianceOfPlayer[msg.sender],
            _newAllianceOwner,
            block.timestamp
        );
    }

    function kickAllianceMember(address _player) external {
        // Only the owner of the alliance can kick members
        require(
            s.allianceOwner[s.allianceOfPlayer[msg.sender]] == msg.sender,
            "Only the alliance owner can kick members!"
        );

        // The owner cannot kick themselves
        require(_player != msg.sender, "Owner cannot kick themselves!");

        // The player must be a member of the alliance
        require(
            s.allianceOfPlayer[_player] == s.allianceOfPlayer[msg.sender],
            "Player is not a member of the alliance!"
        );

        uint256 allianceMemberCount = s.allianceMemberCount[
            s.allianceOfPlayer[msg.sender]
        ];

        for (uint256 i = 0; i < allianceMemberCount; i++) {
            if (
                s.membersAlliance[s.allianceOfPlayer[msg.sender]][i] == _player
            ) {
                s.membersAlliance[s.allianceOfPlayer[msg.sender]][i] = s
                    .membersAlliance[s.allianceOfPlayer[msg.sender]][
                        allianceMemberCount - 1
                    ];
                break;
            }
        }

        delete s.membersAlliance[s.allianceOfPlayer[msg.sender]][
            allianceMemberCount - 1
        ];

        // Decrease alliance member count
        s.allianceMemberCount[s.allianceOfPlayer[msg.sender]] -= 1;

        // Emit a event for leaving the alliance
        emit leavingAlliance(
            s.allianceOfPlayer[_player],
            _player,
            block.timestamp
        );

        // Remove the player from the alliance
        delete s.allianceOfPlayer[_player];
    }

    function _removeInvitation(address _member, bytes32 _alliance) internal {
        uint256 numInvitations = s.outstandingInvitations[_member].length;
        for (uint256 i = 0; i < numInvitations; i++) {
            if (s.outstandingInvitations[_member][i] == _alliance) {
                s.outstandingInvitations[_member][i] = s.outstandingInvitations[
                    _member
                ][numInvitations - 1];
                s.outstandingInvitations[_member].pop();
                break;
            }
        }
    }

    function getOutstandingInvitations(
        address _member
    ) external view returns (bytes32[] memory) {
        return s.outstandingInvitations[_member];
    }

    function returnAllAlliances() external view returns (bytes32[] memory) {
        bytes32[] memory allAllianceNames = new bytes32[](s.totalAllianceCount);

        for (uint256 i = 0; i < s.totalAllianceCount; i++) {
            allAllianceNames[i] = s.registeredAlliances[i];
        }

        return allAllianceNames;
    }

    function viewAllAlliancesMembers(
        bytes32 _allianceToCheck
    ) external view returns (address[] memory) {
        uint256 allianceMemberCount = s.allianceMemberCount[_allianceToCheck];

        address[] memory allianceMembers = new address[](allianceMemberCount);
        for (uint256 i = 0; i < allianceMemberCount; i++) {
            allianceMembers[i] = s.membersAlliance[_allianceToCheck][i];
        }

        return allianceMembers;
    }

    function getCurrentAlliancePlanet(
        uint256 _planetId
    ) external view returns (bytes32) {
        address currPlayerowner = IERC721(s.planetsAddress).ownerOf(_planetId);

        return s.allianceOfPlayer[currPlayerowner];
    }

    function getCurrentAlliancePlayer(
        address _player
    ) external view returns (bytes32) {
        return s.allianceOfPlayer[_player];
    }

    function getAllianceOwner(
        bytes32 _allianceToCheck
    ) external view returns (address) {
        return s.allianceOwner[_allianceToCheck];
    }
}
