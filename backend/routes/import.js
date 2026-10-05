const express = require("express");
const multer = require("multer");
const XLSX = require("xlsx");
const {
  appendRows,
  deleteRows,
} = require("../services/googleSheets");

const router = express.Router();

// File Excel disimpan sementara di memory
const upload = multer({
  storage: multer.memoryStorage(),
});

// Kolom yang wajib ada di Excel
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

// POST /api/import/preview
router.post("/commit", upload.single("file"), async (req, res) => {
  try {
    // Cek file
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "File Excel belum dipilih",
      });
    }

    // Baca workbook
    const workbook = XLSX.read(req.file.buffer, {
      type: "buffer",
    });

    // Cari sheet DATABASE
    const sheetName = workbook.SheetNames.find(
      (name) => name.toUpperCase() === "DATABASE"
    );

    if (!sheetName) {
      return res.status(400).json({
        success: false,
        message: "Sheet DATABASE tidak ditemukan",
      });
    }

    // Ambil worksheet
    const worksheet = workbook.Sheets[sheetName];

    // Ubah Excel menjadi array object
    const data = XLSX.utils.sheet_to_json(worksheet, {
      defval: "",
    });

    // Cek apakah ada data
    if (data.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Sheet DATABASE tidak memiliki data",
      });
    }

    // Validasi kolom
    const columns = Object.keys(data[0]);

    const missingColumns = REQUIRED_COLUMNS.filter(
      (column) => !columns.includes(column)
    );

    if (missingColumns.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Format kolom Excel tidak sesuai",
        missingColumns,
      });
    }

    // Kirim data ke Google Sheets
    const result = await appendRows(data);

    res.json({
      success: true,
      message: "Data Excel berhasil diimport ke Google Sheets 🎉",
      fileName: req.file.originalname,
      sheet: sheetName,
      totalRows: data.length,
      savedRows: result.updatedRows,
      status: "SAVED",
      importId: result.importId,
    });
  } catch (error) {
    console.error("Error commit import:", error);

    res.status(500).json({
      success: false,
      message: "Gagal mengimport data ke Google Sheets",
      error: error.message,
    });
  }
});

router.delete("/", async (req, res) => {
  try {
    const importId = req.body?.importId;
    const rowsToDelete = Array.isArray(req.body?.rows)
      ? req.body.rows
      : [];

    if (!importId && rowsToDelete.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Tidak ada data yang dipilih untuk dihapus",
      });
    }

    const result = await deleteRows(rowsToDelete, importId);

    res.json({
      success: true,
      message: "Data import berhasil dihapus dari Google Sheets",
      deletedRows: result.deletedRows || 0,
    });
  } catch (error) {
    console.error("Error delete import:", error);

    res.status(500).json({
      success: false,
      message: "Gagal menghapus data import dari Google Sheets",
      error: error.message,
    });
  }
});

module.exports = router;