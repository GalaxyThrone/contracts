<img width="167" alt="medium_" src="https://user-images.githubusercontent.com/117198798/202849745-e7d7a8a1-413a-4e87-8d3f-9dbea3377aef.png">


**Galaxy Throne**

a fully on-chain SciFi strategy game inspired from games like tribal wars.



We wanted to create a SciFi Strategy Building Game where your owned planets & ships are actually yours, not just existing on a centralized backend and dictated by one company.

So every Asset in our game has been created using **ERC721** for planets and ships and **ERC1155** for buildings/research/technologies, while the resources of the game itself are **ERC20** tokens. 

A **governance DAO** exists via snapshot.org and the ownership of 1 planet NFT

We are utilizing Chainlinks Verifiable Random Function to randomize planet generation & the assignment of the home planet as well as for dynamic fights.

In order to avoid frequent transactions & user gas-fees we leveraged Chainlink-Automation triggering those transactions instead of the player, for a gasless & seamless user experience.


We are utilizing the **EIP-2535 Diamond Standard**: https://eips.ethereum.org/EIPS/eip-2535 to offer upgradable, limitless contracts

