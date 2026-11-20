// Shared building blocks for every screen. Class names map to src/styles/app.css.
import type { CSSProperties, ReactNode } from 'react';
import { Link } from 'react-router-dom';

const cx = (...names: Array<string | false | undefined>) => names.filter(Boolean).join(' ');

/** One phone-sized screen (390×844 frame on desktop, full screen on phones). */
export function Screen({ className, children }: { className?: string; children: ReactNode }) {
  return <main className={cx('app', className)}>{children}</main>;
}

/** Top bar: [left] [title pill] [right]. Pass `null` to keep an empty 44px slot. */
export function TopBar({ left, right, children, style }: { left?: ReactNode; right?: ReactNode; children: ReactNode; style?: CSSProperties }) {
  return (
    <div className="topbar" style={style}>
      {left ?? <div className="spacer" />}
      {children}
      {right ?? <div className="spacer" />}
    </div>
  );
}

export function TitlePill({ icon, children, fontSize }: { icon: ReactNode; children: ReactNode; fontSize?: number }) {
  return (
    <div className="title-pill">
      {icon}
      <h1 style={fontSize ? { fontSize } : undefined}>{children}</h1>
    </div>
  );
}

/** Round 44px icon link (back / close / pause). */
export function IconLink({ to, label, children, className }: { to: string; label: string; children: ReactNode; className?: string }) {
  return (
    <Link className={cx('icon-btn', className)} to={to} aria-label={label}>
      {children}
    </Link>
  );
}

type ButtonProps = {
  variant?: 'primary' | 'paper';
  size?: 'xl' | 'lg' | 'sm';
  to?: string;
  className?: string;
  style?: CSSProperties;
  disabled?: boolean;
  onClick?: () => void;
  /** 'submit' inside a form; defaults to 'button' */
  type?: 'button' | 'submit';
  children: ReactNode;
};

/** Renders a router Link when `to` is set, otherwise a <button>. */
export function Button({ variant = 'primary', size, to, className, style, disabled, onClick, type = 'button', children }: ButtonProps) {
  const cls = cx('btn', `btn-${variant}`, size && `btn-${size}`, className);
  if (to) {
    return (
      <Link className={cls} to={to} style={style}>
        {children}
      </Link>
    );
  }
  return (
    <button className={cls} type={type} style={style} disabled={disabled} onClick={onClick}>
      {children}
    </button>
  );
}

/** Rounded photo stage. `grow` fills the remaining height. */
export function Stage({
  src,
  alt,
  grow,
  className,
  imgStyle,
  children,
}: {
  src: string;
  alt: string;
  grow?: boolean;
  className?: string;
  imgStyle?: CSSProperties;
  children?: ReactNode;
}) {
  return (
    <div className={cx('stage', grow && 'grow', className)}>
      <img className="cover" src={src} alt={alt} aria-hidden={alt === '' || undefined} style={imgStyle} />
      {children}
    </div>
  );
}

/** Speech bubble in the pup's handwriting font. */
export function Bubble({ children, className, style }: { children: ReactNode; className?: string; style?: CSSProperties }) {
  return (
    <div className={cx('bubble', className)} style={style}>
      {children}
    </div>
  );
}

/**
 * Horizontal gauge. `value` is 0–100, `color` any CSS color or var().
 * `label` names what it measures for screen readers (required: an unnamed meter only reads "24").
 */
export function Meter({
  value,
  label,
  valueText,
  color,
  className,
  style,
}: {
  value: number;
  label: string;
  valueText?: string;
  color?: string;
  className?: string;
  style?: CSSProperties;
}) {
  const v = Math.round(value);
  const fill = { '--v': `${value}%`, ...(color ? { '--c': color } : {}) } as CSSProperties;
  return (
    <span
      className={cx('meter', className)}
      style={style}
      role="meter"
      aria-label={label}
      aria-valuenow={v}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuetext={valueText}
    >
      <i style={fill} />
    </span>
  );
}

/** Label · gauge · number row. */
export function StatRow({ label, value, color, display, numColor }: { label: string; value: number; color?: string; display?: string; numColor?: string }) {
  return (
    <div className="stat">
      <span className="label">{label}</span>
      <Meter value={value} label={label} valueText={display} color={color} />
      <span className="num" style={numColor ? { color: numColor } : undefined}>
        {display ?? value}
      </span>
    </div>
  );
}

export function Chip({ children, outline }: { children: ReactNode; outline?: boolean }) {
  return <span className={cx('chip', outline && 'outline')}>{children}</span>;
}
