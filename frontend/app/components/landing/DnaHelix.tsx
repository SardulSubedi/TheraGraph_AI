"use client";

import { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  hue: number; // 0 = pure white, up towards a faint cyan tint
}

interface StrandPoint {
  x: number;
  y: number;
  depth: number; // -1 (back) .. 1 (front)
}

// Tuning constants for the helix + particle field.
const TURNS = 3.1;
const SAMPLES = 132;
const SPIN_SPEED = 0.16; // radians / second — deliberately slow
const HOVER_RADIUS = 78; // px from a strand point that counts as "hovering it"
const MAX_PARTICLES = 240;

export function DnaHelix() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    let width = 0;
    let height = 0;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    const particles: Particle[] = [];
    const pointer = { x: -9999, y: -9999, active: false };
    let lastSpawn = { x: -9999, y: -9999 };
    let rotation = 0;
    let raf = 0;
    let last = performance.now();

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const strandPoints = (rotationValue: number): {
      a: StrandPoint[];
      b: StrandPoint[];
    } => {
      const cx = width / 2;
      const top = height * 0.1;
      const usableH = height * 0.8;
      const amplitude = Math.min(width * 0.16, 150);
      const a: StrandPoint[] = [];
      const b: StrandPoint[] = [];
      for (let i = 0; i < SAMPLES; i++) {
        const t = i / (SAMPLES - 1);
        const y = top + t * usableH;
        const phase = t * TURNS * Math.PI * 2 + rotationValue;
        a.push({ x: cx + Math.sin(phase) * amplitude, y, depth: Math.cos(phase) });
        b.push({
          x: cx + Math.sin(phase + Math.PI) * amplitude,
          y,
          depth: Math.cos(phase + Math.PI),
        });
      }
      return { a, b };
    };

    const spawnParticles = (x: number, y: number, count: number) => {
      const cx = width / 2;
      for (let i = 0; i < count; i++) {
        if (particles.length >= MAX_PARTICLES) break;
        const outward = x >= cx ? 1 : -1;
        const angle = (Math.random() - 0.5) * Math.PI * 0.9;
        const speed = 0.4 + Math.random() * 1.5;
        particles.push({
          x,
          y,
          vx: outward * Math.cos(angle) * speed + (Math.random() - 0.5) * 0.4,
          vy: Math.sin(angle) * speed - 0.2,
          life: 0,
          maxLife: 46 + Math.random() * 70,
          size: 0.7 + Math.random() * 2,
          hue: Math.random() * 0.6,
        });
      }
    };

    const emitFromHover = (points: StrandPoint[]) => {
      if (!pointer.active || reduceMotion) return;
      // Find the nearest strand point to the cursor; only emit if it's close,
      // so particles only fly out of the area the cursor is hovering over.
      let nearest: StrandPoint | null = null;
      let bestDist = HOVER_RADIUS * HOVER_RADIUS;
      for (const p of points) {
        const dx = p.x - pointer.x;
        const dy = p.y - pointer.y;
        const d = dx * dx + dy * dy;
        if (d < bestDist) {
          bestDist = d;
          nearest = p;
        }
      }
      if (!nearest) return;
      // Throttle by cursor travel so the stream feels tied to movement.
      const moved =
        (pointer.x - lastSpawn.x) ** 2 + (pointer.y - lastSpawn.y) ** 2;
      if (moved < 36) return;
      lastSpawn = { x: pointer.x, y: pointer.y };
      spawnParticles(nearest.x, nearest.y, 2 + Math.floor(Math.random() * 2));
    };

    const drawHelix = (a: StrandPoint[], b: StrandPoint[]) => {
      // Rungs (base pairs) first, behind the backbones.
      for (let i = 0; i < a.length; i += 4) {
        const pa = a[i];
        const pb = b[i];
        const frontness = (Math.max(pa.depth, pb.depth) + 1) / 2;
        ctx.strokeStyle = `rgba(210,225,255,${0.05 + frontness * 0.16})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(pa.x, pa.y);
        ctx.lineTo(pb.x, pb.y);
        ctx.stroke();
      }

      const drawStrand = (pts: StrandPoint[]) => {
        ctx.beginPath();
        pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
        ctx.strokeStyle = "rgba(240,246,255,0.22)";
        ctx.lineWidth = 1.5;
        ctx.stroke();
        for (const p of pts) {
          const frontness = (p.depth + 1) / 2;
          const r = 1 + frontness * 2.6;
          ctx.beginPath();
          ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255,255,255,${0.25 + frontness * 0.7})`;
          ctx.fill();
        }
      };
      drawStrand(a);
      drawStrand(b);
    };

    const drawParticles = (dt: number) => {
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life += dt * 60;
        p.x += p.vx * dt * 60;
        p.y += p.vy * dt * 60;
        p.vx *= 0.975;
        p.vy *= 0.975;
        const t = p.life / p.maxLife;
        if (t >= 1) {
          particles.splice(i, 1);
          continue;
        }
        const alpha = (1 - t) * 0.9;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (1 - t * 0.5), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${255 - p.hue * 90},${255 - p.hue * 20},255,${alpha})`;
        ctx.fill();
      }
    };

    const frame = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      if (!reduceMotion) rotation += SPIN_SPEED * dt;

      ctx.clearRect(0, 0, width, height);
      const { a, b } = strandPoints(rotation);
      drawHelix(a, b);
      emitFromHover([...a, ...b]);
      drawParticles(dt);

      raf = requestAnimationFrame(frame);
    };

    const onPointerMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      pointer.active = x >= 0 && x <= width && y >= 0 && y <= height;
      pointer.x = x;
      pointer.y = y;
    };
    const onPointerLeave = () => {
      pointer.active = false;
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerdown", onPointerMove, { passive: true });
    document.addEventListener("pointerleave", onPointerLeave);

    if (reduceMotion) {
      // Draw a single static frame.
      ctx.clearRect(0, 0, width, height);
      const { a, b } = strandPoints(0.7);
      drawHelix(a, b);
    } else {
      raf = requestAnimationFrame(frame);
    }

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerdown", onPointerMove);
      document.removeEventListener("pointerleave", onPointerLeave);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none absolute inset-0 h-full w-full"
    />
  );
}
