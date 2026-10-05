const { google } = require("googleapis");

const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY ? process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n') : undefined,
  },
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

const sheets = google.sheets({
  version: "v4",
  auth,
});

const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID;
const SHEET_NAME = process.env.GOOGLE_SHEET_NAME || "DATABASE";

async function appendRows(rows) {
  if (!SPREADSHEET_ID) {
    throw new Error("GOOGLE_SHEET_ID belum diatur di .env");
  }

  if (!rows || rows.length === 0) {
    return { updatedRows: 0 };
  }

  const values = rows.map((row) => [
    row.Periode ?? "",
    row["Item Id"] ?? "",
    row.Customer ?? "",
    row.CCT ?? "",
    row.Model ?? "",
    row.Forecast ?? "",
    row.PO ?? "",
    row.Variance ?? "",
    row.Accuracy ?? "",
    row.Status ?? "",
    row.Tahun ?? "",
    row.Bulan ?? "",
  ]);

  const result = await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A:L`,
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: {
      values,
    },
  });

  return {
    updatedRows: result.data.updates?.updatedRows ?? 0,
  };
}

async function getRows() {
  if (!SPREADSHEET_ID) {
    throw new Error("GOOGLE_SHEET_ID belum diatur di .env");
  }

  const result = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A:L`,
  });

  return result.data.values || [];
}

module.exports = {
  appendRows,
  getRows,
};