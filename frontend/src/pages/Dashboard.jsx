import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import axios from "axios";
import * as XLSX from "xlsx";

import {
  ForecastChart,
  AccuracyChart,
} from "../components/Chart";

/* =========================
   DEFAULT FILTER
========================= */

const DEFAULT_FILTERS = {
  itemId: "",
  customer: "",
  model: "",
  tahun: "",
  bulan: "",
};

const DASHBOARD_STORAGE_KEY =
  "forecastDashboardData";

const CHART_MODE = {
  CCT: "CCT",
  QTY: "QTY",
};

/* =========================
   STATUS
========================= */

const STATUS_CATEGORIES = [
  {
    key: "Increase",
    label: "Increase",
    className: "increase",
  },
  {
    key: "Decrease",
    label: "Decrease",
    className: "decrease",
  },
  {
    key: "Stable",
    label: "Stable",
    className: "stable",
  },
  {
    key: "Unforecasted Demand",
    label: "Unforecasted Demand",
    className: "unforecasted-demand",
  },
  {
    key: "No Demand",
    label: "No Demand",
    className: "no-demand",
  },
];

/* =========================
   HELPER NUMBER
========================= */

const toNumber = (value) => {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return 0;
  }

  const normalized = Number(
    String(value).replace(/,/g, "")
  );

  return Number.isNaN(normalized)
    ? 0
    : normalized;
};

/* =========================
   FORMAT PERIODE
========================= */

const formatPeriode = (value) => {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "Unknown";
  }

  const serial = Number(value);

  if (
    !Number.isNaN(serial) &&
    serial > 30000
  ) {
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

  return String(value);
};

/* =========================
   SORT PERIODE
========================= */

const getPeriodeSortValue = (
  row = {}
) => {
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

  const normalizeMonthIndex = (
    value
  ) => {
    const normalized = String(
      value ?? ""
    )
      .trim()
      .toLowerCase();

    return (
      monthAliases[normalized] ??
      Number.NaN
    );
  };

  const rawYear = Number(
    String(row.Tahun ?? "").trim()
  );

  const rawMonth = String(
    row.Bulan ?? ""
  ).trim();

  const monthIndex =
    normalizeMonthIndex(
      rawMonth
    );

  if (
    !Number.isNaN(rawYear) &&
    Number.isFinite(monthIndex)
  ) {
    return (
      rawYear * 100 +
      monthIndex
    );
  }

  const periodeRaw = String(
    row.Periode ?? ""
  ).trim();

  if (!periodeRaw) {
    return 0;
  }

  const serial = Number(
    periodeRaw
  );

  if (
    !Number.isNaN(serial) &&
    serial > 30000
  ) {
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

    return (
      excelDate.getUTCFullYear() *
        100 +
      excelDate.getUTCMonth()
    );
  }

  const directDate = new Date(
    periodeRaw
  );

  if (
    !Number.isNaN(
      directDate.getTime()
    )
  ) {
    return (
      directDate.getFullYear() *
        100 +
      directDate.getMonth()
    );
  }

  const labelMatch =
    periodeRaw.match(
      /^([A-Za-z]+)\s*[-/ ]?\s*(\d{4})$/
    );

  if (labelMatch) {
    const labelMonthIndex =
      normalizeMonthIndex(
        labelMatch[1]
      );

    const labelYear = Number(
      labelMatch[2]
    );

    if (
      Number.isFinite(
        labelMonthIndex
      ) &&
      !Number.isNaN(labelYear)
    ) {
      return (
        labelYear * 100 +
        labelMonthIndex
      );
    }
  }

  return 0;
};

const isAllFilterValue = (
  value
) =>
  value === undefined ||
  value === null ||
  String(value).trim() === "" ||
  String(value)
    .trim()
    .toLowerCase() === "all";

const filterRowsByDashboard = (
  rows = [],
  activeFilters = DEFAULT_FILTERS
) => {
  return rows.filter((row) => {
    const matchItem =
      isAllFilterValue(
        activeFilters.itemId
      ) ||
      String(
        row["Item Id"] ?? ""
      )
        .trim()
        .toLowerCase() ===
        String(
          activeFilters.itemId
        )
          .trim()
          .toLowerCase();

    const matchCustomer =
      isAllFilterValue(
        activeFilters.customer
      ) ||
      String(
        row.Customer ?? ""
      )
        .trim()
        .toLowerCase() ===
        String(
          activeFilters.customer
        )
          .trim()
          .toLowerCase();

    const matchModel =
      isAllFilterValue(
        activeFilters.model
      ) ||
      String(
        row.Model ?? ""
      )
        .trim()
        .toLowerCase() ===
        String(
          activeFilters.model
        )
          .trim()
          .toLowerCase();

    const matchTahun =
      isAllFilterValue(
        activeFilters.tahun
      ) ||
      String(
        row.Tahun ?? ""
      ).trim() ===
        String(
          activeFilters.tahun
        ).trim();

    const matchBulan =
      isAllFilterValue(
        activeFilters.bulan
      ) ||
      String(
        row.Bulan ?? ""
      )
        .trim()
        .toLowerCase() ===
        String(
          activeFilters.bulan
        )
          .trim()
          .toLowerCase();

    return (
      matchItem &&
      matchCustomer &&
      matchModel &&
      matchTahun &&
      matchBulan
    );
  });
};

