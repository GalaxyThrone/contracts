// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import {AppStorage, Modifiers, CraftItem, SendCargo, SendTerraform, attackStatus, ShipType, Building} from "../libraries/AppStorage.sol";
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
    function createAlliance(bytes32 _allianceNameToCreate) external {
        require(
            s.allianceOwner[_allianceNameToCreate] == address(0),
            "alliance name is already taken!"
        );

        require(s.registered[msg.sender], "VRFFacet: not registered yet!");

        //@TODO minimum payment to disallow spam

        s.allianceOwner[_allianceNameToCreate] = msg.sender;
    }

    function inviteToAlliance(
        address _memberInvited,
        bytes32 _allianceToInviteTo
    ) external {
        require(s.allianceOwner[_allianceToInviteTo] == msg.sender);
        s.isInvitedToAlliance[_memberInvited] = true;
    }

    function joinAlliance(bytes32 _allianceToJoin) external {
        require(
            s.isInvitedToAlliance[msg.sender] == true,
            "you are not invited to this alliance!"
        );

        s.allianceOfPlayer[msg.sender] = _allianceToJoin;
        delete s.isInvitedToAlliance[msg.sender];
    }

    function leaveAlliance() external {
        delete s.allianceOfPlayer[msg.sender];
    }

    function checkAlliance(address _playerToCheck)
        public
        view
        returns (bytes32)
    {
        return s.allianceOfPlayer[_playerToCheck];
    }
}
