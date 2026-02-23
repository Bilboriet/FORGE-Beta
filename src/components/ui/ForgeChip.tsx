import type { ButtonHTMLAttributes } from "react";

export type ForgeChipProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  active?: boolean;
};

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function ForgeChip({ active = false, className, type = "button", ...props }: ForgeChipProps) {
  return (
    <button
      type={type}
      className={cx(
        "forge-chip",
        active ? "forge-chip--active" : "forge-chip--inactive",
        className
      )}
      {...props}
    />
  );
}

