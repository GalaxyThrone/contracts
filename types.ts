import { BigNumberish } from "@ethersproject/bignumber";

export interface Building {
  price: [BigNumberish, BigNumberish, BigNumberish];
  boosts: [BigNumberish, BigNumberish, BigNumberish];
  defenseTypes: [BigNumberish, BigNumberish, BigNumberish];
  health: BigNumberish;
  craftTime: BigNumberish;
  name: string;
}

export interface ship {
  shipType: BigNumberish;
  price: [BigNumberish, BigNumberish, BigNumberish, BigNumberish];
  attack: BigNumberish;
  attackTypes: [BigNumberish, BigNumberish, BigNumberish];
  defenseTypes: [BigNumberish, BigNumberish, BigNumberish];
  health: BigNumberish;
  cargo: BigNumberish;
  craftTime: BigNumberish;
  craftedFrom: BigNumberish;
  name: string;
  moduleSlots: BigNumberish;
}
