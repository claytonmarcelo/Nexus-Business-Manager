import React from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { colors } from "../../theme";
import {
  defaultMessages,
  type ModalType,
  type AppModalProps,
} from "./types";

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
  const handleConfirm = () => {
    onConfirm?.();
    onClose?.();
  };

  const handleCancel = () => {
    onCancel?.();
    onClose?.();
  };

  const icon = type === "success" ? "✓" : type === "error" ? "✕" : type === "warning" ? "!" : "i";

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={[styles.iconContainer, styles[`icon_${type}`]]}>
            <Text style={styles.iconText}>{icon}</Text>
          </View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <View style={styles.actions}>
            {cancelText && (
              <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
                <Text style={styles.cancelText}>{cancelText}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.confirmButton} onPress={handleConfirm}>
              <Text style={styles.confirmText}>{confirmText}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export { defaultMessages };
export type { ModalType, AppModalProps };
