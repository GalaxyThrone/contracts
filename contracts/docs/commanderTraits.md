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

### EM Warfare Mastery Trait [ID 1]

- **Trait ID**: 1
- **Description**: 15% Buff to Ships Electromagnetic Damage
- **Preset Commander**: Commander Vektrix[Faction 0]
