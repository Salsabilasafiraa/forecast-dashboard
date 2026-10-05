const { google } = require("googleapis");

const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID;
const SHEET_NAME = process.env.GOOGLE_SHEET_NAME || "DATABASE";

const hasGoogleConfig = () =>
  Boolean(
    process.env.GOOGLE_SHEET_ID &&
      process.env.GOOGLE_CLIENT_EMAIL &&
      process.env.GOOGLE_PRIVATE_KEY
  );

const ensureGoogleConfig = () => {
  if (!hasGoogleConfig()) {
    throw new Error(
      "Konfigurasi Google Sheets belum lengkap. Isi GOOGLE_SHEET_ID, GOOGLE_CLIENT_EMAIL, dan GOOGLE_PRIVATE_KEY di file .env."
    );
  }
};

const getGoogleAuth = () => {
  ensureGoogleConfig();

  const privateKey = process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n");

  return new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: privateKey,
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
};

const getSheetsClient = () => {
  const auth = getGoogleAuth();

  return google.sheets({
    version: "v4",
    auth,
  });
};

async function appendRows(rows) {
  ensureGoogleConfig();

  if (!rows || rows.length === 0) {
    return { updatedRows: 0 };
  }

  const sheets = getSheetsClient();
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
  ensureGoogleConfig();

  const sheets = getSheetsClient();
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