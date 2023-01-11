// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import {AppStorage, Modifiers, CraftItem, SendTerraform, attackStatus, ShipType, Building} from "../libraries/AppStorage.sol";
import "../interfaces/IPlanets.sol";
import "../interfaces/IShips.sol";
import "../interfaces/IERC20.sol";
import "../interfaces/IERC721.sol";
import "../interfaces/IResource.sol";
import "../interfaces/IBuildings.sol";
import "./FleetsFacet.sol";
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
            s.allianceOwner[_allianceNameToCreate] == address(0),
            "alliance name is already taken!"
        );

        require(s.registered[msg.sender], "VRFFacet: not registered yet!");

        //@TODO minimum payment to disallow spam

        s.allianceOwner[_allianceNameToCreate] = msg.sender;
        s.allianceOfPlayer[msg.sender] = _allianceNameToCreate;
        s.allianceMemberCount[_allianceNameToCreate] += 1;
        s.registeredAlliances[s.totalAllianceCount] = _allianceNameToCreate;
        s.totalAllianceCount += 1;

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

        emit invitedToAlliance(
            s.allianceOfPlayer[msg.sender],
            _memberInvited,
            block.timestamp
        );
    }

    function joinAlliance(bytes32 _allianceToJoin) external {
        require(
            s.isInvitedToAlliance[msg.sender] == true,
            "you are not invited to this alliance!"
        );

        s.allianceMemberCount[_allianceToJoin] += 1;
        s.allianceOfPlayer[msg.sender] = _allianceToJoin;
        delete s.isInvitedToAlliance[msg.sender];

        emit joinedAlliance(_allianceToJoin, msg.sender, block.timestamp);
    }

    function leaveAlliance() external {
        //owner cannot leave alliance without changing the owner
        require(s.allianceOwner[s.allianceOfPlayer[msg.sender]] != msg.sender);
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

    function returnAllAlliances() external view returns (bytes32[] memory) {
        bytes32[] memory allAllianceNames = new bytes32[](s.totalAllianceCount);

        for (uint256 i = 0; i < s.totalAllianceCount; i++) {
            allAllianceNames[i] = s.registeredAlliances[i];
        }

        return allAllianceNames;
    }
}
