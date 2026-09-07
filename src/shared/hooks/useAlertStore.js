import { create } from 'zustand';

export const useAlertStore = create((set, get) => ({
  isOpen: false,
  title: '',
  message: '',
  type: 'INFO', // 'JINENDRA' | 'SUCCESS' | 'WARNING' | 'ERROR' | 'INFO' | 'CONFIRM'
  confirmText: 'OK',
  cancelText: null,
  confirmVariant: 'saffron', // 'saffron' | 'primary' | 'emergency'
  onConfirm: null,
  onCancel: null,

  /**
   * Show a single-button notification or multi-button custom alert
   * @param {Object} options
   * @param {string} options.title
   * @param {string} options.message
   * @param {'JINENDRA' | 'SUCCESS' | 'WARNING' | 'ERROR' | 'INFO' | 'CONFIRM'} [options.type='INFO']
   * @param {string} [options.confirmText='OK']
   * @param {string} [options.cancelText]
   * @param {'saffron' | 'primary' | 'emergency'} [options.confirmVariant='saffron']
   * @param {Function} [options.onConfirm]
   * @param {Function} [options.onCancel]
   */
  showAlert: ({
    title = 'Notice',
    message = '',
    type = 'INFO',
    confirmText = 'OK',
    cancelText = null,
    confirmVariant = 'saffron',
    onConfirm = null,
    onCancel = null,
  }) => {
    set({
      isOpen: true,
      title,
      message,
      type,
      confirmText,
      cancelText,
      confirmVariant,
      onConfirm,
      onCancel,
    });
  },

  /**
   * Shortcut for 2-button confirmation dialog
   */
  showConfirm: ({
    title = 'Confirm Action',
    message = 'Are you sure you want to proceed?',
    type = 'CONFIRM',
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    confirmVariant = 'primary',
    onConfirm,
    onCancel = null,
  }) => {
    set({
      isOpen: true,
      title,
      message,
      type,
      confirmText,
      cancelText,
      confirmVariant,
      onConfirm,
      onCancel,
    });
  },

  /**
   * Close the active alert
   */
  closeAlert: () => {
    set({
      isOpen: false,
      onConfirm: null,
      onCancel: null,
    });
  },
}));
