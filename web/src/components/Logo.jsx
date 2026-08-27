// components/Logo.jsx — Logotipo oficial do sistema (SVG — mesma em todo o sistema)
export default function Logo({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="12" fill="var(--accent, #06b6d4)" />
      <path d="M12 20L24 13L36 20L24 27L12 20Z" fill="#ffffff" />
      <path d="M12 28L24 35L36 28" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 24L24 31L36 24" stroke="#ffffff" strokeOpacity="0.6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
