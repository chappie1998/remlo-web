"use client";

import { useTheme } from "@/components/providers/ThemeProvider";
import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

export default function ThemeToaster({ ...props }: ToasterProps) {
  const { theme } = useTheme();

  return (
    <Sonner
      theme={theme === "system" ? "system" : theme}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
          success:
            "group-[.toaster]:bg-background group-[.toaster]:text-success group-[.toaster]:border-success",
          error:
            "group-[.toaster]:bg-background group-[.toaster]:text-destructive group-[.toaster]:border-destructive",
          info: "group-[.toaster]:bg-background group-[.toaster]:border-blue-500 group-[.toaster]:text-blue-500",
          warning:
            "group-[.toaster]:bg-background group-[.toaster]:border-yellow-500 group-[.toaster]:text-yellow-500",
        },
      }}
      {...props}
    />
  );
}
