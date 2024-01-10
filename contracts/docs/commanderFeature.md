# Commander Feature Documentation

The Commander Feature introduces a unique gameplay element in the form of NFT-based Commanders. Each Commander possesses specific Traits, adding depth and strategy to the game.

## Overview

- Commanders are represented as NFTs with a set of Traits.
- The first Trait is pre-determined; the remaining two are assigned randomly.
- Commanders can accumulate EXP and specialize through skill trees, enhancing their effectiveness.
- EXP is reset after each season, aligning with the game's seasonal dynamics.

## Commander Structure

A Commander is defined as follows:

```solidity
struct Commander {
    uint faction;
    string name;
    uint EXP;
    uint256[3] traits;
    uint veteranRank;
}
```

## Commander Traits

#### Traits are crucial in defining a Commander's abilities and impact on gameplay.

```solidity
struct CommanderTrait {
    string name;
    uint value;
    uint level;
    uint[5] expRequirementsLevel;
}
```

- #### Traits Pool: There is a pool of 20 distinct traits.
- #### Season Wins: Winning a season allows a Commander to pre-set additional Traits for subsequent seasons.
- #### No Planet Penalty: Commanders left without any planets at the end of a season are reset to rank 0.

## Factions and Pre-Set Commanders

Each faction has three pre-set Commanders to choose from, each with unique bonuses and lore.

### The Cybertorians

1. **Commander Vektrix**

   - **Preset-Trait**: +15% to EM Damage.
   - **Lore**: Vektrix, the scientist-turned-cyborg, commands fleets with unrivaled EM warfare expertise.

2. **Commander Seraphel**

   - **Preset-Trait**: +20% to Fleet EM-Defense.
   - **Lore**: Cybernetically enhanced Seraphel is a tactical genius, ensuring her fleet's resilience.

3. **Commander Nova**
   - **Preset-Trait**: Enhanced ShipType production speed by 20%.
   - **Lore**: The innovative engineer, Nova, leads with advanced ship designs, ensuring fleet supremacy.

### The Naxians

1. **Commander Korgath**

   - **Preset-Trait**: +15% Kinetic Damage.
   - **Lore**: Korgath, a warrior of unmatched efficiency, ensures every shot counts in battle.

2. **Commander Lunara**

   - **Preset-Trait**: +30% to mining yield.
   - **Lore**: Lunara, born in the asteroid belts, excels in resource extraction.

3. **Commander Rexar**
   - **Preset-Trait**: +20% Kinetic Defense.
   - **Lore**: The shield expert Rexar is known for his defensive strategies, saving countless fleets.

### The Netharim

1. **Commander Zethos**

   - **Preset-Trait**: -15% Fleet Travel Time.
   - **Lore**: Zethos, the FTL travel pioneer, ensures his fleets are always strategically positioned.

2. **Commander Illari**

   - **Preset-Trait**: +10% to Research Speed.
   - **Lore**: The curious Illari drives rapid technological advancements.

3. **Commander Raelon**
   - **Preset-Trait**: +20% Ship Defense.
   - **Lore**: The strategist Raelon focuses on defensive preparations, creating impenetrable fleets.

### The Xantheans

1. **Commander Sylas**

   - **Preset-Trait**: -15% Crafting Time.
   - **Lore**: Sylas, known for his interconnectedness, streamlines ship and structure formation.

2. **Commander Lyria**

   - **Preset-Trait**: +30% to Ship Speed.
   - **Lore**: The explorer Lyria ensures her fleets are swift and agile in space.

3. **Commander Phaelon**
   - **Preset-Trait**: Enhanced planetary defenses by 25%.
   - **Lore**: Phaelon, the protector, focuses on the impregnable defense of Xanthean territories.

## Additional Notes

- ### In Development: Randomization Feature: A feature to assign random Traits to Commanders
- ### In Development: Skill Trees and EXP: Commanders can invest EXP in skill trees for additional bonuses and specialization.
