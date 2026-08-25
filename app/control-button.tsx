"use client";

export function ControlButton({
  icon,
  label,
  active,
  danger,
  disabled,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  danger?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      aria-label={label}
      title={label}
      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors duration-150 [&_svg]:h-[18px] [&_svg]:w-[18px] ${
        disabled
          ? "pointer-events-none text-zinc-600 opacity-40"
          : danger
            ? "bg-red-600 text-white hover:bg-red-500"
            : active
              ? "bg-white text-zinc-900 shadow-sm"
              : "text-zinc-300 hover:bg-white/10 hover:text-white"
      }`}
    >
      {icon}
    </button>
  );
}
