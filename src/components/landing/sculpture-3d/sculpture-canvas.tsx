"use client";

import { useEffect, useState, Component, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { SculptureFallback } from "./sculpture-fallback";

// WebGL Error Boundary to catch render failures gracefully
interface WebGLBoundaryProps {
  children: ReactNode;
  fallback: ReactNode;
}

interface WebGLBoundaryState {
  hasError: boolean;
}

class WebGLErrorBoundary extends Component<WebGLBoundaryProps, WebGLBoundaryState> {
  constructor(props: WebGLBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  override componentDidCatch() {
    // Graceful error logging without spamming
  }

  override render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

// Dynamically import the 3D scene (client-side only, no SSR)
const DynamicRepoSculpture = dynamic(
  () =>
    import("./repo-sculpture").then((mod) => ({
      default: mod.RepoSculpture,
    })),
  {
    ssr: false,
    loading: () => <SculptureFallback />,
  }
);

export function SculptureCanvas() {
  const [mounted, setMounted] = useState(false);
  const [webGLSupported, setWebGLSupported] = useState(true);
  const [activeElement, setActiveElement] = useState<string>("AST Core");

  useEffect(() => {
    setMounted(true);

    // Verify WebGL support
    try {
      const canvas = document.createElement("canvas");
      const gl =
        canvas.getContext("webgl2") ||
        canvas.getContext("webgl") ||
        canvas.getContext("experimental-webgl");
      if (!gl) {
        setWebGLSupported(false);
      }
    } catch {
      setWebGLSupported(false);
    }
  }, []);

  if (!mounted || !webGLSupported) {
    return <SculptureFallback />;
  }

  return (
    <div className="relative flex h-[380px] w-full flex-col items-center justify-center overflow-hidden rounded-2xl border border-[#E6E1D8] bg-[#F7F5F0] p-3 shadow-sm transition-colors dark:border-[#2C323D] dark:bg-[#14171F] sm:h-[480px]">
      {/* Background Architectural Grid Pattern */}
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full stroke-[#E2DDD3]/50 dark:stroke-[#262C38]/50"
        fill="none"
      >
        <defs>
          <pattern id="canvas-grid-pattern" width="32" height="32" patternUnits="userSpaceOnUse">
            <path d="M 32 0 L 0 0 0 32" strokeWidth="0.75" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#canvas-grid-pattern)" />
      </svg>

      {/* Floating Spatial Annotation Badges */}
      <div className="pointer-events-none absolute top-4 left-4 z-10 flex flex-col gap-1.5">
        <div className="inline-flex items-center gap-2 rounded-full border border-[#DCD6CA] bg-[#FAF8F5]/90 px-3 py-1 font-mono text-[10px] font-medium text-[#5C5852] backdrop-blur-sm dark:border-[#333A48] dark:bg-[#181C26]/90 dark:text-[#9DA6B8]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#C15C3D]" aria-hidden="true" />
          <span>SCULPTURE // {activeElement.toUpperCase()}</span>
        </div>
      </div>

      <div className="pointer-events-none absolute bottom-4 right-4 z-10 hidden sm:block">
        <p className="font-mono text-[10px] text-[#8C867C] dark:text-[#7A8394]">
          DRAG OR MOVE TO TILT · INTERACTIVE 3D
        </p>
      </div>

      {/* 3D Canvas Canvas with Error Boundary */}
      <WebGLErrorBoundary fallback={<SculptureFallback />}>
        <div className="relative h-full w-full cursor-grab active:cursor-grabbing">
          <DynamicRepoSculpture onInteract={(el) => setActiveElement(el)} />
        </div>
      </WebGLErrorBoundary>
    </div>
  );
}
