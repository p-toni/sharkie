import { Sharkie, type SharkieState } from './index'

const mount = document.querySelector<HTMLElement>('#sharkie')
if (!mount) throw new Error('Missing #sharkie mount')

const sharkie = new Sharkie(mount, { interactive: true })

document.querySelectorAll<HTMLButtonElement>('[data-state]').forEach((button) => {
  button.addEventListener('click', () => sharkie.setState(button.dataset.state as SharkieState))
})
