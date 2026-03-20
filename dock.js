/**
 * macOS-style Magnifying Dock in Vanilla JS
 */
class Dock {
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);
    if (!this.container) return;

    this.items = options.items || [];
    this.panelHeight = options.panelHeight || 68;
    this.baseItemSize = options.baseItemSize || 50;
    this.magnification = options.magnification || 70;
    this.distance = options.distance || 150;

    this.injectStyles();
    this.render();
    this.attachEvents();
  }

  injectStyles() {
    if (document.getElementById('magic-dock-styles')) return;

    const style = document.createElement('style');
    style.id = 'magic-dock-styles';
    style.innerHTML = `
      /* Default (Mobile) - Bottom, Horizontal */
      .dock-container {
        position: fixed;
        bottom: 24px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 10000;
        display: flex;
        flex-direction: row;
        align-items: flex-end;
        height: var(--panel-height);
        pointer-events: none; /* Let clicks pass through container */
      }
      .dock-panel {
        display: flex;
        flex-direction: row;
        align-items: flex-end;
        gap: 12px;
        padding: 10px 16px;
        background: rgba(255, 255, 255, 0.25);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        border: 1px solid rgba(255, 255, 255, 0.4);
        border-radius: 26px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255,255,255,0.6);
        pointer-events: auto; /* Re-enable for panel */
      }
      .dock-item {
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        background: linear-gradient(135deg, rgba(255,255,255,0.9), rgba(240,246,251,0.9));
        box-shadow: 
          0 4px 10px rgba(0, 0, 0, 0.15),
          0 0 0 1px rgba(255, 255, 255, 0.5),
          inset 0 2px 0 rgba(255, 255, 255, 0.8);
        cursor: pointer;
        color: var(--teal-dark, #006978);
        transition: width 0.1s ease-out, height 0.1s ease-out, transform 0.2s ease, margin 0.1s ease-out;
      }
      .dock-icon-wrapper {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        height: 100%;
        transition: transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1);
      }
      .dock-icon-wrapper svg {
        width: 48%;
        height: 48%;
        fill: none;
        stroke: currentColor;
        stroke-width: 2;
        stroke-linecap: round;
        stroke-linejoin: round;
      }
      .dock-item.has-fill svg {
        fill: currentColor;
        stroke: none;
      }
      .dock-tooltip {
        position: absolute;
        top: -46px;
        left: 50%;
        transform: translateX(-50%) translateY(12px) scale(0.9);
        padding: 6px 14px;
        background: rgba(17, 40, 64, 0.9);
        color: #fff;
        font-family: 'Inter', sans-serif;
        font-size: 0.8rem;
        font-weight: 600;
        border-radius: 10px;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
        white-space: nowrap;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        z-index: 100;
      }
      .dock-tooltip::after {
        content: '';
        position: absolute;
        bottom: -5px;
        left: 50%;
        transform: translateX(-50%);
        border-left: 6px solid transparent;
        border-right: 6px solid transparent;
        border-top: 6px solid rgba(17, 40, 64, 0.9);
      }
      .dock-item:hover .dock-tooltip {
        opacity: 1;
        transform: translateX(-50%) translateY(0) scale(1);
      }
      .dock-item:active .dock-icon-wrapper {
        transform: translateY(-8px) scale(0.9);
      }

      /* Desktop - Right side, Vertical */
      @media (min-width: 768px) {
        .dock-container {
          bottom: auto;
          top: 50%;
          left: auto;
          right: 24px;
          transform: translateY(-50%);
          flex-direction: column;
          align-items: center;
          height: auto;
          width: var(--panel-height); /* use panel-height for width now */
        }
        .dock-panel {
          flex-direction: column;
          align-items: center;
          padding: 16px 10px;
        }
        .dock-tooltip {
          top: 50%;
          left: -15px;
          transform: translateY(-50%) translateX(-100%) scale(0.9) translateX(12px);
        }
        .dock-tooltip::after {
          bottom: auto;
          top: 50%;
          left: auto;
          right: -5px;
          transform: translateY(-50%);
          border-left: 6px solid rgba(17, 40, 64, 0.9);
          border-top: 6px solid transparent;
          border-bottom: 6px solid transparent;
        }
        .dock-item:hover .dock-tooltip {
          opacity: 1;
          transform: translateY(-50%) translateX(-100%) scale(1);
        }
      }
    `;
    document.head.appendChild(style);
  }

  render() {
    this.container.innerHTML = '';
    this.container.classList.add('dock-container');
    this.container.style.setProperty('--panel-height', `${this.panelHeight}px`);
    
    const panel = document.createElement('div');
    panel.classList.add('dock-panel');

    this.items.forEach((item) => {
      const el = document.createElement('div');
      el.classList.add('dock-item');
      if (item.hasFill) el.classList.add('has-fill');
      
      el.style.width = `${this.baseItemSize}px`;
      el.style.height = `${this.baseItemSize}px`;
      
      el.innerHTML = `
        <div class="dock-tooltip">${item.label}</div>
        <div class="dock-icon-wrapper">${item.icon}</div>
      `;

      el.addEventListener('click', () => {
        if (item.onClick) item.onClick();
        
        // Custom bounce on click
        const iconWrapper = el.querySelector('.dock-icon-wrapper');
        iconWrapper.style.transform = 'translateY(-18px) scale(1.1)';
        setTimeout(() => { iconWrapper.style.transform = ''; }, 200);
      });

      panel.appendChild(el);
    });

    this.container.appendChild(panel);
    this.itemsElements = panel.querySelectorAll('.dock-item');
  }

  attachEvents() {
    this.container.addEventListener('mousemove', (e) => {
      const isVertical = window.innerWidth >= 768;

      this.itemsElements.forEach((el) => {
        const rect = el.getBoundingClientRect();
        
        let dist;
        if (isVertical) {
          const elCenterY = rect.top + rect.height / 2;
          dist = Math.abs(e.clientY - elCenterY);
        } else {
          const elCenterX = rect.left + rect.width / 2;
          dist = Math.abs(e.clientX - elCenterX);
        }
        
        let scale = 1;
        if (dist < this.distance) {
          const maxScale = this.magnification / this.baseItemSize;
          // non-linear scaling curve for smoother magnification
          const factor = Math.cos((dist / this.distance) * (Math.PI / 2)); 
          scale = 1 + (maxScale - 1) * factor;
        }

        const size = this.baseItemSize * scale;
        el.style.width = `${size}px`;
        el.style.height = `${size}px`;
        
        const marginOffset = (size - this.baseItemSize) * 0.4;
        if (isVertical) {
          // In vertical mode, apply margin top and bottom to push items apart vertically
          el.style.margin = `${marginOffset}px 0`;
        } else {
          // In horizontal mode, apply margin left and right
          el.style.margin = `0 ${marginOffset}px`;
        }
      });
    });

    this.container.addEventListener('mouseleave', () => {
      this.itemsElements.forEach((el) => {
        el.style.width = `${this.baseItemSize}px`;
        el.style.height = `${this.baseItemSize}px`;
        el.style.margin = `0`;
      });
    });
  }
}

