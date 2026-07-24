"use client";
import { useCallback, useRef, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { useModalA11y } from "@/lib/useModalA11y";

type ConfirmState = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
};

const DEFAULT_STATE: ConfirmState = {
  open: false,
  title: "Confirmer la suppression",
  message: "",
  confirmLabel: "Supprimer",
  cancelLabel: "Annuler",
};

export function useConfirm() {
  const [state, setState] = useState<ConfirmState>(DEFAULT_STATE);
  const resolver = useRef<(value: boolean) => void>();

  const confirm = useCallback(
    (message: string, options?: Partial<Pick<ConfirmState, "title" | "confirmLabel" | "cancelLabel">>) => {
      setState({ ...DEFAULT_STATE, ...options, message, open: true });
      return new Promise<boolean>((resolve) => {
        resolver.current = resolve;
      });
    },
    []
  );

  const close = (result: boolean) => {
    setState((s) => ({ ...s, open: false }));
    resolver.current?.(result);
  };

  const dialog = state.open ? (
    <ConfirmDialog
      title={state.title}
      message={state.message}
      confirmLabel={state.confirmLabel}
      cancelLabel={state.cancelLabel}
      onCancel={() => close(false)}
      onConfirm={() => close(true)}
    />
  ) : null;

  return { confirm, dialog };
}

function ConfirmDialog({
  title,
  message,
  confirmLabel,
  cancelLabel,
  onCancel,
  onConfirm,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const dialogRef = useModalA11y<HTMLDivElement>(onCancel, true);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      onClick={onCancel}
    >
      <div
        ref={dialogRef}
        className="card max-w-sm w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-red-50 shrink-0">
            <AlertTriangle className="h-5 w-5 text-red-600" />
          </div>
          <div>
            <h2 id="confirm-dialog-title" className="luxe text-lg">
              {title}
            </h2>
            <p className="mt-1 text-sm opacity-80">{message}</p>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" className="btn" onClick={onCancel} autoFocus>
            {cancelLabel}
          </button>
          <button
            type="button"
            className="btn border-0 bg-red-600 text-white hover:bg-red-700 transition-colors"
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