const getUniqueValues = (
  rows = [],
  field,
  formatter = (value) => value
) => {
  const values = rows
    .map((row) =>
      formatter(
        row[field]
      )
    )
    .filter(
      (value) =>
        value !== null &&
        value !== undefined &&
        String(value).trim() !== ""
    );

  return [...new Set(values)].sort((a, b) =>
    String(a).localeCompare(String(b), "id-ID")
  );
};

const buildDynamicFilterOptions = (
  rows = [],
  currentFilters = DEFAULT_FILTERS
) => {
  const normalized = {
    ...DEFAULT_FILTERS,
    ...currentFilters,
  };

  const dataset = rows.filter((row) => {
    const matchItem =
      isAllFilterValue(
        normalized.itemId
      ) ||
      String(
        row["Item Id"] ?? ""
      )
        .trim()
        .toLowerCase() ===
        String(
          normalized.itemId
        )
          .trim()
          .toLowerCase();

    const matchCustomer =
      isAllFilterValue(
        normalized.customer
      ) ||
      String(
        row.Customer ?? ""
      )
        .trim()
        .toLowerCase() ===
        String(
          normalized.customer
        )
          .trim()
          .toLowerCase();

    const matchModel =
      isAllFilterValue(
        normalized.model
      ) ||
      String(
        row.Model ?? ""
      )
        .trim()
        .toLowerCase() ===
        String(
          normalized.model
        )
          .trim()
          .toLowerCase();

    const matchYear =
      isAllFilterValue(
        normalized.tahun
      ) ||
      String(
        row.Tahun ?? ""
      )
        .trim() ===
        String(
          normalized.tahun
        ).trim();

    const matchMonth =
      isAllFilterValue(
        normalized.bulan
      ) ||
      String(
        row.Bulan ?? ""
      )
        .trim()
        .toLowerCase() ===
        String(
          normalized.bulan
        )
          .trim()
          .toLowerCase();

    return (
      matchItem &&
      matchCustomer &&
      matchModel &&
      matchYear &&
      matchMonth
    );
  });

  const itemIds = getUniqueValues(
    dataset,
    "Item Id"
  );

  const customers = getUniqueValues(
    rows.filter((row) => {
      const matchItem =
        isAllFilterValue(
          normalized.itemId
        ) ||
        String(
          row["Item Id"] ?? ""
        )
          .trim()
          .toLowerCase() ===
          String(
            normalized.itemId
          )
            .trim()
            .toLowerCase();

      const matchModel =
        isAllFilterValue(
          normalized.model
        ) ||
        String(
          row.Model ?? ""
        )
          .trim()
          .toLowerCase() ===
          String(
            normalized.model
          )
            .trim()
            .toLowerCase();

      const matchYear =
        isAllFilterValue(
          normalized.tahun
        ) ||
        String(
          row.Tahun ?? ""
        )
          .trim() ===
          String(
            normalized.tahun
          ).trim();

      const matchMonth =
        isAllFilterValue(
          normalized.bulan
        ) ||
        String(
          row.Bulan ?? ""
        )
          .trim()
          .toLowerCase() ===
          String(
            normalized.bulan
          )
            .trim()
            .toLowerCase();

      return (
        matchItem &&
        matchModel &&
        matchYear &&
        matchMonth
      );
    }),
    "Customer"
  );

  const models = getUniqueValues(
    rows.filter((row) => {
      const matchItem =
        isAllFilterValue(
          normalized.itemId
        ) ||
        String(
          row["Item Id"] ?? ""
        )
          .trim()
          .toLowerCase() ===
          String(
            normalized.itemId
          )
            .trim()
            .toLowerCase();

      const matchCustomer =
        isAllFilterValue(
          normalized.customer
        ) ||
        String(
          row.Customer ?? ""
        )
          .trim()
          .toLowerCase() ===
          String(
            normalized.customer
          )
            .trim()
            .toLowerCase();

      const matchYear =
        isAllFilterValue(
          normalized.tahun
        ) ||
        String(
          row.Tahun ?? ""
        )
          .trim() ===
          String(
            normalized.tahun
          ).trim();

      const matchMonth =
        isAllFilterValue(
          normalized.bulan
        ) ||
        String(
          row.Bulan ?? ""
        )
          .trim()
          .toLowerCase() ===
          String(
            normalized.bulan
          )
            .trim()
            .toLowerCase();

      return (
        matchItem &&
        matchCustomer &&
        matchYear &&
        matchMonth
      );
    }),
    "Model"
  );

  const years = getUniqueValues(
    rows.filter((row) => {
      const matchItem =
        isAllFilterValue(
          normalized.itemId
        ) ||
        String(
          row["Item Id"] ?? ""
        )
          .trim()
          .toLowerCase() ===
          String(
            normalized.itemId
          )
            .trim()
            .toLowerCase();

      const matchCustomer =
        isAllFilterValue(
          normalized.customer
        ) ||
        String(
          row.Customer ?? ""
        )
          .trim()
          .toLowerCase() ===
          String(
            normalized.customer
          )
            .trim()
            .toLowerCase();

      const matchModel =
        isAllFilterValue(
          normalized.model
        ) ||
        String(
          row.Model ?? ""
        )
          .trim()
          .toLowerCase() ===
          String(
            normalized.model
          )
            .trim()
            .toLowerCase();

      const matchMonth =
        isAllFilterValue(
          normalized.bulan
        ) ||
        String(
          row.Bulan ?? ""
        )
          .trim()
          .toLowerCase() ===
          String(
            normalized.bulan
          )
            .trim()
            .toLowerCase();

      return (
        matchItem &&
        matchCustomer &&
        matchModel &&
        matchMonth
      );
    }),
    "Tahun",
    (value) => String(value ?? "")
  );

  const months = getUniqueValues(
    rows.filter((row) => {
      const matchItem =
        isAllFilterValue(
          normalized.itemId
        ) ||
        String(
          row["Item Id"] ?? ""
        )
          .trim()
          .toLowerCase() ===
          String(
            normalized.itemId
          )
            .trim()
            .toLowerCase();

      const matchCustomer =
        isAllFilterValue(
          normalized.customer
        ) ||
        String(
          row.Customer ?? ""
        )
          .trim()
          .toLowerCase() ===
          String(
            normalized.customer
          )
            .trim()
            .toLowerCase();

      const matchModel =
        isAllFilterValue(
          normalized.model
        ) ||
        String(
          row.Model ?? ""
        )
          .trim()
          .toLowerCase() ===
          String(
            normalized.model
          )
            .trim()
            .toLowerCase();

      const matchYear =
        isAllFilterValue(
          normalized.tahun
        ) ||
        String(
          row.Tahun ?? ""
        )
          .trim() ===
          String(
            normalized.tahun
          ).trim();

      return (
        matchItem &&
        matchCustomer &&
        matchModel &&
        matchYear
      );
    }),
    "Bulan",
    (value) => String(value ?? "")
  );

  return {
    itemIds: itemIds,
    customers: customers,
    models: models,
    years: years,
    months: months,
  };
};

