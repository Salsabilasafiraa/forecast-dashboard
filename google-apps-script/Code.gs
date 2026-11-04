const SPREADSHEET_ID = "1oCU0N3rBfCosNZ3FfBTj7W_hXTHOW2gvY9vYf5sXj0k";
const SHEET_NAME = "DATABASE";
const REQUIRED_COLUMNS = [
  "Periode",
  "Item Id",
  "Customer",
  "Model",
  "Forecast",
  "PO",
  "Variance",
  "Accuracy",
  "Status",
  "Tahun",
  "Bulan",
];

function jsonResponse(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

function getSheet() {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  return spreadsheet.getSheetByName(SHEET_NAME) || spreadsheet.getSheets()[0];
}

function normalizeObjectRow(row, headers) {
  const normalized = {};

  headers.forEach((header, index) => {
    normalized[header] = row[index] ?? "";
  });

  return normalized;
}

function getAllRows() {
  const sheet = getSheet();
  const values = sheet.getDataRange().getValues();

  if (!values.length) {
    return [];
  }

  const headers = values[0].map((header) => String(header || "").trim());

  return values.slice(1).map((row) => normalizeObjectRow(row, headers));
}

function ensureRequiredColumns(keys) {
  const missing = REQUIRED_COLUMNS.filter((column) => !keys.includes(column));

  if (missing.length > 0) {
    throw new Error("Format kolom spreadsheet tidak sesuai. Kolom missing: " + missing.join(", "));
  }
}

function normalizeRowsForSheet(rows) {
  const keys = REQUIRED_COLUMNS;

  return rows.map((row) => {
    return keys.map((key) => row[key] ?? "");
  });
}

function appendRows(rows) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return 0;
  }

  const sheet = getSheet();
  const safeRows = rows.map((row) => ({
    Periode: row.Periode ?? "",
    "Item Id": row["Item Id"] ?? row.itemId ?? "",
    Customer: row.Customer ?? "",
    Model: row.Model ?? "",
    Forecast: row.Forecast ?? 0,
    PO: row.PO ?? 0,
    Variance: row.Variance ?? 0,
    Accuracy: row.Accuracy ?? 0,
    Status: row.Status ?? "",
    Tahun: row.Tahun ?? "",
    Bulan: row.Bulan ?? "",
  }));

  const keys = REQUIRED_COLUMNS;
  const header = sheet.getDataRange().getValues()[0] || keys;
  const hasHeader = header && header.length;

  if (!hasHeader) {
    sheet.appendRow(keys);
  }

  const values = normalizeRowsForSheet(safeRows);
  sheet.getRange(sheet.getLastRow() + 1, 1, values.length, keys.length).setValues(values);

  return values.length;
}

function deleteRows(rows) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return 0;
  }

  const sheet = getSheet();
  const data = getAllRows();

  if (!data.length) {
    return 0;
  }

  const rowKeys = rows.map((row) => {
    return JSON.stringify({
      periode: String(row.Periode ?? ""),
      itemId: String(row["Item Id"] ?? row.itemId ?? ""),
      customer: String(row.Customer ?? ""),
      model: String(row.Model ?? ""),
      tahun: String(row.Tahun ?? ""),
      bulan: String(row.Bulan ?? ""),
    });
  });

  const remaining = data.filter((item) => {
    const currentKey = JSON.stringify({
      periode: String(item.Periode ?? ""),
      itemId: String(item["Item Id"] ?? ""),
      customer: String(item.Customer ?? ""),
      model: String(item.Model ?? ""),
      tahun: String(item.Tahun ?? ""),
      bulan: String(item.Bulan ?? ""),
    });

    return !rowKeys.includes(currentKey);
  });

  const headers = REQUIRED_COLUMNS;
  sheet.clearContents();
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);

  if (remaining.length > 0) {
    const values = normalizeRowsForSheet(remaining);
    sheet.getRange(2, 1, values.length, headers.length).setValues(values);
  }

  return rows.length;
}

function doGet(e) {
  try {
    const action = String(e && e.parameter && e.parameter.action ? e.parameter.action : "read").toLowerCase();

    if (action === "read") {
      const data = getAllRows();
      return jsonResponse({
        success: true,
        message: "OK",
        data,
        sourceData: data,
      });
    }

    return jsonResponse({
      success: false,
      message: "Action tidak dikenali: " + action,
    });
  } catch (error) {
    return jsonResponse({
      success: false,
      message: error && error.message ? error.message : "Gagal membaca data",
    });
  }
}

function doPost(e) {
  try {
    const raw = e && e.postData && e.postData.contents ? e.postData.contents : "{}";
    const payload = JSON.parse(raw || "{}");
    const action = String(payload.action || "append").toLowerCase();

    if (action === "append") {
      const rows = Array.isArray(payload.rows) ? payload.rows : [];

      if (!rows.length) {
        return jsonResponse({
          success: false,
          message: "Tidak ada data untuk diimport",
        });
      }

      const firstRowKeys = Object.keys(rows[0] || {});
      ensureRequiredColumns(firstRowKeys);

      const total = appendRows(rows);

      return jsonResponse({
        success: true,
        message: "Data berhasil ditambahkan ke spreadsheet",
        totalRows: total,
        data: rows,
      });
    }

    if (action === "delete") {
      const rows = Array.isArray(payload.rows) ? payload.rows : [];
      const deletedRows = deleteRows(rows);

      return jsonResponse({
        success: true,
        message: "Data berhasil dihapus",
        deletedRows,
      });
    }

    return jsonResponse({
      success: false,
      message: "Action tidak dikenali: " + action,
    });
  } catch (error) {
    return jsonResponse({
      success: false,
      message: error && error.message ? error.message : "Gagal memproses request",
    });
  }
}
