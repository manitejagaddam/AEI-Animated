"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { motion, useScroll, useTransform, useMotionValueEvent } from "framer-motion";

// Helper to pad numbers to 5 digits (00001 -> 00240)
const padIndex = (num: number) => num.toString().padStart(5, "0");

export default function KeyboardScrollAni() {
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
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
      img.src = `${basePath}/assets/${padIndex(index)}.png`;
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
      <div className="sticky top-0 w-full h-[100dvh] overflow-hidden flex items-center justify-center p-4 md:p-8">
        <div className="w-full max-w-4xl max-h-[75vh] aspect-video relative flex items-center justify-center bg-black/20 rounded-2xl border border-white/10 shadow-2xl overflow-hidden backdrop-blur-sm">
          <canvas
            ref={canvasRef}
            className="w-full h-full block"
            style={{ mixBlendMode: "normal" }}
          />
        </div>
      </div>
    </div>
  );
}
