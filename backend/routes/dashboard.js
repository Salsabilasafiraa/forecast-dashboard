const express = require("express");
const { getRows } = require("../services/googleSheets");

const router = express.Router();

// =====================================================
// HELPER
// =====================================================

// Konversi nilai menjadi angka
const toNumber = (value) => {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return 0;
  }

  const number = Number(
    String(value).replace(/,/g, "")
  );

  return Number.isNaN(number) ? 0 : number;
};


// Konversi Periode Excel menjadi tanggal yang mudah dibaca
// Contoh:
// 46023 -> Jan 2026
// 46054 -> Feb 2026
const formatPeriode = (value) => {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "Unknown";
  }

  const serial = Number(value);

  // Jika merupakan Excel Serial Date
  if (!Number.isNaN(serial) && serial > 30000) {
    const excelDate = new Date(
      Date.UTC(
        1899,
        11,
        30
      ) +
        serial *
          24 *
          60 *
          60 *
          1000
    );

    return excelDate.toLocaleDateString(
      "id-ID",
      {
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      }
    );
  }

  // Jika bukan serial Excel
  return String(value);
};


// Untuk kebutuhan sorting periode berdasarkan nilai kalender sebenarnya,
// bukan berdasarkan label yang ditampilkan seperti "Jan 2026".
const getPeriodeSortValue = (row) => {
  const monthAliases = {
    jan: 0,
    januari: 0,
    feb: 1,
    februari: 1,
    mar: 2,
    maret: 2,
    apr: 3,
    april: 3,
    may: 4,
    mei: 4,
    jun: 5,
    juni: 5,
    jul: 6,
    juli: 6,
    aug: 7,
    ags: 7,
    agu: 7,
    agustus: 7,
    sep: 8,
    sept: 8,
    september: 8,
    oct: 9,
    okt: 9,
    oktober: 9,
    nov: 10,
    november: 10,
    dec: 11,
    des: 11,
    desember: 11,
  };

  const normalizeMonthIndex = (value) => {
    const normalized = String(value ?? "").trim().toLowerCase();
    return monthAliases[normalized] ?? Number.NaN;
  };

  const rawYear = Number(String(row?.Tahun ?? "").trim());
  const rawMonth = String(row?.Bulan ?? "").trim();
  const monthIndex = normalizeMonthIndex(rawMonth);

  if (!Number.isNaN(rawYear) && Number.isFinite(monthIndex)) {
    return rawYear * 100 + monthIndex;
  }

  const periodeRaw = String(row?.Periode ?? "").trim();

  if (!periodeRaw) {
    return 0;
  }

  const serial = Number(periodeRaw);

  if (!Number.isNaN(serial) && serial > 30000) {
    const excelDate = new Date(
      Date.UTC(1899, 11, 30) + serial * 24 * 60 * 60 * 1000
    );

    return (
      excelDate.getUTCFullYear() * 100 + excelDate.getUTCMonth()
    );
  }

  const directDate = new Date(periodeRaw);

  if (!Number.isNaN(directDate.getTime())) {
    return directDate.getFullYear() * 100 + directDate.getMonth();
  }

  const labelMatch = periodeRaw.match(/^([A-Za-z]+)\s*[-/ ]?\s*(\d{4})$/);

  if (labelMatch) {
    const labelMonthIndex = normalizeMonthIndex(labelMatch[1]);
    const labelYear = Number(labelMatch[2]);

    if (Number.isFinite(labelMonthIndex) && !Number.isNaN(labelYear)) {
      return labelYear * 100 + labelMonthIndex;
    }
  }

  return 0;
};


// =====================================================
// GET /api/dashboard
// =====================================================

