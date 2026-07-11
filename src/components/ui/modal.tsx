"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  closeOnBackdrop?: boolean;
}

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  className,
  closeOnBackdrop = true,
}: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="presentation"
      onMouseDown={(event) => {
        if (
          closeOnBackdrop &&
          dialogRef.current &&
          !dialogRef.current.contains(event.target as Node)
        ) {
          onClose();
        }
      }}
    >
      <div className="absolute inset-0 bg-text-primary/40" aria-hidden="true" />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === "string" ? title : "Dialog"}
        className={cn(
          "relative z-10 flex max-h-[min(90dvh,40rem)] w-full max-w-lg flex-col overflow-hidden rounded-radius-lg border border-border bg-grad-card shadow-lg",
          className,
        )}
      >
        {title ? (
          <div className="shrink-0 border-b border-border px-4 py-4 sm:px-6">
            <div className="text-lg font-medium text-text-primary">{title}</div>
          </div>
        ) : null}
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">
          {children}
        </div>
        {footer ? (
          <div className="shrink-0 border-t border-border px-4 py-4 sm:px-6">
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
