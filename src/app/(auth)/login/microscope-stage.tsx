import * as React from "react";

/**
 * Static laboratory microscope illustration with surrounding accent cards,
 * matching medical_lab_login_ui.svg exactly, styled with BenchBook design system tokens.
 */
export function MicroscopeStage({ className = "" }: { className?: string }) {
  return (
    <div className={`relative flex items-center justify-center select-none ${className}`}>
      <svg
        width="380"
        height="260"
        viewBox="40 25 360 275"
        className="w-full max-w-[340px] max-h-[230px] h-auto"
        role="img"
        aria-label="Laboratory microscope and resource reservation cards"
      >
        <defs>
          <linearGradient id="staticOrbGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#dceef4" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#0e6a85" stopOpacity="0.12" />
          </linearGradient>
          <filter id="svgCardShadow" x="-20%" y="-20%" width="150%" height="150%">
            <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#062C36" floodOpacity="0.25" />
          </filter>
        </defs>

        {/* Ambient radial aura backdrop */}
        <circle cx="226" cy="151" r="145" fill="url(#staticOrbGrad)" />
        <circle
          cx="226"
          cy="151"
          r="118"
          fill="#dceef4"
          fillOpacity="0.08"
          stroke="#dceef4"
          strokeOpacity="0.22"
        />
        <circle cx="226" cy="151" r="88" fill="#e6eef1" fillOpacity="0.06" />

        {/* Orbit guide dots matching reference SVG */}
        <circle cx="93" cy="76" r="4.5" fill="#5fb3cc" />
        <circle cx="361" cy="112" r="4" fill="#5fb3cc" opacity="0.85" />
        <circle cx="325" cy="286" r="5" fill="#5fb3cc" opacity="0.75" />
        <circle cx="115" cy="264" r="3.5" fill="#dceef4" opacity="0.9" />

        {/* Stylized vector microscope */}
        <g strokeLinecap="round" strokeLinejoin="round">
          {/* Eyepiece / Ocular */}
          <path
            d="M196 64 L224 40 Q230 35 236 42 L247 54 Q252 60 246 66 L220 88 Z"
            fill="#e6eef1"
            stroke="#9db5c0"
            strokeWidth="2.5"
          />
          <path d="M224 40 L238 55" stroke="#3a8fa8" strokeWidth="5" />

          {/* Body barrel */}
          <path d="M213 80 L242 108" stroke="#e6eef1" strokeWidth="22" />
          <path d="M208 87 L237 116" stroke="#0e6a85" strokeWidth="10" />
          <path d="M232 112 L211 133" stroke="#e6eef1" strokeWidth="19" />

          {/* Objective lenses */}
          <path d="M203 132 L220 147" stroke="#9db5c0" strokeWidth="12" />
          <path d="M210 139 L223 152" stroke="#ffffff" strokeWidth="7" />

          {/* Curved support arm */}
          <path
            d="M225 102 C260 119 273 153 262 186 C254 209 236 223 212 224"
            fill="none"
            stroke="#e6eef1"
            strokeWidth="23"
          />
          <path
            d="M225 102 C260 119 273 153 262 186 C254 209 236 223 212 224"
            fill="none"
            stroke="#5fb3cc"
            strokeWidth="4"
          />

          {/* Coarse and fine focus knobs */}
          <circle cx="249" cy="165" r="18" fill="#dceef4" stroke="#3a8fa8" strokeWidth="3" />
          <circle cx="249" cy="165" r="7" fill="#0e6a85" />
          <circle cx="230" cy="184" r="12" fill="#9db5c0" stroke="#3a8fa8" strokeWidth="3" />

          {/* Specimen stage & slide holder */}
          <path d="M164 183 H248 L263 198 H176 Z" fill="#e6eef1" stroke="#9db5c0" strokeWidth="2" />
          <rect x="185" y="169" width="41" height="8" rx="4" fill="#5fb3cc" />

          {/* Pillar and base foot */}
          <path d="M195 199 L191 240" stroke="#e6eef1" strokeWidth="20" />
          <path d="M191 239 L173 255" stroke="#9db5c0" strokeWidth="17" />
          <path d="M164 255 H257" stroke="#e6eef1" strokeWidth="20" />
          <path d="M154 272 H268" stroke="#3a8fa8" strokeWidth="9" />
          <path d="M171 284 H252" stroke="#e6eef1" strokeWidth="8" />
        </g>

        {/* Card 1: Medical Cross (Static, Left) */}
        <g transform="translate(55 137)" filter="url(#svgCardShadow)">
          <rect width="62" height="62" rx="18" fill="#ffffff" stroke="#d9e1e5" strokeWidth="1.2" />
          <path d="M31 16 V46 M16 31 H46" stroke="#0e6a85" strokeWidth="5" strokeLinecap="round" />
        </g>

        {/* Card 2: Laboratory Flask (Static, Top Right) */}
        <g transform="translate(326 40)" filter="url(#svgCardShadow)">
          <rect width="58" height="58" rx="16" fill="#ffffff" stroke="#d9e1e5" strokeWidth="1.2" />
          <path
            d="M23 14h12 M26 14v12l-10 19q-3 6 5 6h16q8 0 5-6L32 26V14"
            fill="none"
            stroke="#0e6a85"
            strokeWidth="2.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path d="M21 38h20" stroke="#5fb3cc" strokeWidth="4" strokeLinecap="round" />
        </g>

        {/* Card 3: Calendar Schedule (Static, Bottom Right) */}
        <g transform="translate(302 220)" filter="url(#svgCardShadow)">
          <rect width="60" height="60" rx="16" fill="#ffffff" stroke="#d9e1e5" strokeWidth="1.2" />
          <rect
            x="16"
            y="17"
            width="28"
            height="27"
            rx="5"
            fill="none"
            stroke="#0e6a85"
            strokeWidth="2.8"
          />
          <path
            d="M22 12v10M38 12v10M16 26h28"
            stroke="#0e6a85"
            strokeWidth="2.8"
            strokeLinecap="round"
          />
          <path
            d="M22 33h5M33 33h5M22 39h5"
            stroke="#5fb3cc"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </g>
      </svg>
    </div>
  );
}
