import React, { useId } from 'react';

/** Mark for معهد المعرفة / MS Education. */
export default function MsEducationIcon({ size = 40, title = 'MS Education' }) {
  const gradId = `msEducationGrad${useId().replace(/:/g, '')}`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role="img"
      aria-label={title}
    >
      <defs>
        <linearGradient id={gradId} x1="6" y1="4" x2="58" y2="60" gradientUnits="userSpaceOnUse">
          <stop stopColor="#0b3d5c" />
          <stop offset="0.55" stopColor="#1a6bb5" />
          <stop offset="1" stopColor="#1a9b8e" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill={`url(#${gradId})`} />
      <text
        x="32"
        y="42"
        textAnchor="middle"
        fill="#ffffff"
        fontFamily="Segoe UI, Arial, sans-serif"
        fontSize="26"
        fontWeight="700"
      >
        MS
      </text>
    </svg>
  );
}
