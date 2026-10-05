import { useEffect, useState } from "react";
import axios from "axios";

const API_BASE =
  import.meta.env.VITE_API_URL ||
  (window.location.hostname === "localhost"
    ? "http://localhost:5000"
    : window.location.origin);

function ImportHistory() {
  const [history, setHistory] = useState([]);
  const [processing, setProcessing] = useState(false);

  const loadHistory = () => {
    const saved = JSON.parse(
      localStorage.getItem("forecast-import-history") || "[]"
    );

    setHistory(saved);
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const handleDelete = async (item, index) => {
    const confirmed = window.confirm(
      `Hapus data import "${item.fileName || "file"}" dari Google Sheets?`
    );

    if (!confirmed) return;

    try {
      setProcessing(true);

      const response = await axios.delete(`${API_BASE}/api/import`, {
        data: {
          importId: item.importId || null,
          rows: Array.isArray(item.rows) ? item.rows : [],
        },
      });

      if (!response.data.success) {
        throw new Error(response.data.message || "Gagal menghapus data");
      }

      const updatedHistory = history.filter((_, itemIndex) => itemIndex !== index);
      localStorage.setItem(
        "forecast-import-history",
        JSON.stringify(updatedHistory)
      );

      setHistory(updatedHistory);
      window.location.href = "/";
    } catch (error) {
      console.error(error);
      alert(
        error?.response?.data?.message ||
          "Gagal menghapus data import dari Google Sheets."
      );
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="history-page">
      <div className="page-header">
        <div>
          <h1>Import History</h1>
          <p>Riwayat proses import data ke Google Sheets</p>
        </div>
      </div>

      <div className="history-card">
        {history.length === 0 ? (
          <div className="database-state">
            <p>Belum ada riwayat import.</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="database-table">
              <thead>
                <tr>
                  <th>Nama File</th>
                  <th>Tanggal Import</th>
                  <th>Jumlah Data</th>
                  <th>Status</th>
                  <th>Aksi</th>
                </tr>
              </thead>

              <tbody>
                {history.map((item, index) => (
                  <tr key={`${item.fileName}-${index}`}>
                    <td>{item.fileName || "-"}</td>
                    <td>
                      {item.importedAt
                        ? new Date(item.importedAt).toLocaleString("id-ID")
                        : "-"}
                    </td>
                    <td>{item.totalRows || 0}</td>
                    <td>
                      <span
                        className={`status-badge ${
                          item.status === "Berhasil" ? "increase" : "decrease"
                        }`}
                      >
                        {item.status || "Gagal"}
                      </span>
                    </td>
                    <td>
                      <button
                        className="btn-delete"
                        type="button"
                        onClick={() => handleDelete(item, index)}
                        disabled={processing}
                      >
                        Hapus
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default ImportHistory;
