/**
 * MagicBento Vanilla JS Engine
 * Replicates the MagicBento React block for any grid layout
 */
class MagicBento {
  constructor(selector, options = {}) {
    this.grid = document.querySelector(selector);
    if (!this.grid) return;

    this.options = {
      textAutoHide: options.textAutoHide !== undefined ? options.textAutoHide : true,
      enableStars: options.enableStars !== undefined ? options.enableStars : true,
      enableSpotlight: options.enableSpotlight !== undefined ? options.enableSpotlight : true,
      enableBorderGlow: options.enableBorderGlow !== undefined ? options.enableBorderGlow : true,
      enableTilt: options.enableTilt !== undefined ? options.enableTilt : false,
      enableMagnetism: options.enableMagnetism !== undefined ? options.enableMagnetism : false,
      clickEffect: options.clickEffect !== undefined ? options.clickEffect : true,
      spotlightRadius: options.spotlightRadius || 400,
      particleCount: options.particleCount || 12,
      glowColor: options.glowColor || "132, 0, 255",
      disableAnimations: options.disableAnimations || false
    };

    if (this.options.disableAnimations) return;

    this.injectStyles();
    
    // Initialize existing cards
    const initialCards = this.grid.querySelectorAll('.bento-card:not(.mb-card)');
    initialCards.forEach(card => this.initCard(card));

    // Observe grid for dynamic changes (like after an AI analysis finishes)
    this.observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          const newCards = this.grid.querySelectorAll('.bento-card:not(.mb-card)');
          newCards.forEach(card => this.initCard(card));
        }
      });
    });
    this.observer.observe(this.grid, { childList: true, subtree: true });
  }

  injectStyles() {
    if (document.getElementById('magic-bento-styles')) return;

    const rgb = this.options.glowColor;
    const style = document.createElement('style');
    style.id = 'magic-bento-styles';
    style.innerHTML = `
      .mb-card {
        position: relative;
        overflow: hidden;
        transition: transform 0.3s ease, box-shadow 0.3s ease;
        z-index: 1; /* Keep above grid bg */
      }
      
      /* Border Glow (Spotlight mask on pseudo-element) */
      .mb-card::before {
        content: "";
        position: absolute;
        inset: 0;
        border-radius: inherit;
        padding: 2px; /* thickness of glow border */
        background: radial-gradient(var(--spot-r, 400px) circle at var(--x, 0) var(--y, 0), rgba(${rgb}, 0.9), transparent 40%);
        -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
        -webkit-mask-composite: xor;
        mask-composite: exclude;
        pointer-events: none;
        opacity: 0;
        transition: opacity 0.5s ease;
        z-index: 10;
      }
      .mb-card:hover::before {
        opacity: var(--border-glow, 1);
      }
      
      /* Inner Spotlight Background Glow */
      .mb-spotlight {
        position: absolute;
        inset: 0;
        background: radial-gradient(var(--spot-r, 400px) circle at var(--x, 0) var(--y, 0), rgba(${rgb}, 0.08), transparent 40%);
        opacity: 0;
        transition: opacity 0.5s ease;
        pointer-events: none;
        z-index: -1;
        border-radius: inherit;
      }
      .mb-card:hover .mb-spotlight {
        opacity: var(--spotlight-glow, 1);
      }
      
      /* Stars/Particles */
      .mb-sparkle {
        position: absolute;
        width: 3px;
        height: 3px;
        background: #fff;
        border-radius: 50%;
        box-shadow: 0 0 10px rgba(${rgb}, 0.9), 0 0 20px rgba(${rgb}, 0.9);
        pointer-events: none;
        opacity: 0;
        z-index: 20;
        animation: mb-sparkle-anim 1s forwards cubic-bezier(0.2, 0.8, 0.2, 1);
      }
      @keyframes mb-sparkle-anim {
        0% { transform: translate(-50%, -50%) scale(0) rotate(0deg); opacity: 0; }
        50% { opacity: 1; transform: translate(-50%, -50%) scale(1.5) rotate(180deg); }
        100% { transform: translate(-50%, -50%) scale(0) rotate(360deg); opacity: 0; }
      }

      /* Click Ripple */
      .mb-ripple {
        position: absolute;
        width: 100px;
        height: 100px;
        border-radius: 50%;
        background: radial-gradient(circle, rgba(${rgb}, 0.4) 0%, transparent 70%);
        transform: translate(-50%, -50%) scale(0);
        animation: mb-ripple-anim 0.6s linear forwards;
        pointer-events: none;
        z-index: 15;
      }
      @keyframes mb-ripple-anim {
        0% { transform: translate(-50%, -50%) scale(0); opacity: 0.8; }
        100% { transform: translate(-50%, -50%) scale(6); opacity: 0; }
      }

      /* Text Auto Hide Feature */
      .mb-text-hide .bento-list,
      .mb-text-hide .diagnosis-desc,
      .mb-text-hide .doctor-text,
      .mb-text-hide .diagnosis-symptoms,
      .mb-text-hide .score-info {
        opacity: 0.35;
        transform: translateY(8px);
        transition: opacity 0.4s ease-out, transform 0.4s ease-out;
      }
      .mb-card:hover.mb-text-hide .bento-list,
      .mb-card:hover.mb-text-hide .diagnosis-desc,
      .mb-card:hover.mb-text-hide .doctor-text,
      .mb-card:hover.mb-text-hide .diagnosis-symptoms,
      .mb-card:hover.mb-text-hide .score-info {
        opacity: 1;
        transform: translateY(0);
      }
    `;
    document.head.appendChild(style);
  }

  initCard(card) {
    card.classList.add('mb-card');
    card.style.setProperty('--spot-r', `${this.options.spotlightRadius}px`);
    card.style.setProperty('--border-glow', this.options.enableBorderGlow ? '1' : '0');
    card.style.setProperty('--spotlight-glow', this.options.enableSpotlight ? '1' : '0');
    
    if (this.options.textAutoHide) {
      card.classList.add('mb-text-hide');
    }

    if (this.options.enableSpotlight && !card.querySelector('.mb-spotlight')) {
      const spotlight = document.createElement('div');
      spotlight.className = 'mb-spotlight';
      // Insert at bottom so it doesn't cover text
      card.insertBefore(spotlight, card.firstChild);
    }

    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      card.style.setProperty('--x', `${x}px`);
      card.style.setProperty('--y', `${y}px`);
      
      // Random star generation on hover movement
      if (this.options.enableStars && Math.random() > 0.92) {
        this.createSparkle(card, x, y);
      }

      if (this.options.enableTilt || this.options.enableMagnetism) {
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const rotateX = this.options.enableTilt ? ((y - centerY) / centerY) * -4 : 0;
        const rotateY = this.options.enableTilt ? ((x - centerX) / centerX) * 4 : 0;
        const transX = this.options.enableMagnetism ? ((x - centerX) / centerX) * 6 : 0;
        const transY = this.options.enableMagnetism ? ((y - centerY) / centerY) * 6 : 0;
        
        card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translate(${transX}px, ${transY}px) scale(1.02)`;
        card.style.zIndex = '10';
      }
    });

    card.addEventListener('mouseleave', () => {
      if (this.options.enableTilt || this.options.enableMagnetism) {
        card.style.transform = '';
        card.style.zIndex = '1';
      }
    });

    if (this.options.clickEffect) {
      card.addEventListener('mousedown', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        this.createRipple(card, x, y);
        
        if (this.options.enableStars) {
          for(let i = 0; i < this.options.particleCount; i++) {
            setTimeout(() => {
              const px = x + (Math.random() - 0.5) * 120;
              const py = y + (Math.random() - 0.5) * 120;
              this.createSparkle(card, px, py);
            }, Math.random() * 300);
          }
        }
      });
    }
  }

  createSparkle(card, x, y) {
    const sparkle = document.createElement('div');
    sparkle.className = 'mb-sparkle';
    sparkle.style.left = `${x}px`;
    sparkle.style.top = `${y}px`;
    card.appendChild(sparkle);
    setTimeout(() => sparkle.remove(), 1000);
  }

  createRipple(card, x, y) {
    const ripple = document.createElement('div');
    ripple.className = 'mb-ripple';
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;
    card.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
  }
}

// Global initialization after DOM Load
document.addEventListener('DOMContentLoaded', () => {
  // Try attaching to the report bento-grid
  if (document.getElementById('bentoGrid')) {
    window.magicBentoInstance = new MagicBento('#bentoGrid', {
      textAutoHide: true,
      enableStars: false,
      enableSpotlight: false,
      enableBorderGlow: false,
      enableTilt: false,
      enableMagnetism: false,
      clickEffect: false,
      spotlightRadius: 400,
      particleCount: 12,
      glowColor: "132, 0, 255",
      disableAnimations: true
    });
  }
});
