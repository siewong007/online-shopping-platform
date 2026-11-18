import { RecordModal } from "./RecordModal";

type ConfirmModalProps = {
  cancelLabel?: string;
  confirmLabel: string;
  eyebrow?: string;
  isConfirming?: boolean;
  isOpen: boolean;
  message: string;
  onCancel: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  tone?: "danger" | "warning";
};

/** In-app confirmation modal replacing blocking browser window.confirm dialogs across admin tools. */
export function ConfirmModal({
  cancelLabel = "Cancel",
  confirmLabel,
  eyebrow = "Confirm action",
  isConfirming = false,
  isOpen,
  message,
  onCancel,
  onConfirm,
  title,
  tone = "danger"
}: ConfirmModalProps) {
  return (
    <RecordModal
      eyebrow={eyebrow}
      isBusy={isConfirming}
      isOpen={isOpen}
      onClose={onCancel}
      size="standard"
      statusLabel={tone === "danger" ? "Destructive" : "Review"}
      statusTone={tone}
      title={title}
    >
      <div className="confirm-modal">
        <p className="confirm-modal__message">{message}</p>
        <div className="form-actions split-actions confirm-modal__actions">
          <button
            className="outline-button"
            disabled={isConfirming}
            onClick={onCancel}
            type="button"
          >
            {cancelLabel}
          </button>
          <button
            className={`solid-button${tone === "danger" ? " confirm-modal__danger" : ""}`}
            disabled={isConfirming}
            onClick={() => void onConfirm()}
            type="button"
          >
            {isConfirming ? "Working..." : confirmLabel}
          </button>
        </div>
      </div>
    </RecordModal>
  );
}
