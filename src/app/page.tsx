import React from "react";
import KeyboardScrollAni from "@/components/KeyboardScrollAni";


export const metadata = {
  title: "AEI Fireguard | Premium Industrial Suppression Systems",
  description: "High-performance automated fire suppression systems engineered for heavy mining, machinery, and extreme industrial environments.",
};

export default function Home() {
  return (
    <main className="relative min-h-screen text-white font-sans selection:bg-white/20">
      {/* The Core Scrollytelling Animation Section */}
      {/* <KeyboardScroll /> */}
      <KeyboardScrollAni />
    </main>
  );
}

