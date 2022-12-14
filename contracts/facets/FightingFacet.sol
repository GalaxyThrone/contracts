// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import {AppStorage, Modifiers, CraftItem, SendCargo, SendTerraform, attackStatus, ShipType, Building} from "../libraries/AppStorage.sol";
import "../interfaces/IPlanets.sol";
import "../interfaces/IShips.sol";
import "../interfaces/IERC20.sol";
import "../interfaces/IERC721.sol";
import "../interfaces/IResource.sol";
import "../interfaces/IBuildings.sol";
import "./AdminFacet.sol";
import "./BuildingsFacet.sol";

contract FightingFacet is Modifiers {
    function sendAttack(
        uint256 _fromPlanetId,
        uint256 _toPlanetId,
        uint256[] memory _shipIds //tokenId's of ships to send
    ) external onlyPlanetOwner(_fromPlanetId) {
        require(
            msg.sender != IERC721(s.planetsAddress).ownerOf(_toPlanetId),
            "you cannot attack your own planets!"
        );

        require(

            IERC721(s.planetsAddress).ownerOf(_toPlanetId) != address(this),
            "planet is uninhabited!"
        );

        require(
            checkAlliance(IERC721(s.planetsAddress).ownerOf(_toPlanetId)) !=

                checkAlliance(msg.sender) ||
                checkAlliance(msg.sender) == bytes32(0),
            "friendly target!"
        );

        //@notice PVP is always enabled for alpha
        /*
        require(
            IPlanets(s.planets).getPVPStatus(_toPlanetId),
            "Planet is invulnerable!"
        );
        */
        //check if ships are assigned to the planet
        for (uint256 i = 0; i < _shipIds.length; i++) {
            require(
                IShips(s.shipsAddress).checkAssignedPlanet(_shipIds[i]) ==
                    _fromPlanetId,
                "ship is not assigned to this planet!"
            );
            require(
                IERC721(s.shipsAddress).ownerOf(_shipIds[i]) == msg.sender,
                "not your ship!"
            );
            IShips(s.shipsAddress).deleteShipFromPlanet(_shipIds[i]);
        }
        //unassign ships during attack
        unAssignNewShipTypeAmount(_fromPlanetId, _shipIds);

        //refactor to  an internal func

        (uint256 fromX, uint256 fromY) = IPlanets(s.planetsAddress)
            .getCoordinates(_fromPlanetId);
        (uint256 toX, uint256 toY) = IPlanets(s.planetsAddress).getCoordinates(
            _toPlanetId
        );

        uint256 xDist = fromX > toX ? fromX - toX : toX - fromX;
        uint256 yDist = fromY > toY ? fromY - toY : toY - fromY;
        uint256 distance = xDist + yDist;

        attackStatus memory attackToBeAdded;

        attackToBeAdded.attackStarted = block.timestamp;

        attackToBeAdded.distance = distance;

        attackToBeAdded.timeToBeResolved = block.timestamp + 180; // minimum 3mins test ( to ensure VRF called back in time)

        attackToBeAdded.fromPlanet = _fromPlanetId;

        attackToBeAdded.toPlanet = _toPlanetId;

        attackToBeAdded.attackerShipsIds = _shipIds;

        attackToBeAdded.attacker = msg.sender;

        uint256 _attackInstanceId = IPlanets(s.planetsAddress).addAttack(
            attackToBeAdded
        );

        AdminFacet(address(this)).drawRandomAttackSeed(_attackInstanceId);
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
            checkAlliance(IERC721(s.planetsAddress).ownerOf(_toPlanetId)) ==
                checkAlliance(msg.sender) ||
                msg.sender == IERC721(s.planetsAddress).ownerOf(_toPlanetId),
            "not a friendly target!"
        );

        for (uint256 i = 0; i < _shipIds.length; i++) {
            require(
                IShips(s.shipsAddress).checkAssignedPlanet(_shipIds[i]) ==
                    _fromPlanetId,
                "ship is not assigned to this planet!"
            );

            require(
                IERC721(s.shipsAddress).ownerOf(_shipIds[i]) == msg.sender,
                "not your ship!"
            );

            IShips(s.shipsAddress).deleteShipFromPlanet(_shipIds[i]);
        }

        unAssignNewShipTypeAmount(_fromPlanetId, _shipIds);

        assignNewShipTypeAmount(_toPlanetId, _shipIds);

        for (uint256 i = 0; i < _shipIds.length; i++) {
            IShips(s.shipsAddress).assignShipToPlanet(_shipIds[i], _toPlanetId);
        }
    }

    function assignNewShipTypeAmount(
        uint256 _toPlanetId,
        uint256[] memory _shipsTokenIds
    ) internal {
        for (uint256 i = 0; i < _shipsTokenIds.length; i++) {
            s.fleets[_toPlanetId][
                IShips(s.shipsAddress).getShipStats(_shipsTokenIds[i]).shipType
            ] += 1;
        }
    }

    function unAssignNewShipTypeAmount(
        uint256 _toPlanetId,
        uint256[] memory _shipsTokenIds
    ) internal {
        for (uint256 i = 0; i < _shipsTokenIds.length; i++) {
            s.fleets[_toPlanetId][
                IShips(s.shipsAddress).getShipStats(_shipsTokenIds[i]).shipType
            ] -= 1;
        }
    }

    function unAssignNewShipTypeIdAmount(
        uint256 _toPlanetId,
        uint256 _shipsTokenIds
    ) internal {
        s.fleets[_toPlanetId][
            IShips(s.shipsAddress).getShipStats(_shipsTokenIds).shipType
        ] -= 1;
    }

    function resolveAttack(uint256 _attackInstanceId) external {
        attackStatus memory attackToResolve = IPlanets(s.planetsAddress)
            .getAttackStatus(_attackInstanceId);

        require(
            block.timestamp >= attackToResolve.timeToBeResolved,
            "attack fleet hasnt arrived yet!"
        );

        uint256[] memory attackerShips = attackToResolve.attackerShipsIds;
        uint256[] memory defenderShips = IShips(s.shipsAddress)
            .getDefensePlanet(attackToResolve.toPlanet);

        int256 attackStrength;
        int256 attackHealth;

        int256 defenseStrength;
        int256 defenseHealth;
        for (uint256 i = 0; i < attackerShips.length; i++) {
            attackStrength += int256(
                IShips(s.shipsAddress).getShipStats(attackerShips[i]).attack
            );
            attackHealth += int256(
                IShips(s.shipsAddress).getShipStats(attackerShips[i]).health
            );
        }

        for (uint256 i = 0; i < defenderShips.length; i++) {
            defenseStrength += int256(
                IShips(s.shipsAddress).getShipStats(defenderShips[i]).attack
            );

            defenseHealth += int256(
                IShips(s.shipsAddress).getShipStats(defenderShips[i]).health
            );
        }

        //add buildings defense strength

        // Array of BuildingAmounts per BuildingId (ArrayIndex == BuildingTypeId)
        uint256[] memory buildingsPlanetCount = BuildingsFacet(address(this))
            .getAllBuildings(
                attackToResolve.toPlanet,
                IBuildings(s.buildingsAddress).getTotalBuildingTypes()
            );

        //Building metadata type array
        Building[] memory buildingTypesArray = IBuildings(s.buildingsAddress)
            .getBuildingTypes(buildingsPlanetCount);

        for (uint256 i = 0; i < buildingsPlanetCount.length; i++) {
            defenseStrength += int256(
                buildingsPlanetCount[i] * buildingTypesArray[i].attack
            );
        }

        //every planet has a minimum defense strength, even if its only the spaceship debris of their destroyed fleet blocking the way
        if (defenseStrength == 0) {
            defenseStrength += 10;
        }

        //even a ship without weapons still has its warpdrive ( as demonstrated in the extremely plot-holey star wars movie)
        if (attackStrength == 0) {
            attackStrength += 10;
        }

        //attack strength bonus/malus

        attackStrength +=
            (attackStrength * int256((attackToResolve.attackSeed[0] % 25))) /
            100;
        attackStrength -=
            (attackStrength * int256((attackToResolve.attackSeed[1] % 25))) /
            100;

        //defense strength bonus/malus

        //everyone loves an underdog
        if (defenseStrength * 5 < attackStrength) {
            defenseStrength +=
                (defenseStrength *
                    int256((attackToResolve.attackSeed[2] % 100))) /
                100;
            defenseStrength -=
                (defenseStrength *
                    int256((attackToResolve.attackSeed[3] % 5))) /
                100;
        } else {
            defenseStrength +=
                (defenseStrength *
                    int256((attackToResolve.attackSeed[2] % 25))) /
                100;
            defenseStrength -=
                (defenseStrength *
                    int256((attackToResolve.attackSeed[3] % 25))) /
                100;
        }

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
                    IShips(s.shipsAddress).burnShip(defenderShips[i]);
                    IShips(s.shipsAddress).deleteShipFromPlanet(
                        defenderShips[i]
                    );
                    //@TODO burn defense buildings / transfer buildings
                }

                //conquer planet
                //give new owner the planet
                address loserAddr = IERC721(s.planetsAddress).ownerOf(
                    attackToResolve.toPlanet
                );

                IPlanets(s.planetsAddress).planetConquestTransfer(
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
                    IShips(s.shipsAddress).assignShipToPlanet(
                        attackerShips[i],
                        attackToResolve.toPlanet
                    );
                }

                IBuildings(s.buildingsAddress).transferBuildingsToConquerer(
                    buildingsPlanetCount,
                    loserAddr,
                    attackToResolve.attacker
                );
            }
            //burn killed ships until there are no more left; then reassign attacking fleet to home-planet
            else {
                //burn nfts and unassign ship from planets
                for (uint256 i = 0; i < defenderShips.length; i++) {
                    int256 defenderShipHealth = int256(
                        IShips(s.shipsAddress)
                            .getShipStats(defenderShips[i])
                            .health
                    );

                    if (battleResult > defenderShipHealth) {
                        battleResult -= defenderShipHealth;

                        IShips(s.shipsAddress).burnShip(defenderShips[i]);
                        IShips(s.shipsAddress).deleteShipFromPlanet(
                            defenderShips[i]
                        );
                        delete defenderShips[i];
                    }
                }

                //sending ships home

                assignNewShipTypeAmount(
                    attackToResolve.fromPlanet,
                    attackerShips
                );

                for (uint256 i = 0; i < attackerShips.length; i++) {
                    IShips(s.shipsAddress).assignShipToPlanet(
                        attackerShips[i],
                        attackToResolve.fromPlanet
                    );
                }

                IPlanets(s.planetsAddress).resolveLostAttack(
                    attackToResolve.attackInstanceId
                );
            }
        }

        //defender has higher atk than attacker
        if (battleResult < 0) {
            //burn attacker nfts that lost
            for (uint256 i = 0; i < attackerShips.length; i++) {
                int256 attackerShipHealth = int256(
                    IShips(s.shipsAddress).getShipStats(attackerShips[i]).health
                );

                if (battleResult > attackerShipHealth) {
                    battleResult -= attackerShipHealth;

                    IShips(s.shipsAddress).burnShip(attackerShips[i]);
                    IShips(s.shipsAddress).deleteShipFromPlanet(
                        attackerShips[i]
                    );
                    delete attackerShips[i];
                }
            }

            //sending ships home

            assignNewShipTypeAmount(attackToResolve.fromPlanet, attackerShips);

            for (uint256 i = 0; i < attackerShips.length; i++) {
                IShips(s.shipsAddress).assignShipToPlanet(
                    attackerShips[i],
                    attackToResolve.fromPlanet
                );
            }

            IPlanets(s.planetsAddress).resolveLostAttack(
                attackToResolve.attackInstanceId
            );
        }

        //draw -> currently leads to zero losses, only a retreat
        if (battleResult == 0) {
            for (uint256 i = 0; i < attackerShips.length; i++) {
                IShips(s.shipsAddress).assignShipToPlanet(
                    attackerShips[i],
                    attackToResolve.fromPlanet
                );
            }

            //sending ships home
            assignNewShipTypeAmount(attackToResolve.fromPlanet, attackerShips);
            IPlanets(s.planetsAddress).resolveLostAttack(
                attackToResolve.attackInstanceId
            );
        }
    }

    function checkAlliance(address _playerToCheck)
        public
        view
        returns (bytes32)
    {
        return s.allianceOfPlayer[_playerToCheck];
    }
}
