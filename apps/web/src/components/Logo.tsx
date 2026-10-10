import logoUrl from "../assets/brand/logo.png";

interface LogoProps {
  size?: number;
  animated?: boolean;
  animation?: "fade" | "heartbeat";
  className?: string;
}

// Logo oficial preservada (seção 11). Animação via CSS (heartbeat = "batida de coração"),
// tecnicamente superior a GIF em peso e nitidez, com fallback estático e respeito a
// prefers-reduced-motion (declarado no keyframe global).
export function Logo({ size = 40, animated = false, animation, className = "" }: LogoProps) {
  const effect =
    animation === "heartbeat"
      ? "nexus-heartbeat 5.2s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite"
      : animated
        ? "nexus-fade 0.6s ease both"
        : "none";
  return (
    <img
      src={logoUrl}
      alt="Nexus Business Manager"
      width={size}
      height={size}
      className={className}
      style={{ animation: effect, objectFit: "contain" }}
      draggable={false}
    />
  );
}
