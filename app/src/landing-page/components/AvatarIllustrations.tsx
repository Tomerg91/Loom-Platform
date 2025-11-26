/**
 * Abstract SVG avatar illustrations to replace repeated placeholder images
 * Used in testimonials and examples carousels
 */

// Testimonial Avatar 1: Geometric circles with warm colors
export function TestimonialAvatar1() {
  return (
    <svg viewBox="0 0 100 100" className="w-10 h-10">
      <defs>
        <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: "#fbbf24", stopOpacity: 1 }} />
          <stop offset="100%" style={{ stopColor: "#f97316", stopOpacity: 1 }} />
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="45" fill="url(#grad1)" />
      <circle cx="35" cy="40" r="8" fill="white" opacity="0.6" />
      <circle cx="65" cy="40" r="8" fill="white" opacity="0.6" />
      <path d="M 40 60 Q 50 70 60 60" stroke="white" strokeWidth="3" fill="none" />
    </svg>
  );
}

// Testimonial Avatar 2: Geometric squares with purple gradient
export function TestimonialAvatar2() {
  return (
    <svg viewBox="0 0 100 100" className="w-10 h-10">
      <defs>
        <linearGradient id="grad2" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: "#a78bfa", stopOpacity: 1 }} />
          <stop offset="100%" style={{ stopColor: "#7c3aed", stopOpacity: 1 }} />
        </linearGradient>
      </defs>
      <rect x="10" y="10" width="80" height="80" fill="url(#grad2)" rx="8" />
      <rect x="25" y="25" width="20" height="20" fill="white" opacity="0.4" rx="4" />
      <rect x="55" y="25" width="20" height="20" fill="white" opacity="0.4" rx="4" />
      <rect x="40" y="60" width="20" height="15" fill="white" opacity="0.6" rx="3" />
    </svg>
  );
}

// Example Avatar 1: Abstract waves and circles
export function ExampleAvatar1() {
  return (
    <svg viewBox="0 0 280 160" className="w-full h-auto">
      <defs>
        <linearGradient id="exGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: "#fbbf24", stopOpacity: 1 }} />
          <stop offset="100%" style={{ stopColor: "#ec4899", stopOpacity: 1 }} />
        </linearGradient>
      </defs>
      <rect width="280" height="160" fill="#f5f5f5" />
      <circle cx="70" cy="50" r="30" fill="url(#exGrad1)" opacity="0.8" />
      <circle cx="180" cy="80" r="40" fill="#a78bfa" opacity="0.6" />
      <path
        d="M 40 120 Q 60 110 80 120 T 120 120 T 160 120 T 200 120 T 240 120"
        stroke="#7c3aed"
        strokeWidth="3"
        fill="none"
        opacity="0.7"
      />
      <circle cx="240" cy="50" r="20" fill="#06b6d4" opacity="0.5" />
    </svg>
  );
}

// Example Avatar 2: Geometric grid pattern
export function ExampleAvatar2() {
  return (
    <svg viewBox="0 0 280 160" className="w-full h-auto">
      <defs>
        <linearGradient id="exGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: "#7c3aed", stopOpacity: 1 }} />
          <stop offset="100%" style={{ stopColor: "#06b6d4", stopOpacity: 1 }} />
        </linearGradient>
      </defs>
      <rect width="280" height="160" fill="#f9f5ff" />
      <g fill="url(#exGrad2)" opacity="0.4">
        <rect x="30" y="20" width="25" height="25" />
        <rect x="70" y="20" width="25" height="25" />
        <rect x="110" y="20" width="25" height="25" />
        <rect x="150" y="20" width="25" height="25" />
        <rect x="190" y="20" width="25" height="25" />
        <rect x="230" y="20" width="25" height="25" />
      </g>
      <g fill="#a78bfa" opacity="0.7">
        <rect x="30" y="65" width="35" height="35" />
        <rect x="75" y="65" width="35" height="35" />
        <rect x="170" y="65" width="35" height="35" />
        <rect x="215" y="65" width="35" height="35" />
      </g>
      <g fill="#f97316" opacity="0.5">
        <circle cx="50" cy="130" r="12" />
        <circle cx="110" cy="130" r="12" />
        <circle cx="170" cy="130" r="12" />
        <circle cx="230" cy="130" r="12" />
      </g>
    </svg>
  );
}

// Example Avatar 3: Abstract organic shapes
export function ExampleAvatar3() {
  return (
    <svg viewBox="0 0 280 160" className="w-full h-auto">
      <defs>
        <linearGradient id="exGrad3" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: "#ec4899", stopOpacity: 1 }} />
          <stop offset="100%" style={{ stopColor: "#fbbf24", stopOpacity: 1 }} />
        </linearGradient>
      </defs>
      <rect width="280" height="160" fill="#fffbeb" />
      <path
        d="M 40 60 Q 60 30 90 50 Q 110 70 85 95 Q 60 110 40 90 Z"
        fill="url(#exGrad3)"
        opacity="0.7"
      />
      <path
        d="M 150 40 Q 180 35 200 60 Q 210 90 180 110 Q 150 115 140 85 Z"
        fill="#06b6d4"
        opacity="0.6"
      />
      <path
        d="M 220 80 Q 240 70 260 85 Q 265 110 245 120 Q 220 125 215 100 Z"
        fill="#7c3aed"
        opacity="0.5"
      />
      <circle cx="120" cy="130" r="18" fill="#a78bfa" opacity="0.4" />
    </svg>
  );
}
