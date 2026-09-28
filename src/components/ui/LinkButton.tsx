import Link from "next/link";
import type { ComponentProps } from "react";
import { buttonClasses, type ButtonStyleOptions } from "./Button";

type LinkButtonProps = ComponentProps<typeof Link> & Omit<ButtonStyleOptions, "className">;

/** A navigation link styled as a button. */
export function LinkButton({ variant, size, className, ...props }: LinkButtonProps) {
  return <Link className={buttonClasses({ variant, size, className })} {...props} />;
}
