import { useEffect, useState } from "react";

type Variant = "fade" | "slide";

export function PageMotion({
  children,
  variant = "fade",
  delayMs = 0,
}: {
  children: React.ReactNode;
  variant?: Variant;
  delayMs?: number;
}) {
  const [mountKey, setMountKey] = useState(0);

  // retrigger on mount
  useEffect(() => {
    setMountKey((k) => k + 1);
  }, []);

  return (
    <div key={mountKey}>
      <style>{`
        @keyframes forgeFadeIn {
          from { opacity: 0; transform: translateY(0px); }
          to   { opacity: 1; transform: translateY(0px); }
        }
        @keyframes forgeSlideIn {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0px); }
        }

        .forge-anim { opacity: 0; will-change: transform, opacity; }
        .forge-anim--fade  { animation: forgeFadeIn 320ms ease forwards; }
        .forge-anim--slide { animation: forgeSlideIn 360ms ease forwards; }

        @media (prefers-reduced-motion: reduce) {
          .forge-anim { opacity: 1 !important; animation: none !important; transform: none !important; }
        }
      `}</style>

      <div
        className={`forge-anim ${variant === "slide" ? "forge-anim--slide" : "forge-anim--fade"}`}
        style={{ animationDelay: `${Math.max(0, delayMs)}ms` }}
      >
        {children}
      </div>
    </div>
  );
}
