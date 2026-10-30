/**
 * THE NEW ME — REACT BITS HARMONIC FLUID WAVE LOADER
 * Self-initializing standalone fluid glass fill loader.
 * Multi-harmonic sinusoidal canvas waves + effervescent micro-bubbles + specular meniscus + optical bloom dissolve.
 */

(function () {
  'use strict';

  // Prevent double-initialization
  if (window.__tnmFluidLoaderInit) return;

  class ReactBitsFluidLoader {
    constructor(canvas, revealedLayer, options = {}) {
      this.canvas = canvas;
      this.revealedLayer = revealedLayer;
      this.ctx = canvas.getContext('2d');
      this.onComplete = options.onComplete || (() => {});
      this.progress = 0; // 0.0 -> 1.0
      this.phase = 0;
      this.phaseSpeed = 0.038;
      this.isRunning = true;
      this.rafId = null;

      // Hydrodynamic effervescence (bubbles rising inside the liquid)
      this.bubbles = Array.from({ length: 22 }, () => ({
        x: Math.random(),
        y: 1.0 + Math.random() * 0.3,
        size: 1.2 + Math.random() * 2.8,
        speed: 0.003 + Math.random() * 0.005,
        wobbleFreq: 2 + Math.random() * 3,
        wobbleAmp: 3 + Math.random() * 5,
        alpha: 0.25 + Math.random() * 0.45
      }));

      this.resize();
      this.resizeHandler = () => this.resize();
      window.addEventListener('resize', this.resizeHandler, { passive: true });
      this.animate = this.animate.bind(this);
      this.rafId = requestAnimationFrame(this.animate);
    }

    resize() {
      this.dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.width = this.canvas.clientWidth || window.innerWidth;
      this.height = this.canvas.clientHeight || window.innerHeight;
      this.canvas.width = this.width * this.dpr;
      this.canvas.height = this.height * this.dpr;
      this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    }

    drawWave(amplitude, frequency, phaseOffset, yBase, fillStyle) {
      const ctx = this.ctx;
      const w = this.width;
      const h = this.height;

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(0, h);

      for (let x = 0; x <= w; x += 4) {
        const harmonic1 = Math.sin(x * frequency + this.phase + phaseOffset) * amplitude;
        const harmonic2 = Math.cos(x * frequency * 1.7 + this.phase * 0.8) * (amplitude * 0.32);
        const y = yBase + harmonic1 + harmonic2;
        ctx.lineTo(x, y);
      }

      ctx.lineTo(w, h);
      ctx.closePath();
      ctx.fillStyle = fillStyle;
      ctx.fill();
      ctx.restore();
    }

    drawMeniscus(amplitude, frequency, yBase) {
      const ctx = this.ctx;
      const w = this.width;

      ctx.save();
      ctx.beginPath();

      for (let x = 0; x <= w; x += 4) {
        const harmonic1 = Math.sin(x * frequency + this.phase + 2.8) * amplitude;
        const harmonic2 = Math.cos(x * frequency * 1.7 + this.phase * 0.8) * (amplitude * 0.32);
        const y = yBase + harmonic1 + harmonic2;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }

      ctx.lineWidth = 2.4;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
      ctx.shadowColor = 'rgba(167, 243, 208, 0.85)';
      ctx.shadowBlur = 8;
      ctx.stroke();
      ctx.restore();
    }

    updateBubbles(targetY) {
      const ctx = this.ctx;
      const w = this.width;
      const h = this.height;

      ctx.save();
      for (let i = 0; i < this.bubbles.length; i++) {
        const b = this.bubbles[i];
        b.y -= b.speed;
        const pixelY = b.y * h;

        if (pixelY < targetY || b.y < 0) {
          b.y = 1.0 + Math.random() * 0.15;
          b.x = Math.random();
        }

        const pixelX = b.x * w + Math.sin(b.y * b.wobbleFreq * Math.PI * 2 + this.phase) * b.wobbleAmp;

        if (pixelY >= targetY) {
          ctx.beginPath();
          ctx.arc(pixelX, pixelY, b.size, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 255, 255, ${b.alpha})`;
          ctx.fill();
        }
      }
      ctx.restore();
    }

    animate() {
      if (!this.isRunning) return;

      this.ctx.clearRect(0, 0, this.width, this.height);
      this.phase += this.phaseSpeed;

      const targetY = this.height - (this.progress * this.height);
      const currentAmp = 22 * (1 - this.progress * 0.65);

      if (this.progress > 0.005) {
        // Layer 1: Ambient Undertow
        this.drawWave(currentAmp * 1.25, 0.006, 0.0, targetY + 6, 'rgba(26, 62, 31, 0.40)');

        // Layer 2: Mid Chlorophyll Swell
        this.drawWave(currentAmp * 1.05, 0.011, 1.4, targetY + 3, 'rgba(36, 83, 41, 0.82)');

        // Layer 3: Forefront Primary Liquid Mass
        this.drawWave(currentAmp * 0.85, 0.016, 2.8, targetY, '#204a25');

        // Specular Meniscus
        this.drawMeniscus(currentAmp * 0.85, 0.016, targetY);

        // Effervescent Micro-Bubbles
        this.updateBubbles(targetY);
      }

      this.rafId = requestAnimationFrame(this.animate);
    }

    setProgress(val) {
      this.progress = Math.max(0, Math.min(1, val));
      if (this.revealedLayer) {
        this.revealedLayer.style.height = `${(this.progress * 100).toFixed(2)}%`;
      }
    }

    destroy() {
      this.isRunning = false;
      if (this.rafId) cancelAnimationFrame(this.rafId);
      window.removeEventListener('resize', this.resizeHandler);
    }
  }

  // Expose class globally if needed
  window.ReactBitsFluidLoader = ReactBitsFluidLoader;

  function initStandaloneLoader() {
    if (window.__tnmFluidLoaderInit) return;
    const loader = document.getElementById('proteinLoader');
    const canvas = document.getElementById('loaderWaveCanvas');
    const revealedLayer = document.getElementById('loaderRevealedLayer');

    if (!loader || !canvas || !revealedLayer) return;

    window.__tnmFluidLoaderInit = true;
    const fluidLoader = new ReactBitsFluidLoader(canvas, revealedLayer);

    const duration = 3.2; // 3.2 seconds minimum fill duration
    let dismissed = false;

    function dissolve() {
      if (dismissed) return;
      dismissed = true;
      window.__tnmFluidLoaderDismissed = true;
      if (window.proteinAnim) {
        window.proteinAnim.loaderDismissed = true;
      }

      fluidLoader.setProgress(1);

      if (typeof gsap !== 'undefined') {
        gsap.to(loader, {
          opacity: 0,
          scale: 1.03,
          filter: 'brightness(1.22) blur(8px)',
          duration: 0.85,
          ease: 'power2.inOut',
          onComplete: () => {
            fluidLoader.destroy();
            loader.style.display = 'none';
            if (window.proteinAnim) {
              window.proteinAnim.loaderDismissed = true;
            }
          }
        });
      } else {
        loader.style.transition = 'opacity 0.85s ease, filter 0.85s ease, transform 0.85s ease';
        loader.style.opacity = '0';
        loader.style.transform = 'scale(1.03)';
        loader.style.filter = 'brightness(1.22) blur(8px)';
        setTimeout(() => {
          fluidLoader.destroy();
          loader.style.display = 'none';
          if (window.proteinAnim) {
            window.proteinAnim.loaderDismissed = true;
          }
        }, 850);
      }
    }

    if (typeof gsap !== 'undefined') {
      gsap.to(fluidLoader, {
        progress: 1,
        duration: duration,
        ease: 'power2.inOut',
        onUpdate: function () {
          fluidLoader.setProgress(this.progress());
        },
        onComplete: dissolve
      });
    } else {
      const start = performance.now();
      function tick(now) {
        const elapsed = (now - start) / 1000;
        const p = Math.min(1, elapsed / duration);
        // Eased progress (power2 in/out)
        const eased = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
        fluidLoader.setProgress(eased);
        if (p < 1) {
          requestAnimationFrame(tick);
        } else {
          dissolve();
        }
      }
      requestAnimationFrame(tick);
    }
  }

  // Run immediately if DOM nodes are already parsed, or wait for DOMContentLoaded
  if (document.getElementById('proteinLoader')) {
    initStandaloneLoader();
  } else if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initStandaloneLoader);
  } else {
    initStandaloneLoader();
  }
})();
