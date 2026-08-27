// components/Logo.jsx — Logotipo oficial do sistema (idêntico ao badge da tela de login)
export default function Logo({ size = 36 }) {
  const radius = Math.round(size * 0.26);
  const fontSize = Math.max(7, Math.round(size * 0.16));

  return (
    <div
      style={{
        width: size,
        height: size,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: radius,
        background: 'linear-gradient(135deg, #137f9b, #4566d1)',
        color: '#ffffff',
        fontSize: fontSize,
        fontWeight: 700,
        letterSpacing: '0.01em',
        flexShrink: 0,
        lineHeight: 1,
      }}
    >
      SUALOGO
    </div>
  );
}
