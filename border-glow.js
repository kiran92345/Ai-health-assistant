/* BorderGlow - vanilla JS port for edge-following glow effect */

(function() {
  const GRADIENT_POSITIONS = ['80% 55%', '69% 34%', '8% 6%', '41% 38%', '86% 85%', '82% 18%', '51% 4%'];
  const GRADIENT_KEYS = ['--gradient-one', '--gradient-two', '--gradient-three', '--gradient-four', '--gradient-five', '--gradient-six', '--gradient-seven'];
  const COLOR_MAP = [0, 1, 2, 0, 1, 2, 1];

  function parseHSL(hslStr) {
    if (!hslStr) return { h: 40, s: 80, l: 80 };
    const parts = hslStr.trim().split(/\s+/).map(Number);
    if (parts.length >= 3) return { h: parts[0], s: parts[1], l: parts[2] };
    return { h: 40, s: 80, l: 80 };
  }

  function buildGlowVars(glowColor, intensity) {
    const { h, s, l } = typeof glowColor === 'string' && glowColor.includes(' ')
      ? parseHSL(glowColor)
      : { h: 195, s: 80, l: 70 };
    const base = `${h}deg ${s}% ${l}%`;
    const opacities = [100, 60, 50, 40, 30, 20, 10];
    const keys = ['', '-60', '-50', '-40', '-30', '-20', '-10'];
    const vars = {};
    for (let i = 0; i < opacities.length; i++) {
      vars[`--glow-color${keys[i]}`] = `hsl(${base} / ${Math.min(opacities[i] * intensity, 100)}%)`;
    }
    return vars;
  }

  function buildGradientVars(colors) {
    const arr = Array.isArray(colors) ? colors : (colors || '#c084fc,#f472b6,#38bdf8').split(',').map(s => s.trim());
    const vars = {};
    for (let i = 0; i < 7; i++) {
      const c = arr[Math.min(COLOR_MAP[i], arr.length - 1)];
      vars[GRADIENT_KEYS[i]] = `radial-gradient(at ${GRADIENT_POSITIONS[i]}, ${c} 0px, transparent 50%)`;
    }
    vars['--gradient-base'] = `linear-gradient(${arr[0]} 0 100%)`;
    return vars;
  }

  function getCenterOfElement(el) {
    const rect = el.getBoundingClientRect();
    return [rect.width / 2, rect.height / 2];
  }

  function getEdgeProximity(el, x, y) {
    const [cx, cy] = getCenterOfElement(el);
    const dx = x - cx;
    const dy = y - cy;
    let kx = Infinity, ky = Infinity;
    if (dx !== 0) kx = cx / Math.abs(dx);
    if (dy !== 0) ky = cy / Math.abs(dy);
    return Math.min(Math.max(1 / Math.min(kx, ky), 0), 1);
  }

  function getCursorAngle(el, x, y) {
    const [cx, cy] = getCenterOfElement(el);
    const dx = x - cx;
    const dy = y - cy;
    if (dx === 0 && dy === 0) return 0;
    const radians = Math.atan2(dy, dx);
    let degrees = radians * (180 / Math.PI) + 90;
    if (degrees < 0) degrees += 360;
    return degrees;
  }

  function initBorderGlow(card) {
    const radius = parseInt(card.dataset.borderRadius || '28', 10);
    const colors = card.dataset.glowColors || '#c084fc,#f472b6,#38bdf8';
    const bg = card.dataset.backgroundColor || 'rgba(0,0,0,0.4)';

    const glowVars = buildGlowVars('195 80 70', 1);
    const gradientVars = buildGradientVars(colors);

    Object.assign(card.style, {
      '--card-bg': bg,
      '--border-radius': `${radius}px`,
      '--glow-padding': '40px',
      ...glowVars,
      ...gradientVars
    });

    card.addEventListener('pointermove', function(e) {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const edge = getEdgeProximity(card, x, y);
      const angle = getCursorAngle(card, x, y);
      card.style.setProperty('--edge-proximity', (edge * 100).toFixed(3));
      card.style.setProperty('--cursor-angle', angle.toFixed(3) + 'deg');
    });

    card.addEventListener('pointerleave', function() {
      card.style.setProperty('--edge-proximity', '0');
    });
  }

  document.addEventListener('DOMContentLoaded', function() {
    document.querySelectorAll('.border-glow-card').forEach(initBorderGlow);
  });
})();
