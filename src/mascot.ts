import {
  ACTION_DURATIONS,
  blendSharkieFrames,
  sampleSharkie,
  type LookTarget,
  type SharkieAction,
  type SharkieFrame,
  type SharkieState
} from './engine'
import { clamp, r3, smooth } from './math'

export type SharkieTracking = 'self' | 'viewport' | false

export interface SharkieOptions {
  state?: SharkieState
  className?: string
  /** Backwards-compatible shortcut. false disables pointer tracking. */
  interactive?: boolean
  tracking?: SharkieTracking
  reducedMotion?: boolean
  transitionMs?: number
  ariaLabel?: string | null
  autoPause?: boolean
}

export interface SharkiePlayOptions {
  duration?: number
  returnTo?: SharkieState
  transitionMs?: number
}

const NS = 'http://www.w3.org/2000/svg'
let instanceCount = 0

function svgEl<K extends keyof SVGElementTagNameMap>(name: K): SVGElementTagNameMap[K] {
  return document.createElementNS(NS, name)
}

function setPath(path: SVGPathElement, d: string) {
  path.setAttribute('d', d)
}

export class Sharkie {
  readonly element: SVGSVGElement

  private body = svgEl('path')
  private clipBody = svgEl('path')
  private faceClipGroup = svgEl('g')
  private faceGroup = svgEl('g')
  private leftEye = svgEl('ellipse')
  private rightEye = svgEl('ellipse')
  private smile = svgEl('path')
  private mouthOpen = svgEl('ellipse')
  private fangLeft = svgEl('path')
  private fangRight = svgEl('path')
  private openToothLeft = svgEl('path')
  private openToothRight = svgEl('path')
  private gill1 = svgEl('path')
  private gill2 = svgEl('path')

  private raf = 0
  private lastNow = performance.now()
  private elapsed = 0
  private stateElapsed = 0
  private state: SharkieState
  private currentFrame: SharkieFrame
  private transitionFrom: SharkieFrame | null = null
  private transitionElapsed = 0
  private transitionDuration = 0
  private defaultTransitionMs: number

  private lookTarget: LookTarget | null = null
  private smoothLook = { x: 0, y: 0, mix: 0 }
  private tracking: SharkieTracking
  private reducedMotion: boolean
  private reducedMotionExplicit: boolean
  private motionQuery: MediaQueryList | null = null

  private actionReturnTo: SharkieState | null = null
  private actionDuration = 0
  private actionTransitionMs = 220

  private manualPaused = false
  private pageVisible = !document.hidden
  private inViewport = true
  private autoPause: boolean
  private intersectionObserver: IntersectionObserver | null = null

