import type { ButtonHTMLAttributes } from "react";

type ForgeButtonVariant = "metal" | "hot" | "subtle";
type ForgeButtonSize = "sm" | "md";

export type ForgeButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ForgeButtonVariant;
  size?: ForgeButtonSize;
};

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function ForgeButton({
  variant = "metal",
  size = "md",
  className,
  type = "button",
  ...props
}: ForgeButtonProps) {
  return (
    <button
      type={type}
      className={cx(
        "forge-btn",
        `forge-btn--${variant}`,
        size === "sm" ? "forge-btn--sm" : "forge-btn--md",
        className
      )}
      {...props}
    />
  );
}

