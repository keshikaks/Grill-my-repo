export function SculptureFallback() {
  return (
    <div
      className="relative flex h-[380px] w-full items-center justify-center overflow-hidden rounded-2xl border border-[#E6E1D8] bg-[#F7F5F0] p-6 shadow-sm dark:border-[#2C323D] dark:bg-[#14171F] sm:h-[480px]"
      role="img"
      aria-label="Sculptural representation of an analyzed code repository architecture"
    >
      {/* Background Architectural Grid Pattern */}
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full stroke-[#E2DDD3]/60 dark:stroke-[#262C38]/60"
        fill="none"
      >
        <defs>
          <pattern id="editorial-grid-pattern" width="32" height="32" patternUnits="userSpaceOnUse">
            <path d="M 32 0 L 0 0 0 32" strokeWidth="0.75" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#editorial-grid-pattern)" />
      </svg>

      {/* Warm Ambient Radial Glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute h-64 w-64 rounded-full bg-[#E8DFD1]/50 blur-3xl dark:bg-[#202736]/40"
      />

      {/* Isometric Sculptural Artwork */}
      <div className="relative flex flex-col items-center">
        <svg
          viewBox="0 0 400 360"
          className="h-64 w-64 sm:h-80 sm:w-80"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Base Ceramic Pedestal */}
          <g transform="translate(200, 260)">
            <ellipse cx="0" cy="20" rx="140" ry="42" fill="#E2DDD2" className="dark:fill-[#1F242E]" />
            <ellipse cx="0" cy="10" rx="130" ry="36" fill="#EDE8DD" className="dark:fill-[#262C38]" />
            <ellipse cx="0" cy="0" rx="120" ry="30" fill="#F4EFE6" className="dark:fill-[#2E3544]" />
            <ellipse cx="0" cy="0" rx="116" ry="28" stroke="#D3CCC0" strokeWidth="1.5" className="dark:stroke-[#3B4354]" />
          </g>

          {/* Frosted Glass Core Monolith (Translucent Box) */}
          <g transform="translate(130, 80)">
            {/* Left face */}
            <path
              d="M70 40 L0 80 L0 180 L70 140 Z"
              fill="#EAE4D9"
              fillOpacity="0.82"
              stroke="#D2C9B8"
              strokeWidth="1.5"
              className="dark:fill-[#252C3A] dark:stroke-[#3C4558]"
            />
            {/* Right face */}
            <path
              d="M70 40 L140 80 L140 180 L70 140 Z"
              fill="#F2EDE3"
              fillOpacity="0.9"
              stroke="#D8CFBF"
              strokeWidth="1.5"
              className="dark:fill-[#2B3342] dark:stroke-[#444E62]"
            />
            {/* Top face */}
            <path
              d="M70 40 L140 80 L70 120 L0 80 Z"
              fill="#FCF9F3"
              fillOpacity="0.95"
              stroke="#E2D9CA"
              strokeWidth="1.5"
              className="dark:fill-[#333C4E] dark:stroke-[#4C576D]"
            />

            {/* Internal AST Grid Lines */}
            <path
              d="M70 70 L35 90 M70 100 L105 80 M70 100 L70 140"
              stroke="#8F754E"
              strokeWidth="1.5"
              strokeDasharray="3 3"
              opacity="0.8"
            />
          </g>

          {/* Interlocking Brass Evidence Ring */}
          <ellipse
            cx="200"
            cy="150"
            rx="92"
            ry="46"
            transform="rotate(-22 200 150)"
            stroke="#C5A566"
            strokeWidth="4"
            fill="none"
            opacity="0.9"
          />

          {/* Terracotta Audit Cube */}
          <g transform="translate(85, 140)">
            <path d="M30 10 L0 25 L0 60 L30 45 Z" fill="#A84C32" />
            <path d="M30 10 L60 25 L60 60 L30 45 Z" fill="#C15C3D" />
            <path d="M30 10 L60 25 L30 40 L0 25 Z" fill="#D47355" />
          </g>

          {/* Deep Wine Rubric Plate */}
          <g transform="translate(255, 110)">
            <path d="M30 5 L0 18 L0 44 L30 31 Z" fill="#58242D" />
            <path d="M30 5 L60 18 L60 44 L30 31 Z" fill="#6E2E39" />
            <path d="M30 5 L60 18 L30 31 L0 18 Z" fill="#873C48" />
          </g>

          {/* Delicate Brass Pin */}
          <line
            x1="200"
            y1="50"
            x2="200"
            y2="250"
            stroke="#9E7D46"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <circle cx="200" cy="50" r="4.5" fill="#C5A566" />
        </svg>

        {/* Caption Plate */}
        <div className="mt-2 flex items-center gap-2 rounded-full border border-[#DCD6CA] bg-[#FAF8F5]/90 px-3 py-1 font-mono text-[11px] text-[#6E685F] dark:border-[#353D4D] dark:bg-[#1A1E27]/90 dark:text-[#A0A8B8]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#C15C3D]" aria-hidden="true" />
          <span>SCULPTURAL REPO MONOLITH · AST SYNTAX</span>
        </div>
      </div>
    </div>
  );
}
