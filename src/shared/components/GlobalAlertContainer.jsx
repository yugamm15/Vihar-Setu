import React from 'react';
import { useAlertStore } from '../hooks/useAlertStore';
import { CustomAlertModal } from './CustomAlertModal';

export const GlobalAlertContainer = () => {
  const {
    isOpen,
    title,
    message,
    type,
    confirmText,
    cancelText,
    confirmVariant,
    onConfirm,
    onCancel,
    closeAlert,
  } = useAlertStore();

  return (
    <CustomAlertModal
      visible={isOpen}
      title={title}
      message={message}
      type={type}
      confirmText={confirmText}
      cancelText={cancelText}
      confirmVariant={confirmVariant}
      onConfirm={onConfirm}
      onCancel={onCancel}
      onClose={closeAlert}
    />
  );
};
