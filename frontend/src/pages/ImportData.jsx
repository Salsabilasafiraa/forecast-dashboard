import { useMemo, useState } from "react";
import axios from "axios";
import * as XLSX from "xlsx";

const API_BASE =
  import.meta.env.VITE_API_URL ||
  (window.location.hostname === "localhost"
    ? "http://localhost:5000"
    : window.location.origin);

function ImportData() {
  const [file, setFile] = useState(null);
  const [importRows, setImportRows] = useState([]);
  const [previewRows, setPreviewRows] = useState([]);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [loadingImport, setLoadingImport] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const previewHeaders = useMemo(() => {
    if (!previewRows.length) return [];
    return Object.keys(previewRows[0]);
  }, [previewRows]);

  const handleFileChange = async (event) => {
    const selectedFile = event.target.files?.[0];

    if (!selectedFile) {
      setFile(null);
      setPreviewRows([]);
      return;
    }

    if (
      ![".xlsx", ".xls"].some((ext) =>
        selectedFile.name.toLowerCase().endsWith(ext)
      )
    ) {
      setError("Format file harus .xlsx atau .xls");
      setFile(null);
      setPreviewRows([]);
      return;
    }

    setFile(selectedFile);
    setImportRows([]);
    setError("");
    setMessage("");
    setLoadingPreview(true);

    try {
      const buffer = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });

      const sheetName =
        workbook.SheetNames.find(
          (name) => name.toUpperCase() === "DATABASE"
        ) || workbook.SheetNames[0];

      const worksheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(worksheet, {
        defval: "",
      });

      setImportRows(rows);

      const safeRows = rows.slice(0, 10);
      setPreviewRows(safeRows);

      if (safeRows.length === 0) {
        setError("File Excel tidak memiliki data yang bisa diimport.");
      }
    } catch (err) {
      console.error(err);
      setError("Gagal membaca file Excel. Pastikan format benar.");
      setPreviewRows([]);
    } finally {
      setLoadingPreview(false);
    }
  };

  const saveImportHistory = (result) => {
    const existing = JSON.parse(
      localStorage.getItem("forecast-import-history") || "[]"
    );

    const item = {
      fileName: file?.name || "Unknown",
      importedAt: new Date().toISOString(),
      totalRows: result?.totalRows || importRows.length,
      status: result?.success ? "Berhasil" : "Gagal",
      importId: result?.importId || null,
    };

    localStorage.setItem(
      "forecast-import-history",
      JSON.stringify([item, ...existing].slice(0, 20))
    );
  };

  const handleImport = async () => {
    if (!file) {
      setError("Pilih file Excel terlebih dahulu.");
      return;
    }

    setLoadingImport(true);
    setError("");
    setMessage("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await axios.post(
        `${API_BASE}/api/import/commit`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      saveImportHistory(response.data);

      setMessage(
        `Import berhasil: ${response.data.totalRows || importRows.length} data tersimpan.`
      );
      setFile(null);
      setImportRows([]);
      setPreviewRows([]);
      document.getElementById("excel-file-input").value = "";
    } catch (err) {
      console.error(err);
      const errorMessage =
        err?.response?.data?.message ||
        "Import gagal. Cek format file dan koneksi backend.";

      setError(errorMessage);
      saveImportHistory({ success: false, totalRows: importRows.length });
    } finally {
      setLoadingImport(false);
    }
  };

  return (
    <div className="import-page">
      <div className="page-header">
        <div>
          <h1>Import Data</h1>
          <p>Upload file Excel untuk menambahkan data ke Google Sheets</p>
        </div>
      </div>

      <div className="import-panel">
        <div className="upload-box">
          <input
            id="excel-file-input"
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileChange}
          />

          <button
            className="btn-primary"
            type="button"
            onClick={handleImport}
            disabled={!file || loadingImport}
          >
            {loadingImport ? "Mengimport..." : "Import ke Google Sheets"}
          </button>
        </div>

        {file && (
          <div className="import-summary">
            <div>
              <span>Nama File</span>
              <strong>{file.name}</strong>
            </div>
            <div>
              <span>Jumlah Data</span>
              <strong>{previewRows.length || 0}</strong>
            </div>
          </div>
        )}

        {error && <div className="alert alert-error">{error}</div>}
        {message && <div className="alert alert-success">{message}</div>}

        {loadingPreview ? (
          <div className="database-state">
            <div className="loading-spinner"></div>
            <p>Memuat preview file...</p>
          </div>
        ) : previewRows.length > 0 ? (
          <div className="preview-card">
            <h3>Preview Data</h3>

            <div className="table-wrapper">
              <table className="database-table">
                <thead>
                  <tr>
                    {previewHeaders.map((header) => (
                      <th key={header}>{header}</th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {previewRows.map((row, index) => (
                    <tr key={`${index}-${row[previewHeaders[0]] || "row"}`}>
                      {previewHeaders.map((header) => (
                        <td key={`${header}-${index}`}>
                          {String(row[header] ?? "")}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="database-state">
            <p>Pilih file Excel untuk melihat preview data.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default ImportData;
