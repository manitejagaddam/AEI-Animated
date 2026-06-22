"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { motion, useScroll, useTransform, useMotionValueEvent } from "framer-motion";

// Helper to pad numbers to 5 digits (00001 -> 00240)
const padIndex = (num: number) => num.toString().padStart(5, "0");

export default function KeyboardScroll() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [images, setImages] = useState<HTMLImageElement[]>([]);
  const [loadedCount, setLoadedCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFrame, setActiveFrame] = useState(0);
  const [bgColor, setBgColor] = useState("rgb(91, 97, 98)");

  const totalFrames = 240;

  // 1. Preload images
  useEffect(() => {
    let isMounted = true;
    const loadedImages: HTMLImageElement[] = [];
    let count = 0;

    const loadImage = (index: number) => {
      const img = new Image();
      img.src = `/assets/${padIndex(index)}.png`;
      img.onload = () => {
        if (!isMounted) return;
        loadedImages[index - 1] = img;
        count++;
        setLoadedCount(count);

        if (count === totalFrames) {
          setImages(loadedImages);
          setIsLoading(false);
        }
      };
      img.onerror = () => {
        console.error(`Failed to load image at index ${index}`);
        // Increment count even on error to prevent blocking the loader
        count++;
        setLoadedCount(count);
        if (count === totalFrames) {
          setImages(loadedImages);
          setIsLoading(false);
        }
      };
    };

    for (let i = 1; i <= totalFrames; i++) {
      loadImage(i);
    }

    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Framer Motion Scroll Tracking
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  // Map scroll progress (0 -> 1) to frame index (0 -> 239)
  const frameIndexMotion = useTransform(scrollYProgress, [0, 1], [0, totalFrames - 1]);

  // Set active frame and dynamic background color on scroll
  useMotionValueEvent(frameIndexMotion, "change", (latest) => {
    const rounded = Math.min(totalFrames - 1, Math.max(0, Math.round(latest)));
    setActiveFrame(rounded);

    // Dynamic background color interpolation:
    // Frame 1 (progress 0.0): #5B6162 -> RGB(91, 97, 98)
    // Frame 120 (progress 0.5): #4D869D -> RGB(77, 134, 157) [Mid-scroll blue]
    // Frame 240 (progress 1.0): #000000 -> RGB(0, 0, 0)
    const progress = rounded / (totalFrames - 1);
    let r, g, b;
    if (progress < 0.5) {
      const t = progress / 0.5; // 0 to 1
      r = Math.round(91 + (77 - 91) * t);
      g = Math.round(97 + (134 - 97) * t);
      b = Math.round(98 + (157 - 98) * t);
    } else {
      const t = (progress - 0.5) / 0.5; // 0 to 1
      r = Math.round(77 + (0 - 77) * t);
      g = Math.round(134 + (0 - 134) * t);
      b = Math.round(157 + (0 - 157) * t);
    }
    setBgColor(`rgb(${r}, ${g}, ${b})`);
  });

  // 3. Canvas rendering and resize handling
  const drawFrame = useCallback((frame: number) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    const img = images[frame];

    if (!canvas || !ctx || !img) return;

    // Handle high DPI displays
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    // Clear canvas
    ctx.clearRect(0, 0, rect.width, rect.height);

    // Contain fit logic
    const imgWidth = img.width;
    const imgHeight = img.height;
    const canvasWidth = rect.width;
    const canvasHeight = rect.height;

    const imgRatio = imgWidth / imgHeight;
    const canvasRatio = canvasWidth / canvasHeight;

    let drawWidth = canvasWidth;
    let drawHeight = canvasHeight;
    let offsetX = 0;
    let offsetY = 0;

    if (canvasRatio > imgRatio) {
      // Canvas is wider than image aspect ratio -> bound by height
      drawWidth = canvasHeight * imgRatio;
      offsetX = (canvasWidth - drawWidth) / 2;
    } else {
      // Canvas is taller than image aspect ratio -> bound by width
      drawHeight = canvasWidth / imgRatio;
      offsetY = (canvasHeight - drawHeight) / 2;
    }

    ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
  }, [images]);

  // Redraw when active frame or images change
  useEffect(() => {
    if (images.length > 0) {
      requestAnimationFrame(() => drawFrame(activeFrame));
    }
  }, [activeFrame, images, drawFrame]);

  // Handle window resizing
  useEffect(() => {
    const handleResize = () => {
      if (images.length > 0) {
        drawFrame(activeFrame);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [activeFrame, images, drawFrame]);

  // 4. Interpolate typography values
  // Fade beats:
  // Beat 1 (0%): Center
  const opacity1 = useTransform(scrollYProgress, [0, 0.12, 0.18], [1, 1, 0]);
  const y1 = useTransform(scrollYProgress, [0, 0.12, 0.18], [0, 0, -20]);

  // Beat 2 (25%): Left
  const opacity2 = useTransform(scrollYProgress, [0.15, 0.22, 0.32, 0.40], [0, 1, 1, 0]);
  const y2 = useTransform(scrollYProgress, [0.15, 0.22, 0.32, 0.40], [20, 0, 0, -20]);

  // Beat 3 (60%): Right
  const opacity3 = useTransform(scrollYProgress, [0.45, 0.54, 0.66, 0.74], [0, 1, 1, 0]);
  const y3 = useTransform(scrollYProgress, [0.45, 0.54, 0.66, 0.74], [20, 0, 0, -20]);

  // Beat 4 (90%): Center CTA
  const opacity4 = useTransform(scrollYProgress, [0.80, 0.90, 1.0], [0, 1, 1]);
  const y4 = useTransform(scrollYProgress, [0.80, 0.90, 1.0], [20, 0, 0]);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[500vh] transition-colors duration-300 ease-out"
      style={{ backgroundColor: bgColor }}
    >
      {/* Loading overlay */}
      {isLoading && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#5B6162] text-white">
          <div className="flex flex-col items-center space-y-4">
            {/* Minimal Spinner */}
            <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            <div className="text-center font-sans tracking-tight">
              <h2 className="text-lg font-light text-white/90">AEI FIREGUARD</h2>
              <p className="text-xs text-white/50 uppercase tracking-widest mt-1">
                Loading Sequence... {Math.round((loadedCount / totalFrames) * 100)}%
              </p>
            </div>
          </div>
          {/* Subtle loading bar */}
          <div className="absolute bottom-12 left-12 right-12 h-[1px] bg-white/10 overflow-hidden">
            <motion.div 
              className="h-full bg-white/80" 
              style={{ width: `${(loadedCount / totalFrames) * 100}%` }}
              layoutId="loading-bar"
            />
          </div>
        </div>
      )}

      {/* Sticky Canvas Viewport */}
      <div className="sticky top-0 w-full h-screen overflow-hidden flex items-center justify-center">
        <canvas
          ref={canvasRef}
          className="w-full h-full max-w-[100vw] max-h-[100vh] block"
          style={{ mixBlendMode: "normal" }}
        />

        {/* --- Story Overlays --- */}

        {/* 0% Scroll: Centered Intro */}
        <motion.div
          style={{ opacity: opacity1, y: y1 }}
          className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none px-6"
        >
          <div className="text-center max-w-lg mt-[35vh] md:mt-[40vh]">
            <h1 className="text-4xl md:text-6xl font-extralight text-white/90 tracking-tight leading-none">
              AEI Fireguard
            </h1>
            <p className="text-sm md:text-base font-light text-white/50 tracking-wider uppercase mt-4">
              Engineered protection
            </p>
          </div>
        </motion.div>

        {/* 25% Scroll: Left-Aligned Feature */}
        <motion.div
          style={{ opacity: opacity2, y: y2 }}
          className="absolute inset-x-0 top-0 bottom-0 flex items-center justify-start pointer-events-none px-8 md:px-24"
        >
          <div className="max-w-md bg-black/10 backdrop-blur-md p-8 rounded-lg border border-white/5">
            <span className="text-xs font-semibold text-white/40 uppercase tracking-widest">
              01 // Heavy Duty
            </span>
            <h2 className="text-3xl md:text-5xl font-light text-white/95 tracking-tight leading-tight mt-2">
              Built for Extremes
            </h2>
            <p className="text-sm md:text-base text-white/60 font-light mt-4 leading-relaxed">
              Designed to withstand severe industrial environments. Every valve, cylinder, and sensor is calibrated to respond instantly to thermal anomalies.
            </p>
          </div>
        </motion.div>

        {/* 60% Scroll: Right-Aligned Detail */}
        <motion.div
          style={{ opacity: opacity3, y: y3 }}
          className="absolute inset-x-0 top-0 bottom-0 flex items-center justify-end pointer-events-none px-8 md:px-24"
        >
          <div className="max-w-md bg-black/10 backdrop-blur-md p-8 rounded-lg border border-white/5">
            <span className="text-xs font-semibold text-white/40 uppercase tracking-widest">
              02 // Inspection
            </span>
            <h2 className="text-3xl md:text-5xl font-light text-white/95 tracking-tight leading-tight mt-2">
              Layered Protection
            </h2>
            <p className="text-sm md:text-base text-white/60 font-light mt-4 leading-relaxed">
              Peel back the frame. Inside the engine bay lies a complex matrix of fire suppressors, specialized piping, and sensors designed to isolate and eliminate fire.
            </p>
          </div>
        </motion.div>

        {/* 90% Scroll: Centered CTA */}
        <motion.div
          style={{ opacity: opacity4, y: y4 }}
          className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none px-6"
        >
          <div className="text-center max-w-xl mb-[35vh] md:mb-[40vh] bg-black/20 backdrop-blur-md p-8 rounded-2xl border border-white/5">
            <h2 className="text-4xl md:text-6xl font-light text-white/90 tracking-tight leading-none">
              Secured. Ready.
            </h2>
            <p className="text-sm md:text-base text-white/50 font-light mt-4">
              Integrated suppression systems for heavy mining and machinery.
            </p>
            <div className="mt-8 flex justify-center gap-4 pointer-events-auto">
              <button className="px-6 py-3 bg-white text-black font-medium text-sm rounded-full hover:bg-white/90 transition-all duration-300 shadow-lg tracking-tight">
                Explore Systems
              </button>
              <button className="px-6 py-3 border border-white/20 text-white font-medium text-sm rounded-full hover:bg-white/10 transition-all duration-300 tracking-tight">
                Get in Touch
              </button>
            </div>
            <p className="text-[10px] text-white/30 uppercase tracking-widest mt-8 animate-pulse">
              Scroll back up to replay
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