const getModeValue = (
  row,
  field,
  mode
) => {
  const baseValue =
    toNumber(row[field]);

  if (mode === CHART_MODE.CCT) {
    return (
      baseValue *
      toNumber(row.CCT)
    );
  }

  return baseValue;
};

const buildDashboardSnapshot = (
  rows = [],
  activeFilters = DEFAULT_FILTERS,
  filterOptions = {},
  mode = CHART_MODE.QTY
) => {
  const filteredData =
    filterRowsByDashboard(
      rows,
      activeFilters
    );

  const totalForecast =
    filteredData.reduce(
      (total, row) =>
        total +
        getModeValue(
          row,
          "Forecast",
          mode
        ),
      0
    );

  const totalPO =
    filteredData.reduce(
      (total, row) =>
        total +
        getModeValue(
          row,
          "PO",
          mode
        ),
      0
    );

  const totalVariance =
    filteredData.reduce(
      (total, row) =>
        total +
        (mode === CHART_MODE.CCT
          ? toNumber(row.Variance) *
            toNumber(row.CCT)
          : toNumber(row.Variance)),
      0
    );

  const totalCCT =
    filteredData.reduce(
      (total, row) =>
        total +
        toNumber(row.CCT) *
          toNumber(row.PO),
      0
    );

  let accuracy = 0;

  if (totalForecast !== 0) {
    accuracy =
      (1 -
        Math.abs(
          totalForecast -
            totalPO
        ) /
          Math.abs(
            totalForecast
          )) *
      100;
  }

  accuracy = Math.max(
    0,
    Math.min(100, accuracy)
  );

  const status = {};

  filteredData.forEach(
    (row) => {
      const currentStatus =
        String(
          row.Status ||
            "Unknown"
        ).trim();

      status[currentStatus] =
        (status[currentStatus] ||
          0) + 1;
    }
  );

  const chartMap = {};

  filteredData.forEach(
    (row) => {
      const periode =
        formatPeriode(
          row.Periode
        );

      if (!chartMap[periode]) {
        chartMap[periode] = {
          periode,
          periodeSort:
            getPeriodeSortValue(
              row
            ),
          forecast: 0,
          po: 0,
          variance: 0,
          accuracy: 0,
          totalCCT: 0,
        };
      }

      chartMap[periode].forecast +=
        getModeValue(
          row,
          "Forecast",
          mode
        );

      chartMap[periode].po +=
        getModeValue(
          row,
          "PO",
          mode
        );

      chartMap[periode].variance +=
        mode ===
        CHART_MODE.CCT
          ? toNumber(row.Variance) *
            toNumber(row.CCT)
          : toNumber(row.Variance);

      chartMap[periode].totalCCT +=
        toNumber(row.CCT) *
        toNumber(row.PO);
    }
  );

  const chart =
    Object.values(chartMap)
      .sort(
        (a, b) =>
          a.periodeSort -
          b.periodeSort
      )
      .map((item) => {
        if (
          item.forecast !== 0
        ) {
          item.accuracy =
            (1 -
              Math.abs(
                item.forecast -
                  item.po
              ) /
                Math.abs(
                  item.forecast
                )) *
            100;
        }

        item.accuracy =
          Math.max(
            0,
            Math.min(
              100,
              item.accuracy || 0
            )
          );

        delete item.periodeSort;

        return item;
      });

  return {
    totalData:
      filteredData.length,

    kpi: {
      totalForecast,
      totalPO,
      totalVariance,
      totalCCT,
      accuracy:
        Number(
          accuracy.toFixed(2)
        ),
    },

    status,
    chart,
    filters:
      filterOptions || {},
  };
};

