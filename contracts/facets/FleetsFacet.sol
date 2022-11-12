// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import {AppStorage, Modifiers, CraftItem, SendCargo, SendTerraform, attackStatus, ShipType} from "../libraries/AppStorage.sol";
import "../interfaces/IPlanets.sol";
import "../interfaces/IFleets.sol";

import "../interfaces/IShips.sol";
import "../interfaces/IERC20.sol";
import "../interfaces/IERC721.sol";
import "../interfaces/IResource.sol";

contract FleetsFacet is Modifiers {
    function craftFleet(uint256 _fleetId, uint256 _planetId)
        external
        onlyPlanetOwner(_planetId)
    {
        IShips fleetsContract = IShips(s.ships);
        uint256[3] memory price = fleetsContract.getPrice(_fleetId);
        uint256 craftTime = fleetsContract.getCraftTime(_fleetId);
        uint256 craftedFrom = fleetsContract.getCraftedFrom(_fleetId);
        uint256 buildings = IPlanets(s.planets).getBuildings(
            _planetId,
            craftedFrom
        );
        require(craftTime > 0, "FleetsFacet: not released yet");
        require(
            s.craftFleets[_planetId].itemId == 0,
            "FleetsFacet: planet already crafting"
        );
        require(buildings > 0, "FleetsFacet: missing building requirement");
        uint256 readyTimestamp = block.timestamp + craftTime;
        CraftItem memory newFleet = CraftItem(_fleetId, readyTimestamp);
        s.craftFleets[_planetId] = newFleet;
        IERC20(s.metal).burnFrom(msg.sender, price[0]);
        IERC20(s.crystal).burnFrom(msg.sender, price[1]);
        IERC20(s.ethereus).burnFrom(msg.sender, price[2]);
    }

    function claimFleet(uint256 _planetId) external onlyPlanetOwner(_planetId) {
        require(
            block.timestamp >= s.craftFleets[_planetId].readyTimestamp,
            "FleetsFacet: not ready yet"
        );
        uint256 shipId = IShips(s.ships).mint(
            msg.sender,
            s.craftFleets[_planetId].itemId
        );
        uint256 fleetId = s.craftFleets[_planetId].itemId;
        delete s.craftFleets[_planetId];

        IPlanets(s.planets).addFleet(_planetId, fleetId, 1);
        IShips(s.ships).assignShipToPlanet(shipId, _planetId);
    }

    //@notice Disabled for V0.01
    /*
    function sendCargo(
        uint256 _fromPlanetId,
        uint256 _toPlanetId,
        uint256 _fleetId,
        uint256 _resourceId
    ) external onlyPlanetOwner(_fromPlanetId) {
        //todo: require only cargo ships
        SendCargo memory newSendCargo = SendCargo(
            _fromPlanetId,
            _toPlanetId,
            _fleetId,
            _resourceId,
            block.timestamp
        );
        s.sendCargoId++;
        s.sendCargo[s.sendCargoId] = newSendCargo;
        // emit event
    }
    */
    //@notice Disabled for V0.01
    /*
    function returnCargo(uint256 _sendCargoId) external {
        require(
            msg.sender ==
                IERC721(s.planets).ownerOf(
                    s.sendCargo[_sendCargoId].fromPlanetId
                ),
            "AppStorage: Not owner"
        );
        (uint256 fromX, uint256 fromY) = IPlanets(s.planets).getCoordinates(
            s.sendCargo[_sendCargoId].fromPlanetId
        );
        (uint256 toX, uint256 toY) = IPlanets(s.planets).getCoordinates(
            s.sendCargo[_sendCargoId].toPlanetId
        );
        uint256 xDist = fromX > toX ? fromX - toX : toX - fromX;
        uint256 yDist = fromY > toY ? fromY - toY : toY - fromY;
        uint256 distance = xDist + yDist;
        require(
            block.timestamp >=
                s.sendCargo[_sendCargoId].timestamp + (distance * 2),
            "FleetsFacet: not ready yet"
        );
        uint256 cargo = IFleets(s.fleets).getCargo(
            s.sendCargo[_sendCargoId].fleetId
        );
        IPlanets(s.planets).mineResource(
            s.sendCargo[_sendCargoId].toPlanetId,
            s.sendCargo[_sendCargoId].resourceId,
            cargo
        );
        IResource(s.ethereus).mint(msg.sender, cargo);
        delete s.sendCargo[_sendCargoId];
    }
    */
    //@notice Disabled for V0.01

    /*
    function sendTerraform(
        uint256 _fromPlanetId,
        uint256 _toPlanetId,
        uint256 _fleetId
    ) external onlyPlanetOwner(_fromPlanetId) {
        //todo: require only to empty planet
        //todo: only terraform ship
        SendTerraform memory newSendTerraform = SendTerraform(
            _fromPlanetId,
            _toPlanetId,
            _fleetId,
            block.timestamp
        );
        s.sendTerraformId++;
        s.sendTerraform[s.sendTerraformId] = newSendTerraform;
        // emit event
    }
    */
    //@notice Disabled for V0.01
    /*
    function endTerraform(uint256 _sendTerraformId) external {
        require(
            msg.sender ==
                IERC721(s.planets).ownerOf(
                    s.sendTerraform[_sendTerraformId].fromPlanetId
                ),
            "AppStorage: Not owner"
        );
        (uint256 fromX, uint256 fromY) = IPlanets(s.planets).getCoordinates(
            s.sendTerraform[_sendTerraformId].fromPlanetId
        );
        (uint256 toX, uint256 toY) = IPlanets(s.planets).getCoordinates(
            s.sendTerraform[_sendTerraformId].toPlanetId
        );
        uint256 xDist = fromX > toX ? fromX - toX : toX - fromX;
        uint256 yDist = fromY > toY ? fromY - toY : toY - fromY;
        uint256 distance = xDist + yDist;
        require(
            block.timestamp >=
                s.sendTerraform[_sendTerraformId].timestamp + distance,
            "FleetsFacet: not ready yet"
        );
        //todo: conquer planet
    }
    */
    function getCraftFleets(uint256 _planetId)
        external
        view
        returns (uint256, uint256)
    {
        return (
            s.craftFleets[_planetId].itemId,
            s.craftFleets[_planetId].readyTimestamp
        );
    }

    function sendAttack(
        uint256 _fromPlanetId,
        uint256 _toPlanetId,
        uint256[] memory _shipIds //tokenId's of ships to send
    ) external onlyPlanetOwner(_fromPlanetId) {
        require(
            msg.sender != IERC721(s.planets).ownerOf(_toPlanetId),
            "you cannot attack your own planets!"
        );

        require(
            checkAlliance(IERC721(s.planets).ownerOf(_toPlanetId)) !=
                checkAlliance(msg.sender) ||
                checkAlliance(msg.sender) == address(0),
            "friendly target!"
        );

        //check if ships are assigned to the planet
        for (uint256 i = 0; i < _shipIds.length; i++) {
            require(
                IShips(s.ships).checkAssignedPlanet(_shipIds[i]) ==
                    _fromPlanetId,
                "ship is not assigned to this planet!"
            );
            require(
                IERC721(s.ships).ownerOf(_shipIds[i]) == msg.sender,
                "not your ship!"
            );
            //unassign ships during attack
            IShips(s.ships).deleteShipFromPlanet(_shipIds[i]);
        }
        unAssignNewShipTypeAmount(_fromPlanetId, _shipIds);

        //refactor to  an internal func

        (uint256 fromX, uint256 fromY) = IPlanets(s.planets).getCoordinates(
            _fromPlanetId
        );
        (uint256 toX, uint256 toY) = IPlanets(s.planets).getCoordinates(
            _toPlanetId
        );

        uint256 xDist = fromX > toX ? fromX - toX : toX - fromX;
        uint256 yDist = fromY > toY ? fromY - toY : toY - fromY;
        uint256 distance = xDist + yDist;

        attackStatus memory attackToBeAdded;

        attackToBeAdded.attackStarted = block.timestamp;

        attackToBeAdded.distance = distance;

        attackToBeAdded.timeToBeResolved = block.timestamp + distance + 120; // minimum 2min test

        attackToBeAdded.fromPlanet = _fromPlanetId;

        attackToBeAdded.toPlanet = _toPlanetId;

        attackToBeAdded.attackerShipsIds = _shipIds;

        attackToBeAdded.attacker = msg.sender;

        IPlanets(s.planets).addAttack(attackToBeAdded);
    }

    //@TODO currently instantenous for hackathon.
    //@notice perhaps require a specific building for instantenous travel / normal travel for others>

    function sendFriendlies(
        uint256 _fromPlanetId,
        uint256 _toPlanetId,
        uint256[] memory _shipIds
    ) external onlyPlanetOwner(_fromPlanetId) {
        //check if ships are assigned to the planet

        require(
            checkAlliance(IERC721(s.planets).ownerOf(_toPlanetId)) ==
                checkAlliance(msg.sender) ||
                msg.sender == IERC721(s.planets).ownerOf(_toPlanetId),
            "not a friendly target!"
        );

        for (uint256 i = 0; i < _shipIds.length; i++) {
            require(
                IShips(s.ships).checkAssignedPlanet(_shipIds[i]) ==
                    _fromPlanetId,
                "ship is not assigned to this planet!"
            );

            require(
                IERC721(s.ships).ownerOf(_shipIds[i]) == msg.sender,
                "not your ship!"
            );

            IShips(s.ships).deleteShipFromPlanet(_shipIds[i]);
        }

        unAssignNewShipTypeAmount(_fromPlanetId, _shipIds);

        AssignNewShipTypeAmount(_toPlanetId, _shipIds);

        for (uint256 i = 0; i < attackerShips.length; i++) {
            IShips(s.ships).assignShipToPlanet(_shipIds[i], _toPlanetId);
        }
    }

    function assignNewShipTypeAmount(
        uint256 _toPlanetId,
        uint256[] memory _shipsTokenIds
    ) internal {
        for (uint256 i = 0; i < _shipsTokenIds.length; i++) {
            IPlanets(s.planets).addFleet(
                _toPlanetId,
                IShips(s.ships).getShipStats(_shipsTokenIds[i]).shipType,
                1
            );
        }
    }

    function assignNewShipTypeAmount(
        uint256 _toPlanetId,
        uint256[] memory _shipsTokenIds
    ) internal {
        for (uint256 i = 0; i < _shipsTokenIds.length; i++) {
            IPlanets(s.planets).addFleet(
                _toPlanetId,
                IShips(s.ships).getShipStats(_shipsTokenIds[i]).shipType,
                1
            );
        }
    }

    function unAssignNewShipTypeAmount(
        uint256 _toPlanetId,
        uint256[] memory _shipsTokenIds
    ) internal {
        for (uint256 i = 0; i < _shipsTokenIds.length; i++) {
            IPlanets(s.planets).removeFleet(
                _toPlanetId,
                IShips(s.ships).getShipStats(_shipsTokenIds[i]).shipType,
                1
            );
        }
    }

    function resolveAttack(uint256 _attackInstanceId) external {
        attackStatus memory attackToResolve = IPlanets(s.planets)
            .getAttackStatus(_attackInstanceId);

        require(
            block.timestamp >= attackToResolve.timeToBeResolved,
            "attack fleet hasnt arrived yet!"
        );

        uint256[] memory attackerShips = attackToResolve.attackerShipsIds;
        uint256[] memory defenderShips = IShips(s.ships).getDefensePlanet(
            attackToResolve.toPlanet
        );

        int256 attackStrength;
        int256 attackHealth;

        int256 defenseStrength;
        int256 defenseHealth;
        for (uint256 i = 0; i < attackerShips.length; i++) {
            attackStrength += int256(
                IShips(s.ships).getShipStats(attackerShips[i]).attack
            );
            attackHealth += int256(
                IShips(s.ships).getShipStats(attackerShips[i]).health
            );
        }

        for (uint256 i = 0; i < defenderShips.length; i++) {
            defenseStrength += int256(
                IShips(s.ships).getShipStats(defenderShips[i]).attack
            );

            defenseHealth += int256(
                IShips(s.ships).getShipStats(defenderShips[i]).health
            );
        }

        //to be improved later, very rudimentary resolvement
        // 100 - 50 = 50 dmg
        int256 battleResult = attackStrength - defenseStrength;

        //attacker has higher atk than defender
        if (battleResult > 0) {
            //attacker has higher atk than defender + entire health destroyed
            //win for attacker
            if (battleResult >= defenseHealth) {
                //burn defender ships

                //burn NFTs
                //remove  shipID assignment to Planet

                for (uint256 i = 0; i < defenderShips.length; i++) {
                    IShips(s.ships).burnShip(defenderShips[i]);
                    IShips(s.ships).deleteShipFromPlanet(defenderShips[i]);
                }

                //conquer planet
                //give new owner the planet
                address loserAddr = IERC721(s.planets).ownerOf(
                    attackToResolve.toPlanet
                );

                IPlanets(s.planets).planetConquestTransfer(
                    attackToResolve.toPlanet,
                    loserAddr,
                    attackToResolve.attacker,
                    attackToResolve.attackInstanceId
                );

                //damage to attackerForce, random? @TODO

                //assign attacker ships to new planet

                unAssignNewShipTypeAmount(
                    attackToResolve.toPlanet,
                    defenderShips
                );
                assignNewShipTypeAmount(
                    attackToResolve.toPlanet,
                    attackerShips
                );

                for (uint256 i = 0; i < attackerShips.length; i++) {
                    IShips(s.ships).assignShipToPlanet(
                        attackerShips[i],
                        attackToResolve.toPlanet
                    );
                }
            }
            //burn killed ships until there are no more left; then reassign attacking fleet to home-planet
            else {
                //burn nfts and unassign ship from planets, also reduce defenderShip Array
                for (uint256 i = 0; i < defenderShips.length; i++) {
                    int256 defenderShipHealth = int256(
                        IShips(s.ships).getShipStats(defenderShips[i]).health
                    );

                    if (battleResult > defenderShipHealth) {
                        battleResult -= defenderShipHealth;

                        IShips(s.ships).burnShip(defenderShips[i]);
                        IShips(s.ships).deleteShipFromPlanet(defenderShips[i]);
                        delete defenderShips[i];
                    }
                }

                //sending ships home

                assignNewShipTypeAmount(
                    attackToResolve.fromPlanet,
                    attackerShips
                );

                for (uint256 i = 0; i < attackerShips.length; i++) {
                    IShips(s.ships).assignShipToPlanet(
                        attackerShips[i],
                        attackToResolve.fromPlanet
                    );
                }

                IPlanets(s.planets).resolveLostAttack(
                    attackToResolve.attackInstanceId
                );
            }
        }

        //defender has higher atk than attacker
        if (battleResult < 0) {
            //burn attacker nfts that lost
            for (uint256 i = 0; i < attackerShips.length; i++) {
                int256 attackerShipHealth = int256(
                    IShips(s.ships).getShipStats(attackerShips[i]).health
                );

                if (battleResult > attackerShipHealth) {
                    battleResult -= attackerShipHealth;

                    IShips(s.ships).burnShip(attackerShips[i]);
                    IShips(s.ships).deleteShipFromPlanet(attackerShips[i]);
                    delete attackerShips[i];
                }
            }

            //sending ships home

            assignNewShipTypeAmount(attackToResolve.fromPlanet, attackerShips);

            for (uint256 i = 0; i < attackerShips.length; i++) {
                IShips(s.ships).assignShipToPlanet(
                    attackerShips[i],
                    attackToResolve.fromPlanet
                );
            }

            IPlanets(s.planets).resolveLostAttack(
                attackToResolve.attackInstanceId
            );
        }

        //draw -> currently leads to zero losses, only a retreat
        if (battleResult == 0) {
            for (uint256 i = 0; i < attackerShips.length; i++) {
                IShips(s.ships).assignShipToPlanet(
                    attackerShips[i],
                    attackToResolve.fromPlanet
                );
            }

            //sending ships home
            assignNewShipTypeAmount(attackToResolve.fromPlanet, attackerShips);
            IPlanets(s.planets).resolveLostAttack(
                attackToResolve.attackInstanceId
            );
        }
    }

    //@notice alliance functions, saved in AppStorage

    function createAlliance(bytes32 memory _allianceNameToCreate) external {
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

    function leaveAlliance(bytes32 _allianceToJoin) external {
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
