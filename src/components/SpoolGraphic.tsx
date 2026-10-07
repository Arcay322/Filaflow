export function SpoolGraphic({
  color = "#2457d6",
  small = false,
}: {
  color?: string;
  small?: boolean;
}) {
  return (
    <svg
      className={small ? "spool-graphic small" : "spool-graphic"}
      viewBox="0 0 160 160"
      aria-hidden="true"
    >
      <circle cx="80" cy="80" r="71" fill="#e8edf3" />
      <circle cx="80" cy="80" r="62" fill={color} />
      {[57, 51, 45, 39, 33].map((r) => (
        <circle
          key={r}
          cx="80"
          cy="80"
          r={r}
          fill="none"
          stroke="#ffffff"
          strokeOpacity=".22"
          strokeWidth="1.5"
        />
      ))}
      <circle cx="80" cy="80" r="23" fill="#e8edf3" />
      <circle cx="80" cy="80" r="12" fill="#fff" />
      {[0, 120, 240].map((angle) => (
        <path
          key={angle}
          d="M76 13h8v24h-8z"
          fill="#ffffff"
          fillOpacity=".65"
          transform={`rotate(${angle} 80 80)`}
        />
      ))}
      <path
        d="M122 124c16 0 23 8 23 22"
        fill="none"
        stroke={color}
        strokeWidth="4"
        strokeLinecap="round"
      />
    </svg>
  );
}
