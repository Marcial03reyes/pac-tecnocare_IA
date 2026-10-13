import type { ReactNode } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const inputClass = "mt-1 w-full rounded-md border border-[#D9DFEA] bg-white px-3 py-2 text-sm text-[#14213D] focus:outline-none focus:ring-2 focus:ring-[#2F6FDB]";
export const actionClass = "rounded-md bg-[#F28C28] px-3 py-2 text-sm font-semibold text-white disabled:opacity-50";
export function FormField({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block text-xs font-semibold text-[#5B6478]">{label}{children}</label>;
}
export function FormShell({ title, description, onClose, busy, children }: { title: string; description: string; onClose: () => void; busy?: boolean; children: ReactNode }) {
  return <Dialog open onOpenChange={(open) => !open && !busy && onClose()}>
    <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl" onInteractOutside={(event) => busy && event.preventDefault()}>
      <DialogHeader><DialogTitle>{title}</DialogTitle><DialogDescription>{description}</DialogDescription></DialogHeader>
      {children}
    </DialogContent>
  </Dialog>;
}
