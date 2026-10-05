function KPICard({
  icon,
  label,
  value,
  tone = "forecast",
}) {
  return (
    <div className="kpi-card">
      <div className={`kpi-icon ${tone}`}>
        {icon}
      </div>

      <div>
        <span>{label}</span>
        <h2>{value}</h2>
      </div>
    </div>
  );
}

export default KPICard;
