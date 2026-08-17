# Sharkie

A small, expressive SVG shark mascot for the web.

Sharkie is intentionally closer to **a living blob with shark cues** than a literal shark illustration. Its neutral silhouette is based on the accepted Sharkie artwork, while the animation system uses a framework-free radial-profile morphing approach adapted from [bloub](https://github.com/jeremy-prt/bloub). No x.ai-derived measured avatar profiles are included.

## What is included

- Original high-fidelity Sharkie silhouette sampled into a 128-point radial profile
- Framework-free SVG renderer with no runtime dependencies
- Pure deterministic `sampleSharkie(t, options)` animation engine
- Smooth interruptible state transitions
- Subtle irregular blinking and low-amplitude idle breathing
- Smoothed pointer gaze, including optional viewport-wide tracking
- Durable moods: `idle`, `happy`, `curious`, `surprised`
- One-shot actions: `chomp`, `bounce`, `peek`, `dive`
- Face geometry that follows the body's translation, rotation, squash, and stretch
- Silhouette clipping so facial features never leak outside the body
- Automatic off-screen/background-tab pausing
- `prefers-reduced-motion` support
- CSS-variable theming
- Minimal Vite motion lab for tuning interactions

See [`docs/CHARACTER.md`](./docs/CHARACTER.md) for the character and motion contract.

## Run the motion lab

```bash
npm install
npm run dev
```

Move the pointer anywhere in the viewport to see Sharkie track it. Click Sharkie for a chomp, or use the dock to inspect moods and actions.

## Embed

```ts
import { Sharkie } from 'sharkie-mascot'

const mount = document.querySelector<HTMLElement>('#mascot')!
const sharkie = new Sharkie(mount, {
  tracking: 'viewport',
  ariaLabel: null // decorative mascot
})

sharkie.setState('curious')
sharkie.play('bounce', { returnTo: 'curious' })
```

The renderer owns only the SVG inside the mount element. Size and positioning remain controlled by the host site's CSS.

### Styling

```css
#mascot {
  width: 220px;
  aspect-ratio: 1.24;
  --sharkie-body: #fff;
  --sharkie-ink: #000;
}
```

### Pointer behavior

`tracking` accepts:

- `'viewport'` — subtle gaze toward the pointer anywhere on the page (default when interactive)
- `'self'` — react only while the pointer is over Sharkie
- `false` — no automatic pointer tracking; use `setLook()` manually

### Moods vs. actions

Use `setState()` for a durable expression:

```ts
sharkie.setState('happy')
```

Use `play()` for a one-shot reaction that returns to a mood automatically:

```ts
sharkie.play('chomp', { returnTo: 'happy' })
```

### Lifecycle

```ts
sharkie.pause()
sharkie.resume()
sharkie.destroy()
```

`autoPause` defaults to `true`, so animation stops when Sharkie leaves the viewport or the page is hidden.

## Low-level sampling

For React, canvas, custom renderers, testing, or a site's own animation clock:

```ts
import { sampleSharkie } from 'sharkie-mascot'

const frame = sampleSharkie(1.2, {
  state: 'idle',
  look: { x: 0.25, y: -0.1, mix: 0.8 }
})
```

The sampler has no clock and mutates no state. Equal inputs produce equal frames. `blendSharkieFrames()` is also exported for custom transition systems.

## Build

```bash
npm test
npm run build
```

The library build emits ESM plus TypeScript declarations.

## Attribution

The radial-profile morphing technique is adapted from bloub by Jérémy Perret. See [`ATTRIBUTION.md`](./ATTRIBUTION.md) and [`vendor/bloub/LICENSE`](./vendor/bloub/LICENSE).
