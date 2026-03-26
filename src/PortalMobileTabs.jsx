import "./PortalMobileTabs.css";

export default function PortalMobileTabs({
  items,
  activeTab,
  onChange,
  ariaLabel,
}) {
  return (
    <div className="portal-mobile-tabs" aria-label={ariaLabel}>
      <div className="portal-mobile-tabs-track">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`portal-mobile-tab ${activeTab === item.id ? "portal-mobile-tab-active" : ""}`}
            onClick={() => onChange(item.id)}
          >
            {item.mobileLabel || item.label}
          </button>
        ))}
      </div>
    </div>
  );
}
