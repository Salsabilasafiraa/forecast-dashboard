const express = require("express");
const cors = require("cors");
require("dotenv").config();

const { getRows } = require("./services/googleSheets");

const dashboardRoutes = require("./routes/dashboard");
const databaseRoutes = require("./routes/database");
const importRoutes = require("./routes/import");

const app = express();
const PORT = 5000;

// =========================
// MIDDLEWARE
// =========================

app.use(cors());
app.use(express.json());

// =========================
// API ROUTES
// =========================

app.use("/api/dashboard", dashboardRoutes);
app.use("/api/database", databaseRoutes);
app.use("/api/import", importRoutes);

// =========================
// HOME
// =========================

app.get("/", (req, res) => {
  res.json({
    message: "Backend Forecast Dashboard berhasil berjalan 🚀",
  });
});

// =========================
// HEALTH CHECK
// =========================

app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    message: "API Forecast Dashboard aktif",
  });
});

// =========================
// TEST GOOGLE SHEETS
// =========================

app.get("/api/google-sheets/test", async (req, res) => {
  try {
    const rows = await getRows();

    res.json({
      success: true,
      message: "Koneksi Google Sheets berhasil! 🎉",
      totalRows: rows.length,
      preview: rows.slice(0, 5),
    });
  } catch (error) {
    console.error("Google Sheets Error:", error);

    const isMissingConfig =
      String(error.message).includes(
        "Konfigurasi Google Sheets belum lengkap"
      );

    res.status(isMissingConfig ? 200 : 500).json({
      success: isMissingConfig,
      message: isMissingConfig
        ? "Google Sheets belum dikonfigurasi. Tambahkan variabel .env terlebih dahulu."
        : "Koneksi Google Sheets gagal",
      error: error.message,
    });
  }
});

// =========================
// START SERVER
// =========================

app.listen(PORT, () => {
  console.log(`Backend berjalan di http://localhost:${PORT}`);
});