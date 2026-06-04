import React, { useEffect } from "react";
import { colors } from "../../theme";
import { defaultMessages, type AppModalProps, type ModalType } from "./types";
import {
  overlayStyle,
  cardStyle,
  iconContainerStyle,
  iconTextStyle,
  titleStyle,
  messageStyle,
  actionsStyle,
  confirmButtonStyle,
  cancelButtonStyle,
} from "./styles";

const iconMap: Record<ModalType, { char: string; bg: string }> = {
  success: { char: "✓", bg: colors.success },
  error: { char: "✕", bg: colors.danger },
  warning: { char: "!", bg: colors.warning },
  info: { char: "i", bg: colors.info },
};

export function AppModal({
  visible,
  type,
  title,
  message,
  confirmText = "OK",
  cancelText,
  onConfirm,
  onCancel,
  onClose,
}: AppModalProps) {
  useEffect(() => {
    if (visible) {
      const handleEsc = (e: KeyboardEvent) => {
        if (e.key === "Escape") onClose?.();
      };
      document.addEventListener("keydown", handleEsc);
      return () => document.removeEventListener("keydown", handleEsc);
    }
  }, [visible, onClose]);

  if (!visible) return null;

  const { char, bg } = iconMap[type];

  const handleConfirm = () => {
    onConfirm?.();
    onClose?.();
  };

  const handleCancel = () => {
    onCancel?.();
    onClose?.();
  };

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={cardStyle} onClick={(e) => e.stopPropagation()}>
        <div style={iconContainerStyle(bg)}>
          <span style={iconTextStyle}>{char}</span>
        </div>
        <h2 style={titleStyle}>{title}</h2>
        <p style={messageStyle}>{message}</p>
        <div style={actionsStyle}>
          {cancelText && (
            <button style={cancelButtonStyle} onClick={handleCancel}>
              {cancelText}
            </button>
          )}
          <button style={confirmButtonStyle} onClick={handleConfirm}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

export { defaultMessages };
export type { ModalType, AppModalProps };