  constructor(container: HTMLElement, options: SharkieOptions = {}) {
    this.state = options.state ?? 'idle'
    this.defaultTransitionMs = Math.max(0, options.transitionMs ?? 220)
    this.autoPause = options.autoPause ?? true
    this.reducedMotionExplicit = options.reducedMotion !== undefined
    this.motionQuery = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : null
    this.reducedMotion = options.reducedMotion ?? this.motionQuery?.matches ?? false

    const interactive = options.interactive ?? true
    this.tracking = options.tracking ?? (interactive ? 'viewport' : false)

    const id = `sharkie-${++instanceCount}`
    const svg = svgEl('svg')
    svg.setAttribute('viewBox', '-140 -132 280 238')
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet')
    svg.setAttribute('shape-rendering', 'geometricPrecision')
    svg.style.width = '100%'
    svg.style.height = '100%'
    svg.style.overflow = 'visible'
    svg.style.display = 'block'
    if (options.className) svg.setAttribute('class', options.className)

    const ariaLabel = options.ariaLabel === undefined ? 'Sharkie mascot' : options.ariaLabel
    if (ariaLabel === null) {
      svg.setAttribute('aria-hidden', 'true')
    } else {
      svg.setAttribute('role', 'img')
      svg.setAttribute('aria-label', ariaLabel)
    }
    this.element = svg

    const defs = svgEl('defs')
    const clipPath = svgEl('clipPath')
    clipPath.setAttribute('id', `${id}-clip`)
    clipPath.setAttribute('clipPathUnits', 'userSpaceOnUse')
    clipPath.append(this.clipBody)
    defs.append(clipPath)

    this.body.setAttribute('fill', 'var(--sharkie-body, #fff)')
    this.faceClipGroup.setAttribute('clip-path', `url(#${id}-clip)`)

    for (const eye of [this.leftEye, this.rightEye]) eye.setAttribute('fill', 'var(--sharkie-ink, #000)')

    this.smile.setAttribute('fill', 'none')
    this.smile.setAttribute('stroke', 'var(--sharkie-ink, #000)')
    this.smile.setAttribute('stroke-linecap', 'round')
    this.smile.setAttribute('stroke-linejoin', 'round')

    this.mouthOpen.setAttribute('fill', 'var(--sharkie-ink, #000)')
    for (const fang of [this.fangLeft, this.fangRight]) fang.setAttribute('fill', 'var(--sharkie-ink, #000)')
    for (const tooth of [this.openToothLeft, this.openToothRight]) tooth.setAttribute('fill', 'var(--sharkie-body, #fff)')
    for (const gill of [this.gill1, this.gill2]) {
      gill.setAttribute('fill', 'none')
      gill.setAttribute('stroke', 'var(--sharkie-ink, #000)')
      gill.setAttribute('stroke-width', '4.8')
      gill.setAttribute('stroke-linecap', 'round')
    }

    this.faceGroup.append(
      this.leftEye,
      this.rightEye,
      this.smile,
      this.fangLeft,
      this.fangRight,
      this.mouthOpen,
      this.openToothLeft,
      this.openToothRight,
      this.gill1,
      this.gill2
    )
    this.faceClipGroup.append(this.faceGroup)
    svg.append(defs, this.body, this.faceClipGroup)
    container.replaceChildren(svg)

    this.currentFrame = sampleSharkie(0, { state: this.state, stateTime: 0, reducedMotion: this.reducedMotion })
    this.render(this.currentFrame)

    this.attachPointerTracking()
    document.addEventListener('visibilitychange', this.onVisibilityChange)
    if (!this.reducedMotionExplicit) this.motionQuery?.addEventListener('change', this.onMotionPreferenceChange)

    if (this.autoPause && typeof IntersectionObserver !== 'undefined') {
      this.intersectionObserver = new IntersectionObserver(([entry]) => {
        this.inViewport = entry?.isIntersecting ?? true
        this.syncRunning()
      }, { rootMargin: '120px' })
      this.intersectionObserver.observe(svg)
    }

    this.syncRunning()
  }

  getState(): SharkieState {
    return this.state
  }

  setState(state: SharkieState, options: { transitionMs?: number } = {}) {
    this.actionReturnTo = null
    this.changeState(state, options.transitionMs)
  }

  play(state: SharkieAction, options: SharkiePlayOptions = {}) {
    this.changeState(state, options.transitionMs)
    this.actionReturnTo = options.returnTo ?? 'idle'
    this.actionDuration = Math.max(0, options.duration ?? ACTION_DURATIONS[state] + (state === 'peek' ? 0.18 : 0.08))
    this.actionTransitionMs = options.transitionMs ?? this.defaultTransitionMs
  }

  setLook(look: LookTarget | null) {
    if (look && (!Number.isFinite(look.x) || !Number.isFinite(look.y) || (look.mix !== undefined && !Number.isFinite(look.mix)))) return
    this.lookTarget = look
    if (!this.manualPaused) this.syncRunning()
  }

  setReducedMotion(reduced: boolean) {
    this.reducedMotionExplicit = true
    this.reducedMotion = reduced
  }

  pause() {
    this.manualPaused = true
    this.syncRunning()
  }

  resume() {
    this.manualPaused = false
    this.syncRunning()
  }

  destroy() {
    cancelAnimationFrame(this.raf)
    this.detachPointerTracking()
    document.removeEventListener('visibilitychange', this.onVisibilityChange)
    this.motionQuery?.removeEventListener('change', this.onMotionPreferenceChange)
    this.intersectionObserver?.disconnect()
  }

  private changeState(state: SharkieState, transitionMs = this.defaultTransitionMs) {
    this.transitionFrom = this.currentFrame
    this.transitionElapsed = 0
    this.transitionDuration = Math.max(0, transitionMs) / 1000
    this.state = state
    this.stateElapsed = 0
  }

