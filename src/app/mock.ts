import dayjs from "dayjs";
import { Alert, InventoryItem, SettingsModel, StockAdjustment } from "./types";

export const offices = ["All Offices", "Austin", "New York", "Wells Fargo Tower", "Electric Road"];

export const items: InventoryItem[] = [
  {
    id: "item-1",
    name: "Dell Latitude 5420",
    category: "Laptops",
    office: "Austin",
    location: "Main Storage",
    qty: 10,
    lowStockLevel: 10,
    criticalLevel: 5,
    maxLevel: 50,
    reorderPoint: 15,
    avgDailyUsage: 0,
    top5: true,
    updatedAt: dayjs().subtract(2, "day").toISOString()
  },
  {
    id: "item-2",
    name: "HP EliteDesk 800",
    category: "Desktops",
    office: "Austin",
    location: "Main Storage",
    qty: 2,
    lowStockLevel: 10,
    criticalLevel: 5,
    maxLevel: 50,
    reorderPoint: 15,
    avgDailyUsage: 0.1,
    top5: true,
    updatedAt: dayjs().subtract(3, "day").toISOString()
  },
  {
    id: "item-3",
    name: "USB-C Docking Station",
    category: "Accessories",
    office: "Austin",
    location: "Secondary Storage",
    qty: 0,
    lowStockLevel: 10,
    criticalLevel: 5,
    maxLevel: 50,
    reorderPoint: 15,
    avgDailyUsage: 0,
    top5: true,
    updatedAt: dayjs().subtract(1, "day").toISOString()
  },
  {
    id: "item-4",
    name: "Conference Room Camera Kit",
    category: "Tracked Equipment",
    office: "Austin",
    location: "Conference Room A",
    qty: 1,
    lowStockLevel: 0,
    criticalLevel: 0,
    maxLevel: 2,
    reorderPoint: 0,
    avgDailyUsage: 0,
    top5: false,
    updatedAt: dayjs().subtract(6, "day").toISOString()
  }
];

export const adjustments: StockAdjustment[] = [
  {
    id: "adj-1",
    itemId: "item-3",
    itemName: "USB-C Docking Station",
    type: "Add",
    quantity: 20,
    reason: "New shipment received",
    date: dayjs().subtract(3, "day").format("MM/DD/YYYY"),
    createdAt: dayjs().subtract(3, "day").toISOString(),
    office: "Austin"
  },
  {
    id: "adj-2",
    itemId: "item-1",
    itemName: "Dell Latitude 5420",
    type: "Remove",
    quantity: -5,
    reason: "Issued to new hires",
    date: dayjs().subtract(8, "day").format("MM/DD/YYYY"),
    createdAt: dayjs().subtract(8, "day").toISOString(),
    office: "Austin"
  },
  {
    id: "adj-3",
    itemId: "item-3",
    itemName: "USB-C Docking Station",
    type: "Remove",
    quantity: -3,
    reason: "Decommissioned units",
    date: dayjs().subtract(10, "day").format("MM/DD/YYYY"),
    createdAt: dayjs().subtract(10, "day").toISOString(),
    office: "Austin"
  }
];

export const alerts: Alert[] = [
  {
    id: "al-1",
    itemId: "item-3",
    itemName: "USB-C Docking Station",
    category: "Accessories",
    location: "loc-2",
    office: "Austin",
    type: "OutOfStock",
    priority: "High",
    message: "USB-C Docking Station is out of stock",
    acknowledged: false,
    createdAt: dayjs().toISOString()
  },
  {
    id: "al-2",
    itemId: "item-2",
    itemName: "HP EliteDesk 800",
    category: "Desktops",
    location: "loc-1",
    office: "Austin",
    type: "Critical",
    priority: "High",
    message: "HP EliteDesk 800 has reached critical level (2 units remaining)",
    acknowledged: false,
    createdAt: dayjs().toISOString()
  },
  {
    id: "al-3",
    itemId: "item-1",
    itemName: "Dell Latitude 5420",
    category: "Laptops",
    location: "loc-1",
    office: "Austin",
    type: "LowStock",
    priority: "Medium",
    message: "Dell Latitude 5420 is running low (10 units remaining)",
    acknowledged: false,
    createdAt: dayjs().toISOString()
  }
];

export const defaultSettings: SettingsModel = {
  accent: "#b33a3a",
  themeMode: "light",
  densityMode: "comfortable",
  secureSettingsEnabled: false,
  adminEmail: "",
  settingsAccessKey: "",
  includeTrackedInAnalytics: false,
  showItemId: true,
  timezone: "America/Chicago",
  currencyCode: "USD",
  defaultLowStockLevel: 10,
  defaultCriticalLevel: 5,
  defaultReorderPoint: 15,
  defaultMaxLevel: 50,
  summaryWatchLimit: 5,
  autoRefreshSeconds: 30,
  quickAdjustmentStep: 1,
  showLowStockOnDashboard: true,
  compactMode: false,
  dateFormat: "MM/DD/YYYY",
  syncEnabled: true,
  syncIntervalMins: 15,
  backupsEnabled: true,
  backupFrequency: "Daily",
  shippingLeadTimeDays: 7,
  shippingBufferDays: 3,
  forecastWindowDays: 30,
  lookbackDays: 30,
  notificationsEnabled: true,
  notifyCritical: true,
  notifyLow: true,
  notifyOut: true,
  notifyReorder: true,
  autoReorderEnabled: false,
  reorderToOptimal: true,
  requireAdjustmentReason: true,
  managerApprovalRequired: false,
  exportFormat: "CSV",
  weeklyDigestEnabled: true,
  digestRecipients: "manager@company.com",
  sessionTimeoutMins: 30,
  auditLogRetentionDays: 180,
  allowItemDeletion: true,
  requireMfaForManagers: true,
  officeThresholds: [
    { office: "Austin", lowStockLevel: 10, criticalLevel: 5, reorderPoint: 15, maxLevel: 50 },
    { office: "New York", lowStockLevel: 12, criticalLevel: 6, reorderPoint: 18, maxLevel: 55 },
    { office: "Wells Fargo Tower", lowStockLevel: 9, criticalLevel: 4, reorderPoint: 13, maxLevel: 46 },
    { office: "Electric Road", lowStockLevel: 8, criticalLevel: 4, reorderPoint: 12, maxLevel: 45 }
  ]
};
