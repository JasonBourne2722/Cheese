# Mouse Pepe Monster Rally

Browser-playable starter prototype for the Mouse Pepe off-road monster truck game.

## Run it

```bash
npm install
npm run dev
```

Open the local Vite URL.

## Controls

- W / Arrow Up = Gas
- S / Arrow Down = Brake / reverse
- R = Reset after wipeout
- 1 = Ethereum truck
- 2 = Solana truck

## What is already built

- Vite + Three.js + cannon-es
- Side-view 2.5D monster truck prototype
- Dirt track with ramps, a gap trap, hazard signs, swinging ball prop, coins
- Ethereum and Solana truck variants
- Procedural placeholder Mouse Pepe rider on top of each truck
- Mobile buttons for brake/gas/swap

## Where to add final art

Put final PNG/GLB assets in:

```txt
src/assets/
```

Recommended final asset names:

```txt
src/assets/trucks/eth-mouse-pepe-truck.glb
src/assets/trucks/sol-mouse-pepe-truck.glb
src/assets/ui/cheese-coin.png
src/assets/track/dirt-texture.png
```

The current truck is procedural, so it works immediately without art files.
