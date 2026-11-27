import { useEffect, useRef } from 'react'
import './GalaxyBackground.css'

// Colours: PETRONAS-style teal, violet, warm core, cool white, plus a little gold.
const TEAL = [0, 224, 194]
const VIOLET = [150, 120, 255]
const CORE = [255, 236, 210]
const WHITE = [233, 242, 255]
const GOLD = [255, 196, 120]

const ARM_COUNT = 3
const WINDING = 5.2 // how tightly the spiral arms wrap (radians from core to edge)
const INCLINATION = 0.42 // squash the disc so it looks tilted towards the viewer
const TILT = -0.38 // rotate the whole galaxy on screen (radians)
const ROTATION_SPEED = 0.022 // radians per second, kept slow on purpose

// Visibility: turn these up or down to make the dots stronger or softer.
const STAR_SIZE = 1 // multiply every galaxy star's size
const STAR_BRIGHTNESS = 1 // multiply every galaxy star's opacity
const WHITEN = 0.35 // 0 = pure teal/violet, 1 = pure white (whiter dots stand out more)

// Scatter settings
const SCATTER_DISTANCE = 0.9 // fully scattered after scrolling 0.9 of a screen height
const SCATTER_STAGGER = 0.35 // stars leave at slightly different times
const SCATTER_SMOOTHING = 0.06 // lower = softer, slower follow of the scroll
const CONSTELLATION_EVERY = 12 // every 12th star can join a constellation line
const CONSTELLATION_MAX_LENGTH = 0.085 // lines only form between stars closer than this (share of screen width)

// Movement after the galaxy has scattered
const DRIFT_SPEED = 0.012 // how fast scattered stars float (screen widths per second, at most)
const WOBBLE = 0.012 // how much each star sways around its path (share of the screen)
const SCROLL_PARALLAX = 0.25 // stars rise as you keep scrolling; near stars rise faster
const POINTER_PUSH = 40 // stars move out of the way of the mouse (pixels, 0 = off)
const POINTER_RADIUS = 140 // how close the mouse has to be to push stars (pixels)

function seededRandom(seed) {
  return () => {
    seed = (Math.imul(1664525, seed) + 1013904223) >>> 0
    return seed / 4294967296
  }
}

// Normal distribution, so stars cluster around the arm centre lines.
function gaussian(random) {
  const u = 1 - random()
  const v = random()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

function mixRgb(a, b, t) {
  return a.map((value, i) => Math.round(value + (b[i] - value) * t))
}

function mix(a, b, t) {
  const c = mixRgb(a, b, t)
  return `rgb(${c[0]}, ${c[1]}, ${c[2]})`
}

const clamp01 = (value) => Math.min(Math.max(value, 0), 1)
const easeInOutCubic = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2)

// Each star has two homes: a place in the galaxy (radius and angle)
// and a place in the scattered starfield (scatterX and scatterY, 0 to 1 of the screen).
function makeGalaxy(count, random) {
  return Array.from({ length: count }, () => {
    const kind = random()
    let radius
    let angle
    let color
    let alpha

    if (kind < 0.14) {
      // Bright core
      radius = Math.abs(gaussian(random)) * 0.07
      angle = random() * Math.PI * 2
      color = mix(CORE, WHITE, random() * 0.5)
      alpha = 0.75 + random() * 0.25
    } else if (kind < 0.32) {
      // Disc between the arms
      radius = Math.pow(random(), 0.8)
      angle = random() * Math.PI * 2
      color = mix(mixRgb(WHITE, VIOLET, random() * 0.5), WHITE, WHITEN)
      alpha = 0.35 + random() * 0.35
    } else {
      // Spiral arms
      const arm = Math.floor(random() * ARM_COUNT)
      radius = 0.08 + Math.pow(random(), 1.25) * 0.92
      angle =
        (arm * Math.PI * 2) / ARM_COUNT +
        radius * WINDING +
        gaussian(random) * 0.24 * (1 - radius * 0.4)
      radius = Math.abs(radius + gaussian(random) * 0.025)
      color =
        random() < 0.22
          ? mix(WHITE, TEAL, 0.25)
          : mix(mixRgb(TEAL, VIOLET, Math.min(radius * 1.2, 1)), WHITE, WHITEN)
      alpha = 0.6 + random() * 0.4
    }

    // A few big, glowing "feature" stars in gold or teal, like the reference.
    const feature = random() < 0.045
    if (feature) color = random() < 0.7 ? mix(GOLD, WHITE, 0.25) : mix(TEAL, WHITE, 0.35)

    // Direction and speed each star floats in once scattered.
    const driftAngle = random() * Math.PI * 2
    const driftSpeed = 0.3 + random() * 0.7

    return {
      driftX: Math.cos(driftAngle) * driftSpeed,
      driftY: Math.sin(driftAngle) * driftSpeed,
      depth: 0.4 + random(), // nearer stars (bigger depth) move more with scroll
      wobbleSpeed: 0.15 + random() * 0.25,
      radius,
      angle,
      color,
      alpha: Math.min(alpha * STAR_BRIGHTNESS, 1),
      size: (feature ? 3 + random() * 1.5 : 1.1 + Math.pow(random(), 2.2) * 2.2) * STAR_SIZE,
      spin: 1 + 0.6 * (1 - radius), // inner stars orbit a little faster
      phase: random() * Math.PI * 2,
      scatterX: -0.02 + random() * 1.04,
      scatterY: -0.02 + random() * 1.04,
      delay: random() * SCATTER_STAGGER,
    }
  })
}

