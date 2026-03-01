export type StockStatus = "InStock" | "LowStock" | "OutOfStock" | "Retired";

export type InventoryItem = {
  id: string;
  name: string;
  category: string;
  office: string;
  location: string;
  qty: number;
  lowStockLevel: number;
  criticalLevel: number;
  maxLevel: number;
  reorderPoint: number;
  avgDailyUsage: number;
  top5: boolean;
  updatedAt: string;
};

export type StockAdjustmentType = "Add" | "Remove";

export type StockAdjustment = {
  id: string;
  itemId: string;
  itemName: string;
  type: StockAdjustmentType;
  quantity: number; // positive for Add, negative for Remove stored as signed in UI
  reason?: string;
  date: string;
  createdAt: string;
  office: string;
};

export type InventoryChangeLog = {
  id: string;
  timestamp: string;
  office: string;
  itemId?: string;
  itemName: string;
  action: string;
  details?: string;
};

export type AlertType = "OutOfStock" | "Critical" | "LowStock" | "ReorderPoint";
export type AlertPriority = "High" | "Medium" | "Low";

export type Alert = {
  id: string;
  itemId: string;
  itemName: string;
  category: string;
  location: string;
  office: string;
  type: AlertType;
  priority: AlertPriority;
  message: string;
  acknowledged: boolean;
  createdAt: string;
};

export type SettingsModel = {
  accent: string;
  themeMode: "light" | "dark";
  densityMode: "comfortable" | "compact";
  secureSettingsEnabled: boolean;
  adminEmail: string;
  settingsAccessKey: string;
  includeTrackedInAnalytics: boolean;
  showItemId: boolean;
  timezone: string;
  currencyCode: "USD" | "EUR" | "GBP" | "CAD";
  defaultLowStockLevel: number;
  defaultCriticalLevel: number;
  defaultReorderPoint: number;
  defaultMaxLevel: number;
  summaryWatchLimit: number;
  autoRefreshSeconds: number;
  quickAdjustmentStep: number;
  showLowStockOnDashboard: boolean;
  compactMode: boolean;
  dateFormat: "MM/DD/YYYY" | "DD/MM/YYYY";
  syncEnabled: boolean;
  syncIntervalMins: number;
  backupsEnabled: boolean;
  backupFrequency: string;
  shippingLeadTimeDays: number;
  shippingBufferDays: number;
  forecastWindowDays: number;
  lookbackDays: number;
  notificationsEnabled: boolean;
  notifyCritical: boolean;
  notifyLow: boolean;
  notifyOut: boolean;
  notifyReorder: boolean;
  autoReorderEnabled: boolean;
  reorderToOptimal: boolean;
  requireAdjustmentReason: boolean;
  managerApprovalRequired: boolean;
  exportFormat: string;
  weeklyDigestEnabled: boolean;
  digestRecipients: string;
  sessionTimeoutMins: number;
  auditLogRetentionDays: number;
  allowItemDeletion: boolean;
  requireMfaForManagers: boolean;
  officeThresholds: Array<{
    office: string;
    lowStockLevel: number;
    criticalLevel: number;
    reorderPoint: number;
    maxLevel: number;
  }>;
};
