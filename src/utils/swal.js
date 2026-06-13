import Swal from 'sweetalert2';

const BRAND = {
  primary: '#ff7e47',
  primaryDark: '#f97316',
  secondary: '#0b182a',
  success: '#10B981',
  danger: '#EF4444',
  warning: '#F59E0B',
  info: '#3B82F6',
  text: '#1e293b',
  muted: '#64748b',
  surface: '#ffffff',
  border: '#e2e8f0',
};

const basePopup = {
  background: BRAND.surface,
  color: BRAND.text,
  confirmButtonColor: BRAND.primary,
  cancelButtonColor: '#94A3B8',
  buttonsStyling: false,
  customClass: {
    container: 'poch-admin-swal-container',
    popup: 'poch-admin-swal-popup',
    title: 'poch-admin-swal-title',
    htmlContainer: 'poch-admin-swal-text',
    actions: 'poch-admin-swal-actions',
    confirmButton: 'poch-admin-swal-btn poch-admin-swal-btn-confirm',
    cancelButton: 'poch-admin-swal-btn poch-admin-swal-btn-cancel',
    denyButton: 'poch-admin-swal-btn poch-admin-swal-btn-cancel',
    icon: 'poch-admin-swal-icon',
    input: 'poch-admin-swal-input',
    validationMessage: 'poch-admin-swal-validation',
    timerProgressBar: 'poch-admin-swal-timer',
  },
  showClass: {
    popup: 'poch-admin-swal-animate-in',
  },
  hideClass: {
    popup: 'poch-admin-swal-animate-out',
  },
};

const merge = (options = {}) => ({
  ...basePopup,
  ...options,
  customClass: {
    ...basePopup.customClass,
    ...(options.customClass || {}),
  },
});

export const alertSuccess = (title, text = '', options = {}) =>
  Swal.fire(
    merge({
      icon: 'success',
      title,
      text,
      timer: options.timer ?? 2200,
      timerProgressBar: true,
      showConfirmButton: false,
      ...options,
    })
  );

export const alertError = (title, text = '', options = {}) =>
  Swal.fire(
    merge({
      icon: 'error',
      title,
      text,
      confirmButtonText: options.confirmButtonText || 'Got it',
      ...options,
    })
  );

export const alertWarning = (title, text = '', options = {}) =>
  Swal.fire(
    merge({
      icon: 'warning',
      title,
      text,
      confirmButtonText: options.confirmButtonText || 'OK',
      ...options,
    })
  );

export const alertInfo = (title, text = '', options = {}) =>
  Swal.fire(
    merge({
      icon: 'info',
      title,
      text,
      confirmButtonText: options.confirmButtonText || 'OK',
      ...options,
    })
  );

export const confirmAction = (options = {}) =>
  Swal.fire(
    merge({
      icon: 'warning',
      title: options.title || 'Are you sure?',
      text: options.text || '',
      showCancelButton: true,
      confirmButtonText: options.confirmButtonText || 'Confirm',
      cancelButtonText: options.cancelButtonText || 'Cancel',
      reverseButtons: true,
      focusCancel: true,
      ...options,
    })
  );

export const confirmDelete = (options = {}) =>
  confirmAction({
    title: options.title || 'Delete permanently?',
    text: options.text || 'This action cannot be undone.',
    confirmButtonText: options.confirmButtonText || 'Yes, delete',
    ...options,
    customClass: {
      ...basePopup.customClass,
      confirmButton: 'poch-admin-swal-btn poch-admin-swal-btn-danger',
      ...(options.customClass || {}),
    },
  });

export const toast = (title, text = '', options = {}) =>
  Swal.fire(
    merge({
      toast: true,
      position: 'top-end',
      icon: options.icon || 'success',
      title,
      text,
      showConfirmButton: false,
      timer: options.timer ?? 4500,
      timerProgressBar: true,
      background: BRAND.secondary,
      color: '#ffffff',
      customClass: {
        ...basePopup.customClass,
        popup: 'poch-admin-swal-toast',
        title: 'poch-admin-swal-toast-title',
        htmlContainer: 'poch-admin-swal-toast-text',
        timerProgressBar: 'poch-admin-swal-toast-timer',
      },
      ...options,
    })
  );

export const fire = (options = {}) => Swal.fire(merge(options));

export default Swal;
