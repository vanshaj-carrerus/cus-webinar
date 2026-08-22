"use client";

export function ControlButton({
  icon,
  label,
  active,
  danger,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      aria-label={label}
      title={label}
      className={`flex h-12 w-12 items-center justify-center rounded-full transition-colors [&_svg]:h-5 [&_svg]:w-5 ${
        danger
          ? "bg-red-600 text-white hover:bg-red-500"
          : active
            ? "bg-white text-zinc-900"
            : "text-zinc-200 hover:bg-white/15"
      }`}
    >
      {icon}
    </button>
  );
}
