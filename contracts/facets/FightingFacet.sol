// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import {AppStorage, Modifiers, CraftItem, SendTerraform, attackStatus, ShipType, Building} from "../libraries/AppStorage.sol";
import "../interfaces/IPlanets.sol";
import "../interfaces/IShips.sol";
import "../interfaces/IERC20.sol";
import "../interfaces/IERC721.sol";
import "../interfaces/IResource.sol";
import "../interfaces/IBuildings.sol";
import "./AdminFacet.sol";
import "./BuildingsFacet.sol";

contract FightingFacet is Modifiers {
    event AttackSent(
        uint256 indexed id,
        uint256 indexed toPlanet,
        address indexed fromPlayer
    );

    event attackLost(uint256 indexed attackedPlanet, address indexed Attacker);

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

        //to be deleted later @TODO
        uint256 distance = 420;

        attackStatus memory attackToBeAdded;

        attackToBeAdded.attackStarted = block.timestamp;

        attackToBeAdded.distance = distance;

        attackToBeAdded.timeToBeResolved = calculateTravelTime(
            _fromPlanetId,
            _toPlanetId,
            s.playersFaction[msg.sender]
        );

        attackToBeAdded.fromPlanet = _fromPlanetId;

        attackToBeAdded.toPlanet = _toPlanetId;

        attackToBeAdded.attackerShipsIds = _shipIds;

        attackToBeAdded.attacker = msg.sender;

        s.sendAttackId++;
        s.runningAttacks[s.sendAttackId] = attackToBeAdded;

        AdminFacet(address(this)).drawRandomAttackSeed(s.sendAttackId);

        emit AttackSent(s.sendAttackId, _toPlanetId, msg.sender);
    }

    //@TODO currently instantenous for pre-alpha
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

        //@notice can be removed, it overcomplicates things for small improvements in the frontend UX
        //@notice this can be replaced
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

    function calculateAttackBattleStats(
        uint256[] memory shipIds,
        uint256[] memory attackSeed
    ) internal returns (int256[3] memory, int256) {
        int256[3] memory attackStrength;
        int256 attackHealth;

        for (uint256 i = 0; i < shipIds.length; i++) {
            attackStrength[0] += int256(
                s.SpaceShips[shipIds[i]].attackTypes[0]
            );
            attackStrength[1] += int256(
                s.SpaceShips[shipIds[i]].attackTypes[1]
            );
            attackStrength[2] += int256(
                s.SpaceShips[shipIds[i]].attackTypes[2]
            );

            attackHealth += int256(s.SpaceShips[shipIds[i]].health);
        }

        for (uint256 i = 0; i < attackStrength.length; i++) {
            attackStrength[i] +=
                (attackStrength[i] * int256((attackSeed[0] % 15))) /
                100;
            attackStrength[i] -=
                (attackStrength[i] * int256((attackSeed[1] % 15))) /
                100;
        }

        return (attackStrength, attackHealth);
    }

    function calculateDefenseBattleStats(
        uint256[] memory shipIds,
        uint256[] memory buildingsPlanetCount,
        uint256[] memory attackSeed,
        uint256 _planetId
    ) internal returns (int256[3] memory, int256) {
        int256[3] memory defenseStrength;
        int256 defenseHealth;

        for (uint256 i = 0; i < shipIds.length; i++) {
            defenseStrength[0] += int256(
                s.SpaceShips[shipIds[i]].defenseTypes[0]
            );
            defenseStrength[1] += int256(
                s.SpaceShips[shipIds[i]].defenseTypes[1]
            );
            defenseStrength[2] += int256(
                s.SpaceShips[shipIds[i]].defenseTypes[2]
            );

            defenseHealth += int256(s.SpaceShips[shipIds[i]].health);
        }

        //Building metadata type array
        Building[] memory buildingTypesArray = IBuildings(s.buildingsAddress)
            .getBuildingTypes(buildingsPlanetCount);

        for (uint256 i = 0; i < buildingsPlanetCount.length; i++) {
            defenseStrength[0] += int256(
                buildingsPlanetCount[i] * buildingTypesArray[i].defenseTypes[0]
            );

            defenseStrength[1] += int256(
                buildingsPlanetCount[i] * buildingTypesArray[i].defenseTypes[1]
            );

            defenseStrength[2] += int256(
                buildingsPlanetCount[i] * buildingTypesArray[i].defenseTypes[2]
            );
        }

        for (uint256 i = 0; i < defenseStrength.length; i++) {
            defenseStrength[i] +=
                (defenseStrength[i] * int256((attackSeed[2] % 15))) /
                100;
            defenseStrength[i] -=
                (defenseStrength[i] * int256((attackSeed[3] % 15))) /
                100;
        }

        return (defenseStrength, defenseHealth);
    }

    function calculateRandomnessBattle() internal {}

    function resolveAttack(uint256 _attackInstanceId) external {
        attackStatus memory attackToResolve = s.runningAttacks[
            _attackInstanceId
        ];

        require(
            block.timestamp >= attackToResolve.timeToBeResolved,
            "attack fleet hasnt arrived yet!"
        );

        uint256[] memory attackerShips = attackToResolve.attackerShipsIds;
        uint256[] memory defenderShips = IShips(s.shipsAddress)
            .getDefensePlanet(attackToResolve.toPlanet);

        int256[3] memory attackStrength;
        int256 attackHealth;

        int256[3] memory defenseStrength;
        int256 defenseHealth;

        //load defense buildings
        uint256[] memory buildingsPlanetCount = BuildingsFacet(address(this))
            .getAllBuildings(
                attackToResolve.toPlanet,
                IBuildings(s.buildingsAddress).getTotalBuildingTypes()
            );

        //@TODO to be refactored to accomodate new attackTypes / Defense Types
        (attackStrength, attackHealth) = calculateAttackBattleStats(
            attackerShips,
            attackToResolve.attackSeed
        );

        (defenseStrength, defenseHealth) = calculateDefenseBattleStats(
            defenderShips,
            buildingsPlanetCount,
            attackToResolve.attackSeed,
            attackToResolve.toPlanet
        );

        //battle calculation
        int256 battleResult;

        for (uint256 i = 0; i < 3; i++) {
            //if (attackStrength[i] - defenseStrength[i] > 0) { }

            //weakness modifier by, 15% if the difference between the two is 30% in favour of the attacker
            if (attackStrength[i] * 7 > defenseStrength[i] * 10) {
                battleResult += attackStrength[i] - defenseStrength[i];
                battleResult += ((attackStrength[i] * 15) / 100);
            } else {
                battleResult += attackStrength[i] - defenseStrength[i];
            }
        }

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

                emit attackLost(
                    attackToResolve.toPlanet,
                    attackToResolve.attacker
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

            emit attackLost(attackToResolve.toPlanet, attackToResolve.attacker);
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
            emit attackLost(attackToResolve.toPlanet, attackToResolve.attacker);
        }

        delete s.runningAttacks[_attackInstanceId];
    }

    function checkAlliance(address _playerToCheck)
        public
        view
        returns (bytes32)
    {
        return s.allianceOfPlayer[_playerToCheck];
    }

    function getAttackStatus(uint256 _instanceId)
        external
        view
        returns (attackStatus memory)
    {
        return s.runningAttacks[_instanceId];
    }

    function getCurrentAttackStorageSize() external view returns (uint256) {
        return s.sendAttackId;
    }

    function getMultipleRunningAttacks(uint256 _startRange, uint256 _endRange)
        external
        view
        returns (attackStatus[] memory)
    {
        attackStatus[] memory queriedAttacks = new attackStatus[](
            _startRange - _endRange
        );

        uint256 counter = 0;

        for (uint256 i = _startRange; i < _endRange; i++) {
            queriedAttacks[counter] = s.runningAttacks[i];

            counter++;
        }

        return queriedAttacks;
    }

    function getAllIncomingAttacksPlayer(address _player)
        external
        view
        returns (attackStatus[] memory)
    {
        uint256 counter = 0;

        uint256 totalCount;
        for (uint256 i = 0; i < s.sendAttackId; i++) {
            if (
                IERC721(s.planetsAddress).ownerOf(
                    s.runningAttacks[i].toPlanet
                ) == _player
            ) {
                counter += 1;
            }
        }

        attackStatus[] memory incomingAttacksPlayer = new attackStatus[](
            counter
        );

        for (uint256 i = 0; i < s.sendAttackId; i++) {
            if (
                IERC721(s.planetsAddress).ownerOf(
                    s.runningAttacks[i].toPlanet
                ) == _player
            ) {
                incomingAttacksPlayer[counter] = s.runningAttacks[i];
                counter++;
            }
        }

        return incomingAttacksPlayer;
    }

    function getAllOutgoingAttacks(address _player)
        external
        view
        returns (attackStatus[] memory)
    {
        uint256 counter = 0;
        for (uint256 i = 0; i < s.sendAttackId; i++) {
            if (s.runningAttacks[i].attacker == _player) {
                counter++;
            }
        }

        attackStatus[] memory outgoingAttacks = new attackStatus[](counter);

        for (uint256 i = 0; i < s.sendAttackId; i++) {
            if (s.runningAttacks[i].attacker == _player) {
                outgoingAttacks[counter] = s.runningAttacks[i];
                counter++;
            }
        }

        return outgoingAttacks;
    }

    function getAllIncomingAttacksPlanet(uint256 _planetId)
        external
        view
        returns (attackStatus[] memory)
    {
        uint256 totalCount;
        for (uint256 i = 0; i < s.sendAttackId; i++) {
            if (s.runningAttacks[i].toPlanet == _planetId) {
                totalCount++;
            }
        }

        attackStatus[] memory incomingAttacks = new attackStatus[](totalCount);

        uint256 counter = 0;

        for (uint256 i = 0; i < s.sendAttackId; i++) {
            if (s.runningAttacks[i].toPlanet == _planetId) {
                incomingAttacks[counter] = s.runningAttacks[i];
                counter++;
            }
        }

        return incomingAttacks;
    }

    function calculateTravelTime(
        uint256 _from,
        uint256 _to,
        uint256 factionOfPlayer
    ) internal returns (uint256) {
        (uint256 fromX, uint256 fromY) = IPlanets(s.planetsAddress)
            .getCoordinates(_from);
        (uint256 toX, uint256 toY) = IPlanets(s.planetsAddress).getCoordinates(
            _to
        );
        uint256 xDist = fromX > toX ? fromX - toX : toX - fromX;
        uint256 yDist = fromY > toY ? fromY - toY : toY - fromY;

        uint256 arrivalTime = xDist + yDist + block.timestamp;
        if (factionOfPlayer == 2) {
            arrivalTime -= (((xDist + yDist) * 30) / 100);
        }

        return arrivalTime;
    }

    //@notice deprecated view function for now
    //function checkIfPlayerHasAttackRunning(address _player)
}
