import { useEffect, useRef, useState } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

/** A bounded, deterministic coherent field; no per-frame allocations or image assets. */
export function HeroField() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    const hero = canvas?.parentElement;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !hero || !ctx) return;
    const desktop = matchMedia("(min-width: 1024px) and (pointer: fine)");
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    let width = 0, height = 0, raf = 0, visible = true, phase = 0;
    let hairline = "", coral = "";
    const cursor = { x: -1000, y: -1000 };
    const animated = () => desktop.matches && !reduced.matches && navigator.maxTouchPoints === 0;
    const colors = () => {
      const style = getComputedStyle(hero);
      hairline = style.getPropertyValue("--flow-line").trim();
      coral = style.getPropertyValue("--brand").trim();
    };
    const draw = () => {
      const start = performance.now();
      const canRepel = animated() && cursor.x > -500;
      ctx.clearRect(0, 0, width, height);
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.3;
      for (let group = 0; group < 2; group++) {
       ctx.strokeStyle = group === 1 ? coral : hairline;
       ctx.beginPath();
       for (let line = 0; line < 170; line++) {
        if ((line % 13 === 0) !== (group === 1)) continue;
        let x = (line % 17) * width / 16 - 60;
        let y = Math.floor(line / 17) * height / 9 - 80;
        ctx.moveTo(x, y);
        for (let step = 0; step < 28; step++) {
          const angle = Math.sin(x * 0.0022 + phase) * 0.55 + Math.cos(y * 0.003 + phase * 0.6) * 0.45;
          const dx = x - cursor.x, dy = y - cursor.y;
          const distance = canRepel ? Math.sqrt(dx * dx + dy * dy) : 1000;
          const repel = distance < 160 ? (1 - distance / 160) * 4 : 0;
          x += Math.cos(angle) * 12 + dx / Math.max(1, distance) * repel;
          y += Math.sin(angle) * 12 + dy / Math.max(1, distance) * repel;
          ctx.lineTo(x, y);
        }
       }
       ctx.stroke();
      }
      canvas.dataset['frameMs'] = (performance.now() - start).toFixed(3);
      canvas.dataset['mode'] = animated() ? "animated" : "static";
    };
    const loop = () => {
      if (!visible || document.hidden || !animated()) return;
      phase += 0.0015; draw(); raf = requestAnimationFrame(loop);
    };
    const restart = () => { cancelAnimationFrame(raf); draw(); if (visible && !document.hidden && animated()) raf = requestAnimationFrame(loop); };
    const resize = () => {
      const rect = hero.getBoundingClientRect(); width = rect.width; height = rect.height;
      const dpr = Math.min(devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); colors(); restart();
    };
    const move = (event: PointerEvent) => { const rect = hero.getBoundingClientRect(); cursor.x = event.clientX - rect.left; cursor.y = event.clientY - rect.top; };
    const leave = () => { cursor.x = -1000; cursor.y = -1000; };
    const intersection = new IntersectionObserver(([entry]) => { visible = entry?.isIntersecting ?? false; canvas.dataset['paused'] = String(!visible || document.hidden); restart(); });
    const size = new ResizeObserver(resize);
    const theme = new MutationObserver(() => { colors(); restart(); });
    intersection.observe(hero); size.observe(hero); theme.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    const visibility = () => { canvas.dataset['paused'] = String(!visible || document.hidden); restart(); };
    document.addEventListener("visibilitychange", visibility); hero.addEventListener("pointermove", move); hero.addEventListener("pointerleave", leave);
    desktop.addEventListener("change", restart); reduced.addEventListener("change", restart); resize();
    return () => { cancelAnimationFrame(raf); intersection.disconnect(); size.disconnect(); theme.disconnect(); document.removeEventListener("visibilitychange", visibility); hero.removeEventListener("pointermove", move); hero.removeEventListener("pointerleave", leave); desktop.removeEventListener("change", restart); reduced.removeEventListener("change", restart); };
  }, []);
  return <canvas ref={ref} aria-hidden="true" className="hero-field" />;
}

export function GiantType({ word }: { word: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], ["5%", "-5%"]);
  return <motion.span ref={ref} aria-hidden="true" className="giant-type" style={reduce ? {} : { y }}>{word}</motion.span>;
}

export function FooterWordmark() {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end end"] });
  const clipPath = useTransform(scrollYProgress, [0, 1], ["inset(0 100% 0 0)", "inset(0 0% 0 0)"]);
  return <div ref={ref} aria-hidden="true" className="footer-wordmark"><span>WebZaura</span><motion.span className="wordmark-fill" style={reduce ? {} : { clipPath }}>WebZaura</motion.span></div>;
}

export function HomeIntro() {
  const [show, setShow] = useState(false);
  const reduce = useReducedMotion();
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    try {
      if (reduce || sessionStorage.getItem("webzaura-intro")) return;
      sessionStorage.setItem("webzaura-intro", "1"); setShow(true);
      const timer = setTimeout(() => setShow(false), 700);
      return () => clearTimeout(timer);
    } catch { return; }
  }, [reduce]);
  if (!show || reduce) return null;
  return <motion.div aria-hidden="true" className="home-intro" initial={{ y: 0 }} animate={{ y: "-100%" }} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}><img src="/webzaura-logo.png" width="56" height="56" alt="" /><span>WebZaura</span></motion.div>;
}

export function BackgroundLayers() {
  return <><div aria-hidden="true" className="film-grain" /><div aria-hidden="true" className="viewport-frame" /></>;
}