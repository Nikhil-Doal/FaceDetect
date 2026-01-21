"use client";

import Silk from "@/components/Silk";

interface SilkBackgroundProps {
  color?: string;
}

export default function SilkBackground({ color = "#ff0000" }: SilkBackgroundProps) {
  return (
    <div className="fixed inset-0 -z-10">
      <Silk
        speed={4}
        scale={0.75}
        noiseIntensity={10}
        color={color}
        rotation={75}
      />
    </div>
  );
}