const getDominantStatus = (
  statusMap = {}
) => {
  const entries =
    Object.entries(statusMap);

  if (entries.length === 0) {
    return "No Demand";
  }

  const [status] =
    entries.sort(
      (a, b) =>
        Number(b[1]) -
        Number(a[1])
    )[0];

  return status || "No Demand";
};

const buildExportSummaryRows = (
  rows = [],
  activeFilters = DEFAULT_FILTERS,
  mode = CHART_MODE.QTY
) => {
  const filteredData =
    filterRowsByDashboard(
      rows,
      activeFilters
    );

  if (filteredData.length === 0) {
    return [
      {
        Customer: "No Data",
        "Total Forecast": 0,
        "Total PO": 0,
        Accuracy: 0,
        Status: "No Demand",
        "Total Variance": 0,
        "Total CCT": 0,
      },
    ];
  }

  const grouped = {};

  filteredData.forEach((row) => {
    const customer =
      String(
        row.Customer ||
          "Unknown"
      ).trim() || "Unknown";

    if (!grouped[customer]) {
      grouped[customer] = {
        Customer: customer,
        totalForecastQty: 0,
        totalPOQty: 0,
        totalVarianceQty: 0,
        totalForecastCCT: 0,
        totalPOCCT: 0,
        totalVarianceCCT: 0,
        totalCCT: 0,
        statusCounts: {},
      };
    }

    const summary = grouped[customer];

    summary.totalForecastQty +=
      toNumber(row.Forecast);
    summary.totalPOQty +=
      toNumber(row.PO);
    summary.totalVarianceQty +=
      toNumber(row.Variance);
    summary.totalForecastCCT +=
      toNumber(row.Forecast) *
      toNumber(row.CCT);
    summary.totalPOCCT +=
      toNumber(row.PO) *
      toNumber(row.CCT);
    summary.totalVarianceCCT +=
      toNumber(row.Variance) *
      toNumber(row.CCT);
    summary.totalCCT +=
      toNumber(row.CCT) *
      toNumber(row.PO);

    const statusKey =
      String(
        row.Status ||
          "Unknown"
      ).trim() || "Unknown";

    summary.statusCounts[statusKey] =
      (summary.statusCounts[statusKey] || 0) + 1;
  });

  const rowsForExport = Object.values(grouped).map(
    (summary) => {
      const totalForecast =
        mode === CHART_MODE.CCT
          ? summary.totalForecastCCT
          : summary.totalForecastQty;

      const totalPO =
        mode === CHART_MODE.CCT
          ? summary.totalPOCCT
          : summary.totalPOQty;

      const totalVariance =
        mode === CHART_MODE.CCT
          ? summary.totalVarianceCCT
          : summary.totalVarianceQty;

      let accuracy = 0;

      if (totalForecast !== 0) {
        accuracy =
          (1 -
            Math.abs(
              totalForecast -
                totalPO
            ) /
              Math.abs(
                totalForecast
              )) *
          100;
      }

      accuracy = Math.max(
        0,
        Math.min(100, accuracy)
      );

      return {
        Customer: summary.Customer,
        "Total Forecast":
          Number(
            totalForecast.toFixed(2)
          ),
        "Total PO":
          Number(
            totalPO.toFixed(2)
          ),
        Accuracy:
          Number(
            accuracy.toFixed(2)
          ),
        Status: getDominantStatus(
          summary.statusCounts
        ),
        "Total Variance":
          Number(
            totalVariance.toFixed(2)
          ),
        "Total CCT":
          Number(
            summary.totalCCT.toFixed(2)
          ),
      };
    }
  );

  if (
    !activeFilters.customer &&
    rowsForExport.length > 1
  ) {
    return rowsForExport;
  }

  return rowsForExport.slice(0, 1);
};

