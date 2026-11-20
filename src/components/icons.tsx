// Inline SVG icons from the design. All decorative (aria-hidden); give the parent control a label.
import type { CSSProperties } from 'react';

const INK = '#4A2C17';

type IconProps = { size?: number; color?: string; className?: string; style?: CSSProperties };

const svg = (size: number, className?: string, style?: CSSProperties) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  'aria-hidden': true as const,
  className,
  style,
});

export function PawIcon({ size = 18, color = '#E89B3C', className, style }: IconProps) {
  return (
    <svg {...svg(size, className, style)}>
      <ellipse cx="12" cy="16" rx="5" ry="4" fill={color} />
      <circle cx="6" cy="10" r="2" fill={color} />
      <circle cx="10" cy="6.5" r="2" fill={color} />
      <circle cx="14" cy="6.5" r="2" fill={color} />
      <circle cx="18" cy="10" r="2" fill={color} />
    </svg>
  );
}

export function HeartIcon({ size = 18, color = '#D9534F', strokeWidth = 2, className, style }: IconProps & { strokeWidth?: number }) {
  return (
    <svg {...svg(size, className, style)}>
      <path d="M12 21s-7-4.5-9.3-9A5 5 0 0 1 12 6a5 5 0 0 1 9.3 6C19 16.5 12 21 12 21z" fill={color} stroke={INK} strokeWidth={strokeWidth} />
    </svg>
  );
}

export function CoinIcon({ size = 18 }: IconProps) {
  return (
    <svg {...svg(size)}>
      <circle cx="12" cy="12" r="9" fill="#E89B3C" stroke={INK} strokeWidth="2" />
      <circle cx="12" cy="12" r="5" fill="none" stroke="#C97A1F" strokeWidth="2" />
    </svg>
  );
}

export function CoinDotIcon({ size = 12 }: IconProps) {
  return (
    <svg {...svg(size)}>
      <circle cx="12" cy="12" r="9" fill="#E89B3C" stroke={INK} strokeWidth="2.5" />
    </svg>
  );
}

