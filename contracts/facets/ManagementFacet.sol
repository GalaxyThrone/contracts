// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import {AppStorage, Modifiers, CraftItem, OutMining, SendTerraform, TransferResource, attackStatus, ShipType, Building, DiplomacyDeal, PeaceDeal} from "../libraries/AppStorage.sol";
import "../interfaces/IPlanets.sol";
import "../interfaces/IShips.sol";
import "../interfaces/IERC20.sol";
import "../interfaces/IERC721.sol";
import "../interfaces/IResource.sol";

import "./AdminFacet.sol";

contract ManagementFacet is Modifiers {
    event techResearched(uint techId, address playerAddress);
    event playerNameChosen(address playerAddress, string newName);
    event DealCreated(
        uint indexed dealID,
        address indexed initiator,
        address indexed acceptor
    );
    event DealAccepted(uint indexed dealID);
    event DealViewed(uint indexed dealID);
    event DealCancelled(uint indexed dealID);
    event DealRejected(uint indexed dealID);
    event dealCountered(uint indexed dealID);

    //Research Feature

    function researchTech(
        uint _techIdToResearch,
        uint _researchBasePlanet
    ) external onlyPlanetOwner(_researchBasePlanet) {
        require(
            s.lastResearchTimeCooldown[msg.sender] <= block.timestamp,
            "ManagementFacet: cooldown research!"
        );

        require(
            s.playerTechnologies[msg.sender][_techIdToResearch] == false,
            "ManagementFacet: already researched!"
        );

        require(
            s.counterPlayerTechnologies[msg.sender] < s.maxTechCount,
            "ManagementFacet: reached max tech researched"
        );

        //@TODO prerequisite

        for (uint256 i = 0; i < 3; i++) {
            require(
                s.planetResources[_researchBasePlanet][i] >=
                    s.availableResearchTechs[_techIdToResearch].price[i],
                "ManagementFacet: not enough resources"
            );
            s.planetResources[_researchBasePlanet][i] -= s
                .availableResearchTechs[_techIdToResearch]
                .price[i];

            burnResource(
                i,
                s.availableResearchTechs[_techIdToResearch].price[i]
            );
        }

        s.lastResearchTimeCooldown[msg.sender] =
            block.timestamp +
            s.availableResearchTechs[_techIdToResearch].cooldown;

        s.playerTechnologies[msg.sender][_techIdToResearch] = true;
        s.counterPlayerTechnologies[msg.sender]++;
        emit techResearched(_techIdToResearch, msg.sender);
    }

    function returnPlayerResearchedTech(
        uint _techIdToCheckStatus,
        address _playerAddr
    ) external view returns (bool) {
        return s.playerTechnologies[_playerAddr][_techIdToCheckStatus];
    }

    //Playernames Feature (@notice, this could be moved to backend via offchain signature validation..tbd)

    function setPlayername(string memory _newPlayerName) external {
        require(s.registered[msg.sender], "ManagementFacet: not registered!");
        require(
            !s.playerNameOwnership[_newPlayerName],
            "ManagementFacet: player name taken!"
        );
        s.playerName[msg.sender] = _newPlayerName;
        s.playerNameOwnership[_newPlayerName] = true;

        emit playerNameChosen(msg.sender, _newPlayerName);
    }

    function returnPlayerName(
        address _playerNameToGet
    ) external view returns (string memory) {
        return s.playerName[_playerNameToGet];
    }

    //Diplomacy Feature

    function createDeal(
        DiplomacyDeal memory _deal
    ) external onlyPlanetOwner(_deal.initiatorPlanetId) returns (uint) {
        s.dealCounter++;
        s.diplomacyDeals[s.dealCounter] = _deal;
        if (!_deal.demanded) {
            lockResources(_deal.resourcesAmount, _deal.initiatorPlanetId);
        }
        emit DealCreated(s.dealCounter, _deal.initiator, _deal.acceptor);
        return s.dealCounter;
    }

    function lockResources(
        uint[3] memory _resourceToLock,
        uint _planetId
    ) internal {
        // If resources are offered, transfer from the initiator to the contract

        for (uint i = 0; i < 3; i++) {
            require(
                s.planetResources[_planetId][i] >= _resourceToLock[i],
                "Not enough resources"
            );
            s.planetResources[_planetId][i] -= _resourceToLock[i];
        }
    }

    function unlockResources(
        uint[3] memory _resourceToUnlock,
        uint _planetId
    ) internal {
        for (uint i = 0; i < 3; i++) {
            s.planetResources[_planetId][i] += _resourceToUnlock[i];
        }
    }

    function receiveOfferedResources(
        uint[3] memory _offeredResources,
        uint _planetId
    ) internal {
        for (uint i = 0; i < 3; i++) {
            s.planetResources[_planetId][i] += _offeredResources[i];
        }
    }

    function payDemandedResources(
        uint[3] memory _demandedResources,
        uint _planetIdPayer,
        uint _planetIdReceiver
    ) internal {
        for (uint i = 0; i < 3; i++) {
            require(
                s.planetResources[_planetIdPayer][i] >= _demandedResources[i],
                "Not enough resources"
            );
            s.planetResources[_planetIdPayer][i] -= _demandedResources[i];
            s.planetResources[_planetIdReceiver][i] += _demandedResources[i];
        }
    }

    function acceptDeal(
        uint _dealID,
        uint _planetToAcceptDealFrom
    ) external onlyPlanetOwner(_planetToAcceptDealFrom) {
        DiplomacyDeal storage deal = s.diplomacyDeals[_dealID];
        require(
            msg.sender == deal.acceptor,
            "Only the acceptor can accept the deal."
        );

        require(
            block.timestamp < deal.timeFrameExpirationOffer,
            "cant accept expired deal"
        );
        if (deal.demanded) {
            payDemandedResources(
                deal.resourcesAmount,
                _planetToAcceptDealFrom,
                deal.initiatorPlanetId
            );
        } else {
            receiveOfferedResources(
                deal.resourcesAmount,
                _planetToAcceptDealFrom
            );
        }

        // Register the peace deal
        s.activePeaceDeals[deal.initiator][deal.acceptor] = PeaceDeal(
            block.timestamp + deal.timeFramePeaceDealInSeconds
        );
        s.activePeaceDeals[deal.acceptor][deal.initiator] = PeaceDeal(
            block.timestamp + deal.timeFramePeaceDealInSeconds
        );

        emit DealAccepted(_dealID);
    }

    function cancelDeal(uint _dealID) external {
        DiplomacyDeal storage deal = s.diplomacyDeals[_dealID];
        require(
            msg.sender == deal.initiator,
            "Only the initiator can cancel the deal."
        );
        if (!deal.demanded) {
            unlockResources(deal.resourcesAmount, deal.initiatorPlanetId);
        }
        delete s.diplomacyDeals[_dealID];
        emit DealCancelled(_dealID);
    }

    function viewDeal(
        uint _dealID
    ) external view returns (DiplomacyDeal memory) {
        return s.diplomacyDeals[_dealID];
    }

    function getPeaceDealStatus(
        address _player1,
        address _player2
    ) external view returns (bool) {
        PeaceDeal memory peaceDeal1 = s.activePeaceDeals[_player1][_player2];
        PeaceDeal memory peaceDeal2 = s.activePeaceDeals[_player2][_player1];

        // Check if there's no peace deal in place
        if (peaceDeal1.endTime == 0 && peaceDeal2.endTime == 0) {
            return false;
        }

        // Check if the peace deal between _player1 and _player2 is still active
        if (
            block.timestamp < peaceDeal1.endTime ||
            block.timestamp < peaceDeal2.endTime
        ) {
            return true;
        }

        // If neither of the above conditions are met, then the peace deal has expired
        return false;
    }

    //Helper Functions

    function burnResource(uint256 i, uint256 amount) internal {
        if (i == 0) {
            IERC20(s.metalAddress).burnFrom(address(this), amount);
        } else if (i == 1) {
            IERC20(s.crystalAddress).burnFrom(address(this), amount);
        } else {
            IERC20(s.antimatterAddress).burnFrom(address(this), amount);
        }
    }
}
