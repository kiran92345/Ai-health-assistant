class ScrollStack {
  constructor(options = {}) {
    this.container = options.container || document.querySelector('.scroll-stack-scroller');
    if (!this.container) return;
    
    this.itemDistance = options.itemDistance || 100;
    this.itemScale = options.itemScale || 0.03;
    this.itemStackDistance = options.itemStackDistance || 30;
    this.stackPosition = options.stackPosition || '20%';
    this.scaleEndPosition = options.scaleEndPosition || '10%';
    this.baseScale = options.baseScale || 0.85;
    this.rotationAmount = options.rotationAmount || 0;
    this.blurAmount = options.blurAmount || 0;
    this.useWindowScroll = options.useWindowScroll !== undefined ? options.useWindowScroll : true;
    
    this.cards = Array.from(
      this.useWindowScroll 
        ? document.querySelectorAll('.scroll-stack-card') 
        : this.container.querySelectorAll('.scroll-stack-card')
    );
    
    this.lastTransforms = new Map();
    this.isUpdating = false;
    
    this.init();
  }
  
  parsePercentage(value, containerHeight) {
    if (typeof value === 'string' && value.includes('%')) {
      return (parseFloat(value) / 100) * containerHeight;
    }
    return parseFloat(value);
  }
  
  getScrollData() {
    if (this.useWindowScroll) {
      return {
        scrollTop: window.scrollY,
        containerHeight: window.innerHeight
      };
    } else {
      return {
        scrollTop: this.container.scrollTop,
        containerHeight: this.container.clientHeight
      };
    }
  }
  
  getElementOffset(element) {
    let top = 0;
    let current = element;
    while (current) {
      top += current.offsetTop;
      current = current.offsetParent;
    }
    return top;
  }
  
  calculateProgress(scrollTop, start, end) {
    if (scrollTop < start) return 0;
    if (scrollTop > end) return 1;
    return (scrollTop - start) / (end - start);
  }
  
  updateCardTransforms() {
    if (!this.cards.length || this.isUpdating) return;
    this.isUpdating = true;
    
    const { scrollTop, containerHeight } = this.getScrollData();
    const stackPositionPx = this.parsePercentage(this.stackPosition, containerHeight);
    const scaleEndPositionPx = this.parsePercentage(this.scaleEndPosition, containerHeight);
    
    const endElement = this.useWindowScroll
      ? document.querySelector('.scroll-stack-end')
      : this.container.querySelector('.scroll-stack-end');
      
    const endElementTop = endElement ? this.getElementOffset(endElement) : 0;
    
    this.cards.forEach((card, i) => {
      const cardTop = this.getElementOffset(card);
      const triggerStart = cardTop - stackPositionPx - this.itemStackDistance * i;
      const triggerEnd = cardTop - scaleEndPositionPx;
      const pinStart = cardTop - stackPositionPx - this.itemStackDistance * i;
      const pinEnd = endElementTop - containerHeight / 2;
      
      const scaleProgress = this.calculateProgress(scrollTop, triggerStart, triggerEnd);
      const targetScale = this.baseScale + i * this.itemScale;
      const scale = 1 - scaleProgress * (1 - targetScale);
      const rotation = this.rotationAmount ? i * this.rotationAmount * scaleProgress : 0;
      
      let blur = 0;
      if (this.blurAmount) {
        let topCardIndex = 0;
        for (let j = 0; j < this.cards.length; j++) {
          const jCardTop = this.getElementOffset(this.cards[j]);
          const jTriggerStart = jCardTop - stackPositionPx - this.itemStackDistance * j;
          if (scrollTop >= jTriggerStart) {
            topCardIndex = j;
          }
        }
        if (i < topCardIndex) {
          const depthInStack = topCardIndex - i;
          blur = Math.max(0, depthInStack * this.blurAmount);
        }
      }
      
      let translateY = 0;
      const isPinned = scrollTop >= pinStart && scrollTop <= pinEnd;
      
      if (isPinned) {
        translateY = scrollTop - cardTop + stackPositionPx + this.itemStackDistance * i;
      } else if (scrollTop > pinEnd) {
        translateY = pinEnd - cardTop + stackPositionPx + this.itemStackDistance * i;
      }
      
      const newTransform = {
        translateY: Math.round(translateY * 100) / 100,
        scale: Math.round(scale * 1000) / 1000,
        rotation: Math.round(rotation * 100) / 100,
        blur: Math.round(blur * 100) / 100
      };
      
      const lastTransform = this.lastTransforms.get(i);
      const hasChanged = !lastTransform ||
        Math.abs(lastTransform.translateY - newTransform.translateY) > 0.1 ||
        Math.abs(lastTransform.scale - newTransform.scale) > 0.001 ||
        Math.abs(lastTransform.rotation - newTransform.rotation) > 0.1 ||
        Math.abs(lastTransform.blur - newTransform.blur) > 0.1;
        
      if (hasChanged) {
        card.style.transform = `translate3d(0, ${newTransform.translateY}px, 0) scale(${newTransform.scale}) rotate(${newTransform.rotation}deg)`;
        card.style.filter = newTransform.blur > 0 ? `blur(${newTransform.blur}px)` : '';
        this.lastTransforms.set(i, newTransform);
      }
    });
    
    this.isUpdating = false;
  }
  
  init() {
    this.cards.forEach((card, i) => {
      if (i < this.cards.length - 1) {
        card.style.marginBottom = `${this.itemDistance}px`;
      }
      card.style.willChange = 'transform, filter';
      card.style.transformOrigin = 'top center';
      card.style.backfaceVisibility = 'hidden';
      card.style.transform = 'translateZ(0)';
      card.style.perspective = '1000px';
    });
    
    const handleScroll = () => {
      this.updateCardTransforms();
    };
    
    const isMobile = window.matchMedia('(max-width: 768px)').matches;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const shouldUseLenis = typeof Lenis !== 'undefined' && !isMobile && !prefersReducedMotion;

    if (shouldUseLenis) {
      const lenisOptions = this.useWindowScroll ? {
        duration: 1.05,
        easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smoothWheel: true,
        touchMultiplier: 1,
        syncTouch: true,
        syncTouchLerp: 0.09
      } : {
        wrapper: this.container,
        content: this.container.querySelector('.scroll-stack-inner'),
        duration: 1.05,
        easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smoothWheel: true,
        touchMultiplier: 1,
        syncTouch: true,
        syncTouchLerp: 0.09
      };
      
      this.lenis = new Lenis(lenisOptions);
      this.lenis.on('scroll', handleScroll);
      
      const raf = (time) => {
        this.lenis.raf(time);
        requestAnimationFrame(raf);
      };
      requestAnimationFrame(raf);
    } else {
      (this.useWindowScroll ? window : this.container).addEventListener('scroll', handleScroll, { passive: true });
    }
    
    requestAnimationFrame(() => this.updateCardTransforms());
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new ScrollStack({
    useWindowScroll: true,
    itemDistance: 120, // Distance between consecutive cards
    stackPosition: '30%', // Position from top where cards start to pin
    itemStackDistance: 35, // Vertical stagger between stacked cards
  });
});
