import logoUrl from "../assets/brand/logo.png";

interface LogoProps {
  size?: number;
  showWordmark?: boolean;
  animated?: boolean;
  className?: string;
}

// Logo oficial preservada (seção 11). Versão estática com fallback; animação opcional discreta.
export function Logo({ size = 40, animated = false, className = "" }: LogoProps) {
  return (
    <img
      src={logoUrl}
      alt="Nexus Business Manager"
      width={size}
      height={size}
      className={className}
      style={
        animated
          ? { animation: "nexus-fade 0.6s ease both", objectFit: "contain" }
          : { objectFit: "contain" }
      }
      draggable={false}
    />
  );
}
