interface LogoGCAPGNProps {
  size?: 'sm' | 'md' | 'lg'
  variant?: 'light' | 'dark'
}

const SIZE_MAP = { sm: 24, md: 40, lg: 56 }

export function LogoGCAPGN({ size = 'md', variant = 'dark' }: LogoGCAPGNProps) {
  const h = SIZE_MAP[size]
  const color = variant === 'dark' ? '#1B4F72' : '#ffffff'
  const textColor = variant === 'dark' ? '#1B4F72' : '#ffffff'
  const fontSize = h * 0.45

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: h * 0.3 }}>
      {/* Mark : lettre G construite en SVG path */}
      <svg
        width={h}
        height={h}
        viewBox="0 0 56 56"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        {/* Cercle de fond */}
        <circle cx="28" cy="28" r="26" fill={color} />
        {/* Lettre G en path SVG — arc + barre horizontale */}
        <path
          d="M38 22.5C35.5 18.5 31.5 16 27 16C20.4 16 15 21.4 15 28C15 34.6 20.4 40 27 40C32.8 40 37.7 36.1 39.4 30.5H27V25.5H44.5V28C44.5 37.1 36.6 44.5 27 44.5C17.3 44.5 9.5 36.7 9.5 27C9.5 17.3 17.3 9.5 27 9.5C32.9 9.5 38.2 12.3 41.5 16.7L38 22.5Z"
          fill="white"
          transform="scale(0.62) translate(3, 3)"
        />
        {/* Version simplifiée du G : arc + barre */}
        <text
          x="28"
          y="36"
          textAnchor="middle"
          fontSize="30"
          fontWeight="700"
          fontFamily="system-ui, sans-serif"
          fill="white"
        >
          G
        </text>
      </svg>

      {/* Wordmark */}
      <span
        style={{
          fontSize,
          fontWeight: 700,
          letterSpacing: '0.02em',
          color: textColor,
          fontFamily: 'system-ui, sans-serif',
          lineHeight: 1,
        }}
      >
        GCAP
        <span style={{ color: '#F39C12', marginLeft: 1 }}>-GN</span>
      </span>
    </div>
  )
}
