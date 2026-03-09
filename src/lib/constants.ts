/**
 * System constants
 */

export const CURRENCY = {
  code: 'KES',
  symbol: 'KSh',
} as const;

export const USER_ROLES = {
  ADMIN: 'admin',
  STAFF: 'staff', 
  FARMER: 'farmer',
} as const;

export const NOTIFICATION_TYPES = {
  LOW_STOCK: 'low_stock',
  PAYMENT_CONFIRMATION: 'payment_confirmation',
  AUDIT_REMINDER: 'audit_reminder',
  ADMIN_ALERT: 'admin_alert',
  SYSTEM_UPDATE: 'system_update',
} as const;