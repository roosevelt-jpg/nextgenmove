"use client";

/**
 * Soft talent-connection atmosphere: dots linked by faint arcs (purple→amber).
 * Decorative only — pointer-events-none; animations honor prefers-reduced-motion via globals.css.
 */
export function TalentConnectionsBg() {
  return (
    <div
      className="talent-connections-bg pointer-events-none absolute inset-0 -z-10 overflow-hidden opacity-[0.22]"
      aria-hidden
    >
      <svg
        className="h-full w-full"
        viewBox="0 0 1200 800"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <linearGradient id="talent-arc" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#4B3F9C" stopOpacity="0.7" />
            <stop offset="55%" stopColor="#3C3489" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#C97A2E" stopOpacity="0.7" />
          </linearGradient>
        </defs>
        <g className="talent-arcs" fill="none" stroke="url(#talent-arc)" strokeWidth="1">
          <path d="M80 620 Q 300 200 520 480" className="talent-arc-draw" />
          <path d="M200 140 Q 480 80 760 320" className="talent-arc-draw" />
          <path d="M420 700 Q 650 360 980 520" className="talent-arc-draw" />
          <path d="M60 300 Q 400 500 900 180" className="talent-arc-draw" />
          <path d="M300 80 Q 700 600 1100 240" className="talent-arc-draw" />
        </g>
        <g fill="#4B3F9C">
          <circle className="talent-dot" cx="80" cy="620" r="3.5" />
          <circle className="talent-dot" cx="520" cy="480" r="3" />
          <circle className="talent-dot" cx="200" cy="140" r="3.5" />
          <circle className="talent-dot" cx="760" cy="320" r="3" />
          <circle className="talent-dot" cx="420" cy="700" r="3" />
          <circle className="talent-dot" cx="980" cy="520" r="3.5" />
          <circle className="talent-dot" cx="60" cy="300" r="3" />
          <circle className="talent-dot" cx="900" cy="180" r="3.5" />
          <circle className="talent-dot" cx="300" cy="80" r="3" />
          <circle className="talent-dot" cx="1100" cy="240" r="3.5" />
          <circle className="talent-dot" cx="640" cy="560" r="2.5" fill="#C97A2E" />
          <circle className="talent-dot" cx="1040" cy="640" r="3" fill="#C97A2E" />
        </g>
      </svg>
    </div>
  );
}
