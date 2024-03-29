// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import {AppStorage, Modifiers, CraftItem, SendTerraform, attackStatus, ShipType, Building, AttackResolveState} from "../libraries/AppStorage.sol";
import "../interfaces/IPlanets.sol";
import "../interfaces/IShips.sol";
import "../interfaces/IERC20.sol";
import "../interfaces/IERC721.sol";
import "../interfaces/IResource.sol";
import "./AdminFacet.sol";
import "./BuildingsFacet.sol";
import "./ManagementFacet.sol";

contract FightingFacet is Modifiers {
    event AttackSent(
        uint256 indexed id,
        uint256 indexed toPlanet,
        address indexed fromPlayer
    );
    event planetConquered(
        uint256 id,
        uint256 indexed tokenId,
        address indexed oldOwner,
        address indexed newOwner
    );

    event attackLost(
        uint256 id,
        uint256 indexed attackedPlanet,
        address indexed Attacker
    );

    event BattleResult(uint atkId, uint resolvedTimestamp, uint resolvedState);

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
            "planet is uninhabited or unattackable!"
        );

        require(
            checkAlliance(IERC721(s.planetsAddress).ownerOf(_toPlanetId)) !=
                checkAlliance(msg.sender) ||
                checkAlliance(msg.sender) == bytes32(0),
            "friendly target!"
        );

        require(
            !ManagementFacet(address(this)).getPeaceDealStatus(
                msg.sender,
                (IERC721(s.planetsAddress).ownerOf(_toPlanetId))
            ),
            "Peace Treaty is in place!"
        );

        //@notice PVP is always enabled for alpha

        require(
            IPlanets(s.planetsAddress).getPVPStatus(_toPlanetId),
            "Planet is invulnerable!"
        );

        //check if ships are assigned to the planet
        for (uint256 i = 0; i < _shipIds.length; ++i) {
            require(
                s.assignedPlanet[_shipIds[i]] == _fromPlanetId,
                "ship is not assigned to this planet!"
            );

            require(
                IERC721(s.shipsAddress).ownerOf(_shipIds[i]) == msg.sender,
                "not your ship!"
            );
            delete s.assignedPlanet[_shipIds[i]];
        }

        attackStatus memory attackToBeAdded;

        attackToBeAdded.attackStarted = block.timestamp;

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
    ) external {
        //check if ships are assigned to the planet

        require(
            (checkAlliance(IERC721(s.planetsAddress).ownerOf(_toPlanetId)) ==
                checkAlliance(msg.sender) &&
                checkAlliance(msg.sender) != bytes32(0)) ||
                msg.sender == IERC721(s.planetsAddress).ownerOf(_toPlanetId),
            "not a friendly target!"
        );

        for (uint256 i = 0; i < _shipIds.length; ++i) {
            require(
                s.assignedPlanet[_shipIds[i]] == _fromPlanetId,
                "ship is not assigned to this planet!"
            );

            require(
                IERC721(s.shipsAddress).ownerOf(_shipIds[i]) == msg.sender,
                "not your ship!"
            );

            delete s.assignedPlanet[_shipIds[i]];
        }

        for (uint256 i = 0; i < _shipIds.length; ++i) {
            s.assignedPlanet[_shipIds[i]] = _toPlanetId;
        }
    }

    function calculateAttackBattleStats(
        uint256[] memory shipIds,
        uint256[] memory attackSeed
    ) internal returns (int256[3] memory, int256) {
        int256[3] memory attackStrength;
        int256 attackHealth;

        for (uint256 i = 0; i < shipIds.length; ++i) {
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

        for (uint256 i = 0; i < attackStrength.length; ++i) {
            attackStrength[i] +=
                (attackStrength[i] * int256((attackSeed[0] % 5))) /
                100;
            attackStrength[i] -=
                (attackStrength[i] * int256((attackSeed[1] % 5))) /
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

        for (uint256 i = 0; i < shipIds.length; ++i) {
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
        Building[] memory buildingTypesArray = BuildingsFacet(address(this))
            .getBuildingTypes(buildingsPlanetCount);

        for (uint256 i = 0; i < buildingsPlanetCount.length; ++i) {
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

        for (uint256 i = 0; i < defenseStrength.length; ++i) {
            defenseStrength[i] +=
                (defenseStrength[i] * int256((attackSeed[2] % 5))) /
                100;
            defenseStrength[i] -=
                (defenseStrength[i] * int256((attackSeed[3] % 5))) /
                100;
        }

        return (defenseStrength, defenseHealth);
    }

    function calculateRandomnessBattle() internal {}

    function returnShipsToHome(
        uint _fromPlanet,
        uint256[] memory _shipIds,
        address shipOwner
    ) internal {
        //origin planet is still owned by the shipOwner Player

        if (shipOwner == IERC721(s.planetsAddress).ownerOf(_fromPlanet)) {
            for (uint256 i = 0; i < _shipIds.length; ++i) {
                s.assignedPlanet[_shipIds[i]] = _fromPlanet;
            }
        }
        //player doesnt own any planets anymore, ships go to a tradehub ( curr always planet #42)
        else if (IERC721(s.planetsAddress).balanceOf(shipOwner) == 0) {
            uint tradeHubPlanet = 42;

            for (uint256 i = 0; i < _shipIds.length; ++i) {
                s.assignedPlanet[_shipIds[i]] = tradeHubPlanet;
            }
        } else {
            uint256 alternativeHomePlanet = IERC721(s.planetsAddress)
                .tokenOfOwnerByIndex(shipOwner, 0);

            for (uint256 i = 0; i < _shipIds.length; ++i) {
                s.assignedPlanet[_shipIds[i]] = alternativeHomePlanet;
            }
        }
    }

    function resolveAttack(uint256 _attackInstanceId) external {
        attackStatus memory attackToResolve = s.runningAttacks[
            _attackInstanceId
        ];

        require(
            attackToResolve.resolvedStatus == AttackResolveState.Unresolved,
            "attack resolved!"
        );

        //@Retreat Path.
        //@notice if the attacked Planet isnt eligible to be attacked on the resolve time, retreat ships
        address attackedOwner = IERC721(s.planetsAddress).ownerOf(
            attackToResolve.toPlanet
        );
        if (
            attackToResolve.attacker == attackedOwner ||
            attackedOwner == address(this)
        ) {
            returnShipsToHome(
                attackToResolve.fromPlanet,
                attackToResolve.attackerShipsIds,
                attackToResolve.attacker
            );

            s
                .runningAttacks[_attackInstanceId]
                .resolvedStatus = AttackResolveState.ResolvedAndLost;
            return;
        }

        require(
            block.timestamp >= attackToResolve.timeToBeResolved,
            "attack fleet hasnt arrived yet!"
        );

        uint256[] memory attackerShips = attackToResolve.attackerShipsIds;
        uint256[] memory defenderShips = getDefensePlanetFleetIds(
            attackToResolve.toPlanet
        );

        uint256[] memory burnedAttackerShips = new uint256[](
            attackerShips.length
        );
        uint256[] memory burnedDefenderShips = new uint256[](
            defenderShips.length
        );

        int256[3] memory attackStrength;
        int256 attackHealth;

        int256[3] memory defenseStrength;
        int256 defenseHealth;

        //load defense buildings
        uint256[] memory buildingsPlanetCount = getAllBuildingsDefender(
            attackToResolve.toPlanet
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

        // Apply the underdog bonus if the defender's total strength is significantly weaker.
        int256 UNDERDOG_THRESHOLD = 50; // 50% weaker defender is considered an underdog.
        int256 UNDERDOG_BONUS_PERCENT = 5; // Underdog defense is increased by 5%.

        int256 totalAttackStrength = attackStrength[0] +
            attackStrength[1] +
            attackStrength[2];
        int256 totalDefenseStrength = defenseStrength[0] +
            defenseStrength[1] +
            defenseStrength[2];

        // Apply Commander Buffs
        //@TODO testing
        //Admiral's Impenetrable Mustache [ID 11], 5% more total defense strength
        if (s.activeCommanderTraits[attackedOwner][11]) {
            totalDefenseStrength += (totalDefenseStrength * 5) / 100;
        }

        if (
            (totalDefenseStrength * 100) / totalAttackStrength <
            UNDERDOG_THRESHOLD
        ) {
            defenseStrength[0] +=
                (defenseStrength[0] * UNDERDOG_BONUS_PERCENT) /
                100;
            defenseStrength[1] +=
                (defenseStrength[1] * UNDERDOG_BONUS_PERCENT) /
                100;
            defenseStrength[2] +=
                (defenseStrength[2] * UNDERDOG_BONUS_PERCENT) /
                100;
        }

        // Fleet size advantage/disadvantage modifier
        int256 LARGER_FLEET_DEBUFF_THRESHOLD = 50; // 50% larger fleet
        int256 LARGER_FLEET_DEBUFF_PERCENT_50 = 5; // 5% debuff
        int256 LARGER_FLEET_DEBUFF_PERCENT_100 = 10; // 10% debuff
        int256 LARGER_FLEET_DEBUFF_PERCENT_200 = 15; // 15% debuff
        int256 LARGER_FLEET_DEBUFF_PERCENT_300 = 20; // 20% debuff

        int256 SMALLER_FLEET_BUFF_PERCENT_50 = 5; // 5% buff
        int256 SMALLER_FLEET_BUFF_PERCENT_100 = 10; // 10% buff
        int256 SMALLER_FLEET_BUFF_PERCENT_200 = 15; // 15% buff
        int256 SMALLER_FLEET_BUFF_PERCENT_300 = 20; // 20% buff

        uint256 fleetSizeDifferencePercent;

        if (defenderShips.length > 0) {
            fleetSizeDifferencePercent =
                (attackerShips.length * 100) /
                defenderShips.length;
        } else {
            fleetSizeDifferencePercent = 0; // Or another value that makes sense in your use case.
        }

        if (fleetSizeDifferencePercent >= 100) {
            // attacker fleet is larger, apply debuff
            if (fleetSizeDifferencePercent >= 300) {
                attackStrength = applyDebuff(
                    attackStrength,
                    LARGER_FLEET_DEBUFF_PERCENT_300
                );
            } else if (fleetSizeDifferencePercent >= 200) {
                attackStrength = applyDebuff(
                    attackStrength,
                    LARGER_FLEET_DEBUFF_PERCENT_200
                );
            } else if (fleetSizeDifferencePercent >= 100) {
                attackStrength = applyDebuff(
                    attackStrength,
                    LARGER_FLEET_DEBUFF_PERCENT_100
                );
            } else {
                attackStrength = applyDebuff(
                    attackStrength,
                    LARGER_FLEET_DEBUFF_PERCENT_50
                );
            }
        } else {
            // attacker fleet is smaller, apply buff
            if (fleetSizeDifferencePercent <= 33) {
                // 33% represents 1/3, or 300% larger defending fleet
                attackStrength = applyBuff(
                    attackStrength,
                    SMALLER_FLEET_BUFF_PERCENT_300
                );
            } else if (fleetSizeDifferencePercent <= 50) {
                // 50% represents 1/2, or 200% larger defending fleet
                attackStrength = applyBuff(
                    attackStrength,
                    SMALLER_FLEET_BUFF_PERCENT_200
                );
            } else if (fleetSizeDifferencePercent <= 75) {
                // 75% represents 3/4, or 100% larger defending fleet
                attackStrength = applyBuff(
                    attackStrength,
                    SMALLER_FLEET_BUFF_PERCENT_100
                );
            } else {}
        }

        //type weakness modifier
        for (uint256 i = 0; i < 3; ++i) {
            //if (attackStrength[i] - defenseStrength[i] > 0) { }

            //weakness modifier by, 15% if the difference between the two is 30% in favour of the attacker
            if (attackStrength[i] * 7 > defenseStrength[i] * 10) {
                battleResult += attackStrength[i] - defenseStrength[i];
                battleResult += ((attackStrength[i] * 15) / 100);
            } else {
                battleResult += attackStrength[i] - defenseStrength[i];
            }
        }

        //Planets have an inherent defense strength which is type agnostic;

        int256 FLAT_PLANETDEFENSE = 1000;
        // Apply Commander Buffs
        //@TODO testing
        //Bunker Philosophy [ID 9], 100% more base planet defense
        if (s.activeCommanderTraits[attackedOwner][9]) {
            FLAT_PLANETDEFENSE += 1000;
        }

        battleResult -= FLAT_PLANETDEFENSE;

        //attacker has higher atk than defender
        if (battleResult > 0) {
            //attacker has higher atk than defender + entire health destroyed
            //win for attacker
            if (battleResult >= defenseHealth) {
                //burn defender ships

                //burn NFTs
                //remove  shipID assignment to Planet

                IShips(s.shipsAddress).burnShips(defenderShips);
                for (uint256 i = 0; i < defenderShips.length; ++i) {
                    delete s.assignedPlanet[defenderShips[i]];
                }

                //@notice losing ships despite winning
                int takenDamageAttackers = totalDefenseStrength / 30;

                for (uint i = 0; i < attackerShips.length; ++i) {
                    int256 attackerShipHealth = int256(
                        s.SpaceShips[attackerShips[i]].health
                    );

                    if (takenDamageAttackers > attackerShipHealth) {
                        takenDamageAttackers -= attackerShipHealth;

                        IShips(s.shipsAddress).burnShip(attackerShips[i]);

                        //@notice GAS OPTIMIZATION FIX:
                        //@notice the ship was already unassigned, so no need to delete.
                        //delete s.assignedPlanet[attackerShips[i]];
                        delete attackerShips[i];
                    }
                }

                //@TODO burn conquered planets buildings partially (or we can even  recycle them instead)

                IPlanets(s.planetsAddress).planetConquestTransfer(
                    attackToResolve.toPlanet,
                    attackedOwner,
                    attackToResolve.attacker
                );

                s
                    .runningAttacks[_attackInstanceId]
                    .resolvedStatus = AttackResolveState.ResolvedAndConquered;

                emit planetConquered(
                    _attackInstanceId,
                    attackToResolve.toPlanet,
                    attackedOwner,
                    attackToResolve.attacker
                );

                for (uint256 i = 0; i < attackerShips.length; ++i) {
                    if (attackerShips[i] != 0) {
                        s.assignedPlanet[attackerShips[i]] = attackToResolve
                            .toPlanet;
                    }
                }
            }
            //burn killed ships until there are no more left; then reassign attacking fleet to home-planet
            else {
                //burn nfts and unassign ship from planets

                for (uint256 i = 0; i < defenderShips.length; ++i) {
                    int256 defenderShipHealth = int256(
                        s.SpaceShips[defenderShips[i]].health
                    );
                    if (battleResult > defenderShipHealth) {
                        battleResult -= defenderShipHealth;

                        IShips(s.shipsAddress).burnShip(defenderShips[i]);
                        delete s.assignedPlanet[defenderShips[i]];

                        //@notice GAS OPTIMIZATION FIX:
                        //@notice the ship was already unassigned, so no need to delete.
                        delete defenderShips[i];
                    }
                }

                //sending ships home

                returnShipsToHome(
                    attackToResolve.fromPlanet,
                    attackerShips,
                    attackToResolve.attacker
                );
                s
                    .runningAttacks[_attackInstanceId]
                    .resolvedStatus = AttackResolveState
                    .ResolvedAndWonButNotConquered;

                emit attackLost(
                    _attackInstanceId,
                    attackToResolve.toPlanet,
                    attackToResolve.attacker
                );
            }
        }

        //defender has higher atk than attacker

        if (battleResult < 0) {
            if (battleResult + attackHealth <= 0) {
                IShips(s.shipsAddress).burnShips(attackerShips);
            } else {
                //burn attacker nfts that lost
                for (uint256 i = 0; i < attackerShips.length; ++i) {
                    int256 attackerShipHealth = int256(
                        s.SpaceShips[attackerShips[i]].health
                    );

                    if (battleResult < attackerShipHealth) {
                        battleResult += attackerShipHealth;

                        IShips(s.shipsAddress).burnShip(attackerShips[i]);

                        //@notice GAS OPTIMIZATION FIX:
                        //@notice the ship was already unassigned, so no need to delete.
                        //delete s.assignedPlanet[attackerShips[i]];
                        delete attackerShips[i];
                    }
                }

                returnShipsToHome(
                    attackToResolve.fromPlanet,
                    attackerShips,
                    attackToResolve.attacker
                );
            }

            s
                .runningAttacks[_attackInstanceId]
                .resolvedStatus = AttackResolveState.ResolvedAndLost;
            emit attackLost(
                _attackInstanceId,
                attackToResolve.toPlanet,
                attackToResolve.attacker
            );
        }

        //draw -> currently leads to zero losses, only a retreat
        if (battleResult == 0) {
            returnShipsToHome(
                attackToResolve.fromPlanet,
                attackerShips,
                attackToResolve.attacker
            );
            s
                .runningAttacks[_attackInstanceId]
                .resolvedStatus = AttackResolveState.ResolvedAndLost;
            emit attackLost(
                _attackInstanceId,
                attackToResolve.toPlanet,
                attackToResolve.attacker
            );
        }

        emit BattleResult(
            _attackInstanceId,
            block.timestamp,
            uint256(s.runningAttacks[_attackInstanceId].resolvedStatus)
        );

        //delete s.runningAttacks[_attackInstanceId];
    }

    function getDefensePlanetFleetIds(
        uint256 _planetId
    ) internal view returns (uint256[] memory) {
        address defenderPlayer = IERC721(s.planetsAddress).ownerOf(_planetId);
        uint256 totalShips = IERC721(s.shipsAddress).balanceOf(defenderPlayer);

        uint256[] memory defenseFleet = new uint256[](totalShips);
        uint256 index = 0;

        for (uint256 i = 0; i < totalShips; ++i) {
            uint256 shipId = IERC721(s.shipsAddress).tokenOfOwnerByIndex(
                defenderPlayer,
                i
            );
            if (s.assignedPlanet[shipId] == _planetId) {
                defenseFleet[index++] = shipId;
            }
        }

        // Truncate the array to the actual number of defender ships found
        uint256[] memory defenseFleetToReturn = new uint256[](index);
        for (uint256 i = 0; i < index; ++i) {
            defenseFleetToReturn[i] = defenseFleet[i];
        }

        return defenseFleetToReturn;
    }

    function getAllBuildingsDefender(
        uint256 _planetId
    ) internal view returns (uint256[] memory) {
        uint256[] memory buildingsCount = new uint256[](s.totalBuildingTypes);

        for (uint256 i = 0; i < s.totalBuildingTypes; ++i) {
            buildingsCount[i] = s.buildings[_planetId][i];
        }
        return buildingsCount;
    }

    // helper functions for applying debuff and buff
    function applyBuff(
        int256[3] memory strengths,
        int256 buffPercent
    ) private pure returns (int256[3] memory) {
        strengths[0] += (strengths[0] * buffPercent) / 100;
        strengths[1] += (strengths[1] * buffPercent) / 100;
        strengths[2] += (strengths[2] * buffPercent) / 100;
        return strengths;
    }

    function applyDebuff(
        int256[3] memory strengths,
        int256 debuffPercent
    ) private pure returns (int256[3] memory) {
        strengths[0] -= (strengths[0] * debuffPercent) / 100;
        strengths[1] -= (strengths[1] * debuffPercent) / 100;
        strengths[2] -= (strengths[2] * debuffPercent) / 100;
        return strengths;
    }

    function checkAlliance(
        address _playerToCheck
    ) public view returns (bytes32) {
        return s.allianceOfPlayer[_playerToCheck];
    }

    function getAttackStatus(
        uint256 _instanceId
    ) external view returns (attackStatus memory) {
        return s.runningAttacks[_instanceId];
    }

    function getCurrentAttackStorageSize() external view returns (uint256) {
        return s.sendAttackId;
    }

    function getMultipleRunningAttacks(
        uint256 _startRange,
        uint256 _endRange
    ) external view returns (attackStatus[] memory) {
        attackStatus[] memory queriedAttacks = new attackStatus[](
            _startRange - _endRange
        );

        uint256 counter = 0;

        for (uint256 i = _startRange; i < _endRange; ++i) {
            queriedAttacks[counter] = s.runningAttacks[i];

            counter++;
        }

        return queriedAttacks;
    }

    function getAllIncomingAttacksPlayer(
        address _player
    ) external view returns (attackStatus[] memory) {
        uint256 counter = 0;

        for (uint256 i = 1; i < s.sendAttackId + 1; ++i) {
            if (s.runningAttacks[i].toPlanet == 0) {
                continue;
            }
            if (
                IERC721(s.planetsAddress).ownerOf(
                    s.runningAttacks[i].toPlanet
                ) == _player
            ) {
                counter++;
            }
        }

        attackStatus[] memory incomingAttacksPlayer = new attackStatus[](
            counter
        );

        uint256 insertIndex = 0;

        for (uint256 i = 1; i < s.sendAttackId + 1; ++i) {
            if (s.runningAttacks[i].toPlanet == 0) {
                continue;
            }
            if (
                IERC721(s.planetsAddress).ownerOf(
                    s.runningAttacks[i].toPlanet
                ) == _player
            ) {
                incomingAttacksPlayer[insertIndex] = s.runningAttacks[i];
                insertIndex++;
            }
        }

        return incomingAttacksPlayer;
    }

    function getAllOutgoingAttacks(
        address _player
    ) external view returns (attackStatus[] memory) {
        uint256 counter = 0;

        for (uint256 i = 1; i <= s.sendAttackId + 1; ++i) {
            if (s.runningAttacks[i].attacker == _player) {
                counter++;
            }
        }

        attackStatus[] memory outgoingAttacks = new attackStatus[](counter);

        uint256 insertIndex = 0;
        for (uint256 i = 1; i <= s.sendAttackId + 1; ++i) {
            if (s.runningAttacks[i].attacker == _player) {
                outgoingAttacks[insertIndex] = s.runningAttacks[i];
                insertIndex++;
            }
        }

        return outgoingAttacks;
    }

    function getAllIncomingAttacksPlanet(
        uint256 _planetId
    ) external view returns (attackStatus[] memory) {
        uint256 counter = 0;
        for (uint256 i = 1; i < s.sendAttackId + 1; ++i) {
            if (s.runningAttacks[i].toPlanet == _planetId) {
                counter++;
            }
        }

        attackStatus[] memory incomingAttacks = new attackStatus[](counter);

        uint256 insertIndex = 0;

        for (uint256 i = 1; i < s.sendAttackId + 1; ++i) {
            if (s.runningAttacks[i].toPlanet == _planetId) {
                incomingAttacks[insertIndex] = s.runningAttacks[i];
                insertIndex++;
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
        // Apply Commander Buffs
        //@TODO testing
        //Are we there yet? [ID 7], 15% faster ship travel time
        if (s.activeCommanderTraits[msg.sender][7]) {
            arrivalTime -= (((xDist + yDist) * 15) / 100);
        }

        return arrivalTime;
    }
}
