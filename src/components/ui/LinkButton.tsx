import Link from "next/link";
import type { ComponentProps } from "react";
import { buttonClasses, type ButtonStyleOptions } from "./Button";
import { LinkPending } from "./LinkPending";

type LinkButtonProps = ComponentProps<typeof Link> & Omit<ButtonStyleOptions, "className">;

/** A navigation link styled as a button; shows a spinner while its route loads. */
export function LinkButton({ variant, size, className, children, ...props }: LinkButtonProps) {
  return (
    <Link className={buttonClasses({ variant, size, className })} {...props}>
      <LinkPending />
      {children}
    </Link>
  );
}