export function BackIcon({ size = 20 }: IconProps) {
  return (
    <svg {...svg(size)}>
      <path d="M15 5l-7 7 7 7" fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function CloseIcon({ size = 16 }: IconProps) {
  return (
    <svg {...svg(size)}>
      <path d="M6 6l12 12M18 6L6 18" stroke={INK} strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function CheckIcon({ size = 24, color = '#B8423D', strokeWidth = 3.4 }: IconProps & { strokeWidth?: number }) {
  return (
    <svg {...svg(size)}>
      <path d="M4 12l5 5L20 5" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function StarIcon({ size = 22, color = '#E89B3C' }: IconProps) {
  return (
    <svg {...svg(size)}>
      <path d="M12 3l2.7 5.6 6.1.8-4.5 4.2 1.1 6-5.4-3-5.4 3 1.1-6L3.2 9.4l6.1-.8z" fill={color} stroke={INK} strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

export function SparkleIcon({ size = 22, color = '#FFD24D', style }: IconProps) {
  return (
    <svg {...svg(size, 'spark', style)}>
      <path d="M12 2l2.2 7.8L22 12l-7.8 2.2L12 22l-2.2-7.8L2 12l7.8-2.2z" fill={color} />
    </svg>
  );
}

export function BowlIcon({ size = 30 }: IconProps) {
  return (
    <svg {...svg(size)}>
      <path d="M3 11h18a9 6 0 0 1-18 0z" fill="#E89B3C" stroke={INK} strokeWidth="2" />
      <circle cx="9" cy="9" r="1.6" fill="#D9534F" stroke={INK} strokeWidth="1.2" />
      <circle cx="13" cy="8.4" r="1.6" fill="#9BC86A" stroke={INK} strokeWidth="1.2" />
      <circle cx="16" cy="9.3" r="1.4" fill="#E89B3C" stroke={INK} strokeWidth="1.2" />
    </svg>
  );
}

export function SteamBowlIcon({ size = 22 }: IconProps) {
  return (
    <svg {...svg(size)}>
      <path d="M3 11h18a9 6 0 0 1-18 0z" fill="#E89B3C" stroke={INK} strokeWidth="2" />
      <path d="M9 8c0-2 2-2 2-4M14 8c0-2 2-2 2-4" fill="none" stroke="#8C6A52" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function ClipboardIcon({ size = 26 }: IconProps) {
  return (
    <svg {...svg(size)}>
      <rect x="5" y="4" width="14" height="17" rx="2" fill="#FFFDF8" stroke={INK} strokeWidth="2" />
      <path d="M9 4V3h6v1" fill="none" stroke={INK} strokeWidth="2" />
      <path d="M8 11l2 2 4-4" fill="none" stroke="#D9534F" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 17h8" stroke="#D9BFA0" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function MissionIcon({ size = 24 }: IconProps) {
  return (
    <svg {...svg(size)}>
      <rect x="4" y="4" width="16" height="17" rx="3" fill="#F3E2C7" stroke={INK} strokeWidth="2" />
      <path d="M8 12l3 3 5-6" fill="none" stroke="#D9534F" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function MailIcon({ size = 24 }: IconProps) {
  return (
    <svg {...svg(size)}>
      <rect x="3" y="6" width="18" height="13" rx="2" fill="#E89B3C" stroke={INK} strokeWidth="2" />
      <path d="M3 8l9 6 9-6" fill="none" stroke={INK} strokeWidth="2" />
    </svg>
  );
}

export function GiftIcon({ size = 24, color = '#F6B5C3', ribbon = INK, strokeWidth = 2 }: IconProps & { ribbon?: string; strokeWidth?: number }) {
  return (
    <svg {...svg(size)}>
      <rect x="4" y="10" width="16" height="11" rx="2" fill={color} stroke={INK} strokeWidth={strokeWidth} />
      <rect x="3" y="7" width="18" height="4" rx="1" fill={color} stroke={INK} strokeWidth={strokeWidth} />
      <path d="M12 7v14M12 7c-2-4-6-3-4 0M12 7c2-4 6-3 4 0" fill="none" stroke={ribbon} strokeWidth={strokeWidth} />
    </svg>
  );
}

export function BallIcon({ size = 30, shine = true }: IconProps & { shine?: boolean }) {
  return (
    <svg {...svg(size)}>
      <circle cx="12" cy="12" r="8" fill="#D9534F" stroke={INK} strokeWidth="2" />
      {shine && <path d="M8 9a5 5 0 0 1 4-2" fill="none" stroke="#FFFDF8" strokeWidth="2" strokeLinecap="round" />}
    </svg>
  );
}

export function DropIcon({ size = 18, shine = false }: IconProps & { shine?: boolean }) {
  return (
    <svg {...svg(size)}>
      <path d="M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11z" fill="#A9D8F0" stroke={INK} strokeWidth="2" />
      {shine && <circle cx="10" cy="14" r="1.6" fill="#FFFDF8" />}
    </svg>
  );
}

export function HouseIcon({ size = 18, door = false }: IconProps & { door?: boolean }) {
  return (
    <svg {...svg(size)}>
      <path d="M3 11l9-7 9 7" fill="none" stroke={INK} strokeWidth={door ? 2 : 2.2} strokeLinejoin="round" />
      <path d="M5 10v10h14V10" fill="#F6B5C3" stroke={INK} strokeWidth="2" />
      {door && <path d="M10 20v-5h4v5" fill="#FFFDF8" stroke={INK} strokeWidth="2" />}
    </svg>
  );
}

export function PinIcon({ size = 16 }: IconProps) {
  return (
    <svg {...svg(size)}>
      <path d="M12 2a7 7 0 0 1 7 7c0 5-7 13-7 13S5 14 5 9a7 7 0 0 1 7-7z" fill="#D9534F" stroke={INK} strokeWidth="2" />
      <circle cx="12" cy="9" r="2.5" fill="#FFFDF8" />
    </svg>
  );
}

export function PauseIcon({ size = 18 }: IconProps) {
  return (
    <svg {...svg(size)}>
      <rect x="5" y="4" width="5" height="16" rx="1.5" fill={INK} />
      <rect x="14" y="4" width="5" height="16" rx="1.5" fill={INK} />
    </svg>
  );
}

export function ClockIcon({ size = 18 }: IconProps) {
  return (
    <svg {...svg(size)}>
      <circle cx="12" cy="13" r="8" fill="#FFFDF8" stroke="#B8423D" strokeWidth="2.5" />
      <path d="M12 9v4l3 2" fill="none" stroke={INK} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function KnifeIcon({ size = 28 }: IconProps) {
  return (
    <svg {...svg(size)}>
      <path d="M4 20L17 7l2 2L6 22z" fill="#FFFDF8" stroke={INK} strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M17 7l2-4 2 2-2 4" fill="#8C6A52" stroke={INK} strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}

export function ThrowUpIcon({ size = 38 }: IconProps) {
  return (
    <svg {...svg(size)}>
      <path d="M12 21V7" stroke="#E89B3C" strokeWidth="3" strokeLinecap="round" />
      <path d="M6 12l6-6 6 6" fill="none" stroke="#E89B3C" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function BathIcon({ size = 26 }: IconProps) {
  return (
    <svg {...svg(size)}>
      <path d="M3 12h18v2a6 6 0 0 1-6 6H9a6 6 0 0 1-6-6z" fill="#A9D8F0" stroke={INK} strokeWidth="2" />
      <circle cx="8" cy="8" r="2" fill="#FFFDF8" stroke={INK} strokeWidth="1.5" />
      <circle cx="13" cy="6" r="2.5" fill="#FFFDF8" stroke={INK} strokeWidth="1.5" />
    </svg>
  );
}

export function BrushIcon({ size = 26 }: IconProps) {
  return (
    <svg {...svg(size)}>
      <rect x="3" y="4" width="18" height="7" rx="3" fill="#E89B3C" stroke={INK} strokeWidth="2" />
      <path d="M6 11v6M9 11v7M12 11v6M15 11v7M18 11v6" stroke={INK} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function NailIcon({ size = 26 }: IconProps) {
  return (
    <svg {...svg(size)}>
      <ellipse cx="12" cy="16" rx="5" ry="4" fill="#F6B5C3" stroke={INK} strokeWidth="1.8" />
      <circle cx="6" cy="10" r="2" fill="#F6B5C3" stroke={INK} strokeWidth="1.5" />
      <circle cx="10" cy="6.5" r="2" fill="#F6B5C3" stroke={INK} strokeWidth="1.5" />
      <circle cx="14" cy="6.5" r="2" fill="#F6B5C3" stroke={INK} strokeWidth="1.5" />
      <circle cx="18" cy="10" r="2" fill="#F6B5C3" stroke={INK} strokeWidth="1.5" />
    </svg>
  );
}

export function HealthIcon({ size = 26 }: IconProps) {
  return (
    <svg {...svg(size)}>
      <path d="M12 21s-7-4.5-9.3-9A5 5 0 0 1 12 6a5 5 0 0 1 9.3 6C19 16.5 12 21 12 21z" fill="#D9534F" stroke={INK} strokeWidth="2" />
      <path d="M6 12h3l1.5-3 2 6 1.5-3h4" fill="none" stroke="#FFFDF8" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}

export function RotateIcon({ size = 18 }: IconProps) {
  return (
    <svg {...svg(size)}>
      <path d="M20 12a8 8 0 1 1-3-6.2" fill="none" stroke={INK} strokeWidth="2.4" strokeLinecap="round" />
      <path d="M18 2v5h-5" fill="none" stroke={INK} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function StoreBoxIcon({ size = 18 }: IconProps) {
  return (
    <svg {...svg(size)}>
      <rect x="3" y="8" width="18" height="12" rx="2" fill="#F3E2C7" stroke={INK} strokeWidth="2" />
      <path d="M2 5h20v3H2zM10 12h4" fill="none" stroke={INK} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function BoneIcon({ size = 34 }: IconProps) {
  return (
    <svg {...svg(size)}>
      <path d="M6 9a2.5 2.5 0 1 1 3-3l6 6a2.5 2.5 0 1 1 3 3 2.5 2.5 0 1 1-3 3l-6-6a2.5 2.5 0 1 1-3-3z" fill="#FFFDF8" stroke={INK} strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

/** Ornamental corner for the "새로 열린 콘텐츠" cards. */
export function CornerOrnament({ className }: { className: string }) {
  return (
    <svg className={`corner ${className}`} viewBox="0 0 12 12" aria-hidden="true">
      <path d="M1.5 10.5C1.5 5 5 1.5 10.5 1.5" fill="none" stroke="#C9A67E" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="4.6" cy="4.6" r="1.3" fill="#C9A67E" />
    </svg>
  );
}
