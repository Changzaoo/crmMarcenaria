import { ReactNode } from "react";

/* Primitivos visuais do estúdio — estética premium escura/champagne.
   Mantidos pequenos para os painéis ficarem enxutos. */

export function Panel({
  title,
  children,
  className = "",
  actions,
}: {
  title?: string;
  children: ReactNode;
  className?: string;
  actions?: ReactNode;
}) {
  return (
    <div
      className={`rounded-xl border border-champagne/15 bg-[rgba(18,16,14,0.82)] backdrop-blur-md shadow-card ${className}`}
    >
      {title && (
        <div className="flex items-center justify-between border-b border-champagne/10 px-4 py-2.5">
          <h3 className="text-[11px] font-semibold uppercase tracking-widest2 text-champagne/80">
            {title}
          </h3>
          {actions}
        </div>
      )}
      {children}
    </div>
  );
}

export function Btn({
  children,
  onClick,
  variant = "ghost",
  size = "md",
  disabled,
  active,
  title,
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "ghost" | "danger";
  size?: "sm" | "md";
  disabled?: boolean;
  active?: boolean;
  title?: string;
  className?: string;
}) {
  const base =
    "inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition disabled:opacity-40 disabled:pointer-events-none select-none";
  const sizes = size === "sm" ? "px-2.5 py-1.5 text-xs" : "px-3.5 py-2 text-sm";
  const variants =
    variant === "primary"
      ? "bg-champagne/90 text-background hover:bg-champagne"
      : variant === "danger"
      ? "border border-red-400/30 text-red-300 hover:bg-red-500/10"
      : `border border-champagne/20 text-text hover:border-champagne/50 hover:bg-champagne/5 ${
          active ? "bg-champagne/15 border-champagne/50" : ""
        }`;
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${sizes} ${variants} ${className}`}
    >
      {children}
    </button>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] uppercase tracking-wide text-muted">{label}</span>
      {children}
    </label>
  );
}

export function NumberInput({
  value,
  onChange,
  min,
  max,
  step = 1,
  suffix,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
}) {
  return (
    <div className="flex items-center rounded-lg border border-champagne/20 bg-surface/60 focus-within:border-champagne/50">
      <input
        type="number"
        value={Number.isFinite(value) ? value : 0}
        min={min}
        max={max}
        step={step}
        onChange={(e) => {
          const v = parseFloat(e.target.value);
          if (Number.isFinite(v)) onChange(v);
        }}
        className="w-full bg-transparent px-3 py-2 text-sm text-text outline-none [appearance:textfield]"
      />
      {suffix && <span className="px-2 text-xs text-muted">{suffix}</span>}
    </div>
  );
}

export function Slider({
  value,
  onChange,
  min,
  max,
  step = 1,
}: {
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
}) {
  return (
    <input
      type="range"
      value={value}
      min={min}
      max={max}
      step={step}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-champagne/15 accent-champagne"
    />
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex rounded-lg border border-champagne/20 p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition ${
            value === o.value ? "bg-champagne/20 text-text" : "text-muted hover:text-text"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between rounded-lg border border-champagne/15 px-3 py-2 text-sm text-text hover:border-champagne/40"
    >
      <span>{label}</span>
      <span
        className={`relative h-5 w-9 rounded-full transition ${checked ? "bg-champagne/80" : "bg-surfaceSoft"}`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-background transition ${
            checked ? "left-4" : "left-0.5"
          }`}
        />
      </span>
    </button>
  );
}
