// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

interface IShips {
    function mint(address _account, uint256 _shipTypeId)
        external
        returns (uint256);

    function getPrice(uint256 _fleetId)
        external
        view
        returns (uint256[3] memory);

    struct ShipType {
        uint256 shipType;
        uint256[3] price; // [metal, crystal, ethereus]
        uint256 attack;
        uint256[3] attackTypes;
        uint256[3] defenseTypes;
        uint256 health;
        uint256 cargo;
        uint256 craftTime;
        uint256 craftedFrom;
        string name;
        uint256 moduleSlots;
    }

    struct ShipModule {
        uint256 attackBoostStat;
        uint256 healthBoostStat;
    }

    function getCraftTime(uint256 _fleetId) external view returns (uint256);

    function getCraftedFrom(uint256 _fleetId) external view returns (uint256);

    function getCargo(uint256 _fleetId) external view returns (uint256);

    function burnShip(uint256 _shipId) external;

    function assignShipToPlanet(uint256 _shipId, uint256 _toPlanetId) external;

    function deleteShipFromPlanet(uint256 _shipId) external;

    function getShipStats(uint256 _shipId)
        external
        view
        returns (ShipType memory);

    function checkAssignedPlanet(uint256 _shipId)
        external
        view
        returns (uint256);

    function getDefensePlanet(uint256 _planetId)
        external
        view
        returns (uint256[] memory);

    function ownerOf(uint256 _tokenId) external view returns (address);
}
