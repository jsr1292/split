/**
 * Lightweight canvas-based confetti system
 * No external dependencies — pure canvas API only
 */

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  rotationSpeed: number;
  width: number;
  height: number;
  color: string;
  alpha: number;
  gravity: number;
}

const COLORS = ['#c9a84c', '#e8c96a', '#00e5a0', '#ffffff', '#72D2A2', '#FFD700'];

function randomBetween(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function createParticle(cx: number, cy: number): Particle {
  const angle = randomBetween(-Math.PI * 0.9, -Math.PI * 0.1); // upward spread
  const speed = randomBetween(6, 14);
  return {
    x: cx,
    y: cy,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    rotation: randomBetween(0, Math.PI * 2),
    rotationSpeed: randomBetween(-0.15, 0.15),
    width: randomBetween(6, 12),
    height: randomBetween(4, 8),
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    alpha: 1,
    gravity: 0.35,
  };
}

export function triggerConfetti(): void {
  const canvas = document.createElement('canvas');
  canvas.style.cssText = `
    position: fixed;
    inset: 0;
    z-index: 9999;
    pointer-events: none;
    width: 100vw;
    height: 100vh;
  `;
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d')!;
  const cx = canvas.width / 2;
  const cy = canvas.height * 0.65; // center-bottom area
  const count = Math.floor(randomBetween(40, 60));

  const particles: Particle[] = Array.from({ length: count }, () => createParticle(cx, cy));

  let animId: number;
  const startTime = performance.now();
  const DURATION = 1800; // ms

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const elapsed = performance.now() - startTime;
    const progress = Math.min(elapsed / DURATION, 1);

    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.gravity;
      p.vx *= 0.99; // air resistance
      p.rotation += p.rotationSpeed;
      p.alpha = Math.max(0, 1 - progress * 1.2);

      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.width / 2, -p.height / 2, p.width, p.height);
      ctx.restore();
    }

    if (progress < 1) {
      animId = requestAnimationFrame(draw);
    } else {
      cancelAnimationFrame(animId);
      canvas.remove();
    }
  }

  animId = requestAnimationFrame(draw);
}
