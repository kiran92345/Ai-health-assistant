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
        bottom: calc(16px + env(safe-area-inset-bottom, 0px));
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
        gap: 10px;
        padding: 10px 12px;
        background: rgba(14, 22, 40, 0.86);
        backdrop-filter: blur(18px);
        -webkit-backdrop-filter: blur(18px);
        border: 1px solid rgba(255, 255, 255, 0.14);
        border-radius: 24px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.28), inset 0 1px 0 rgba(255,255,255,0.15);
        pointer-events: auto; /* Re-enable for panel */
      }
      .dock-item {
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        background: rgba(255,255,255,0.08);
        box-shadow: 
          0 4px 10px rgba(0, 0, 0, 0.15),
          0 0 0 1px rgba(255, 255, 255, 0.18),
          inset 0 1px 0 rgba(255, 255, 255, 0.2);
        cursor: pointer;
        color: rgba(255, 255, 255, 0.72);
        transition: width 0.1s ease-out, height 0.1s ease-out, transform 0.2s ease, margin 0.1s ease-out;
      }
      .dock-item.active {
        color: #4dd0e1;
        background: linear-gradient(135deg, rgba(0,151,167,0.25), rgba(23,193,221,0.18));
        box-shadow:
          0 8px 16px rgba(0,151,167,0.28),
          0 0 0 1px rgba(77,208,225,0.38),
          inset 0 1px 0 rgba(255,255,255,0.35);
      }
      .dock-item.is-switching {
        animation: dockSwitchPop 320ms cubic-bezier(0.22, 1, 0.36, 1);
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
        width: calc(var(--icon-scale, 0.58) * 100%);
        height: calc(var(--icon-scale, 0.58) * 100%);
        fill: none;
        stroke: currentColor;
        stroke-width: 2.2;
        stroke-linecap: round;
        stroke-linejoin: round;
      }
      @keyframes dockSwitchPop {
        0% {
          transform: scale(0.86);
          box-shadow: 0 0 0 0 rgba(77,208,225,0);
        }
        65% {
          transform: scale(1.08);
          box-shadow: 0 0 0 8px rgba(77,208,225,0.16);
        }
        100% {
          transform: scale(1);
          box-shadow: 0 0 0 0 rgba(77,208,225,0);
        }
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
      @media (min-width: 1024px) {
        .dock-container {
          bottom: 24px;
        }
        .dock-panel {
          gap: 14px;
          padding: 12px 18px;
          border-radius: 28px;
        }
        .dock-icon-wrapper svg {
          width: calc(var(--icon-scale, 0.62) * 100%);
          height: calc(var(--icon-scale, 0.62) * 100%);
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
      if (item.page) {
        el.classList.add('nav-tab');
        el.dataset.page = item.page;
      }
      if (item.className) el.classList.add(item.className);
      if (item.hasFill) el.classList.add('has-fill');
      
      const itemBaseSize = item.itemSize || this.baseItemSize;
      el.dataset.baseSize = String(itemBaseSize);
      el.style.setProperty('--icon-scale', String(item.iconScale || 0.58));
      el.style.width = `${itemBaseSize}px`;
      el.style.height = `${itemBaseSize}px`;
      
      el.innerHTML = `
        <div class="dock-tooltip">${item.label}</div>
        <div class="dock-icon-wrapper">${item.icon}</div>
      `;

      el.addEventListener('click', () => {
        if (item.onClick) item.onClick();
        this.updateActive(item.page);
        
        // Custom bounce on click
        const iconWrapper = el.querySelector('.dock-icon-wrapper');
        iconWrapper.style.transform = 'translateY(-18px) scale(1.1)';
        setTimeout(() => { iconWrapper.style.transform = ''; }, 200);
      });

      panel.appendChild(el);
    });

    this.container.appendChild(panel);
    this.itemsElements = panel.querySelectorAll('.dock-item');
    this.updateActive('home');
  }

  updateActive(pageName) {
    this.itemsElements.forEach((itemEl) => {
      const isActive = itemEl.dataset.page === pageName;
      itemEl.classList.toggle('active', isActive);
      if (isActive) {
        itemEl.classList.remove('is-switching');
        requestAnimationFrame(() => itemEl.classList.add('is-switching'));
        setTimeout(() => itemEl.classList.remove('is-switching'), 340);
      }
    });
  }

  attachEvents() {
    this.container.addEventListener('mousemove', (e) => {
      const isVertical = false;

      this.itemsElements.forEach((el) => {
        const rect = el.getBoundingClientRect();
        const baseSize = parseFloat(el.dataset.baseSize) || this.baseItemSize;
        
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
          const maxScale = this.magnification / baseSize;
          // non-linear scaling curve for smoother magnification
          const factor = Math.cos((dist / this.distance) * (Math.PI / 2)); 
          scale = 1 + (maxScale - 1) * factor;
        }

        const size = baseSize * scale;
        el.style.width = `${size}px`;
        el.style.height = `${size}px`;
        
        const marginOffset = (size - baseSize) * 0.35;
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
        const baseSize = parseFloat(el.dataset.baseSize) || this.baseItemSize;
        el.style.width = `${baseSize}px`;
        el.style.height = `${baseSize}px`;
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
    home: `<svg viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>`,
    archive: `<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="4" rx="2" ry="2"></rect><path d="M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8"></path><line x1="10" y1="12" x2="14" y2="12"></line></svg>`,
    profile: `<svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>`,
    settings: `<svg viewBox="0 0 24 24"><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"></path><circle cx="12" cy="12" r="3"></circle></svg>`
  };

  const isDesktop = window.innerWidth >= 1024;

  const dockItems = [
    {
      icon: icons.home, 
      label: 'Home', 
      page: 'home',
      className: 'dock-item--main',
      itemSize: isDesktop ? 62 : 54,
      iconScale: isDesktop ? 0.90 : 0.62,
      onClick: () => { if(typeof showPage==='function') showPage('home'); }
    },
    {
      icon: icons.archive, 
      label: 'Archive', 
      page: 'history',
      className: 'dock-item--main',
      itemSize: isDesktop ? 62 : 54,
      iconScale: isDesktop ? 0.90 : 0.62,
      onClick: () => { if(typeof showPage==='function') showPage('history'); }
    },
    {
      icon: icons.profile, 
      label: 'Profile', 
      page: 'profile',
      className: 'dock-item--main',
      itemSize: isDesktop ? 62 : 54,
      iconScale: isDesktop ? 0.90 : 0.62,
      onClick: () => { if(typeof showPage==='function') showPage('profile'); }
    },
    { 
      icon: icons.settings, 
      label: 'Settings', 
      className: 'dock-item--settings',
      itemSize: isDesktop ? 62 : 54,
      iconScale: isDesktop ? 0.35 : 0.62,
      onClick: () => alert('Settings module is currently under development!') 
    }
  ];

  window.magicDockInstance = new Dock('magic-dock', {
    items: dockItems,
    panelHeight: isDesktop ? 86 : 72,
    baseItemSize: isDesktop ? 62 : 54,
    magnification: isDesktop ? 88 : 74,
    distance: isDesktop ? 170 : 140
  });

  // Hide the old nav tabs to cleanly rely on the dock
  const navTabs = document.querySelector('.nav-tabs');
  if (navTabs) {
    navTabs.style.display = 'none';
  }
});