// Background stars spread across the whole screen.
function makeStarField(count, random) {
  const colors = [mix(WHITE, WHITE, 0), mix(TEAL, WHITE, 0.5), mix(VIOLET, WHITE, 0.45)]
  return Array.from({ length: count }, (_, i) => ({
    x: random(),
    y: random(),
    size: random() < 0.07 ? 2 : 0.8 + random() * 0.9,
    alpha: 0.3 + random() * 0.6,
    depth: 0.3 + random(), // nearer stars move more with scroll and mouse
    speed: 0.5 + random() * 1.8,
    phase: random() * Math.PI * 2,
    color: colors[i % 9 === 0 ? 1 : i % 13 === 0 ? 2 : 0],
  }))
}

// Keep a value inside -0.05 to 1.05, so a star leaving one edge comes back on the other.
const wrap = (value) => ((((value + 0.05) % 1.1) + 1.1) % 1.1) - 0.05

// Fade stars out near the screen edge, so the wrap-around is never visible.
const edgeFade = (x, y) => clamp01((Math.min(x, 1 - x, y, 1 - y) + 0.05) / 0.08)

// A soft white dot, drawn once and reused as the halo for bright stars.
function makeGlowSprite() {
  const sprite = document.createElement('canvas')
  sprite.width = sprite.height = 32
  const g = sprite.getContext('2d')
  const gradient = g.createRadialGradient(16, 16, 0, 16, 16, 16)
  gradient.addColorStop(0, 'rgba(255, 255, 255, 0.9)')
  gradient.addColorStop(0.35, 'rgba(255, 255, 255, 0.25)')
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0)')
  g.fillStyle = gradient
  g.fillRect(0, 0, 32, 32)
  return sprite
}

