import { ApolloClient, InMemoryCache, gql } from "@apollo/client";

// Initialize a GraphQL client
const client = new ApolloClient({
  uri: "http://your-graphql-endpoint.com",
  cache: new InMemoryCache(),
});

// Define the type of your ship data for TypeScript
interface Ship {
  id: number;
  shipType: string;
  price: number;
  attack: number;
  attackTypes: number[];
  defenseTypes: number[];
  health: number;
  cargo: number;
  craftTime: number;
  craftedFrom: string;
  name: string;
  moduleSlots: number;
}

async function calculateBattleResult(
  attackerFleet: number[],
  planetId: number
): Promise<string> {
  // Fetch the defending fleet
  const planetData = await client.query({
    query: gql`
      {
        planet(id: "${planetId}") {
          id
          buildings
          ships {
            id
            shipType
            price
            attack
            attackTypes
            defenseTypes
            health
            cargo
            craftTime
            craftedFrom
            name
            moduleSlots
          }
        }
      }
    `,
  });

  // Fetch the attacker fleet
  const attackerData = await Promise.all(
    attackerFleet.map((shipId) =>
      client.query({
        query: gql`
          {
            ship(id: "${shipId}") {
              id
              shipType
              price
              attack
              attackTypes
              defenseTypes
              health
              cargo
              craftTime
              craftedFrom
              name
              moduleSlots
            }
          }
        `,
      })
    )
  );

  const FLAT_PLANETDEFENSE = 1000;
  const LARGER_FLEET_DEBUFF_PERCENT_300 = 30;
  const LARGER_FLEET_DEBUFF_PERCENT_200 = 20;
  const LARGER_FLEET_DEBUFF_PERCENT_100 = 10;
  const LARGER_FLEET_DEBUFF_PERCENT_50 = 5;
  const SMALLER_FLEET_BUFF_PERCENT_300 = 30;
  const SMALLER_FLEET_BUFF_PERCENT_200 = 20;
  const SMALLER_FLEET_BUFF_PERCENT_100 = 10;
  const SMALLER_FLEET_BUFF_PERCENT_50 = 5;

  // Initialize total health, attack, attackTypes and defenseTypes for each fleet
  let defenderHealth = 0,
    defenderAttack = 0,
    defenderDefenseTypes = [0, 0, 0],
    attackerHealth = 0,
    attackerAttack = 0,
    attackerAttackTypes = [0, 0, 0];

  // Building defense values placeholder
  const buildingDefenseValues = {
    0: { health: 10, defenseTypes: [5, 5, 0] },
    1: { health: 10, defenseTypes: [5, 5, 0] },
    2: { health: 20, defenseTypes: [10, 5, 5] },
    3: { health: 30, defenseTypes: [10, 10, 10] },
  };

  // Add building defenses to planet defenses
  for (let i = 0; i < planetData.data.planet.buildings.length; i++) {
    const buildingDefenses = buildingDefenseValues[i];
    defenderHealth +=
      buildingDefenses.health * planetData.data.planet.buildings[i];
    for (let i = 0; i < 3; i++) {
      defenderDefenseTypes[i] +=
        buildingDefenses.defenseTypes[i] *
        planetData.data.planet.buildings[i];
    }
  }

  // Add defendingFleet stats to planet defenses
  for (const ship of planetData.data.planet.ships) {
    defenderHealth += ship.health;

    for (let i = 0; i < 3; i++) {
      defenderDefenseTypes[i] += ship.defenseTypes[i];
    }
  }

  // Add attackerFleet stats to attack
  for (const shipData of attackerData) {
    const ship = shipData.data.ship as Ship;
    attackerHealth += ship.health;

    for (let i = 0; i < 3; i++) {
      attackerAttackTypes[i] += ship.attackTypes[i];
    }
  }

  // Calculate fleet size difference
  let fleetSizeDifferencePercent =
    (attackerFleet.length * 100) /
    planetData.data.planet.ships.length;

  // Apply debuffs and buffs
  if (fleetSizeDifferencePercent >= 100) {
    // Attacker fleet is larger, apply debuff
    const debuffPercent =
      fleetSizeDifferencePercent >= 300
        ? LARGER_FLEET_DEBUFF_PERCENT_300
        : fleetSizeDifferencePercent >= 200
        ? LARGER_FLEET_DEBUFF_PERCENT_200
        : fleetSizeDifferencePercent >= 100
        ? LARGER_FLEET_DEBUFF_PERCENT_100
        : LARGER_FLEET_DEBUFF_PERCENT_50;

    applyDebuff(attackerAttackTypes, debuffPercent);
  } else {
    // Attacker fleet is smaller, apply buff
    const buffPercent =
      fleetSizeDifferencePercent <= 33
        ? SMALLER_FLEET_BUFF_PERCENT_300
        : fleetSizeDifferencePercent <= 50
        ? SMALLER_FLEET_BUFF_PERCENT_200
        : fleetSizeDifferencePercent <= 75
        ? SMALLER_FLEET_BUFF_PERCENT_100
        : SMALLER_FLEET_BUFF_PERCENT_50;

    applyBuff(attackerAttackTypes, buffPercent);
  }

  let attackerDamage = 0;
  attackerDamage -= FLAT_PLANETDEFENSE;

  // Basic battle result calculation considering attackTypes and defenseTypes
  let battleResult = 0;
  for (let i = 0; i < 3; i++) {
    if (attackerAttackTypes[i] * 7 > defenderDefenseTypes[i] * 10) {
      // Weakness modifier, 15% if the difference between the two is 30% in favor of the attacker
      battleResult +=
        attackerAttackTypes[i] -
        defenderDefenseTypes[i] +
        (attackerAttackTypes[i] * 15) / 100;
    } else {
      battleResult +=
        attackerAttackTypes[i] - defenderDefenseTypes[i];
    }
  }

  attackerDamage += battleResult;

  // without weakness modifier mechanic
  /*
  for (let i = 0; i < 3; i++) {
    attackerDamage +=
      attackerAttackTypes[i] - defenderDefenseTypes[i];
  }
  */

  switch (getDamageLevel(attackerDamage, defenderHealth)) {
    case 100:
      return "100%";
    case 90:
      return "90%";
    case 80:
      return "80%";
    case 70:
      return "70%";
    case 60:
      return "60%";
    case 50:
      return "50%";
    case 40:
      return "40%";
    case 30:
      return "30%";
    case 20:
      return "20%";
    case 10:
      return "10%";
    default:
      return "0%";
  }
}

function getDamageLevel(damage: number, health: number): number {
  if (damage * 0.6 > health) return 100;
  if (damage * 0.7 > health) return 90;
  if (damage * 0.8 > health) return 80;
  if (damage * 0.9 > health) return 70;
  if (damage > health) return 60;
  if (damage == health) return 50;
  if (damage * 1.1 < health) return 40;
  if (damage * 1.2 < health) return 30;
  if (damage * 1.3 < health) return 20;
  if (damage * 1.4 < health) return 10;
  if (damage * 1.5 < health) return 0;
  return 0;
}

function applyDebuff(
  attackerAttackTypes: number[],
  debuffPercent: number
) {
  for (let i = 0; i < 3; i++) {
    attackerAttackTypes[i] -=
      (attackerAttackTypes[i] * debuffPercent) / 100;
  }
}

function applyBuff(
  attackerAttackTypes: number[],
  buffPercent: number
) {
  for (let i = 0; i < 3; i++) {
    attackerAttackTypes[i] +=
      (attackerAttackTypes[i] * buffPercent) / 100;
  }
}
