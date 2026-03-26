"use client";

import { useEffect, useRef } from "react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: string;
}

export default function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  width = "max-w-[560px]",
}: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-[1000] p-4"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
      <div
        className={`bg-white border border-border rounded-xl shadow-xl p-7 w-full ${width} max-h-[90vh] overflow-y-auto`}
      >
        <h2 className="text-lg font-bold text-text mb-5">{title}</h2>
        {children}
        {footer && (
          <div className="flex justify-end gap-2 mt-5">{footer}</div>
        )}
      </div>
    </div>
  );
}
