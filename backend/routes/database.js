const express = require("express");

const router = express.Router();

// GET semua data database
router.get("/", async (req, res) => {
  try {
    res.json({
      success: true,
      message: "API database berhasil diakses",
      data: [],
    });
  } catch (error) {
    console.error("Error database:", error);

    res.status(500).json({
      success: false,
      message: "Gagal mengambil data database",
    });
  }
});

module.exports = router;