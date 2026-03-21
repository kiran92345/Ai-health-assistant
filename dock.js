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
        bottom: calc(20px + env(safe-area-inset-bottom, 0px));
        left: 50%;
        transform: translateX(-50%);
        z-index: 10000;
        display: flex;
        flex-direction: row;
        align-items: flex-end;
        height: var(--panel-height);
        pointer-events: none;
        width: auto;
        max-width: 90vw;
      }
      .dock-panel {
        display: flex;
        flex-direction: row;
        align-items: flex-end;
        gap: 8px;
        padding: 6px 12px;
        background: rgba(14, 22, 40, 0.82);
        backdrop-filter: blur(28px) saturate(200%);
        -webkit-backdrop-filter: blur(28px) saturate(200%);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 40px;
        box-shadow: 
          0 15px 50px rgba(0, 0, 0, 0.6),
          inset 0 1px 2px rgba(255, 255, 255, 0.15);
        pointer-events: auto;
      }
      .dock-item {
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.1);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.2);
        box-shadow: 
          0 4px 15px rgba(0, 0, 0, 0.3),
          inset 0 1px 1px rgba(255, 255, 255, 0.2);
        cursor: pointer;
        color: white;
        transition: width 0.15s cubic-bezier(0.2, 1, 0.3, 1), height 0.15s cubic-bezier(0.2, 1, 0.3, 1), transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), margin 0.15s cubic-bezier(0.2, 1, 0.3, 1);
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
        bottom: 74px; /* Move tooltip above the dock on mobile */
        top: auto;
        left: 50%;
        transform: translateX(-50%) translateY(10px) scale(0.8);
        padding: 5px 12px;
        background: rgba(0, 151, 167, 0.95);
        color: #fff;
        font-family: 'Outfit', sans-serif;
        font-size: 0.75rem;
        font-weight: 700;
        border-radius: 12px;
        opacity: 0;
        pointer-events: none;
        transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
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
      el.classList.add('nav-tab');
      if (item.page) el.dataset.page = item.page;
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
      page: 'home',
      onClick: () => { if(typeof showPage==='function') showPage('home'); }
    },
    { 
      icon: icons.archive, 
      label: 'History', 
      page: 'history',
      onClick: () => { if(typeof showPage==='function') showPage('history'); }
    },
    { 
      icon: icons.profile, 
      label: 'Profile', 
      page: 'profile',
      onClick: () => { if(typeof showPage==='function') showPage('profile'); }
    },
    { 
      icon: icons.settings, 
      label: 'Settings', 
      onClick: () => showToast('⚙️ Settings module is under development!', 'info') 
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
