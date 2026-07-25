"use client";

import { useEffect } from "react";

/** Casual copy/image download deterrents on the public site only. */
export function PublicContentProtection({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    const onContextMenu = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("img, picture, [data-protect-media]")) {
        event.preventDefault();
      }
    };
    const onDragStart = (event: DragEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("img, picture, [data-protect-media]")) {
        event.preventDefault();
      }
    };
    const onCopy = (event: ClipboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, [contenteditable='true']")) {
        return;
      }
      event.preventDefault();
    };
    document.addEventListener("contextmenu", onContextMenu);
    document.addEventListener("dragstart", onDragStart);
    document.addEventListener("copy", onCopy);
    return () => {
      document.removeEventListener("contextmenu", onContextMenu);
      document.removeEventListener("dragstart", onDragStart);
      document.removeEventListener("copy", onCopy);
    };
  }, []);

  return <div className="public-site public-site-protect">{children}</div>;
}
