function Filter({
  label,
  name,
  value,
  options = [],
  onChange,
  placeholder = "Semua",
}) {
  return (
    <div className="filter-group">
      <label>{label}</label>

      <select
        name={name}
        value={value}
        onChange={onChange}
      >
        <option value="">{placeholder}</option>

        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}

export default Filter;
