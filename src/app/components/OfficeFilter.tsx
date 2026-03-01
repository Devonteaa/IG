import { useStore } from "../store";

export default function OfficeFilter() {
  const { office, setOffice, officeOptions } = useStore();

  return (
    <select
      value={office}
      onChange={(e) => setOffice(e.target.value)}
      style={{
        height: 36,
        borderRadius: 10,
        border: "1px solid var(--border)",
        padding: "0 10px",
        background: "var(--panel-soft)",
        color: "var(--text)"
      }}
      aria-label="Office filter"
    >
      {officeOptions.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}