export default function GalaxyBackground() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!ctx) return

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const random = seededRandom(2026)
    const isSmallScreen = window.innerWidth < 680
    const galaxy = makeGalaxy(isSmallScreen ? 1000 : 2000, random)
    const field = makeStarField(isSmallScreen ? 220 : 480, random)
    const glow = makeGlowSprite()
    const positions = new Float32Array(galaxy.length * 2) // current x, y of every galaxy star
    const fades = new Float32Array(galaxy.length) // current edge fade of every galaxy star
    const lineNodes = []
    for (let i = 0; i < galaxy.length; i += CONSTELLATION_EVERY) lineNodes.push(i)

    let width = 0
    let height = 0
    let frameId = 0
    let progress = 0 // 0 = galaxy, 1 = fully scattered
    let shootingStar = null
    let nextShootingStar = 3
    // x, y: smoothed -1 to 1 for parallax. px, py: mouse position in pixels for pushing stars.
    const pointer = { x: 0, y: 0, targetX: 0, targetY: 0, px: -9999, py: -9999 }

    function drawShootingStar(t) {
      if (!shootingStar && t > nextShootingStar) {
        shootingStar = {
          x: width * (0.35 + random() * 0.6),
          y: height * random() * 0.35,
          start: t,
        }
      }
      if (!shootingStar) return

      const life = 1.1
      const age = t - shootingStar.start
      if (age > life) {
        shootingStar = null
        nextShootingStar = t + 5 + random() * 7
        return
      }

      const vx = -560
      const vy = 250
      const headX = shootingStar.x + vx * age
      const headY = shootingStar.y + vy * age
      const tailX = headX - vx * 0.16
      const tailY = headY - vy * 0.16
      const trail = ctx.createLinearGradient(headX, headY, tailX, tailY)
      trail.addColorStop(0, 'rgba(220, 255, 250, 0.9)')
      trail.addColorStop(1, 'rgba(0, 224, 194, 0)')

      ctx.globalAlpha = Math.sin((Math.PI * age) / life)
      ctx.strokeStyle = trail
      ctx.lineWidth = 1.4
      ctx.beginPath()
      ctx.moveTo(headX, headY)
      ctx.lineTo(tailX, tailY)
      ctx.stroke()
    }

    function draw(t) {
      const scroll = reduceMotion ? 0 : window.scrollY

      // Follow the scroll smoothly instead of jumping.
      const targetProgress = reduceMotion ? 0 : clamp01(scroll / (height * SCATTER_DISTANCE))
      progress += (targetProgress - progress) * SCATTER_SMOOTHING
      if (Math.abs(targetProgress - progress) < 0.0005) progress = targetProgress

      pointer.x += (pointer.targetX - pointer.x) * 0.04
      pointer.y += (pointer.targetY - pointer.y) * 0.04

      ctx.globalCompositeOperation = 'source-over'
      ctx.globalAlpha = 1
      ctx.clearRect(0, 0, width, height)
      ctx.globalCompositeOperation = 'lighter' // overlapping stars add up into glow

      // 1. Background stars: twinkle, and drift up slowly as the page scrolls.
      for (const star of field) {
        const x = star.x * width - pointer.x * star.depth * 10
        const rawY = star.y * height - scroll * star.depth * 0.08 - pointer.y * star.depth * 8
        const y = ((rawY % height) + height) % height
        ctx.globalAlpha = star.alpha * (0.6 + 0.4 * Math.sin(t * star.speed + star.phase))
        ctx.fillStyle = star.color
        ctx.fillRect(x, y, star.size, star.size)
      }

      // 2. Galaxy position: right of your name on desktop, top centre on phones.
      //    As it scatters, the centre glides towards the middle of the screen.
      const mobile = width < 680
      const eased = easeInOutCubic(progress)
      const R = Math.min(width, height) * (mobile ? 0.72 : 0.6)
      const homeX = width * (mobile ? 0.5 : 0.7)
      const homeY = height * (mobile ? 0.3 : 0.42)
      const cx = homeX + (width * 0.5 - homeX) * eased + pointer.x * 18
      const cy = homeY + (height * 0.5 - homeY) * eased + pointer.y * 12
      const rotation = t * ROTATION_SPEED + eased * 1.4 // extra swirl while breaking apart
      const cosT = Math.cos(TILT)
      const sinT = Math.sin(TILT)

      // 3. Core glow: bright in the galaxy, a soft haze once scattered.
      ctx.save()
      ctx.translate(cx, cy)
      ctx.rotate(TILT * (1 - eased))
      ctx.scale(1 + eased * 0.6, INCLINATION * 1.4 + eased * (1.6 - INCLINATION * 1.4))
      const core = ctx.createRadialGradient(0, 0, 0, 0, 0, R * 0.42)
      core.addColorStop(0, 'rgba(255, 240, 220, 0.8)')
      core.addColorStop(0.14, 'rgba(255, 225, 190, 0.35)')
      core.addColorStop(0.3, 'rgba(120, 230, 215, 0.16)')
      core.addColorStop(0.6, 'rgba(110, 80, 210, 0.07)')
      core.addColorStop(1, 'rgba(0, 0, 0, 0)')
      ctx.globalAlpha = 1 - eased * 0.65
      ctx.fillStyle = core
      ctx.beginPath()
      ctx.arc(0, 0, R * 0.42, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()

      // 4. Galaxy stars: move from their spiral position to their scattered position.
      galaxy.forEach((star, i) => {
        const angle = star.angle + rotation * star.spin
        const r = star.radius * R
        const gx = Math.cos(angle) * r
        const gy = Math.sin(angle) * r * INCLINATION
        const galaxyX = cx + gx * cosT - gy * sinT
        const galaxyY = cy + gx * sinT + gy * cosT

        // Scattered home keeps moving: a slow drift, a gentle sway, and a rise with scroll.
        const sway = t * star.wobbleSpeed + star.phase
        const fx = wrap(
          star.scatterX + star.driftX * DRIFT_SPEED * t + Math.sin(sway) * WOBBLE,
        )
        const fy = wrap(
          star.scatterY +
            star.driftY * DRIFT_SPEED * t * (width / height) +
            Math.cos(sway * 1.3) * WOBBLE -
            (scroll / height) * SCROLL_PARALLAX * star.depth,
        )
        let scatterX = fx * width - pointer.x * 8 * star.depth
        let scatterY = fy * height - pointer.y * 6 * star.depth

        // Push stars gently away from the mouse.
        if (POINTER_PUSH > 0) {
          const dx = scatterX - pointer.px
          const dy = scatterY - pointer.py
          const d = Math.hypot(dx, dy)
          if (d < POINTER_RADIUS && d > 0.01) {
            const push = (1 - d / POINTER_RADIUS) ** 2 * POINTER_PUSH
            scatterX += (dx / d) * push
            scatterY += (dy / d) * push
          }
        }

        const local = easeInOutCubic(clamp01((progress - star.delay) / (1 - SCATTER_STAGGER)))
        const x = galaxyX + (scatterX - galaxyX) * local
        const y = galaxyY + (scatterY - galaxyY) * local
        positions[i * 2] = x
        positions[i * 2 + 1] = y
        const fade = 1 + (edgeFade(fx, fy) - 1) * local
        fades[i] = fade

        // Gentle twinkle that never drops too low, so dots stay visible.
        const twinkle = 0.85 - local * 0.1 + (0.15 + local * 0.1) * Math.sin(t * 1.3 + star.phase)
        const alpha = star.alpha * twinkle * fade

        // Soft halo around the bigger stars makes them glow instead of looking like flat pixels.
        if (star.size > 2) {
          ctx.globalAlpha = alpha * 0.6
          const s = star.size * 6
          ctx.drawImage(glow, x - s / 2, y - s / 2, s, s)
        }
        ctx.globalAlpha = alpha
        ctx.fillStyle = star.color
        ctx.beginPath()
        ctx.arc(x, y, star.size / 2, 0, Math.PI * 2) // round dots
        ctx.fill()
      })

      // 5. Constellation lines: as stars float, lines join stars that come close
      //    and fade away as they drift apart. Closer pairs get stronger lines.
      const lineAlpha = clamp01((progress - 0.6) / 0.4)
      if (lineAlpha > 0) {
        const maxLength = width * CONSTELLATION_MAX_LENGTH
        ctx.globalCompositeOperation = 'source-over'
        ctx.strokeStyle = 'rgb(170, 225, 230)'
        ctx.lineWidth = 0.8
        for (let m = 0; m < lineNodes.length; m++) {
          const a = lineNodes[m]
          const ax = positions[a * 2]
          const ay = positions[a * 2 + 1]
          for (let n = m + 1; n < lineNodes.length; n++) {
            const b = lineNodes[n]
            const dx = positions[b * 2] - ax
            const dy = positions[b * 2 + 1] - ay
            if (Math.abs(dx) > maxLength || Math.abs(dy) > maxLength) continue
            const d = Math.hypot(dx, dy)
            if (d >= maxLength) continue
            ctx.globalAlpha = lineAlpha * 0.35 * (1 - d / maxLength) * Math.min(fades[a], fades[b])
            ctx.beginPath()
            ctx.moveTo(ax, ay)
            ctx.lineTo(ax + dx, ay + dy)
            ctx.stroke()
          }
        }
        ctx.globalCompositeOperation = 'lighter'
      }

      // 6. An occasional shooting star.
      if (!reduceMotion) drawShootingStar(t)
    }

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      width = window.innerWidth
      height = window.innerHeight
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      if (reduceMotion) draw(0) // static galaxy, no animation loop
    }

    function handlePointer(event) {
      pointer.targetX = (event.clientX / width - 0.5) * 2
      pointer.targetY = (event.clientY / height - 0.5) * 2
      pointer.px = event.clientX
      pointer.py = event.clientY
    }

    function handlePointerLeave() {
      pointer.px = -9999
      pointer.py = -9999
    }

    resize()
    window.addEventListener('resize', resize)

    if (!reduceMotion) {
      window.addEventListener('pointermove', handlePointer)
      document.documentElement.addEventListener('mouseleave', handlePointerLeave)
      const start = performance.now()
      const loop = (now) => {
        draw((now - start) / 1000)
        frameId = requestAnimationFrame(loop)
      }
      frameId = requestAnimationFrame(loop)
    }

    return () => {
      cancelAnimationFrame(frameId)
      window.removeEventListener('resize', resize)
      window.removeEventListener('pointermove', handlePointer)
      document.documentElement.removeEventListener('mouseleave', handlePointerLeave)
    }
  }, [])

  return (
    <div className="galaxy-background" aria-hidden="true">
      <canvas ref={canvasRef} className="galaxy-canvas" />
      <div className="galaxy-shade" />
    </div>
  )
}