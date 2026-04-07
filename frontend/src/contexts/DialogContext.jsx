import { createContext, useContext, useMemo, useRef, useState } from "react";
import AppDialogModal from "../components/common/AppDialogModal";

const DialogContext = createContext(null);

function useDialogQueue() {
  const queueRef = useRef([]);
  const [activeDialog, setActiveDialog] = useState(null);

  function showNext() {
    setActiveDialog((current) => {
      if (current || queueRef.current.length === 0) {
        return current;
      }
      return queueRef.current.shift();
    });
  }

  function enqueue(dialogPayload) {
    return new Promise((resolve) => {
      queueRef.current.push({ ...dialogPayload, resolve });
      showNext();
    });
  }

  function close(result) {
    setActiveDialog((current) => {
      if (!current) return null;
      current.resolve(result);
      return null;
    });

    // Process next dialog after current one is removed.
    setTimeout(showNext, 0);
  }

  return { activeDialog, enqueue, close };
}

export default function DialogProvider({ children }) {
  const { activeDialog, enqueue, close } = useDialogQueue();

  const contextValue = useMemo(
    () => ({
      confirm(options = {}) {
        return enqueue({
          mode: "confirm",
          title: options.title || "Please confirm",
          message: options.message || "Are you sure you want to continue?",
          confirmLabel: options.confirmLabel || "Confirm",
          cancelLabel: options.cancelLabel || "Cancel",
          danger: !!options.danger,
        });
      },
      alert(options = {}) {
        return enqueue({
          mode: "alert",
          title: options.title || "Notice",
          message: options.message || "Action completed.",
          confirmLabel: options.buttonLabel || "OK",
          danger: !!options.danger,
        }).then(() => undefined);
      },
    }),
    [enqueue],
  );

  return (
    <DialogContext.Provider value={contextValue}>
      {children}
      <AppDialogModal
        open={!!activeDialog}
        mode={activeDialog?.mode}
        title={activeDialog?.title}
        message={activeDialog?.message}
        confirmLabel={activeDialog?.confirmLabel}
        cancelLabel={activeDialog?.cancelLabel}
        danger={activeDialog?.danger}
        onConfirm={() => close(true)}
        onCancel={() => close(false)}
      />
    </DialogContext.Provider>
  );
}

export function useAppDialog() {
  const context = useContext(DialogContext);

  if (!context) {
    throw new Error("useAppDialog must be used within DialogProvider");
  }

  return context;
}
