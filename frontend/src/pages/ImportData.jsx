import { useMemo, useState } from "react";
import Papa from "papaparse";
import * as XLSX from "xlsx";

import { writeDataToGas } from "../lib/gasApi";

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

    const allowedExtensions = [".csv", ".tsv", ".xls", ".xlsx", ".txt"];
    const fileName = selectedFile.name.toLowerCase();

    if (!allowedExtensions.some((ext) => fileName.endsWith(ext))) {
      setError("Format file harus .csv, .tsv, .xlsx, .xls, atau .txt");
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
      let rows = [];

      if ([".csv", ".tsv", ".txt"].some((ext) => fileName.endsWith(ext))) {
        const text = await selectedFile.text();
        const parsed = Papa.parse(text, {
          header: true,
          skipEmptyLines: true,
          transformHeader: (header) => String(header).trim(),
        });

        rows = Array.isArray(parsed.data) ? parsed.data : [];
      } else {
        const buffer = await selectedFile.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: "array" });

        const sheetName =
          workbook.SheetNames.find(
            (name) => name.toUpperCase() === "DATABASE"
          ) || workbook.SheetNames[0];

        const worksheet = workbook.Sheets[sheetName];
        rows = XLSX.utils.sheet_to_json(worksheet, {
          defval: "",
        });
      }

      setImportRows(rows);

      const safeRows = rows.slice(0, 10);
      setPreviewRows(safeRows);

      if (safeRows.length === 0) {
        setError("File spreadsheet tidak memiliki data yang bisa diimport.");
      }
    } catch (err) {
      console.error(err);
      setError("Gagal membaca file spreadsheet. Pastikan format benar.");
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
      const response = await writeDataToGas("append", {
        rows: importRows,
      });

      saveImportHistory(response);

      setMessage(
        `Import berhasil: ${response.totalRows || importRows.length} data tersimpan.`
      );
      setFile(null);
      setImportRows([]);
      setPreviewRows([]);
      document.getElementById("excel-file-input").value = "";
    } catch (err) {
      console.error(err);
      const errorMessage =
        err?.message ||
        "Import gagal. Cek format file dan URL Google Apps Script.";

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
            accept=".csv,.tsv,.xlsx,.xls,.txt"
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
