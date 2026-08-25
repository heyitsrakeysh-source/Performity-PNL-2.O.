export function Logo({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden>
      <defs>
        <linearGradient id="perf-mark" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--brand)" />
          <stop offset="100%" stopColor="var(--series-6)" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill="url(#perf-mark)" />
      <path
        d="M10 22V10.5A1.5 1.5 0 0 1 11.5 9h5.2a4.4 4.4 0 0 1 0 8.8H13"
        stroke="#fff"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={className}>
      <span className="text-[15px] font-bold tracking-[-0.03em] text-ink">performity</span>
    </span>
  );
}
