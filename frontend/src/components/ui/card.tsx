import * as React from "react";
import { cn } from "@/lib/utils";

export const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("rounded-lg border border-border bg-white shadow-sm", className)}
      {...props}
    />
  )
);
Card.displayName = "Card";

export const CardHeader = (
  props: React.HTMLAttributes<HTMLDivElement>
) => <div className={cn("flex flex-col gap-1 p-6", props.className)} {...props} />;

export const CardTitle = (
  props: React.HTMLAttributes<HTMLHeadingElement>
) => <h2 className={cn("text-lg font-semibold", props.className)} {...props} />;

export const CardDescription = (
  props: React.HTMLAttributes<HTMLParagraphElement>
) => <p className={cn("text-sm text-muted-foreground", props.className)} {...props} />;

export const CardContent = (
  props: React.HTMLAttributes<HTMLDivElement>
) => <div className={cn("p-6 pt-0", props.className)} {...props} />;

export const CardFooter = (
  props: React.HTMLAttributes<HTMLDivElement>
) => <div className={cn("flex items-center p-6 pt-0", props.className)} {...props} />;
