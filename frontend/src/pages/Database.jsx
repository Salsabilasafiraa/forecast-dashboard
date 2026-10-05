import { useEffect, useMemo, useState } from "react";
import axios from "axios";

const PAGE_SIZE = 20;

function Database() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError("");

      const API_BASE = import.meta.env.VITE_API_URL;
      const response = await axios.get(`${API_BASE}/api/database`);

      const data = response?.data?.data || [];
      setRows(data);
      setPage(1);
    } catch (err) {
      console.error(err);
      setError("Gagal memuat data dari Google Sheets.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredRows = useMemo(() => {
    if (!search.trim()) return rows;

    const keyword = search.toLowerCase();

    return rows.filter((row) =>
      Object.values(row).some((value) =>
        String(value).toLowerCase().includes(keyword)
      )
    );
  }, [rows, search]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredRows.length / PAGE_SIZE)
  );

  const paginatedRows = filteredRows.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE
  );

  const formatNumber = (value) => {
    if (value === null || value === undefined || value === "") {
      return "-";
    }

    const number = Number(value);

    return Number.isNaN(number)
      ? String(value)
      : new Intl.NumberFormat("id-ID").format(number);
  };

  const getStatusClass = (status = "") => {
    const normalized = String(status).trim().toLowerCase();

    if (normalized.includes("up") || normalized.includes("increase")) {
      return "increase";
    }

    if (normalized.includes("down") || normalized.includes("decrease")) {
      return "decrease";
    }

    if (normalized.includes("stable") || normalized.includes("on track")) {
      return "stable";
    }

    return "";
  };

  return (
    <div className="database-page">
      <div className="page-header">
        <div>
          <h1>Database</h1>
          <p>Data forecast dari Google Sheets</p>
        </div>

        <button
          className="btn-refresh"
          onClick={fetchData}
        >
          Refresh
        </button>
      </div>

      <div className="database-card">
        <div className="database-toolbar">
          <div>
            <h3>Data Forecast</h3>
            <span>
              Total: {filteredRows.length.toLocaleString("id-ID")} data
            </span>
          </div>

          <input
            className="database-search"
            type="text"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Cari data..."
          />
        </div>

        {loading ? (
          <div className="database-state">
            <div className="loading-spinner"></div>
            <p>Memuat data...</p>
          </div>
        ) : error ? (
          <div className="database-state error">
            <p>{error}</p>
          </div>
        ) : paginatedRows.length === 0 ? (
          <div className="database-state">
            <p>Data tidak ditemukan.</p>
          </div>
        ) : (
          <>
            <div className="table-wrapper">
              <table className="database-table">
                <thead>
                  <tr>
                    <th>Periode</th>
                    <th>Item ID</th>
                    <th>Customer</th>
                    <th>Model</th>
                    <th>Forecast</th>
                    <th>PO</th>
                    <th>Variance</th>
                    <th>Accuracy</th>
                    <th>Status</th>
                    <th>Tahun</th>
                    <th>Bulan</th>
                  </tr>
                </thead>

                <tbody>
                  {paginatedRows.map((row, index) => (
                    <tr key={`${row["Item Id"] || "item"}-${row["Periode"] || "periode"}-${index}`}>
                      <td>{row["Periode"] || "-"}</td>
                      <td>{row["Item Id"] || "-"}</td>
                      <td>{row["Customer"] || "-"}</td>
                      <td>{row["Model"] || "-"}</td>
                      <td className="number-cell">
                        {formatNumber(row["Forecast"])}
                      </td>
                      <td className="number-cell">
                        {formatNumber(row["PO"])}
                      </td>
                      <td className="number-cell">
                        {formatNumber(row["Variance"])}
                      </td>
                      <td className="accuracy-cell">
                        {row["Accuracy"] === "" || row["Accuracy"] === undefined
                          ? "-"
                          : `${Number(row["Accuracy"]).toFixed(2)}%`}
                      </td>
                      <td>
                        <span
                          className={`status-badge ${getStatusClass(
                            row["Status"]
                          )}`}
                        >
                          {row["Status"] || "-"}
                        </span>
                      </td>
                      <td>{row["Tahun"] || "-"}</td>
                      <td>{row["Bulan"] || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="database-footer">
              <span>
                Menampilkan {paginatedRows.length} dari {filteredRows.length} data
              </span>

              <div className="pagination">
                <button
                  type="button"
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  disabled={page === 1}
                  aria-label="Halaman sebelumnya"
                >
                  ←
                </button>

                <span>
                  {page} / {totalPages}
                </span>

                <button
                  type="button"
                  onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={page === totalPages}
                  aria-label="Halaman berikutnya"
                >
                  →
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default Database;
