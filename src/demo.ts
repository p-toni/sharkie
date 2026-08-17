import { Sharkie, type SharkieAction, type SharkieState } from './index'

const mount = document.querySelector<HTMLElement>('#sharkie')
if (!mount) throw new Error('Missing #sharkie mount')

const sharkie = new Sharkie(mount, {
  tracking: 'viewport',
  ariaLabel: 'Sharkie, an animated shark mascot'
})

let mood: SharkieState = 'idle'
const moodButtons = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-mood]'))

function selectMood(next: SharkieState) {
  mood = next
  sharkie.setState(next)
  for (const button of moodButtons) {
    const selected = button.dataset.mood === next
    button.classList.toggle('is-active', selected)
    button.setAttribute('aria-pressed', String(selected))
  }
}

for (const button of moodButtons) {
  button.addEventListener('click', () => selectMood(button.dataset.mood as SharkieState))
}

document.querySelectorAll<HTMLButtonElement>('[data-action]').forEach((button) => {
  button.addEventListener('click', () => {
    sharkie.play(button.dataset.action as SharkieAction, { returnTo: mood })
  })
})

mount.addEventListener('pointerdown', () => sharkie.play('chomp', { returnTo: mood }))

const pauseButton = document.querySelector<HTMLButtonElement>('[data-pause]')
let paused = false
pauseButton?.addEventListener('click', () => {
  paused = !paused
  if (paused) sharkie.pause()
  else sharkie.resume()
  pauseButton.textContent = paused ? 'resume' : 'pause'
  pauseButton.setAttribute('aria-pressed', String(paused))
})