  private attachPointerTracking() {
    if (this.tracking === 'viewport') {
      window.addEventListener('pointermove', this.onViewportPointerMove, { passive: true })
      window.addEventListener('blur', this.onPointerGone)
    } else if (this.tracking === 'self') {
      this.element.addEventListener('pointermove', this.onSelfPointerMove, { passive: true })
      this.element.addEventListener('pointerleave', this.onPointerGone)
    }
  }

  private detachPointerTracking() {
    window.removeEventListener('pointermove', this.onViewportPointerMove)
    window.removeEventListener('blur', this.onPointerGone)
    this.element.removeEventListener('pointermove', this.onSelfPointerMove)
    this.element.removeEventListener('pointerleave', this.onPointerGone)
  }

  private onViewportPointerMove = (event: PointerEvent) => {
    const rect = this.element.getBoundingClientRect()
    if (!rect.width || !rect.height) return
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    const xScale = Math.max(rect.width * 1.35, window.innerWidth * 0.32)
    const yScale = Math.max(rect.height * 1.45, window.innerHeight * 0.34)
    this.lookTarget = {
      x: clamp((event.clientX - cx) / xScale, -1, 1),
      y: clamp((event.clientY - cy) / yScale, -1, 1),
      mix: 0.94
    }
  }

  private onSelfPointerMove = (event: PointerEvent) => {
    const rect = this.element.getBoundingClientRect()
    if (!rect.width || !rect.height) return
    this.lookTarget = {
      x: ((event.clientX - rect.left) / rect.width) * 2 - 1,
      y: ((event.clientY - rect.top) / rect.height) * 2 - 1,
      mix: 0.9
    }
  }

  private onPointerGone = () => { this.lookTarget = null }

  private onVisibilityChange = () => {
    this.pageVisible = !document.hidden
    this.syncRunning()
  }

  private onMotionPreferenceChange = (event: MediaQueryListEvent) => {
    if (!this.reducedMotionExplicit) this.reducedMotion = event.matches
  }

  private shouldRun() {
    return !this.manualPaused && this.pageVisible && (!this.autoPause || this.inViewport)
  }

  private syncRunning() {
    if (!this.shouldRun()) {
      cancelAnimationFrame(this.raf)
      this.raf = 0
      return
    }
    if (!this.raf) {
      this.lastNow = performance.now()
      this.raf = requestAnimationFrame(this.tick)
    }
  }

  private tick = (now: number) => {
    this.raf = 0
    if (!this.shouldRun()) return

    const dt = clamp((now - this.lastNow) / 1000, 0, 0.05)
    this.lastNow = now
    this.elapsed += dt
    this.stateElapsed += dt

    const target = this.lookTarget ?? { x: 0, y: 0, mix: 0 }
    const entering = (target.mix ?? 0) > this.smoothLook.mix
    const alpha = 1 - Math.exp(-dt * (entering ? 10.5 : 4.2))
    this.smoothLook.x += (target.x - this.smoothLook.x) * alpha
    this.smoothLook.y += (target.y - this.smoothLook.y) * alpha
    this.smoothLook.mix += ((target.mix ?? 0) - this.smoothLook.mix) * alpha

    const targetFrame = sampleSharkie(this.elapsed, {
      state: this.state,
      stateTime: this.stateElapsed,
      look: this.smoothLook,
      reducedMotion: this.reducedMotion
    })

    let frame = targetFrame
    if (this.transitionFrom && this.transitionDuration > 0) {
      this.transitionElapsed += dt
      const p = smooth(this.transitionElapsed / this.transitionDuration)
      frame = blendSharkieFrames(this.transitionFrom, targetFrame, p)
      if (p >= 1) this.transitionFrom = null
    } else {
      this.transitionFrom = null
    }

    this.currentFrame = frame
    this.render(frame)

    if (this.actionReturnTo && this.stateElapsed >= this.actionDuration) {
      const returnTo = this.actionReturnTo
      this.actionReturnTo = null
      this.changeState(returnTo, this.actionTransitionMs)
    }

    this.raf = requestAnimationFrame(this.tick)
  }

