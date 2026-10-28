/**
 * Lightweight, zero-dependency canvas confetti and floating emoji bursts
 * Designed for 60fps high performance in modern browsers.
 */

export const fireConfetti = () => {
  if (typeof window === 'undefined') return;

  const canvas = document.createElement('canvas');
  canvas.style.position = 'fixed';
  canvas.style.top = '0';
  canvas.style.left = '0';
  canvas.style.width = '100vw';
  canvas.style.height = '100vh';
  canvas.style.pointerEvents = 'none';
  canvas.style.zIndex = '9999';
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  ctx.scale(dpr, dpr);

  const colors = ['#38bdf8', '#a855f7', '#22c55e', '#f59e0b', '#ec4899', '#3b82f6', '#eab308'];
  const particles = [];
  const particleCount = 80;

  for (let i = 0; i < particleCount; i++) {
    particles.push({
      x: window.innerWidth * (0.35 + Math.random() * 0.3),
      y: window.innerHeight * 0.7,
      vx: (Math.random() - 0.5) * 16,
      vy: -Math.random() * 16 - 6,
      size: Math.random() * 8 + 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * 360,
      rSpeed: (Math.random() - 0.5) * 12,
      opacity: 1,
      gravity: 0.45
    });
  }

  let animationFrame;
  const render = () => {
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    let alive = 0;

    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.gravity;
      p.rotation += p.rSpeed;
      p.opacity -= 0.012;

      if (p.opacity > 0) {
        alive++;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.globalAlpha = Math.max(0, p.opacity);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        ctx.restore();
      }
    }

    if (alive > 0) {
      animationFrame = requestAnimationFrame(render);
    } else {
      cancelAnimationFrame(animationFrame);
      canvas.remove();
    }
  };

  render();
};

export const fireEmojiBurst = (emoji = '🎉') => {
  if (typeof window === 'undefined') return;

  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.bottom = '80px';
  container.style.right = '40px';
  container.style.pointerEvents = 'none';
  container.style.zIndex = '9999';
  document.body.appendChild(container);

  const count = 12;
  for (let i = 0; i < count; i++) {
    const el = document.createElement('div');
    el.innerText = emoji;
    el.style.position = 'absolute';
    el.style.fontSize = `${Math.floor(Math.random() * 16) + 24}px`;
    el.style.userSelect = 'none';
    el.style.transition = 'all 1.6s cubic-bezier(0.1, 0.8, 0.3, 1)';
    el.style.opacity = '1';
    el.style.transform = `translate(0, 0) scale(0.5)`;
    container.appendChild(el);

    const destX = (Math.random() - 0.5) * 200;
    const destY = -Math.random() * 260 - 80;
    const rot = (Math.random() - 0.5) * 60;

    setTimeout(() => {
      el.style.transform = `translate(${destX}px, ${destY}px) rotate(${rot}deg) scale(1.2)`;
      el.style.opacity = '0';
    }, 20);
  }

  setTimeout(() => {
    container.remove();
  }, 1800);
};