router.get("/", async (req, res) => {
  try {
    const rows = await getRows();

    // Jika belum ada data
    if (rows.length <= 1) {
      return res.json({
        success: true,
        message: "Belum ada data",

        data: {
          totalData: 0,

          kpi: {
            totalForecast: 0,
            totalPO: 0,
            totalVariance: 0,
            accuracy: 0,
          },

          status: {},

          chart: [],

          filters: {
            itemIds: [],
            customers: [],
            models: [],
            years: [],
            months: [],
          },
        },

        sourceData: [],
      });
    }

    // =================================================
    // HEADER
    // =================================================

    const headers = rows[0];


    // =================================================
    // UBAH DATA ARRAY MENJADI OBJECT
    // =================================================

    const data = rows
      .slice(1)
      .map((row) => {
        const item = {};

        headers.forEach(
          (header, index) => {
            item[header] =
              row[index] ?? "";
          }
        );

        return item;
      });


    const getUniqueValues = (
      field,
      customSort
    ) => {
      const values = data
        .map((row) =>
          String(
            row[field] ?? ""
          ).trim()
        )
        .filter(Boolean);

      const uniqueValues = [
        ...new Set(values),
      ];

      if (!customSort) {
        return uniqueValues.sort(
          (a, b) =>
            a.localeCompare(
              b,
              "id-ID"
            )
        );
      }

      return uniqueValues.sort(
        customSort
      );
    };

    const normalizeMonthKey = (
      value
    ) => {
      const normalized =
        String(value || "")
          .trim()
          .toLowerCase();

      const aliases = {
        jan: 0,
        januari: 0,
        feb: 1,
        februari: 1,
        mar: 2,
        maret: 2,
        apr: 3,
        april: 3,
        may: 4,
        mei: 4,
        jun: 5,
        juni: 5,
        jul: 6,
        juli: 6,
        aug: 7,
        ags: 7,
        agu: 7,
        agustus: 7,
        sep: 8,
        sept: 8,
        september: 8,
        oct: 9,
        okt: 9,
        oktober: 9,
        nov: 10,
        november: 10,
        dec: 11,
        des: 11,
        desember: 11,
      };

      return aliases[normalized] ?? Number.MAX_SAFE_INTEGER;
    };

    const filtersData = {
      itemIds: getUniqueValues(
        "Item Id"
      ),
      customers: getUniqueValues(
        "Customer"
      ),
      models: getUniqueValues(
        "Model"
      ),
      years: getUniqueValues(
        "Tahun",
        (a, b) =>
          Number(a) -
          Number(b)
      ),
      months: getUniqueValues(
        "Bulan",
        (a, b) => {
          const aIndex =
            normalizeMonthKey(a);
          const bIndex =
            normalizeMonthKey(b);

          if (
            aIndex ===
              Number.MAX_SAFE_INTEGER &&
            bIndex ===
              Number.MAX_SAFE_INTEGER
          ) {
            return String(a).localeCompare(
              String(b),
              "id-ID"
            );
          }

          if (
            aIndex ===
              Number.MAX_SAFE_INTEGER
          )
            return 1;
          if (
            bIndex ===
              Number.MAX_SAFE_INTEGER
          )
            return -1;

          return aIndex - bIndex;
        }
      ),
    };


    // =================================================
    // FILTER
    // =================================================

    const {
      itemId,
      customer,
      model,
      tahun,
      bulan,
    } = req.query;


    const filteredData = data.filter(
      (row) => {

        // Filter Item ID
        const matchItem =
          !itemId ||
          String(
            row["Item Id"]
          )
            .trim()
            .toLowerCase() ===
            String(itemId)
              .trim()
              .toLowerCase();


        // Filter Customer
        const matchCustomer =
          !customer ||
          String(
            row["Customer"]
          )
            .trim()
            .toLowerCase() ===
            String(customer)
              .trim()
              .toLowerCase();


        // Filter Model
        const matchModel =
          !model ||
          String(
            row["Model"]
          )
            .trim()
            .toLowerCase() ===
            String(model)
              .trim()
              .toLowerCase();


        // Filter Tahun
        const matchTahun =
          !tahun ||
          String(
            row["Tahun"]
          ).trim() ===
            String(tahun).trim();


        // Filter Bulan
        const matchBulan =
          !bulan ||
          String(
            row["Bulan"]
          )
            .trim()
            .toLowerCase() ===
            String(bulan)
              .trim()
              .toLowerCase();


        return (
          matchItem &&
          matchCustomer &&
          matchModel &&
          matchTahun &&
          matchBulan
        );
      }
    );


    // =================================================
    // KPI
    // =================================================

    const totalForecast =
      filteredData.reduce(
        (total, row) => {
          return (
            total +
            toNumber(
              row["Forecast"]
            )
          );
        },
        0
      );


    const totalPO =
      filteredData.reduce(
        (total, row) => {
          return (
            total +
            toNumber(
              row["PO"]
            )
          );
        },
        0
      );


    const totalVariance =
      filteredData.reduce(
        (total, row) => {
          return (
            total +
            toNumber(
              row["Variance"]
            )
          );
        },
        0
      );


    // =================================================
    // ACCURACY
    // =================================================

    let accuracy = 0;

    if (totalForecast !== 0) {
      accuracy =
        (
          1 -
          Math.abs(
            totalForecast -
              totalPO
          ) /
            Math.abs(
              totalForecast
            )
        ) *
        100;
    }


    // Pastikan accuracy 0 - 100
    accuracy = Math.max(
      0,
      Math.min(
        100,
        accuracy
      )
    );


    // =================================================
    // STATUS
    // =================================================

    const status = {};


    filteredData.forEach(
      (row) => {

        const currentStatus =
          String(
            row["Status"] ||
              "Unknown"
          ).trim();


        if (
          !status[
            currentStatus
          ]
        ) {
          status[
            currentStatus
          ] = 0;
        }


        status[
          currentStatus
        ]++;
      }
    );


    // =================================================
    // CHART FORECAST VS PO
    // =================================================

    const chartMap = {};


    filteredData.forEach(
      (row) => {

        const periodeRaw =
          row["Periode"];


        const periode =
          formatPeriode(
            periodeRaw
          );


        if (
          !chartMap[
            periode
          ]
        ) {

          chartMap[
            periode
          ] = {

            periode,

            periodeSort:
              getPeriodeSortValue(
                row
              ),

            forecast: 0,

            po: 0,

            variance: 0,

            accuracy: 0,
          };
        }


        chartMap[
          periode
        ].forecast +=
          toNumber(
            row["Forecast"]
          );


        chartMap[
          periode
        ].po +=
          toNumber(
            row["PO"]
          );


        chartMap[
          periode
        ].variance +=
          toNumber(
            row["Variance"]
          );
      }
    );


    // =================================================
    // UBAH OBJECT MENJADI ARRAY
    // =================================================

    const chart =
      Object.values(
        chartMap
      );


    // =================================================
    // SORT CHART BERDASARKAN PERIODE
    // =================================================

    chart.sort(
      (a, b) =>
        a.periodeSort -
        b.periodeSort
    );


    // =================================================
    // HITUNG ACCURACY SETIAP PERIODE
    // =================================================

    chart.forEach(
      (item) => {

        if (
          item.forecast !== 0
        ) {

          item.accuracy =
            (
              1 -
              Math.abs(
                item.forecast -
                  item.po
              ) /
                Math.abs(
                  item.forecast
                )
            ) *
            100;
        }


        item.accuracy =
          Math.max(
            0,
            Math.min(
              100,
              item.accuracy
            )
          );


        // Hapus field sorting
        delete item.periodeSort;
      }
    );


    // =================================================
    // RESPONSE
    // =================================================

    res.json({

      success: true,

      filter: {

        itemId:
          itemId || null,

        customer:
          customer || null,

        model:
          model || null,

        tahun:
          tahun || null,

        bulan:
          bulan || null,
      },


      data: {

        // Jumlah data setelah filter
        totalData:
          filteredData.length,


        // ===============================
        // FILTER OPTIONS
        // ===============================

        filters: {
          itemIds:
            filtersData.itemIds,
          customers:
            filtersData.customers,
          models:
            filtersData.models,
          years:
            filtersData.years,
          months:
            filtersData.months,
        },


        // ===============================
        // KPI
        // ===============================

        kpi: {

          totalForecast,

          totalPO,

          totalVariance,

          accuracy:
            Number(
              accuracy.toFixed(
                2
              )
            ),
        },


        // ===============================
        // STATUS
        // ===============================

        status,


        // ===============================
        // CHART
        // ===============================

        chart,
      },

      sourceData: data,
    });

  } catch (error) {
    const isMissingConfig =
      String(error.message).includes(
        "Konfigurasi Google Sheets belum lengkap"
      );

    if (isMissingConfig) {
      return res.json({
        success: true,
        message:
          "Google Sheets belum dikonfigurasi. Menampilkan data kosong.",
        data: {
          totalData: 0,
          kpi: {
            totalForecast: 0,
            totalPO: 0,
            totalVariance: 0,
            accuracy: 0,
          },
          status: {},
          chart: [],
          filters: {
            itemIds: [],
            customers: [],
            models: [],
            years: [],
            months: [],
          },
        },
        sourceData: [],
      });
    }

    console.error(
      "Dashboard Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Gagal mengambil data dashboard",
      error:
        error.message,
    });
  }
});


module.exports = router;