/* =========================
   SEARCHABLE SELECT
========================= */

function SearchableSelect({
  label,
  name,
  value,
  options = [],
  placeholder,
  onChange,
}) {
  const [
    isOpen,
    setIsOpen,
  ] = useState(false);

  const [
    searchTerm,
    setSearchTerm,
  ] = useState("");

  const wrapperRef =
    useRef(null);

  const normalizedOptions =
    useMemo(
      () => [
        "",
        ...options.filter(
          Boolean
        ),
      ],
      [options]
    );

  const filteredOptions =
    useMemo(() => {
      const term =
        searchTerm
          .trim()
          .toLowerCase();

      if (!term) {
        return normalizedOptions;
      }

      return normalizedOptions.filter(
        (option) => {
          if (!option) {
            return true;
          }

          return String(
            option
          )
            .toLowerCase()
            .includes(term);
        }
      );
    }, [
      normalizedOptions,
      searchTerm,
    ]);

  useEffect(() => {
    if (!isOpen) {
      setSearchTerm(
        value || ""
      );
    }
  }, [value, isOpen]);

  useEffect(() => {
    const handleOutsideClick =
      (event) => {
        if (
          wrapperRef.current &&
          !wrapperRef.current.contains(
            event.target
          )
        ) {
          setIsOpen(false);
        }
      };

    document.addEventListener(
      "mousedown",
      handleOutsideClick
    );

    return () =>
      document.removeEventListener(
        "mousedown",
        handleOutsideClick
      );
  }, []);

  const handleSelect = (
    nextValue
  ) => {
    onChange({
      target: {
        name,
        value: nextValue,
      },
    });

    setSearchTerm(
      nextValue || ""
    );

    setIsOpen(false);
  };

  return (
    <div className="filter-group">
      <label>
        {label}
      </label>

      <div
        className="searchable-select"
        ref={wrapperRef}
      >
        <input
          type="text"
          value={
            isOpen
              ? searchTerm
              : value || ""
          }
          placeholder={
            placeholder
          }
          className="searchable-input"
          onFocus={() => {
            setIsOpen(true);
            setSearchTerm(
              value || ""
            );
          }}
          onChange={(event) => {
            setSearchTerm(
              event.target.value
            );

            setIsOpen(true);
          }}
        />

        <button
          type="button"
          className="searchable-toggle"
          onClick={() =>
            setIsOpen(
              (previous) =>
                !previous
            )
          }
          aria-label={`Toggle ${label}`}
        >
          ▾
        </button>

        {isOpen && (
          <div className="searchable-options">
            {filteredOptions.length >
            0 ? (
              filteredOptions.map(
                (
                  option,
                  index
                ) => {
                  const isAllOption =
                    !option;

                  const optionLabel =
                    isAllOption
                      ? placeholder
                      : option;

                  return (
                    <button
                      key={`${optionLabel}-${index}`}
                      type="button"
                      className={`searchable-option ${
                        value ===
                        option
                          ? "selected"
                          : ""
                      }`}
                      onClick={() =>
                        handleSelect(
                          option
                        )
                      }
                    >
                      {
                        optionLabel
                      }
                    </button>
                  );
                }
              )
            ) : (
              <div className="searchable-empty">
                Tidak ada hasil
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* =========================
   DASHBOARD
========================= */

function Dashboard() {
  const [
    dashboard,
    setDashboard,
  ] = useState(null);

  const [
    cachedData,
    setCachedData,
  ] = useState(null);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState("");

  const [
    filters,
    setFilters,
  ] = useState(
    DEFAULT_FILTERS
  );

  const [
    chartMode,
    setChartMode,
  ] = useState(
    CHART_MODE.QTY
  );

  /* =========================
     FILTER OPTIONS
  ========================= */

  const filterOptions =
    useMemo(() => {
      if (!cachedData?.sourceData) {
        return {
          itemIds: [],
          customers: [],
          models: [],
          years: [],
          months: [],
        };
      }

      return buildDynamicFilterOptions(
        cachedData.sourceData,
        filters
      );
    }, [cachedData, filters]);

  /* =========================
     NORMALIZE FILTER
  ========================= */

  const normalizeFilters =
    useCallback(
      (
        nextFilters = DEFAULT_FILTERS
      ) => ({
        ...DEFAULT_FILTERS,
        ...nextFilters,
      }),
      []
    );

  /* =========================
     SESSION STORAGE
  ========================= */

  const loadFromSessionStorage =
    useCallback(() => {
      try {
        const stored =
          sessionStorage.getItem(
            DASHBOARD_STORAGE_KEY
          );

        if (!stored) {
          return null;
        }

        const parsed =
          JSON.parse(stored);

        if (
          !parsed ||
          !Array.isArray(
            parsed.sourceData
          )
        ) {
          return null;
        }

        return parsed;
      } catch (error) {
        console.error(
          "Session storage error:",
          error
        );

        return null;
      }
    }, []);

  /* =========================
     APPLY FILTER
  ========================= */

  const applyFiltersToCachedData =
    useCallback(
      (
        payload,
        nextFilters = DEFAULT_FILTERS,
        nextMode = chartMode
      ) => {
        const rows =
          Array.isArray(
            payload?.sourceData
          )
            ? payload.sourceData
            : [];

        const normalized =
          normalizeFilters(
            nextFilters
          );

        const snapshot =
          buildDashboardSnapshot(
            rows,
            normalized,
            payload?.data
              ?.filters || {},
            nextMode
          );

        setDashboard(
          snapshot
        );

        setFilters(
          normalized
        );
      },
      [chartMode, normalizeFilters]
    );

  /* =========================
     FETCH DASHBOARD
  ========================= */

  const fetchDashboard =
    useCallback(
      async (
        refresh = false
      ) => {
        setLoading(true);
        setError("");

        try {
          const stored =
            refresh
              ? null
              : loadFromSessionStorage();

          /*
           * Kalau ada cache,
           * jangan fetch Google Sheets
           * lagi.
           */
          if (stored) {
            setCachedData(
              stored
            );

            applyFiltersToCachedData(
              stored,
              DEFAULT_FILTERS,
              chartMode
            );

            setLoading(false);

            return;
          }

          /*
           * Fetch backend
           */
          const API_BASE =
            import.meta.env.VITE_API_URL ||
            window.location.origin ||
            "http://localhost:5000";

          const response = await axios.get(
            `${API_BASE}/api/dashboard`
          );

          const payload =
            response.data || {};

          const sourceData =
            Array.isArray(
              payload.sourceData
            )
              ? payload.sourceData
              : [];

          const prepared = {
            ...payload,

            sourceData,

            data: {
              ...(payload.data ||
                {}),

              filters:
                payload.data
                  ?.filters || {
                  itemIds: [],
                  customers: [],
                  models: [],
                  years: [],
                  months: [],
                },
            },
          };

          setCachedData(
            prepared
          );

          sessionStorage.setItem(
            DASHBOARD_STORAGE_KEY,
            JSON.stringify(
              prepared
            )
          );

          applyFiltersToCachedData(
            prepared,
            DEFAULT_FILTERS,
            chartMode
          );
        } catch (err) {
          console.error(err);

          setError(
            "Gagal mengambil data dashboard. Pastikan backend sedang berjalan."
          );
        } finally {
          setLoading(false);
        }
      },
      [
        applyFiltersToCachedData,
        loadFromSessionStorage,
      ]
    );

  /* =========================
     INITIAL LOAD
  ========================= */

  useEffect(() => {
    void fetchDashboard(
      false
    );
  }, [fetchDashboard]);

  /* =========================
     FILTER CHANGE
  ========================= */

  const handleChange = (
    event
  ) => {
    const {
      name,
      value,
    } = event.target;

    setFilters(
      (previous) => ({
        ...previous,
        [name]: value,
      })
    );
  };

  useEffect(() => {
    const nextFilters = {
      ...filters,
    };

    let changed = false;

    if (
      !isAllFilterValue(
        nextFilters.itemId
      ) &&
      !filterOptions.itemIds.includes(
        nextFilters.itemId
      )
    ) {
      nextFilters.itemId = "";
      changed = true;
    }

    if (
      !isAllFilterValue(
        nextFilters.customer
      ) &&
      !filterOptions.customers.includes(
        nextFilters.customer
      )
    ) {
      nextFilters.customer = "";
      changed = true;
    }

    if (
      !isAllFilterValue(
        nextFilters.model
      ) &&
      !filterOptions.models.includes(
        nextFilters.model
      )
    ) {
      nextFilters.model = "";
      changed = true;
    }

    if (
      !isAllFilterValue(
        nextFilters.tahun
      ) &&
      !filterOptions.years.includes(
        nextFilters.tahun
      )
    ) {
      nextFilters.tahun = "";
      changed = true;
    }

    if (
      !isAllFilterValue(
        nextFilters.bulan
      ) &&
      !filterOptions.months.includes(
        nextFilters.bulan
      )
    ) {
      nextFilters.bulan = "";
      changed = true;
    }

    if (changed) {
      setFilters(nextFilters);
    }
  }, [filterOptions, filters]);

  /* =========================
     APPLY FILTER BUTTON
  ========================= */

  const handleFilter =
    () => {
      const nextFilters =
        normalizeFilters(
          filters
        );

      if (!cachedData) {
        return;
      }

      applyFiltersToCachedData(
        cachedData,
        nextFilters,
        chartMode
      );
    };

  const handleChartModeChange = (
    nextMode
  ) => {
    setChartMode(nextMode);

    if (cachedData) {
      applyFiltersToCachedData(
        cachedData,
        filters,
        nextMode
      );
    }
  };

  const handleExportExcel = () => {
    if (!cachedData?.sourceData) {
      return;
    }

    const sanitizedValue =
      (value = "") =>
        String(value)
          .trim()
          .toLowerCase()
          .replace(
            /[^a-z0-9]+/g,
            "-"
          )
          .replace(
            /^-+|-+$/g,
            ""
          ) || "all-customer";

    const summaryRows =
      buildExportSummaryRows(
        cachedData.sourceData,
        normalizeFilters(filters),
        chartMode
      );

    const fileName =
      `forecast-summary-${chartMode === CHART_MODE.CCT ? "CCT-" : chartMode === CHART_MODE.QTY ? "QTY-" : ""}${sanitizedValue(filters.customer)}${filters.tahun ? `-${sanitizedValue(filters.tahun)}` : ""}.xlsx`;

    const worksheet =
      XLSX.utils.json_to_sheet(
        summaryRows
      );

    worksheet["!cols"] = [
      { wch: 20 },
      { wch: 18 },
      { wch: 18 },
      { wch: 14 },
      { wch: 18 },
      { wch: 18 },
      { wch: 18 },
    ];

    const workbook =
      XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      "Summary"
    );

    XLSX.writeFile(
      workbook,
      fileName
    );
  };

  /* =========================
     RESET
  ========================= */

  const handleReset =
    () => {
      const nextFilters =
        DEFAULT_FILTERS;

      setFilters(
        nextFilters
      );

      if (cachedData) {
        applyFiltersToCachedData(
          cachedData,
          nextFilters,
          chartMode
        );

        return;
      }

      void fetchDashboard(
        true
      );
    };

  /* =========================
     REFRESH
  ========================= */

  const handleRefresh =
    () => {
      void fetchDashboard(
        true
      );
    };

  /* =========================
     KPI
  ========================= */

  const kpi =
    dashboard?.kpi || {
      totalForecast: 0,
      totalPO: 0,
      totalVariance: 0,
      totalCCT: 0,
      accuracy: 0,
    };

  /* =========================
     STATUS SUMMARY
  ========================= */

  const statusSummary =
    useMemo(() => {
      const allStatuses =
        Object.entries(
          dashboard?.status || {}
        );

      const sorted = [
        ...allStatuses,
      ].sort(
        (a, b) =>
          Number(b[1]) -
          Number(a[1])
      );

      const dominant =
        sorted[0];

      if (!dominant) {
        return {
          label: "No Data",
          className:
            "no-data",
        };
      }

      const matched =
        STATUS_CATEGORIES.find(
          (item) =>
            item.key ===
            dominant[0]
        );

      return {
        label: matched
          ? matched.label
          : dominant[0],

        className:
          matched
            ? matched.className
            : "no-data",
      };
    }, [
      dashboard?.status,
    ]);

  /* =========================
     FORMAT NUMBER
  ========================= */

  const formatNumber = (
    number
  ) => {
    return new Intl.NumberFormat(
      "id-ID"
    ).format(
      number || 0
    );
  };

  /* =========================
     SKELETON
  ========================= */

  const renderSkeleton =
    () => (
      <div
        className="dashboard-skeleton"
        aria-live="polite"
        aria-busy="true"
      >
        <div className="skeleton-header" />

        <div className="skeleton-filter" />

        <div className="skeleton-kpi-grid">
          {Array.from({
            length: 6,
          }).map(
            (_, index) => (
              <div
                key={index}
                className="skeleton-kpi-card"
              />
            )
          )}
        </div>

        <div className="skeleton-chart-grid">
          <div className="skeleton-chart" />
          <div className="skeleton-chart" />
          <div className="skeleton-chart" />
        </div>
      </div>
    );

  /* =========================
     LOADING
  ========================= */

  if (
    loading &&
    !dashboard
  ) {
    return (
      <div className="dashboard-page">
        <div className="dashboard-loading">
          {renderSkeleton()}
        </div>
      </div>
    );
  }

  /* =========================
     ERROR
  ========================= */

  if (
    error &&
    !dashboard
  ) {
    return (
      <div className="dashboard-error">
        <h2>
          Terjadi Kesalahan
        </h2>

        <p>
          {error}
        </p>

        <button
          onClick={() =>
            fetchDashboard(
              true
            )
          }
        >
          Coba Lagi
        </button>
      </div>
    );
  }

  /* =========================
     RENDER
  ========================= */

  return (
    <div className="dashboard-page">

      {/* =====================
          HEADER
      ===================== */}

      <div className="dashboard-header">
        <div>
          <h1>
            Forecast Dashboard
          </h1>

          <p>
            Monitoring Forecast,
            PO, Accuracy,
            CCT &amp; Demand
          </p>
        </div>

        <div className="dashboard-date">
          <span>
            Last Update
          </span>

          <strong>
            {new Date().toLocaleDateString(
              "id-ID",
              {
                day: "2-digit",
                month: "short",
                year: "numeric",
              }
            )}
          </strong>

          <button
            type="button"
            className="btn-refresh"
            onClick={
              handleRefresh
            }
          >
            Refresh Data
          </button>
        </div>
      </div>

      {/* =====================
          FILTER
      ===================== */}

      <div className="filter-card">
        <div className="filter-title">
          <div>
            <h3>
              Filter Data
            </h3>

            <p>
              Gunakan filter untuk
              melihat data tertentu
            </p>
          </div>
        </div>

        <div className="filter-grid">

          <SearchableSelect
            label="Item ID"
            name="itemId"
            value={
              filters.itemId
            }
            options={
              filterOptions.itemIds
            }
            placeholder="Semua Item ID"
            onChange={
              handleChange
            }
          />

          <SearchableSelect
            label="Customer"
            name="customer"
            value={
              filters.customer
            }
            options={
              filterOptions.customers
            }
            placeholder="Semua Customer"
            onChange={
              handleChange
            }
          />

          <SearchableSelect
            label="Model"
            name="model"
            value={
              filters.model
            }
            options={
              filterOptions.models
            }
            placeholder="Semua Model"
            onChange={
              handleChange
            }
          />

          <div className="filter-group">
            <label>
              Tahun
            </label>

            <select
              name="tahun"
              value={
                filters.tahun
              }
              onChange={
                handleChange
              }
            >
              <option value="">
                Semua Tahun
              </option>

              {filterOptions.years.map(
                (value) => (
                  <option
                    key={value}
                    value={value}
                  >
                    {value}
                  </option>
                )
              )}
            </select>
          </div>

          <div className="filter-group">
            <label>
              Bulan
            </label>

            <select
              name="bulan"
              value={
                filters.bulan
              }
              onChange={
                handleChange
              }
            >
              <option value="">
                Semua Bulan
              </option>

              {filterOptions.months.map(
                (value) => (
                  <option
                    key={value}
                    value={value}
                  >
                    {value}
                  </option>
                )
              )}
            </select>
          </div>

          <div className="filter-buttons">
            <button
              className="btn-filter"
              onClick={
                handleFilter
              }
            >
              Terapkan
            </button>

            <button
              className="btn-reset"
              onClick={
                handleReset
              }
            >
              Reset
            </button>

            <button
              type="button"
              className="btn-export"
              onClick={
                handleExportExcel
              }
            >
              Export Excel
            </button>
          </div>
        </div>
      </div>

      {/* =====================
          KPI
      ===================== */}

      <div className="kpi-grid">

        {/* FORECAST */}
        <div className="kpi-card">
          <div className="kpi-icon forecast">
            F
          </div>

          <div>
            <span>
              Total Forecast
            </span>

            <h2>
              {formatNumber(
                kpi.totalForecast
              )}
            </h2>
          </div>
        </div>

        {/* PO */}
        <div className="kpi-card">
          <div className="kpi-icon po">
            P
          </div>

          <div>
            <span>
              Total PO
            </span>

            <h2>
              {formatNumber(
                kpi.totalPO
              )}
            </h2>
          </div>
        </div>

        {/* VARIANCE */}
        <div className="kpi-card">
          <div className="kpi-icon variance">
            V
          </div>

          <div>
            <span>
              Total Variance
            </span>

            <h2>
              {formatNumber(
                kpi.totalVariance
              )}
            </h2>
          </div>
        </div>

        {/* ACCURACY */}
        <div className="kpi-card">
          <div className="kpi-icon accuracy">
            %
          </div>

          <div>
            <span>
              Accuracy
            </span>

            <h2>
              {kpi.accuracy}%
            </h2>
          </div>
        </div>

        {/* STATUS */}
        <div
          className={`kpi-card status-kpi ${statusSummary.className}`}
        >
          <div className="kpi-icon status">
            S
          </div>

          <div>
            <span>
              Status
            </span>

            <h2>
              {statusSummary.label}
            </h2>
          </div>
        </div>

        {/* TOTAL CCT */}
        <div className="kpi-card">
          <div className="kpi-icon cct">
            C
          </div>

          <div>
            <span>
              Total CCT
            </span>

            <h2>
              {formatNumber(
                kpi.totalCCT
              )}
            </h2>

            <small>
              CCT × PO
            </small>
          </div>
        </div>

      </div>

      {/* =====================
          CHART
      ===================== */}

      <div className="chart-grid">

        <ForecastChart
          data={
            dashboard?.chart ||
            []
          }
          mode={chartMode}
          onModeChange={
            handleChartModeChange
          }
        />

        <AccuracyChart
          data={
            dashboard?.chart ||
            []
          }
        />

      </div>

      {/* =====================
          INFO
      ===================== */}

      <div className="dashboard-info">
        <span>
          Total data:
          <strong>
            {" "}
            {formatNumber(
              dashboard?.totalData
            )}
          </strong>
        </span>

        {loading && (
          <span className="updating">
            Memperbarui data...
          </span>
        )}
      </div>
    </div>
  );
}

export default Dashboard;