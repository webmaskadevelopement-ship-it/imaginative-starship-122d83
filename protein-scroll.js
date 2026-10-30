/**
 * The New Me - Protein Powder GSAP Scroll Animation
 * --------------------------------------------------
 * High-performance, direction-aware GSAP ScrollTrigger video frame engine.
 * Scrubs through 528 sequential video frames with an organic Luma Transition
 * between frame 287 and frame 288.
 *
 * Reverse Scroll Optimizations (/gsap skill):
 * 1. Zero-lag tactile scrub (scrub: 0.1) eliminates sluggish momentum drift and rubber-banding.
 * 2. Removed end-hold dead zone so reverse scrubbing begins instantly without freeze.
 * 3. Direction-aware frame lookup (ScrollTrigger.direction === -1) prevents temporal frame jitter.
 * 4. Decoupled RAF render loop prevents dropped frames and redundant canvas redraws.
 * 5. Clean discrete luma transition rendering eliminates ghosting and double-exposure artifacts.
 * 6. High-concurrency frame preloading caches all 528 frames in memory for seamless bidirectional playback.
 */

(function () {
  'use strict';

  // Prevent browser scroll jumps and erratic pin snapping on page refresh
  if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
  }
  window.scrollTo(0, 0);

  // Active frame indices (82-126, 308-346, 456-506 restored, 206-282 ported to temp, even frames elsewhere)
  const ACTIVE_FRAMES = (() => {
    const arr = [];
    for (let i = 0; i <= 526; i++) {
      if (i >= 206 && i <= 282) continue;
      if ((i >= 82 && i <= 126) || (i >= 308 && i <= 346) || (i >= 456 && i <= 506)) {
        arr.push(i);
      } else if (i % 2 === 0) {
        arr.push(i);
      }
    }
    return arr;
  })();

  const TOTAL_VIDEO_FRAMES = ACTIVE_FRAMES.length; // 291 frames
  const LUMA_TRANSITION_STEPS = 24;
  const TOTAL_TIMELINE_STEPS = TOTAL_VIDEO_FRAMES + LUMA_TRANSITION_STEPS; // 315 steps

  /**
   * Dual-Engine Pin Distance Calculator
   * - Mobile Tactile Engine (<=768px): Calibrated travel (5,800px to 7,200px) providing
   *   an identical, predictable ~6-thumb-swipe cadence across all smartphones.
   * - Desktop & 16:9 Tablet Engine (>768px): Effortless, silky travel (3,400px to 4,200px),
   *   eliminating the fatiguing "hard-scroll" drag and allowing ~4 smooth wheel turns to journey
   *   gracefully through all 6 chapters.
   */
  const getPinDistance = (isMobile = window.innerWidth <= 768) => {
    return isMobile
      ? Math.max(9800, Math.round(window.innerHeight * 12.5))
      : Math.max(8400, Math.round(window.innerHeight * 8.5));
  };

  const SCENE_CENTERS = [0.0, 0.20, 0.35, 0.54, 0.73, 1.0];

  /**
   * S-Curve Frame-Hold Plateau Engine (Argon Step 3 - Mobile 9:16)
   * Decelerates frame advancement near scene centers (creating a readable hold)
   * and accelerates through blurry transition frames between scenes.
   */
  function getRemappedFrameProgress(rawProgress) {
    for (let i = 0; i < SCENE_CENTERS.length - 1; i++) {
      const start = SCENE_CENTERS[i];
      const end = SCENE_CENTERS[i + 1];

      if (rawProgress >= start && rawProgress <= end) {
        const localProgress = (rawProgress - start) / (end - start);
        const curvedProgress =
          localProgress < 0.5
            ? 0.5 * Math.pow(2 * localProgress, 2.2)
            : 1 - 0.5 * Math.pow(2 * (1 - localProgress), 2.2);

        return start + curvedProgress * (end - start);
      }
    }
    return rawProgress;
  }

  /**
   * 16:9 Desktop S-Curve Frame-Hold Plateau Engine (Shot 1 removed)
   * Canvas now starts at Pea Isolate (frame 82). 5 chapters remain.
   * Scene centers re-calibrated for the new 933-step universe.
   */
  const SCENE_CENTERS_16X9 = [0.0, 0.170, 0.420, 0.630, 0.910];

  function getRemappedFrameProgress16x9(rawProgress) {
    for (let i = 0; i < SCENE_CENTERS_16X9.length - 1; i++) {
      const start = SCENE_CENTERS_16X9[i];
      const end = SCENE_CENTERS_16X9[i + 1];

      if (rawProgress >= start && rawProgress <= end) {
        const localProgress = (rawProgress - start) / (end - start);
        const curvedProgress =
          localProgress < 0.5
            ? 0.5 * Math.pow(2 * localProgress, 2.2)
            : 1 - 0.5 * Math.pow(2 * (1 - localProgress), 2.2);

        return start + curvedProgress * (end - start);
      }
    }
    return rawProgress;
  }

  // 16:9 Desktop Master Sequence Configuration
  // Shot 1 (Cloudscape, frames 0–57) REMOVED — replaced by ScrollExpand packshot hero.
  // Canvas now begins at frame 82 (Canadian Yellow Pea Isolate).
  // Hard Bloom 2 (24 steps): Between frame 728 and frame 729 (high-energy radiant flare)
  // New total: 910 video frames (82..967 excluding 58) + 24 Hard Bloom = 933 steps (0..932)
  const SHOT_METADATA_16X9 = [
    { id: 1, name: "Canadian Yellow Pea Isolate", start: 82, end: 238, count: 157, subtitle: "Dew & Golden Pods", startProgress: 0.000 },
    { id: 2, name: "Sprouted Brown Rice", start: 243, end: 498, count: 256, subtitle: "Hypoallergenic Matrix", startProgress: 0.170 },
    { id: 3, name: "Cold-Pressed Pumpkin Seeds", start: 513, end: 668, count: 156, subtitle: "Mineral Harvest", startProgress: 0.463 },
    { id: 4, name: "Madagascar Vanilla Orchid", start: 678, end: 932, count: 255, subtitle: "Pure Orchid Aromatics", startProgress: 0.642 },
    { id: 5, name: "The New Me Protein", start: 942, end: 1014, count: 73, subtitle: "Clinical Packshot Formulation", startProgress: 0.914 },
  ];

  const TOTAL_16X9_VIDEO_FRAMES = 968; // Frames 0..967 on disk
  // Bloom 1 removed (was between frame 57 and 59 — Shot 1 is gone)
  const BLOOM_2_STEPS = 24; // Hard bloom between frame 728 and frame 729
  // Timeline: frames 82..728 = 647 steps, Hard Bloom = 24 steps, frames 729..967 = 239 steps → 910 total
  // Stored as indices 0..909 (video) mapped via offset 82, plus bloom at steps 647..670, then 671..909
  const TOTAL_16X9_TIMELINE_STEPS = 933; // 647 + 24 + 239 + 23 spare = 933 round figure
  const FRAME_16X9_PATH = (idx) => `frames/protein_16x9/frame_${String(idx).padStart(4, '0')}.webp?v=16_9_bloom_v3`;
  // Bloom 1 path removed — no longer used
  const BLOOM_2_16X9_PATH = (idx) => `frames/protein_16x9/transitions/hard_bloom_${String(idx).padStart(2, '0')}.webp?v=16_9_bloom_v3`;

  // Resolves frame index to active frame file names (Mobile 9:16)
  const FRAME_PATH = (idx) => `frames/protein/frame_${String(ACTIVE_FRAMES[idx]).padStart(3, '0')}.webp?v=v3_pre1_flow`;
  const LUMA_PATH = (idx) => `frames/protein/transitions/luma_${String(idx).padStart(2, '0')}.webp?v=v3_pre1_flow`;

  /**
   * React Bits Harmonic Fluid Glass Fill Engine
   * Dynamic multi-frequency sine wave superposition + specular meniscus + effervescence.
   * The water level tracks the REAL frame-buffer progress (hero, video, luma) eased
   * through a minimum choreography window: fast connections still get the full
   */
  const ReactBitsFluidLoader = window.ReactBitsFluidLoader || class ReactBitsFluidLoader {
    constructor(canvas, revealedLayer, options = {}) {
      this.canvas = canvas;
      this.revealedLayer = revealedLayer;
      this.ctx = canvas.getContext('2d');
      this.onComplete = options.onComplete || (() => {});
      this.progress = 0; // displayed fill 0.0 -> 1.0
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

  class ProteinScrollAnimation {
    constructor() {
      this.canvas = document.getElementById('protein-canvas');
      if (!this.canvas) return;
      this.ctx = this.canvas.getContext('2d', { alpha: false });

      this.viewport = document.querySelector('.protein-viewport');
      this.section = document.getElementById('protein-scroll-section');
      this.loader = document.getElementById('proteinLoader');
      this.loaderWaveCanvas = document.getElementById('loaderWaveCanvas');
      this.fluidLoader = null;
      this._loaderDismissed = false;
      Object.defineProperty(this, 'loaderDismissed', {
        get: () => {
          return this._loaderDismissed || !!window.__tnmFluidLoaderDismissed || !this.loader || this.loader.style.display === 'none';
        },
        set: (val) => {
          this._loaderDismissed = val;
        }
      });
      this.reducedMotion = false;
      this.scrollTrigger = null;
      this.scrollHint = document.getElementById('proteinScrollHint');
      this.holdIndicator = document.getElementById('proteinHoldIndicator');
      this.progressBar = document.getElementById('proteinProgressBar');
      this.chapterPips = document.querySelectorAll('.chapter-pip');
      this.frameStage = document.getElementById('proteinFrameStage');
      this.wideCard = document.getElementById('proteinWideCard');
      this.specimenDock = document.getElementById('proteinSpecimenDock');
      this.telemetry = document.getElementById('proteinTelemetry');
      this.telemetryVal = document.getElementById('telemetryVal');
      this.telemetryFill = document.getElementById('telemetryFill');

      // Dual White Card Overlays (100% Watermark Occlusion)
      this.nutritionCard = document.getElementById('proteinNutritionCard');
      this.nutritionScenePill = document.getElementById('nutritionScenePill');
      this.metricProteinVal = document.getElementById('metricProteinVal');
      this.metricBcaaVal = document.getElementById('metricBcaaVal');
      this.metricSugarVal = document.getElementById('metricSugarVal');
      this.nutritionCalloutText = document.getElementById('nutritionCalloutText');

      this.chapterIndexCard = document.getElementById('proteinChapterIndexCard');
      this.chapterCurrentBadge = document.getElementById('chapterCurrentBadge');
      this.chapterActiveTitle = document.getElementById('chapterActiveTitle');
      this.chapterActiveSubline = document.getElementById('chapterActiveSubline');
      this.chapterDots = document.querySelectorAll('.chapter-nav-dot');
      this.lastActiveShot = -1;

      // Mode Resolution: Desktop 16:9 vs Mobile 9:16 (URL override ?mode=16_9 or ?mode=9_16)
      const urlParams = new URLSearchParams(window.location.search);
      const forceMode = urlParams.get('mode');
      this.isDesktop = forceMode ? forceMode === '16_9' : window.innerWidth > 768;

      this.totalFrames = this.isDesktop ? TOTAL_16X9_VIDEO_FRAMES : TOTAL_VIDEO_FRAMES;
      this.images = new Array(this.totalFrames);
      this.lumaImages = new Array(LUMA_TRANSITION_STEPS);
      this.bloom2Images16x9 = new Array(BLOOM_2_STEPS);
      this.loadedCount = 0;
      this.lumaLoadedCount = 0;
      this.bloom2LoadedCount = 0;
      this.keyframeStride = 10;

      // Motion & Render State
      this.currentStep = 0;
      this.lastDrawnStep = -1;
      this.lastRenderedImage = null;
      this.scrollDirection = 1; // 1 = forward (down), -1 = backward (up)
      this.animationState = { step: 0 };
      this.dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.renderPending = false;
      this.cachedDims = null;

      // Expose globally for devtools/testing
      window.proteinAnim = this;

      this.init();
    }

    init() {
      // 1. Verify GSAP & ScrollTrigger
      if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
        console.error('[ProteinScroll] GSAP or ScrollTrigger not loaded.');
        return;
      }
      gsap.registerPlugin(ScrollTrigger);
      if (typeof ScrollTrigger.clearScrollMemory === 'function') {
        ScrollTrigger.clearScrollMemory('manual');
      }

      // 2. Initialize Lenis Smooth Scroll (Darkroom Engineering standard)
      this.initLenis();

      // 3. Setup Barba.js transition cleanup lifecycle
      this.initBarbaLifecycle();

      // 4. Setup canvas dimensions & compute layout cache
      this.resizeCanvas = this.resizeCanvas.bind(this);
      this.resizeCanvas();
      window.addEventListener('resize', this.resizeCanvas, { passive: true });

      // 5. Preload all frames aggressively into memory
      this.preloadFrames();

      // 6. Launch botanical liquid wave fill & bloom dissolve
      this.startWaveFillAnimation();

      // 7. Setup ScrollTrigger with instant, direction-aware scrub & text animations
      this.initScrollTrigger();

      // 8. Setup Gentle Dead-Zone Settle Listener (Argon Step 5)
      this.initDeadZoneSettle();

      // 9. Setup interactive Chapter Bar click navigation
      this.initChapterBarNav();

      // 10. Initial render of frame 0 & telemetry HUD
      this.updateHUD(0);
      this.renderTimeline(0, true);

    }

    resizeCanvas() {
      if (!this.canvas || !this.viewport) return;
      const rect = this.viewport.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;

      this.canvasWidth = w;
      this.canvasHeight = h;

      const cw = Math.round(w * this.dpr);
      const ch = Math.round(h * this.dpr);

      this.canvas.width = cw;
      this.canvas.height = ch;
      this.canvas.style.width = `${w}px`;
      this.canvas.style.height = `${h}px`;

      this.ctx.imageSmoothingEnabled = true;
      this.ctx.imageSmoothingQuality = 'high';

      // Pre-compute render dimensions to avoid heavy layout math on every frame tick
      const isMobile = !this.isDesktop;
      const imgW = this.isDesktop ? 1920 : 720;
      const imgH = this.isDesktop ? 1080 : 1280;

      let renderW, renderH, offsetX, offsetY;

      if (isMobile) {
        const scale = Math.max(cw / imgW, ch / imgH);
        renderW = imgW * scale;
        renderH = imgH * scale;
      } else {
        // Desktop 16:9 Cover Scaling (Cinematic Edge-to-Edge)
        const scale = Math.max(cw / imgW, ch / imgH);
        renderW = imgW * scale;
        renderH = imgH * scale;
      }

      offsetX = (cw - renderW) / 2;
      offsetY = (ch - renderH) / 2;

      this.cachedDims = { renderW, renderH, offsetX, offsetY, cw, ch };

      // Re-render current frame after resize
      this.renderTimeline(this.currentStep, true);
    }

    startWaveFillAnimation() {
      // If unified site-loader.js already initialized and manages the loader, let it drive
      if (window.__tnmFluidLoaderInit) {
        return;
      }

      if (!this.loaderWaveCanvas || !this.loaderRevealedLayer) {
        setTimeout(() => this.triggerBloomDissolve(), 3200);
        return;
      }

      this.fluidLoader = new ReactBitsFluidLoader(this.loaderWaveCanvas, this.loaderRevealedLayer);

      const self = this;
      const duration = 3.2; // 3.2 seconds fill duration (exact same choreography as Home Page)

      gsap.to(this.fluidLoader, {
        progress: 1,
        duration: duration,
        ease: 'power2.inOut',
        onUpdate: function () {
          self.fluidLoader.setProgress(this.progress());
        },
        onComplete: () => {
          self.triggerBloomDissolve();
        }
      });
    }

    triggerBloomDissolve() {
      if (this.loaderDismissed) return;
      this._loaderDismissed = true;
      window.__tnmFluidLoaderDismissed = true;

      if (this.fluidLoader) {
        this.fluidLoader.setProgress(1);
      }

      if (!this.loader) return;

      const finish = () => {
        if (this.fluidLoader) {
          this.fluidLoader.destroy();
        }
        if (this.loader) {
          this.loader.style.display = 'none';
        }
      };

      // React-style optical bloom & exposure dissolve to reveal protein home page
      gsap.to(this.loader, {
        opacity: 0,
        scale: 1.03,
        filter: 'brightness(1.22) blur(8px)',
        duration: 0.85,
        ease: 'power2.inOut',
        onComplete: finish
      });
    }

    dismissLoader() {
      this.triggerBloomDissolve();
    }

    preloadFrames() {
      // Safety gate: never hold the visitor past 7s even if the network stalls
      setTimeout(() => this.triggerBloomDissolve(), this.isDesktop ? 2600 : 7000);

      if (this.isDesktop) {
        // Priority 1: Instant Hero Frame 82 (Canadian Yellow Pea Isolate — canvas entry frame)
        const firstImg = new Image();
        firstImg.src = FRAME_16X9_PATH(82);
        const renderFirst = () => {
          this.images[82] = firstImg;
          this.loadedCount++;
          this.renderTimeline(0, true);
        };
        if (firstImg.complete && firstImg.naturalWidth > 0) {
          renderFirst();
        } else {
          firstImg.onload = renderFirst;
        }

        // Priority 2: Preload Hard Bloom 2 (728 -> 729, 24 frames)
        for (let i = 0; i < BLOOM_2_STEPS; i++) {
          const bloom2Img = new Image();
          bloom2Img.src = BLOOM_2_16X9_PATH(i);
          bloom2Img.onload = () => {
            this.bloom2Images16x9[i] = bloom2Img;
            this.bloom2LoadedCount++;
          };
        }

        // Priority 3: Preload Keyframe Anchors (every 10th frame from 82: 82, 90... 960)
        let kIdx = 80;
        const loadKeyframes = () => {
          const batchSize = 10;
          for (let b = 0; b < batchSize && kIdx < TOTAL_16X9_VIDEO_FRAMES; b++, kIdx += this.keyframeStride) {
            const idx = kIdx;
            if (idx < 82) continue;
            if (!this.images[idx]) {
              const img = new Image();
              img.src = FRAME_16X9_PATH(idx);
              img.onload = () => {
                this.images[idx] = img;
                this.loadedCount++;
              };
            }
          }
          if (kIdx < TOTAL_16X9_VIDEO_FRAMES) {
            setTimeout(loadKeyframes, 25);
          }
        };
        setTimeout(loadKeyframes, 40);

        // Priority 4: Buffer window around frame 82 (canvas entry frame)
        this.bufferWindow(82);
        return;
      }

      // Mobile Priority 1: Instant Hero Frame 0
      const firstImg = new Image();
      firstImg.src = FRAME_PATH(0);
      const renderFirst = () => {
        this.images[0] = firstImg;
        this.loadedCount++;
        this.renderTimeline(0, true);
      };
      if (firstImg.complete && firstImg.naturalWidth > 0) {
        renderFirst();
      } else {
        firstImg.onload = renderFirst;
      }

      // Mobile Priority 2: Preload all 24 Luma Fade transition frames in parallel
      for (let i = 0; i < LUMA_TRANSITION_STEPS; i++) {
        const lumaImg = new Image();
        lumaImg.src = LUMA_PATH(i);
        lumaImg.onload = () => {
          this.lumaImages[i] = lumaImg;
          this.lumaLoadedCount++;
        };
      }

      // Mobile Priority 3: Concurrently buffer video frames in fast chunks
      let currentIdx = 1;
      const chunkSize = 24;

      const loadChunk = () => {
        if (currentIdx >= TOTAL_VIDEO_FRAMES) return;
        const limit = Math.min(currentIdx + chunkSize, TOTAL_VIDEO_FRAMES);
        for (let i = currentIdx; i < limit; i++) {
          this.loadImage(i);
        }
        currentIdx = limit;
        if (currentIdx < TOTAL_VIDEO_FRAMES) {
          setTimeout(loadChunk, 20);
        }
      };

      setTimeout(loadChunk, 50);
    }

    bufferWindow(centerIdx) {
      const windowRadius = 35;
      const start = Math.max(0, centerIdx - windowRadius);
      const end = Math.min(this.totalFrames - 1, centerIdx + windowRadius);
      for (let i = start; i <= end; i++) {
        if (this.isDesktop && i === 58) continue;
        if (!this.images[i]) {
          const img = new Image();
          img.src = this.isDesktop ? FRAME_16X9_PATH(i) : FRAME_PATH(i);
          img.onload = () => {
            this.images[i] = img;
            this.loadedCount++;
            if (Math.round(this.currentStep) === i && this.lastDrawnStep !== i) {
              this.renderTimeline(this.currentStep);
            }
          };
        }
      }
    }

    loadImage(index) {
      const img = new Image();
      img.src = FRAME_PATH(index);
      img.onload = () => {
        this.images[index] = img;
        this.loadedCount++;

        // If scrubber is resting precisely at this frame, render it
        if (Math.round(this.currentStep) === index && this.lastDrawnStep !== index) {
          this.renderTimeline(this.currentStep);
        }
      };
    }

    /**
     * Direction-aware frame resolution.
     * When playing in reverse (scrollDirection === -1), looks in the direction of reverse motion
     * (towards the frame that was just on screen) rather than jumping forward into the future.
     */
    getReadyImage(targetIndex) {
      let safeIdx = Math.max(0, Math.min(this.totalFrames - 1, targetIndex));
      if (this.isDesktop && safeIdx === 58) {
        safeIdx = (this.scrollDirection === -1) ? 57 : 59;
      }
      if (this.images[safeIdx] && this.images[safeIdx].complete && this.images[safeIdx].naturalWidth > 0) {
        return this.images[safeIdx];
      }

      const isReverse = this.scrollDirection === -1;

      // Scan nearest neighbor in the current direction of travel
      const scanLimit = this.isDesktop ? 30 : 35;
      for (let offset = 1; offset < scanLimit; offset++) {
        const primary = isReverse ? safeIdx + offset : safeIdx - offset;
        if (this.isDesktop && primary === 58) continue;
        if (primary >= 0 && primary < this.totalFrames && this.images[primary]?.complete && this.images[primary].naturalWidth > 0) {
          return this.images[primary];
        }
        const secondary = isReverse ? safeIdx - offset : safeIdx + offset;
        if (this.isDesktop && secondary === 58) continue;
        if (secondary >= 0 && secondary < this.totalFrames && this.images[secondary]?.complete && this.images[secondary].naturalWidth > 0) {
          return this.images[secondary];
        }
      }

      // Desktop Keyframe Anchor fallback
      if (this.isDesktop) {
        let nearestKeyframe = Math.round(safeIdx / this.keyframeStride) * this.keyframeStride;
        if (nearestKeyframe === 58) nearestKeyframe = 60;
        if (nearestKeyframe >= 0 && nearestKeyframe < this.totalFrames && this.images[nearestKeyframe]?.complete && this.images[nearestKeyframe].naturalWidth > 0) {
          return this.images[nearestKeyframe];
        }
      }

      // Safe fallback: hold currently displayed image to avoid sudden visual flashes
      return this.lastRenderedImage || this.images[0] || null;
    }

    getReadyLumaImage(targetIndex) {
      const safeIdx = Math.min(LUMA_TRANSITION_STEPS - 1, Math.max(0, targetIndex));
      if (this.lumaImages[safeIdx] && this.lumaImages[safeIdx].complete && this.lumaImages[safeIdx].naturalWidth > 0) {
        return this.lumaImages[safeIdx];
      }
      for (let offset = 1; offset < LUMA_TRANSITION_STEPS; offset++) {
        const prev = safeIdx - offset;
        if (prev >= 0 && this.lumaImages[prev]?.complete && this.lumaImages[prev].naturalWidth > 0) {
          return this.lumaImages[prev];
        }
        const next = safeIdx + offset;
        if (next < LUMA_TRANSITION_STEPS && this.lumaImages[next]?.complete && this.lumaImages[next].naturalWidth > 0) {
          return this.lumaImages[next];
        }
      }
      return safeIdx < LUMA_TRANSITION_STEPS / 2 ? (this.images[126] || null) : (this.images[127] || null);
    }

    /**
     * Decoupled Render Engine.
     * Skips redundant clear/draw operations if the integer frame has not changed,
     * eliminating CPU thrashing and frame drops during fast reverse scrubbing.
     */
    renderTimeline(stepPos, force = false) {
      if (!this.ctx || !this.canvas || !this.cachedDims) return;

      const roundedInt = Math.round(stepPos);
      if (!force && roundedInt === this.lastDrawnStep) return;

      if (this.isDesktop) {
        // Desktop 16:9 Canvas Architecture (Shot 1 removed — replaced by ScrollExpand):
        // Canvas starts at frame 82 (Pea Isolate).
        // Segment A: steps 0..646  -> video frames 82..728  (offset +82)
        // Segment B: steps 647..670 -> 24 hard bloom frames (between 728 and 729)
        // Segment C: steps 671..932 -> video frames 729..967 (offset +58 = 729-671)
        if (stepPos <= 646) {
          const videoFrame = Math.round(stepPos + 82);
          const safeFrame = Math.min(728, Math.max(82, videoFrame));
          this.bufferWindow(safeFrame);
          this.drawVideoFrame(safeFrame);
        } else if (stepPos >= 647 && stepPos < 671) {
          const bloom2ProgressFloat = stepPos - 647;
          this.drawBloom2_16x9(bloom2ProgressFloat);
        } else {
          const videoFrame = Math.round(stepPos + 58);
          const safeFrame = Math.min(TOTAL_16X9_VIDEO_FRAMES - 1, Math.max(729, videoFrame));
          this.bufferWindow(safeFrame);
          this.drawVideoFrame(safeFrame);
        }
      } else {
        // Mobile 9:16
        if (stepPos <= 126) {
          this.drawVideoFrame(Math.min(126, Math.max(0, roundedInt)));
        } else if (stepPos >= 151) {
          const videoFrame = Math.round(stepPos - LUMA_TRANSITION_STEPS);
          this.drawVideoFrame(Math.min(TOTAL_VIDEO_FRAMES - 1, Math.max(127, videoFrame)));
        } else {
          const lumaProgressFloat = stepPos - 126; // 0.0 to 24.0
          this.drawLumaTransition(lumaProgressFloat);
        }
      }

      this.lastDrawnStep = roundedInt;
    }

    drawVideoFrame(frameIndex) {
      const img = this.getReadyImage(frameIndex);
      if (!img) return;

      const dims = this.cachedDims;

      // Clean background
      this.ctx.fillStyle = '#090e0b';
      this.ctx.fillRect(0, 0, dims.cw, dims.ch);

      // Draw active frame
      this.ctx.drawImage(img, dims.offsetX, dims.offsetY, dims.renderW, dims.renderH);
      this.lastRenderedImage = img;
    }

    /**
     * Clean Discrete Luma Transition.
     * Eliminates double-drawn ghosting and alpha bleed when scrubbing backwards.
     */
    drawLumaTransition(stepFloat) {
      const lumaIdx = Math.min(LUMA_TRANSITION_STEPS - 1, Math.max(0, Math.round(stepFloat)));
      const img = this.getReadyLumaImage(lumaIdx);
      if (!img) return;

      const dims = this.cachedDims;

      this.ctx.fillStyle = '#090e0b';
      this.ctx.fillRect(0, 0, dims.cw, dims.ch);

      this.ctx.drawImage(img, dims.offsetX, dims.offsetY, dims.renderW, dims.renderH);
      this.lastRenderedImage = img;
    }

    /**
     * 16:9 Hard Bloom 2 Transition Engine (Between frame 728 and frame 729)
     * High-energy solar flare diffusion
     */
    getReadyBloom2_16x9Image(targetIndex) {
      const safeIdx = Math.min(BLOOM_2_STEPS - 1, Math.max(0, targetIndex));
      if (this.bloom2Images16x9[safeIdx] && this.bloom2Images16x9[safeIdx].complete && this.bloom2Images16x9[safeIdx].naturalWidth > 0) {
        return this.bloom2Images16x9[safeIdx];
      }
      for (let offset = 1; offset < BLOOM_2_STEPS; offset++) {
        const prev = safeIdx - offset;
        if (prev >= 0 && this.bloom2Images16x9[prev]?.complete && this.bloom2Images16x9[prev].naturalWidth > 0) {
          return this.bloom2Images16x9[prev];
        }
        const next = safeIdx + offset;
        if (next < BLOOM_2_STEPS && this.bloom2Images16x9[next]?.complete && this.bloom2Images16x9[next].naturalWidth > 0) {
          return this.bloom2Images16x9[next];
        }
      }
      return safeIdx < BLOOM_2_STEPS / 2 ? (this.images[728] || null) : (this.images[729] || null);
    }

    drawBloom2_16x9(stepFloat) {
      const bloomIdx = Math.min(BLOOM_2_STEPS - 1, Math.max(0, Math.round(stepFloat)));
      const img = this.getReadyBloom2_16x9Image(bloomIdx);
      if (!img) return;

      const dims = this.cachedDims;
      this.ctx.fillStyle = '#090e0b';
      this.ctx.fillRect(0, 0, dims.cw, dims.ch);

      this.ctx.drawImage(img, dims.offsetX, dims.offsetY, dims.renderW, dims.renderH);
      this.lastRenderedImage = img;
    }

    /**
     * Dual-Engine ScrollTrigger Engine (gsap.matchMedia Lifecycle)
     * - Mobile Tactile Engine (<=768px): Direct 1:1 scrub (0.15s), calibrated pin travel
     *   providing an identical thumb-swipe cadence across all smartphones.
     * - Desktop & 16:9 Tablet Engine (>768px): Silky smooth glide (0.75s scrub), relaxed pin travel
     *   (3.8vh) eliminating mousewheel exhaustion, with full Swiss telemetry HUD.
     */
    initScrollTrigger() {
      const self = this;

      if (this.mm) {
        this.mm.revert();
      }
      this.mm = gsap.matchMedia();

      this.mm.add({
        isDesktop: "(min-width: 769px)",
        isMobile: "(max-width: 768px)",
        reduceMotion: "(prefers-reduced-motion: reduce)"
      }, (context) => {
        const { isDesktop, isMobile, reduceMotion } = context.conditions;

        // Dynamically configure Lenis for active device profile
        if (window.proteinLenis && window.proteinLenis.options) {
          if (isMobile) {
            // Brick-wall resistance: stops doom-scrolling past animation
            window.proteinLenis.options.duration = 0.55;
            window.proteinLenis.options.wheelMultiplier = 0.30;
            window.proteinLenis.options.touchMultiplier = 0.10;
            window.proteinLenis.options.syncTouch = false;
          } else {
            // Apple-style heavy drag resistance for 16:9 desktop
            window.proteinLenis.options.duration = 1.25;
            window.proteinLenis.options.wheelMultiplier = 0.40;
            window.proteinLenis.options.touchMultiplier = 0.55;
            window.proteinLenis.options.syncTouch = false;
          }
        }

        const totalSteps = self.isDesktop ? TOTAL_16X9_TIMELINE_STEPS : TOTAL_TIMELINE_STEPS;
        const pinDistance = getPinDistance(isMobile);
        const scrubCatchup = isMobile ? 0.08 : 0.25; // Ultra-tight 1:1 scrub on mobile

        // Desktop: the packshot reveal lives INSIDE this pin as phase 0
        if (self.isDesktop) PackshotReveal.init();

        // Responsive, tactile GSAP Timeline with Dual-Engine scrub dynamics
        const tl = gsap.timeline({
          scrollTrigger: {
            id: 'proteinScrollTrigger',
            trigger: self.section,
            start: () => 'top ' + (document.querySelector('.header')?.offsetHeight || 65) + 'px',
            // Desktop unified section: packshot expansion (13%) precedes the full canvas journey (87%)
            end: () => `+=${isMobile ? pinDistance : Math.round(pinDistance / (1 - HERO_PHASE_FRACTION))}`,
            pin: true,
            scrub: scrubCatchup,
            anticipatePin: isMobile ? 0 : 1,
            fastScrollEnd: isMobile ? true : false, // Snap playhead instantly on mobile lift
            invalidateOnRefresh: true,
            onUpdate: (trigger) => {
              self.scrollDirection = trigger.direction;

              // Desktop: phase 0 drives the packshot reveal + bloom inside the same pin
              if (self.isDesktop) {
                PackshotReveal.update(trigger.progress);
              }
              const canvasProgress = self.isDesktop ? canvasPhaseOf(trigger.progress) : trigger.progress;

              const remappedProgress = self.isDesktop
                ? getRemappedFrameProgress16x9(canvasProgress)
                : getRemappedFrameProgress(trigger.progress);
              const step = remappedProgress * (totalSteps - 1);
              self.currentStep = Math.max(0, Math.min(totalSteps - 1, step));

              if (!self.renderPending) {
                self.renderPending = true;
                requestAnimationFrame(() => {
                  self.renderPending = false;
                  self.renderTimeline(self.currentStep);
                });
              }

              self.updateHUD(trigger.progress);
            }
          }
        });
        self.scrollTrigger = tl.scrollTrigger;

        tl.to(self.animationState, {
          step: totalSteps - 1,
          duration: 1.0,
          ease: 'none'
        }, 0);

        // -------------------------------------------------------------
        // SCROLL-DRIVEN EDITORIAL CHAPTER & SPECIMEN DOCK ENGINE
        // Normalized percentage ranges (Argon Step 4)
        // Bold title commands upper video stage; Specimen dock delivers
        // rich creative botanical narrative & clinical telemetry.
        // -------------------------------------------------------------
        const addChapterAndDock = (chapterIdx, inStart, inEnd, outStart, outEnd, isInitial = false) => {
          // Desktop chapters are calibrated in canvas-phase progress (0..1) —
          // remap onto the unified pin so the packshot phase precedes them.
          if (self.isDesktop) {
            inStart = unifiedProgress(inStart);
            inEnd   = unifiedProgress(inEnd);
            if (outStart !== undefined) outStart = unifiedProgress(outStart);
            if (outEnd !== undefined) outEnd = unifiedProgress(outEnd);
          }
          const titleEl = document.querySelector(`.editorial-chapter[data-chapter="${chapterIdx}"]`);
          const dockEl = document.querySelector(`.dock-panel[data-dock="${chapterIdx}"]`);

          if (titleEl) {
            if (isInitial) {
              gsap.set(titleEl, { autoAlpha: 1, xPercent: -50, yPercent: -50, y: 0 });
              if (outStart !== undefined && outEnd !== undefined) {
                tl.to(titleEl, 
                  { autoAlpha: 0, xPercent: -50, yPercent: -50, y: -24, duration: outEnd - outStart, ease: 'power2.in' },
                  outStart
                );
              }
            } else {
              gsap.set(titleEl, { autoAlpha: 0, xPercent: -50, yPercent: -50, y: 30 });
              tl.fromTo(titleEl, 
                { autoAlpha: 0, xPercent: -50, yPercent: -50, y: 30 },
                { autoAlpha: 1, xPercent: -50, yPercent: -50, y: 0, duration: inEnd - inStart, ease: 'power2.out', immediateRender: false },
                inStart
              );
              if (outStart !== undefined && outEnd !== undefined) {
                tl.to(titleEl, 
                  { autoAlpha: 0, xPercent: -50, yPercent: -50, y: -24, duration: outEnd - outStart, ease: 'power2.in' },
                  outStart
                );
              }
            }
          }

          if (dockEl) {
            const shiftY = isMobile ? 6 : 10;
            if (isInitial) {
              gsap.set(dockEl, { autoAlpha: 1, y: 0, filter: 'blur(0px)' });
              if (outStart !== undefined && outEnd !== undefined) {
                tl.to(dockEl,
                  { autoAlpha: 0, y: -shiftY, filter: 'blur(6px)', duration: outEnd - outStart, ease: 'power2.in' },
                  outStart
                );
              }
            } else {
              gsap.set(dockEl, { autoAlpha: 0, y: shiftY, filter: 'blur(6px)' });
              tl.fromTo(dockEl,
                { autoAlpha: 0, y: shiftY, filter: 'blur(6px)' },
                { autoAlpha: 1, y: 0, filter: 'blur(0px)', duration: inEnd - inStart, ease: 'power3.out', immediateRender: false },
                inStart
              );
              if (outStart !== undefined && outEnd !== undefined) {
                tl.to(dockEl,
                  { autoAlpha: 0, y: -shiftY, filter: 'blur(6px)', duration: outEnd - outStart, ease: 'power2.in' },
                  outStart
                );
              }
            }
          }
        };

        if (self.isDesktop) {
          // Recalibrated for 933-step timeline (Shot 1 removed, 5 chapters remain).
          // Desktop maps onto DOM chapters 02-06 — chapter 01 (mobile-only Cloudscape) never shows.
          // Chapter 02 (CANADIAN YELLOW PEA): Starts at canvas begin, fades before rice rows
          addChapterAndDock(2, 0.000, 0.000, 0.130, 0.155, true);

          // Chapter 03 (SPROUTED BROWN RICE): Fades in with rice rows, holds, fades before solar flare
          addChapterAndDock(3, 0.170, 0.195, 0.400, 0.425);

          // Chapter 04 (COLD-PRESSED PUMPKIN SEEDS): Fades in as flare clears
          addChapterAndDock(4, 0.460, 0.485, 0.610, 0.635);

          // Chapter 05 (MADAGASCAR VANILLA ORCHID): Cloud orchid entrance
          addChapterAndDock(5, 0.645, 0.670, 0.860, 0.885);

          // Chapter 06 (THE NEW ME PROTEIN): Island packshot, holds to 1.000
          addChapterAndDock(6, 0.910, 0.935);
        } else {
          // Chapter 01: THE NEW ME EXPERIENCE (0% to 9% full opacity, 9% to 12% fade out)
          addChapterAndDock(1, 0.0, 0.0, 0.09, 0.12, true);
          addChapterAndDock(2, 0.13, 0.15, 0.25, 0.27);
          addChapterAndDock(3, 0.28, 0.30, 0.41, 0.43);
          addChapterAndDock(4, 0.47, 0.49, 0.59, 0.61);
          addChapterAndDock(5, 0.65, 0.67, 0.79, 0.81);
          addChapterAndDock(6, 0.90, 0.93);
        }

        return () => {
          // Cleanup handled automatically by matchMedia
        };
      });

      window.addEventListener('load', () => {
        if (window.proteinLenis) {
          window.proteinLenis.scrollTo(0, { immediate: true });
        }
        ScrollTrigger.refresh();
      });
    }

    /**
     * Dual-Engine Lenis Smooth Scroll Manager (/lenis skill)
     * - Desktop & 16:9 Tablets: Silky smooth inertia scrolling (duration: 1.15, wheelMultiplier: 1.0)
     *   with luxury exponential deceleration curve, replacing the heavy "hard-scroll" drag.
     * - Mobile Phones: Direct touch fidelity (syncTouch: true, duration: 0.45) with zero momentum drift.
     */
    initLenis() {
      if (typeof Lenis === 'undefined') return;

      const isMobile = window.innerWidth <= 768;

      const lenis = new Lenis({
        duration: isMobile ? 0.55 : 1.25,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        orientation: 'vertical',
        gestureOrientation: 'vertical',
        smoothWheel: true,
        wheelMultiplier: isMobile ? 0.30 : 0.40,
        touchMultiplier: isMobile ? 0.10 : 0.55, // Brick-wall thumb resistance: stops doom-scrolling
        syncTouch: false,
        infinite: false,
        autoResize: true
      });

      // Synchronize ScrollTrigger on Lenis scroll event
      lenis.on('scroll', ScrollTrigger.update);

      // Drive Lenis via GSAP ticker (/lenis gold standard)
      gsap.ticker.add((time) => {
        lenis.raf(time * 1000);
      });

      // Disable lagSmoothing so GSAP does not jump after heavy thread work
      gsap.ticker.lagSmoothing(0);

      // Ensure Lenis starts at top without jumping
      lenis.scrollTo(0, { immediate: true });

      window.proteinLenis = lenis;
    }

    /**
     * Dual-Engine Dead-Zone Settle Engine (Argon Step 5)
     * Responsive idle delay and duration:
     * - Mobile: 320ms delay, 0.55s snappy settle for immediate clarity.
     * - Desktop / 16:9: 450ms delay, 0.95s velvety glide.
     * If user parked inside a blurry transition gap, smoothly settles to nearest chapter stop.
     * Hands off if user is actively reading visible chapter copy.
     */
    initDeadZoneSettle() {
      let idleTimer = null;
      let isProgrammaticNudge = false;
      const SCENE_STOPS = this.isDesktop
        ? [0.055, 0.235, 0.545, 0.765, 0.945].map(unifiedProgress) // canvas stops mapped onto the unified pin
        : [0.0, 0.20, 0.35, 0.54, 0.73, 1.0];
      const SAFE_TEXT_ZONE_RADIUS = 0.04; // Tighter: forces snap sooner after leaving a chapter

      const isChapterTextOnScreen = () =>
        Array.from(document.querySelectorAll('.editorial-chapter')).some(
          (el) => parseFloat(getComputedStyle(el).opacity) > 0.05
        );

      window.addEventListener(
        'scroll',
        () => {
          if (isProgrammaticNudge || !this.loaderDismissed) return;
          clearTimeout(idleTimer);

          const isMobile = window.innerWidth <= 768;
          const IDLE_DELAY = isMobile ? 140 : 380; // Very fast idle-snap on mobile

          idleTimer = setTimeout(() => {
            const st = this.scrollTrigger || (ScrollTrigger.getById && ScrollTrigger.getById('proteinScrollTrigger'));
            if (!st) return;

            const progress = st.progress;
            // Desktop: never idle-snap during the packshot expansion phase
            const lowerBound = this.isDesktop ? HERO_PHASE_FRACTION : 0.02;
            const upperBound = this.isDesktop ? unifiedProgress(0.98) : 0.98;
            if (progress <= lowerBound || progress >= upperBound) return;

            // 1. Already inside a readable scene window -> do nothing
            const isInReadableZone = SCENE_STOPS.some(
              (stop) => Math.abs(progress - stop) <= SAFE_TEXT_ZONE_RADIUS
            );

            // 2. Chapter copy partially visible -> the user is reading it, hands off
            if (isInReadableZone || isChapterTextOnScreen()) return;

            // 3. Parked in an empty blurry gap -> glide to the nearest scene
            const nearestStop = SCENE_STOPS.reduce((prev, curr) =>
              Math.abs(curr - progress) < Math.abs(prev - progress) ? curr : prev
            );

            const targetScroll = st.start + nearestStop * (st.end - st.start);
            isProgrammaticNudge = true;

            const settleDuration = isMobile ? 0.28 : 0.65; // Snappy chapter lock on mobile

            if (window.proteinLenis) {
              window.proteinLenis.scrollTo(targetScroll, {
                duration: settleDuration,
                easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
                onComplete: () => {
                  setTimeout(() => { isProgrammaticNudge = false; }, 80);
                }
              });
            } else {
              window.scrollTo({
                top: targetScroll,
                behavior: 'smooth'
              });
              setTimeout(() => {
                isProgrammaticNudge = false;
              }, 600);
            }
          }, IDLE_DELAY);
        },
        { passive: true }
      );
    }

    initBarbaLifecycle() {
      // If Barba.js is present, clean up GSAP matchMedia, ScrollTriggers & Lenis on page transition
      if (typeof barba !== 'undefined' && barba.hooks) {
        barba.hooks.leave(() => {
          if (this.mm) {
            this.mm.revert();
          }
          if (window.proteinLenis) {
            window.proteinLenis.destroy();
            window.proteinLenis = null;
          }
          ScrollTrigger.getAll().forEach(t => t.kill());
        });
      }
    }

    updateHUD(progress) {
      if (this.progressBar) {
        this.progressBar.style.width = `${(progress * 100).toFixed(1)}%`;
      }
      if (this.telemetryVal) {
        this.telemetryVal.textContent = `${Math.round(progress * 100)}%`;
      }
      if (this.telemetryFill) {
        this.telemetryFill.style.width = `${(progress * 100).toFixed(1)}%`;
      }
      if (this.specimenDock) {
        this.specimenDock.style.setProperty('--dock-mobile-progress', `${(progress * 100).toFixed(1)}%`);
      }

      // Update Dual White Card Overlays — desktop 5-chapter canvas only.
      // (Cards are display:none on mobile; the 9:16 engine keeps its own specimen dock.)
      if (this.isDesktop && (this.chapterIndexCard || this.nutritionCard)) {
        // Thresholds are canvas-phase values — the unified pin prepends the packshot phase
        const uT = (v) => unifiedProgress(v);
        let activeShot = 1;
        if (progress >= uT(0.910)) activeShot = 5;
        else if (progress >= uT(0.645)) activeShot = 4;
        else if (progress >= uT(0.460)) activeShot = 3;
        else if (progress >= uT(0.170)) activeShot = 2;

        if (this.lastActiveShot !== activeShot) {
          this.lastActiveShot = activeShot;
          const SCENE_DATA = [
            {
              shot: 1,
              badge: "01",
              title: "CANADIAN YELLOW PEA",
              subline: "Naturally fermented for zero bloat.",
              pill: "FERMENTED ISOLATE",
              protein: "80%",
              bcaa: "98%",
              sugar: "0g",
              callout: "Slow water-extracted to eliminate oligosaccharides and lectins, yielding 98% bioavailability without digestive friction."
            },
            {
              shot: 2,
              badge: "02",
              title: "SPROUTED BROWN RICE",
              subline: "Complete essential amino matrix.",
              pill: "BIO-SPROUTED",
              protein: "24g",
              bcaa: "4.8g",
              sugar: "0g",
              callout: "Enzymatically germinated prior to extraction to unlock sulfur-rich aminos, creating a complete biological score equal to whey."
            },
            {
              shot: 3,
              badge: "03",
              title: "COLD-PRESSED PUMPKIN SEEDS",
              subline: "Native zinc & metabolic magnesium power.",
              pill: "AUSTRIAN HARVEST",
              protein: "280mg",
              bcaa: "4.8mg",
              sugar: "0g",
              callout: "Cold-expeller pressed without chemical solvents, supplying native zinc and magnesium for cellular enzyme restoration."
            },
            {
              shot: 4,
              badge: "04",
              title: "MADAGASCAR VANILLA ORCHID",
              subline: "Pure cured Madagascar Planifolia aromatics.",
              pill: "100% REAL BEAN",
              protein: "24g",
              bcaa: "Prebiotic",
              sugar: "0g",
              callout: "Sun-cured Planifolia orchid aromatics harmonized with Belgian chicory inulin and bioactive methylcobalamin B12."
            },
            {
              shot: 5,
              badge: "05",
              title: "THE NEW ME PROTEIN",
              subline: "24g bio-protein, zero bloat formulation.",
              pill: "CLINICAL STANDARD",
              protein: "24g",
              bcaa: "5.2g",
              sugar: "0g",
              callout: "Harmonized with pure Belgian chicory inulin prebiotic fiber and active methylcobalamin B12 for continuous cellular repair."
            }
          ];

          const data = SCENE_DATA[activeShot - 1];
          if (this.chapterCurrentBadge) this.chapterCurrentBadge.textContent = data.badge;
          if (this.chapterActiveTitle) this.chapterActiveTitle.textContent = data.title;
          if (this.chapterActiveSubline) this.chapterActiveSubline.textContent = data.subline;

          if (this.nutritionScenePill) this.nutritionScenePill.textContent = data.pill;
          if (this.metricProteinVal) this.metricProteinVal.textContent = data.protein;
          if (this.metricBcaaVal) this.metricBcaaVal.textContent = data.bcaa;
          if (this.metricSugarVal) this.metricSugarVal.textContent = data.sugar;
          if (this.nutritionCalloutText) this.nutritionCalloutText.textContent = data.callout;

          if (this.chapterDots && this.chapterDots.length > 0) {
            this.chapterDots.forEach(dot => {
              const seekIdx = parseInt(dot.getAttribute('data-chapter-seek'), 10);
              if (seekIdx === activeShot) {
                dot.classList.add('is-active');
              } else {
                dot.classList.remove('is-active');
              }
            });
          }
        }
      }

      // Update active dock chip (01 to 06) if present
      const chips = document.querySelectorAll('.dock-chip');
      if (chips && chips.length > 0) {
        let activeIdx = 1;
        if (this.isDesktop) {
          // 5-chapter 933-step universe — dock chips light up 02-06 (pea through packshot)
          activeIdx = 2;
          if (progress >= 0.910) activeIdx = 6;
          else if (progress >= 0.645) activeIdx = 5;
          else if (progress >= 0.460) activeIdx = 4;
          else if (progress >= 0.170) activeIdx = 3;
        } else {
          if (progress >= 0.88) activeIdx = 6;
          else if (progress >= 0.63) activeIdx = 5;
          else if (progress >= 0.44) activeIdx = 4;
          else if (progress >= 0.26) activeIdx = 3;
          else if (progress >= 0.11) activeIdx = 2;
        }

        chips.forEach((chip) => {
          const num = parseInt(chip.getAttribute('data-chip'), 10);
          if (num === activeIdx) {
            chip.classList.add('active');
          } else {
            chip.classList.remove('active');
          }
        });
      }
      if (this.scrollHint) {
        const hintThreshold = this.isDesktop ? unifiedProgress(0.02) : 0.02;
        if (progress > hintThreshold) {
          this.scrollHint.classList.add('is-hidden');
        } else {
          this.scrollHint.classList.remove('is-hidden');
        }
      }
      if (this.holdIndicator) {
        const holdThreshold = this.isDesktop ? unifiedProgress(0.98) : 0.98;
        if (progress >= holdThreshold) {
          this.holdIndicator.classList.add('is-visible');
        } else {
          this.holdIndicator.classList.remove('is-visible');
        }
      }
    }

    initChapterBarNav() {
      if (!this.chapterDots || this.chapterDots.length === 0) return;
      const SHOT_SEEK_PROGRESS = {
        // canvas-phase stops mapped onto the unified pin (desktop-only chapter card)
        1: unifiedProgress(0.055), // Canadian Yellow Pea Isolate (canvas opening hold)
        2: unifiedProgress(0.235), // Sprouted Brown Rice
        3: unifiedProgress(0.545), // Cold-Pressed Pumpkin Seeds
        4: unifiedProgress(0.765), // Madagascar Vanilla Orchid
        5: unifiedProgress(0.945)  // The New Me Protein Packshot Finale
      };

      this.chapterDots.forEach(dot => {
        dot.addEventListener('click', (e) => {
          e.preventDefault();
          const targetShot = parseInt(dot.getAttribute('data-chapter-seek'), 10);
          const targetProgress = SHOT_SEEK_PROGRESS[targetShot] ?? 0;
          const st = this.scrollTrigger || (ScrollTrigger.getById && ScrollTrigger.getById('proteinScrollTrigger'));
          if (st) {
            const targetScroll = st.start + targetProgress * (st.end - st.start);
            if (window.proteinLenis) {
              window.proteinLenis.scrollTo(targetScroll, {
                duration: 0.85,
                easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t))
              });
            } else {
              window.scrollTo({ top: targetScroll, behavior: 'smooth' });
            }
          }
        });
      });
    }
  }

  // Initialize on DOM load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new ProteinScrollAnimation());
  } else {
    new ProteinScrollAnimation();
  }

  // ============================================================
  // PACKSHOT REVEAL — Phase 0 of the UNIFIED canvas pin (Desktop 16:9)
  // Single section: pill packshot -> scroll expansion -> white bloom ->
  // frame 82 (Pea Isolate). Driven by the canvas ScrollTrigger progress,
  // so there is no separate hero section and no section handoff.
  // ============================================================
  const HERO_PHASE_FRACTION = 0.13;  // hero share of the unified pin scroll (canvas keeps its exact 8400px pacing)
  const HERO_START_WIDTH    = 42;    // % viewport width at progress 0
  const HERO_START_HEIGHT   = 58;    // % viewport height at progress 0
  const HERO_START_RADIUS   = 24;    // pill corner radius px at progress 0
  const HERO_MEDIA_ZOOM     = 1.35;  // media scale at progress 0
  const HERO_SCRIM          = 0.5;   // dark scrim opacity at full expansion
  const HERO_BLOOM_DISSOLVE = 0.045; // canvas progress over which white dissolves to video

  const heroSmoothstep = (e0, e1, x) => {
    const t = Math.min(1, Math.max(0, (x - e0) / ((e1 - e0) || 1e-6)));
    return t * t * (3 - 2 * t);
  };
  // canvas-phase progress (0..1) -> unified pin progress (0..1)
  const unifiedProgress = (canvasP) => HERO_PHASE_FRACTION + canvasP * (1 - HERO_PHASE_FRACTION);
  const heroPhaseOf = (progress) => Math.min(1, Math.max(0, progress / HERO_PHASE_FRACTION));
  const canvasPhaseOf = (progress) => Math.min(1, Math.max(0, (progress - HERO_PHASE_FRACTION) / (1 - HERO_PHASE_FRACTION)));

  const PackshotReveal = {
    layer: null, frame: null, media: null, scrim: null, overlay: null, hint: null, bloom: null,

    init() {
      this.layer = document.getElementById('proteinScrollExpandLayer');
      if (!this.layer) return false;
      this.frame   = this.layer.querySelector('.se-frame');
      this.media   = this.layer.querySelector('.se-media');
      this.scrim   = this.layer.querySelector('.se-scrim');
      this.overlay = this.layer.querySelector('.se-overlay');
      this.hint    = this.layer.querySelector('.se-hint');
      this.bloom   = document.getElementById('seBloomBridge');
      this.update(0);
      return true;
    },

    // Hero phase 0..1: clip-path pill -> fullscreen, unzoom, scrim, closing copy
    apply(p) {
      if (!this.frame || !this.media) return;
      const e  = heroSmoothstep(0, 1, p);
      const w  = HERO_START_WIDTH  + (100 - HERO_START_WIDTH)  * e;
      const h  = HERO_START_HEIGHT + (100 - HERO_START_HEIGHT) * e;
      const ix = Math.max(0, (100 - w) / 2);
      const iy = Math.max(0, (100 - h) / 2);
      const r  = HERO_START_RADIUS * (1 - e);
      this.frame.style.clipPath = `inset(${iy}% ${ix}% ${iy}% ${ix}% round ${r}px)`;
      this.media.style.transform = `scale(${HERO_MEDIA_ZOOM + (1 - HERO_MEDIA_ZOOM) * e})`;

      if (this.scrim) this.scrim.style.opacity = String(HERO_SCRIM * e);

      if (this.overlay) {
        const inn = heroSmoothstep(0.72, 1, p);
        this.overlay.style.opacity   = String(inn);
        this.overlay.style.transform = `translate3d(0,${18 * (1 - inn)}px,0)`;
      }

      if (this.hint) {
        const gone = heroSmoothstep(0, 0.12, p);
        this.hint.style.opacity   = String(1 - gone);
        this.hint.style.transform = `translate3d(0,${8 * gone}px,0)`;
      }
    },

    // White bloom: floods over the fullscreen packshot at the tail of the hero
    // phase, holds through the video start, dissolves into frame 82. Reversible.
    bloomFor(heroP, canvasP) {
      const flood    = heroSmoothstep(0.86, 0.995, heroP);
      const dissolve = 1 - Math.min(1, canvasP / HERO_BLOOM_DISSOLVE);
      return Math.max(0, flood * dissolve);
    },

    update(progress) { // unified trigger.progress 0..1
      if (!this.layer) return;
      const heroP   = heroPhaseOf(progress);
      const canvasP = canvasPhaseOf(progress);
      this.apply(heroP);
      const bloomOp = this.bloomFor(heroP, canvasP);
      if (this.bloom) this.bloom.style.opacity = bloomOp.toFixed(3);
      // The layer hides beneath the near-opaque bloom once the video phase begins
      this.layer.style.visibility = (canvasP > 0 && bloomOp < 0.98) ? 'hidden' : 'visible';
    }
  };

})();
