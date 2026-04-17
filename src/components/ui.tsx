"use client";

import type { ComponentPropsWithoutRef, ReactNode } from "react";
import NextLink from "next/link";
import { Card, Link as HeroLink, cn } from "@heroui/react";
import { buttonVariants, linkVariants } from "@heroui/styles";

type ButtonLinkVariant = "primary" | "secondary" | "tertiary" | "outline" | "ghost" | "danger";
type ButtonLinkSize = "sm" | "md" | "lg";

interface ButtonLinkProps extends Omit<ComponentPropsWithoutRef<typeof NextLink>, "className"> {
  children: ReactNode;
  className?: string;
  size?: ButtonLinkSize;
  variant?: ButtonLinkVariant;
}

interface TextLinkProps extends Omit<ComponentPropsWithoutRef<typeof NextLink>, "className"> {
  children: ReactNode;
  className?: string;
}

export function ButtonLink({
  children,
  className,
  size = "md",
  variant = "primary",
  ...props
}: ButtonLinkProps) {
  return (
    <NextLink
      className={buttonVariants({
        className: cn("no-underline", className),
        size,
        variant,
      })}
      {...props}
    >
      {children}
    </NextLink>
  );
}

export function TextLink({ children, className, ...props }: TextLinkProps) {
  const slots = linkVariants();

  return (
    <NextLink
      className={cn(
        slots.base(),
        "gap-1.5 no-underline font-semibold underline-offset-4 hover:underline",
        className,
      )}
      {...props}
    >
      {children}
      <HeroLink.Icon className={slots.icon()} />
    </NextLink>
  );
}

export function PageShell({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <main className={cn("page-shell", className)}>{children}</main>;
}

export function SectionCard({
  children,
  className,
  variant = "default",
}: {
  children: ReactNode;
  className?: string;
  variant?: "transparent" | "default" | "secondary" | "tertiary";
}) {
  return (
    <Card className={cn("glass-card", className)} variant={variant}>
      {children}
    </Card>
  );
}
