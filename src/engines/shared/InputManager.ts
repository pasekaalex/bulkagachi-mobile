export interface SwipeResult {
  direction: 'left' | 'right' | 'up' | 'down' | null
  distance: number
}

export class InputManager {
  private keys: Set<string> = new Set()
  private mouseX = 0
  private mouseY = 0
  private mouseDown = false
  private touchStartX = 0
  private touchStartY = 0
  private lastSwipe: SwipeResult = { direction: null, distance: 0 }
  private tapped = false
  private element: HTMLElement
  private isMobile: boolean

  private boundKeyDown: (e: KeyboardEvent) => void
  private boundKeyUp: (e: KeyboardEvent) => void
  private boundMouseMove: (e: MouseEvent) => void
  private boundMouseDown: (e: MouseEvent) => void
  private boundMouseUp: (e: MouseEvent) => void
  private boundTouchStart: (e: TouchEvent) => void
  private boundTouchEnd: (e: TouchEvent) => void
  private boundTouchMove: (e: TouchEvent) => void

  constructor(element: HTMLElement) {
    this.element = element
    this.isMobile = window.innerWidth <= 768

    this.boundKeyDown = this.handleKeyDown.bind(this)
    this.boundKeyUp = this.handleKeyUp.bind(this)
    this.boundMouseMove = this.handleMouseMove.bind(this)
    this.boundMouseDown = this.handleMouseDown.bind(this)
    this.boundMouseUp = this.handleMouseUp.bind(this)
    this.boundTouchStart = this.handleTouchStart.bind(this)
    this.boundTouchEnd = this.handleTouchEnd.bind(this)
    this.boundTouchMove = this.handleTouchMove.bind(this)

    window.addEventListener('keydown', this.boundKeyDown)
    window.addEventListener('keyup', this.boundKeyUp)
    element.addEventListener('mousemove', this.boundMouseMove)
    element.addEventListener('mousedown', this.boundMouseDown)
    element.addEventListener('mouseup', this.boundMouseUp)
    element.addEventListener('touchstart', this.boundTouchStart, { passive: false })
    element.addEventListener('touchend', this.boundTouchEnd, { passive: false })
    element.addEventListener('touchmove', this.boundTouchMove, { passive: false })
  }

  private handleKeyDown(e: KeyboardEvent): void {
    this.keys.add(e.code)
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
      e.preventDefault()
    }
  }

  private handleKeyUp(e: KeyboardEvent): void {
    this.keys.delete(e.code)
  }

  private handleMouseMove(e: MouseEvent): void {
    const rect = this.element.getBoundingClientRect()
    this.mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1
    this.mouseY = ((e.clientY - rect.top) / rect.height) * 2 - 1
  }

  private handleMouseDown(): void {
    this.mouseDown = true
    this.tapped = true
  }

  private handleMouseUp(): void {
    this.mouseDown = false
  }

  private handleTouchStart(e: TouchEvent): void {
    const touch = e.touches[0]
    this.touchStartX = touch.clientX
    this.touchStartY = touch.clientY
    this.tapped = true
  }

  private handleTouchEnd(e: TouchEvent): void {
    const touch = e.changedTouches[0]
    const dx = touch.clientX - this.touchStartX
    const dy = touch.clientY - this.touchStartY
    const distance = Math.sqrt(dx * dx + dy * dy)

    if (distance > 30) {
      if (Math.abs(dx) > Math.abs(dy)) {
        this.lastSwipe = { direction: dx > 0 ? 'right' : 'left', distance }
      } else {
        this.lastSwipe = { direction: dy > 0 ? 'down' : 'up', distance }
      }
    }
    e.preventDefault()
  }

  private handleTouchMove(e: TouchEvent): void {
    const touch = e.touches[0]
    const rect = this.element.getBoundingClientRect()
    this.mouseX = ((touch.clientX - rect.left) / rect.width) * 2 - 1
    this.mouseY = ((touch.clientY - rect.top) / rect.height) * 2 - 1
  }

  isKeyDown(code: string): boolean {
    return this.keys.has(code)
  }

  isAnyKeyDown(...codes: string[]): boolean {
    return codes.some((c) => this.keys.has(c))
  }

  getMousePosition(): { x: number; y: number } {
    return { x: this.mouseX, y: this.mouseY }
  }

  isMouseDown(): boolean {
    return this.mouseDown
  }

  consumeTap(): boolean {
    if (this.tapped) {
      this.tapped = false
      return true
    }
    return false
  }

  consumeSwipe(): SwipeResult {
    const result = { ...this.lastSwipe }
    this.lastSwipe = { direction: null, distance: 0 }
    return result
  }

  getIsMobile(): boolean {
    return this.isMobile
  }

  dispose(): void {
    window.removeEventListener('keydown', this.boundKeyDown)
    window.removeEventListener('keyup', this.boundKeyUp)
    this.element.removeEventListener('mousemove', this.boundMouseMove)
    this.element.removeEventListener('mousedown', this.boundMouseDown)
    this.element.removeEventListener('mouseup', this.boundMouseUp)
    this.element.removeEventListener('touchstart', this.boundTouchStart)
    this.element.removeEventListener('touchend', this.boundTouchEnd)
    this.element.removeEventListener('touchmove', this.boundTouchMove)
  }
}
