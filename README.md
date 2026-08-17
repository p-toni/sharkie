# Sharkie

A tiny animated SVG shark mascot for the web.

Sharkie uses an original shark silhouette and character design with a radial-profile morphing approach adapted from [bloub](https://github.com/jeremy-prt/bloub). It intentionally does not include bloub's x.ai-derived measured avatar profiles.

## What is included

- Framework-free SVG renderer
- Pure deterministic `sampleSharkie(t, options)` animation engine
- 64-point radial silhouette interpolation
- Autonomous eye drift + pointer-reactive gaze
- Subtle idle breathing and blinking
- `idle`, `happy`, `curious`, `chomp`, `bounce`, `peek`, and `dive` states
- `prefers-reduced-motion` support
- Small Vite demo page for tuning the character

## Run the demo

```bash
npm install
npm run dev
```

## Embed

```ts
import { Sharkie } from 'sharkie-mascot'

const mount = document.querySelector<HTMLElement>('#mascot')!
const sharkie = new Sharkie(mount)

sharkie.setState('curious')
```

The renderer owns only the SVG inside the mount element; size and positioning remain controlled by your site's CSS.

## Low-level sampling

For integration with React, canvas, custom renderers, testing, or a site's own animation clock:

```ts
import { sampleSharkie } from 'sharkie-mascot'

const frame = sampleSharkie(1.2, {
  state: 'idle',
  look: { x: 0.25, y: -0.1, mix: 0.8 }
})
```

The sampler has no clock and mutates no state. Equal inputs produce equal frames.

## Attribution

The radial-profile morphing technique is adapted from bloub by Jérémy Perret. See [`ATTRIBUTION.md`](./ATTRIBUTION.md) and [`vendor/bloub/LICENSE`](./vendor/bloub/LICENSE).
