import { useEffect, useRef, useState } from "react";
import { NavLink } from "react-router-dom";
import { BoxMultipleFilled, SettingsFilled, AlertFilled, ChartMultipleFilled, ListFilled, DocumentBulletListFilled, ArrowTrendingLinesFilled, VehicleTruckCubeFilled } from "@fluentui/react-icons";
import clsx from "clsx";

const links = [
  { to: "/overview", label: "Overview", icon: <BoxMultipleFilled /> },
  { to: "/inventory", label: "Inventory", icon: <ListFilled /> },
  { to: "/tracked-equipment", label: "Tracked Equip", icon: <ListFilled /> },
  { to: "/stock-adjustments", label: "Stock Adjustments", icon: <ArrowTrendingLinesFilled /> },
  { to: "/trends", label: "Trends", icon: <ChartMultipleFilled /> },
  { to: "/alerts", label: "Alerts", icon: <AlertFilled /> },
  { to: "/reports", label: "Reports", icon: <DocumentBulletListFilled /> },
  { to: "/forecast", label: "Forecast", icon: <VehicleTruckCubeFilled /> },
  { to: "/settings", label: "Settings", icon: <SettingsFilled /> }
];

export default function Sidebar() {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const onDown = (event: MouseEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, []);

  return (
    <aside ref={menuRef} className={clsx("sidebar", open && "open")} role="navigation" aria-label="App tabs menu">
      <button
        type="button"
        className="menu-hamburger"
        aria-label="Toggle navigation menu"
        aria-expanded={open}
        onClick={() => setOpen(v => !v)}
      >
        <span />
        <span />
        <span />
      </button>
      <nav className="tab-menu-list">
        <div className="brand-mark">
          <div className="brand-glyph">IG</div>
          <div>
            <div className="brand-title">Inventory Guardian</div>
            <div className="brand-sub">Navigation Menu</div>
          </div>
        </div>

        <div className="tab-menu-heading">Menu</div>

        {links.map(l => (
          <NavLink
            key={l.to}
            to={l.to}
            className={({ isActive }) => clsx("tab-menu-item", isActive && "active")}
            style={{ textDecoration: "none" }}
            onClick={() => setOpen(false)}
          >
            <span className="dock-icon">{l.icon}</span>
            <span className="dock-label">{l.label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
