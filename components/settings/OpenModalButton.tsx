"use client";

import { useModals, type ModalKey } from "@/components/modals/ModalsProvider";

export default function OpenModalButton({
  modalKey,
  className = "btn btn-outline",
  children,
}: {
  modalKey: Exclude<ModalKey, null>;
  className?: string;
  children: React.ReactNode;
}) {
  const { open } = useModals();
  return (
    <button type="button" onClick={() => open(modalKey)} className={className}>
      {children}
    </button>
  );
}
