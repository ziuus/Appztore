import { useState } from "react";

interface SpotlightButtonProps {
  children: React.ReactNode;
  onClick?: (e: any) => void;
  className?: string;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "ghost" | "action";
}

export const SpotlightButton = ({
  children,
  onClick,
  className = "",
  disabled = false,
  variant = "primary",
}: SpotlightButtonProps) => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const variants = {
    primary: "bg-[#2E6F40] text-[#CFFFDC] border-[#68BA7F]/20",
    secondary: "bg-white/5 border-white/10 text-white/70",
    ghost: "bg-transparent border-transparent text-white/40",
    action:
      "bg-gradient-to-r from-[#2E6F40] to-[#68BA7F] text-black font-black",
  };

  return (
    <button
      disabled={disabled}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
      className={`relative overflow-hidden rounded-2xl border transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${className}`}
    >
      <div
        className="pointer-events-none absolute -inset-px transition-opacity duration-300"
        style={{
          opacity: isHovered ? 1 : 0,
          background: `radial-gradient(600px circle at ${position.x}px ${position.y}px, rgba(104, 186, 127, 0.15), transparent 40%)`,
        }}
      />
      <div className="relative z-10">{children}</div>
    </button>
  );
};
