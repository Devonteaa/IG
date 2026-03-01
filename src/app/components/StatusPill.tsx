import { InventoryItem } from "../types";

export function statusForItem(item: InventoryItem): "success" | "warn" | "danger" | "neutral" {
  if (item.qty === 0) return "danger";
  if (item.qty <= item.criticalLevel) return "danger";
  if (item.qty <= item.lowStockLevel) return "warn";
  return "success";
}

export default function StatusPill({ item }: { item: InventoryItem }) {
  const kind = statusForItem(item);
  const label = kind === "success" ? "InStock" : kind === "warn" ? "LowStock" : "OutOfStock";
  return <span className={`pill ${kind}`}>{label}</span>;
}