  private render(frame: SharkieFrame) {
    setPath(this.body, frame.bodyPath)
    setPath(this.clipBody, frame.bodyPath)
    this.body.setAttribute('opacity', String(frame.opacity))
    this.faceClipGroup.setAttribute('opacity', String(frame.opacity))

    const b = frame.body
    const c = Math.cos(b.rot)
    const s = Math.sin(b.rot)
    const matrix = [b.sx * c, b.sy * s, -b.sx * s, b.sy * c, b.cx * 100, b.cy * 100]
    this.faceGroup.setAttribute('transform', `matrix(${matrix.map(r3).join(' ')})`)

    this.renderEye(this.leftEye, frame.eyeLeft)
    this.renderEye(this.rightEye, frame.eyeRight)

    const m = frame.mouth
    const leftX = m.x - m.width / 2
    const rightX = m.x + m.width / 2
    const leftY = m.y
    const rightY = m.y + m.skew
    setPath(this.smile, `M${r3(leftX)} ${r3(leftY)} C${r3(m.x - m.width * 0.28)} ${r3(m.y + m.depth)} ${r3(m.x + m.width * 0.2)} ${r3(m.y + m.depth + 4)} ${r3(rightX)} ${r3(rightY)}`)
    this.smile.setAttribute('stroke-width', String(m.stroke))
    const smileOpacity = 1 - smooth(clamp(m.open * 1.28))
    this.smile.setAttribute('opacity', String(smileOpacity))

    const fangOpacity = smileOpacity * m.fang
    const fangTop = m.y + m.depth * 0.62
    const fangH = 12 * m.fang
    const lx = m.x - m.width * 0.15
    const rx = m.x + m.width * 0.18
    setPath(this.fangLeft, `M${r3(lx - 5.5)} ${r3(fangTop - 1)} L${r3(lx + 5.2)} ${r3(fangTop)} L${r3(lx)} ${r3(fangTop + fangH)} Z`)
    setPath(this.fangRight, `M${r3(rx - 5.2)} ${r3(fangTop + 1)} L${r3(rx + 5.5)} ${r3(fangTop)} L${r3(rx + 0.6)} ${r3(fangTop + fangH * 0.92)} Z`)
    this.fangLeft.setAttribute('opacity', String(fangOpacity))
    this.fangRight.setAttribute('opacity', String(fangOpacity))

    this.mouthOpen.setAttribute('cx', String(m.x))
    this.mouthOpen.setAttribute('cy', String(m.y + 11))
    this.mouthOpen.setAttribute('rx', String(m.openWidth / 2))
    this.mouthOpen.setAttribute('ry', String(m.openHeight / 2))
    this.mouthOpen.setAttribute('opacity', String(m.open))

    const toothY = m.y + 1
    setPath(this.openToothLeft, `M${r3(m.x - 13)} ${r3(toothY)} L${r3(m.x - 3)} ${r3(toothY)} L${r3(m.x - 7.5)} ${r3(toothY + 9)} Z`)
    setPath(this.openToothRight, `M${r3(m.x + 3)} ${r3(toothY)} L${r3(m.x + 13)} ${r3(toothY)} L${r3(m.x + 8)} ${r3(toothY + 8.5)} Z`)
    const teethOpacity = m.open * m.teeth
    this.openToothLeft.setAttribute('opacity', String(teethOpacity))
    this.openToothRight.setAttribute('opacity', String(teethOpacity))

    const flare = frame.gillFlare
    setPath(this.gill1, `M61 ${r3(6 - flare * 0.25)} C${r3(69 + flare)} 13 ${r3(75 + flare)} 27 69 36`)
    setPath(this.gill2, `M75 ${r3(-1 - flare * 0.3)} C${r3(86 + flare)} 8 ${r3(91 + flare)} 23 84 31`)
    this.gill1.setAttribute('opacity', String(frame.gillOpacity))
    this.gill2.setAttribute('opacity', String(frame.gillOpacity))
  }

  private renderEye(el: SVGEllipseElement, eye: SharkieFrame['eyeLeft']) {
    el.setAttribute('cx', String(eye.x))
    el.setAttribute('cy', String(eye.y))
    el.setAttribute('rx', String(eye.rx))
    el.setAttribute('ry', String(eye.ry))
    el.setAttribute('transform', `rotate(${r3(eye.rotation)} ${r3(eye.x)} ${r3(eye.y)})`)
  }
}