// Global initialization
document.addEventListener('DOMContentLoaded', () => {
  // Inject the container if it doesn't exist
  let dockWrapper = document.getElementById('magic-dock');
  if (!dockWrapper) {
    dockWrapper = document.createElement('div');
    dockWrapper.id = 'magic-dock';
    document.body.appendChild(dockWrapper);
  }

  const icons = {
    home: `<svg viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path><polyline points="9 22 9 12 15 12 15 22" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></polyline></svg>`,
    archive: `<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="4" rx="2" ry="2"></rect><path d="M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8"></path><line x1="10" y1="12" x2="14" y2="12"></line></svg>`,
    profile: `<svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>`,
    settings: `<svg viewBox="0 0 24 24"><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"></path><circle cx="12" cy="12" r="3"></circle></svg>`
  };

  const dockItems = [
    { 
      icon: icons.home, 
      label: 'Home', 
      onClick: () => { if(typeof showPage==='function') showPage('home'); }
    },
    { 
      icon: icons.archive, 
      label: 'Archive', 
      onClick: () => { if(typeof showPage==='function') showPage('history'); }
    },
    { 
      icon: icons.profile, 
      label: 'Profile', 
      onClick: () => { if(typeof showPage==='function') showPage('profile'); }
    },
    { 
      icon: icons.settings, 
      label: 'Settings', 
      onClick: () => alert('Settings module is currently under development!') 
    }
  ];

  window.magicDockInstance = new Dock('magic-dock', {
    items: dockItems,
    panelHeight: 68,
    baseItemSize: 50,
    magnification: 70,
    distance: 140
  });

  // Hide the old nav tabs to cleanly rely on the dock
  const navTabs = document.querySelector('.nav-tabs');
  if (navTabs) {
    navTabs.style.display = 'none';
  }
});
