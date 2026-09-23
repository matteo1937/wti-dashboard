type IconProps = { className?: string };

export function AccordionIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden="true">
      <rect x="4" y="10" width="10" height="28" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <rect x="34" y="10" width="10" height="28" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M14 13h20M14 17h20M14 21h20M14 25h20M14 29h20M14 33h20M14 37h20"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinecap="round"
      />
      <circle cx="9" cy="16" r="1.4" fill="currentColor" />
      <circle cx="9" cy="21" r="1.4" fill="currentColor" />
      <circle cx="9" cy="26" r="1.4" fill="currentColor" />
      <circle cx="9" cy="31" r="1.4" fill="currentColor" />
      <rect x="37" y="15" width="4" height="18" rx="1" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

export function DoubleBassIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden="true">
      <rect x="21.6" y="3" width="5" height="5" rx="1.2" stroke="currentColor" strokeWidth="1.3" />
      <path d="M24 8v13.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <ellipse cx="24" cy="24" rx="9.5" ry="7.5" stroke="currentColor" strokeWidth="1.6" />
      <ellipse cx="24" cy="36.5" rx="13" ry="8.5" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M19.5 28c.2 2 1.1 3.6 2.6 4.6M28.5 28c-.2 2-1.1 3.6-2.6 4.6"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
      />
      <path d="M24 21.5v23" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.55" />
    </svg>
  );
}

export function InstagramIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="12" cy="12" r="4.2" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="17.3" cy="6.7" r="1.1" fill="currentColor" />
    </svg>
  );
}

export function CheckCircleIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="9.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8 12.5l2.6 2.6L16.2 9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function SpotifyIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="9.2" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M7 10.2c3.2-1 7-.7 9.8 1"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M7.4 13.2c2.6-.8 5.7-.5 8 .9"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <path
        d="M7.8 16c2-.6 4.4-.4 6.2.7"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  );
}
