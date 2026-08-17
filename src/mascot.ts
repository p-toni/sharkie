import { sampleSharkie, type LookTarget, type SharkieState } from './engine'

export interface SharkieOptions {
  state?: SharkieState
  className?: string
  interactive?: boolean
  reducedMotion?: boolean
}

const NS = 'http://www.w3.org/2000/svg'

function svgEl<K extends keyof SVGElementTagNameMap>(name: K): SVGElementTagNameMap[K] {
  return document.createElementNS(NS, name)
}

export class Sharkie {
  readonly element: SVGSVGElement
  private body = svgEl('path')
  private leftEye = svgEl('ellipse')
  private rightEye = svgEl('ellipse')
  private mouthPath = svgEl('path')
  private mouthOpen = svgEl('ellipse')
  private toothLeft = svgEl('path')
  private toothRight = svgEl('path')
  private gill1 = svgEl('path')
  private gill2 = svgEl('path')
  private raf = 0
  private startedAt = performance.now()
  private stateStartedAt = this.startedAt
  private state: SharkieState
  private look: LookTarget | null = null
  private interactive: boolean
  private reducedMotion: boolean

  constructor(container: HTMLElement, options: SharkieOptions = {}) {
    this.state = options.state ?? 'idle'
    this.interactive = options.interactive ?? true
    this.reducedMotion = options.reducedMotion ?? matchMedia('(prefers-reduced-motion: reduce)').matches

    const svg = svgEl('svg')
    svg.setAttribute('viewBox', '-145 -130 290 260')
    svg.setAttribute('role', 'img')
    svg.setAttribute('aria-label', 'Sharkie mascot')
    svg.style.width = '100%'
    svg.style.height = '100%'
    svg.style.overflow = 'visible'
    if (options.className) svg.setAttribute('class', options.className)
    this.element = svg

    this.body.setAttribute('fill', '#fff')
    this.leftEye.setAttribute('fill', '#000')
    this.rightEye.setAttribute('fill', '#000')
    this.mouthPath.setAttribute('fill', 'none')
    this.mouthPath.setAttribute('stroke', '#000')
    this.mouthPath.setAttribute('stroke-width', '9')
    this.mouthPath.setAttribute('stroke-linecap', 'round')
    this.mouthOpen.setAttribute('fill', '#000')
    for (const tooth of [this.toothLeft, this.toothRight]) tooth.setAttribute('fill', '#fff')
    for (const gill of [this.gill1, this.gill2]) {
      gill.setAttribute('fill', 'none')
      gill.setAttribute('stroke', '#000')
      gill.setAttribute('stroke-width', '7')
      gill.setAttribute('stroke-linecap', 'round')
    }

    svg.append(this.body, this.leftEye, this.rightEye, this.mouthPath, this.mouthOpen, this.toothLeft, this.toothRight, this.gill1, this.gill2)
    container.replaceChildren(svg)

    if (this.interactive) {
      svg.addEventListener('pointermove', this.onPointerMove)
      svg.addEventListener('pointerleave', this.onPointerLeave)
    }
    this.tick()
  }

  setState(state: SharkieState) {
    this.state = state
    this.stateStartedAt = performance.now()
  }

  setLook(look: LookTarget | null) {
    if (look && (!Number.isFinite(look.x) || !Number.isFinite(look.y))) return
    this.look = look
  }

  destroy() {
    cancelAnimationFrame(this.raf)
    this.element.removeEventListener('pointermove', this.onPointerMove)
    this.element.removeEventListener('pointerleave', this.onPointerLeave)
  }

  private onPointerMove = (event: PointerEvent) => {
    const rect = this.element.getBoundingClientRect()
    if (!rect.width || !rect.height) return
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    const y = ((event.clientY - rect.top) / rect.height) * 2 - 1
    this.setLook({ x, y, mix: 0.88 })
  }

  private onPointerLeave = () => this.setLook(null)

  private tick = () => {
    const now = performance.now()
    const t = (now - this.startedAt) / 1000
    const stateTime = (now - this.stateStartedAt) / 1000
    const frame = sampleSharkie(t, { state: this.state, stateTime, look: this.look, reducedMotion: this.reducedMotion })

    this.body.setAttribute('d', frame.bodyPath)
    this.body.setAttribute('opacity', String(frame.opacity))
    this.leftEye.setAttribute('cx', String(frame.eyeLeft.x)); this.leftEye.setAttribute('cy', String(frame.eyeLeft.y)); this.leftEye.setAttribute('rx', String(frame.eyeLeft.rx)); this.leftEye.setAttribute('ry', String(frame.eyeLeft.ry))
    this.rightEye.setAttribute('cx', String(frame.eyeRight.x)); this.rightEye.setAttribute('cy', String(frame.eyeRight.y)); this.rightEye.setAttribute('rx', String(frame.eyeRight.rx)); this.rightEye.setAttribute('ry', String(frame.eyeRight.ry))

    if (frame.mouth.kind === 'open') {
      this.mouthPath.setAttribute('display', 'none')
      this.mouthOpen.removeAttribute('display')
      this.mouthOpen.setAttribute('cx', String(frame.mouth.cx)); this.mouthOpen.setAttribute('cy', String(frame.mouth.cy)); this.mouthOpen.setAttribute('rx', String(frame.mouth.rx)); this.mouthOpen.setAttribute('ry', String(frame.mouth.ry))
    } else {
      this.mouthOpen.setAttribute('display', 'none')
      this.mouthPath.removeAttribute('display')
      this.mouthPath.setAttribute('d', frame.mouth.path ?? '')
    }

    const teethDisplay = frame.teeth ? '' : 'none'
    this.toothLeft.setAttribute('display', teethDisplay)
    this.toothRight.setAttribute('display', teethDisplay)
    this.toothLeft.setAttribute('d', 'M-19 12 L-10 12 L-14 24 Z')
    this.toothRight.setAttribute('d', 'M3 12 L12 12 L8 24 Z')

    const gx = frame.gillShift
    this.gill1.setAttribute('d', `M54 ${-2 + gx * 0.1} Q66 12 58 27`)
    this.gill2.setAttribute('d', `M72 ${-4 + gx * 0.1} Q84 11 76 25`)

    for (const feature of [this.leftEye, this.rightEye, this.mouthPath, this.mouthOpen, this.toothLeft, this.toothRight, this.gill1, this.gill2]) {
      feature.setAttribute('opacity', String(frame.opacity))
    }

    this.element.style.transform = `rotate(${frame.rotation}deg)`
    this.raf = requestAnimationFrame(this.tick)
  }
}
