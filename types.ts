import { BigNumberish } from "@ethersproject/bignumber";

export interface Building {
  price: [BigNumberish, BigNumberish, BigNumberish];
  boosts: [BigNumberish, BigNumberish, BigNumberish];
  attack: BigNumberish;
  health: BigNumberish;
  craftTime: BigNumberish;
  name: string;
}

export interface ship {
  shipType: BigNumberish;
  price: [BigNumberish, BigNumberish, BigNumberish];
  attack: BigNumberish;
  health: BigNumberish;
  cargo: BigNumberish;
  craftTime: BigNumberish;
  craftedFrom: BigNumberish;
  name: string;
  moduleSlots: BigNumberish;
  equippedShipModule : any;


}
