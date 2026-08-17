# Sharkie character contract

Sharkie should read as **a blob that happens to be a shark**, not a literal cartoon shark. The silhouette is the identity; the shark cues are deliberately sparse.

## Visual invariants

- White, soft asymmetric blob on a dark surface by default.
- One integrated dorsal fin. No tail, body outline, nose, or extra anatomy.
- Two large, slightly tilted black oval eyes, intentionally offset rather than perfectly symmetrical.
- One broad mischievous smile with two tiny black fang notches.
- Two short curved gill marks. They are enough to sell “shark.”
- No outlines, shadows, gradients, textures, pupils, or decorative detail inside the mascot.
- The neutral pose is the canonical design. Emotional states should alter it lightly, not redraw the character.

The neutral silhouette and face proportions are encoded as constants/tests. Treat changes to them as character-design changes, not routine refactors.

## Motion language

Motion should make Sharkie feel attentive, not busy.

1. **Idle is almost still.** Breathing and float are intentionally sub-pixel to low-single-pixel at normal website sizes.
2. **Eyes do most of the acting.** Slow autonomous drift gives way smoothly to pointer-directed gaze.
3. **Blinking is irregular.** The deterministic schedule includes varied spacing and an occasional double blink so it does not feel clock-driven.
4. **State changes never snap.** The renderer captures the currently displayed frame and interpolates into the next state, including interruptions mid-transition.
5. **Big movement is event-driven.** Chomp, bounce, peek, and dive are one-shot actions; they should not run continuously as ambient decoration.
6. **Squash and stretch stays restrained.** Sharkie remains recognizable at every frame.

## Website interaction rules

- Global pointer tracking is subtle and saturates; Sharkie should notice the pointer, not chase it.
- Use `setState()` for durable moods such as `happy` or `curious`.
- Use `play()` for one-shot reactions such as a successful action, hover surprise, loading completion, or a playful click.
- Prefer one reaction tied to a meaningful website event over random autonomous reactions.
- Do not place Sharkie where it blocks reading, navigation, or touch scrolling.

## Accessibility and performance

- The renderer honors `prefers-reduced-motion` unless explicitly overridden.
- Off-screen and background-tab animation pauses automatically.
- Use `ariaLabel: null` when the mascot is purely decorative.
- Colors are CSS variables (`--sharkie-body`, `--sharkie-ink`) so contrast can be controlled by the host site.
