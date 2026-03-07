// Custom ID Icon (replaces emoji 🆔)

interface IDIconProps {
  size?: number
  className?: string
}

export default function IDIcon({ size = 24, className = '' }: IDIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Badge/Card Background */}
      <rect
        x="3"
        y="5"
        width="18"
        height="14"
        rx="2"
        fill="currentColor"
        fillOpacity="0.1"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      
      {/* Profile Icon Circle */}
      <circle
        cx="8"
        cy="12"
        r="2.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      
      {/* ID Lines */}
      <line
        x1="13"
        y1="10"
        x2="18"
        y2="10"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <line
        x1="13"
        y1="14"
        x2="18"
        y2="14"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  )
}
