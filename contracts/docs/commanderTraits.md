# Commander Traits Documentation

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

## Traits

### EM Warfare Mastery Trait [ID 1] [Tested]

- **Trait ID**: 1
- **Description**: 20% Buff to Ships Electromagnetic Damage
- **Preset Commander**: Commander Vektrix[Faction 0][commander id 1]

### EM Hardening Mastery Trait [ID 2]

- **Trait ID**: 2
- **Description**: 20% Buff to Ships Electromagnetic Defense
- **Preset Commander**: Commander Seraphel[Faction 0][commander id 2]

### Ship Production Micromanagement Guru [ID 3]

- **Trait ID**: 3
- **Description**: -10% Ship Crafting Time
- **Preset Commander**: Commander Nova[Faction 0][commander id 3], Commander Sylas[Faction 3][commander id 1]

### Kinetic Warfare Mastery Trait [ID 4]

- **Trait ID**: 4
- **Description**: 20% Buff to Ships Kinetic Damage
- **Preset Commander**: Commander Korgath[Faction 1][commander id 1]

### Home is where the minerals are [ID 5]

- **Trait ID**: 5
- **Description**: 20% Buff to asteroid mining yield.
- **Preset Commander**: Commander Lunara[Faction 1][commander id 2]

### More Ship-Hulls Philosophy [ID 6]

- **Trait ID**: 6
- **Description**: 10% Buff to Ships Health
- **Preset Commander**: Commander Rexar[Faction 1][commander id 3]

### Are we there yet? [ID 7]

- **Trait ID**: 7
- **Description**: -15% Ship Travel Time.
- **Preset Commander**: Commander Zethos[Faction 2][commander id 1]

### Motivational Research Speaker [ID 8]

- **Trait ID**: 8
- **Description**: 20% Buff to Research Cooldown
- **Preset Commander**: Commander Illari[Faction 2][commander id 2]

### Bunker Philosophy [ID 9]

- **Trait ID**: 9
- **Description**: 100% Buff to Base Planetary Defense
- **Preset Commander**: Commander Raelon[Faction 2][commander id 3]

### Explorer Mindset [ID 10]

- **Trait ID**: 10
- **Description**: -50% Terraformer Crafting TIme
- **Preset Commander**: Commander Lyria[Faction 3][commander id 2]

### Admiral's Impenetrable Mustache [ID 11]

- **Trait ID**: 11
- **Description**: 5% Improved Total Defense Strength for Ships and Buildings
- **Preset Commander**: Commander Raelon[Faction 3][commander id 3]
