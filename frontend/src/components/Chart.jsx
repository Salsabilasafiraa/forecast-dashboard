import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LabelList,
} from "recharts";

/* =========================
   FORMAT ANGKA
========================= */

const formatNumber = (value) => {
  return new Intl.NumberFormat("id-ID").format(
    Number(value) || 0
  );
};

const formatShortNumber = (value) => {
  const numericValue = Number(value || 0);

  if (!Number.isFinite(numericValue)) {
    return "0";
  }

  return new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: 0,
  }).format(numericValue);
};

const formatPercentValue = (value) => {
  const numericValue = Number(value || 0);

  return `${new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numericValue)}%`;
};

/* =========================
   LABEL NILAI DI GRAFIK
========================= */

function ChartValueLabel({
  x,
  y,
  value,
  fill,
  formatter,
  position,
}) {
  const text = formatter
    ? formatter(value)
    : formatShortNumber(value);

  const finalY =
    position === "bottom"
      ? y + 18
      : y - 10;

  return (
    <text
      x={x}
      y={finalY}
      fill={fill}
      fontSize={10}
      fontWeight={700}
      textAnchor="middle"
    >
      {text}
    </text>
  );
}

/* =========================
   TOOLTIP 3 SERIES
========================= */

function ForecastTooltip({
  active,
  payload,
  label,
}) {
  if (
    !active ||
    !payload ||
    payload.length === 0
  ) {
    return null;
  }

  const rows = payload.filter(
    (item) =>
      item &&
      typeof item.value !== "undefined" &&
      item.value !== null
  );

  return (
    <div className="custom-tooltip">
      <p className="tooltip-title">
        {label}
      </p>

      {rows.map((item) => (
        <div
          key={item.dataKey}
          className="tooltip-row"
        >
          <span
            className="tooltip-dot"
            style={{
              backgroundColor: item.color,
            }}
          />

          <span className="tooltip-label">
            {item.name}
          </span>

          <strong>
            {formatNumber(item.value)}
          </strong>
        </div>
      ))}
    </div>
  );
}

/* =========================
   TOOLTIP ACCURACY
========================= */

function AccuracyTooltip({
  active,
  payload,
  label,
}) {
  if (
    !active ||
    !payload ||
    payload.length === 0
  ) {
    return null;
  }

  const value = Number(
    payload[0]?.value || 0
  );

  return (
    <div className="custom-tooltip">
      <p className="tooltip-title">
        {label}
      </p>

      <div className="tooltip-row">
        <span
          className="tooltip-dot"
          style={{
            backgroundColor: "#7c3aed",
          }}
        />

        <span className="tooltip-label">
          Accuracy
        </span>

        <strong>
          {value.toFixed(2)}%
        </strong>
      </div>
    </div>
  );
}

/* =========================
   FORECAST VS PO VS TOTAL CCT
========================= */

function ForecastChart({
  data = [],
  mode = "QTY",
  onModeChange,
}) {
  const title =
    mode === "CCT"
      ? "Forecast vs PO — CCT"
      : "Forecast vs PO — Qty";

  const subtitle =
    mode === "CCT"
      ? "Perbandingan Forecast dan PO berdasarkan CCT"
      : "Perbandingan Forecast dan PO berdasarkan Quantity";

  return (
    <div className="chart-card">
      <div className="chart-header">
        <div>
          <h3>{title}</h3>

          <p>{subtitle}</p>
        </div>

        <div className="chart-mode-toggle">
          <button
            type="button"
            className={
              mode === "CCT"
                ? "active"
                : ""
            }
            onClick={() =>
              onModeChange?.("CCT")
            }
          >
            CCT
          </button>

          <button
            type="button"
            className={
              mode === "QTY"
                ? "active"
                : ""
            }
            onClick={() =>
              onModeChange?.("QTY")
            }
          >
            QTY
          </button>
        </div>
      </div>

      <div className="chart-container">
        {data.length === 0 ? (
          <div className="empty-chart">
            Tidak ada data untuk ditampilkan
          </div>
        ) : (
          <ResponsiveContainer
            width="100%"
            height="100%"
            minWidth={0}
            minHeight={260}
          >
            <LineChart
              data={data}
              margin={{
                top: 30,
                right: 25,
                left: 10,
                bottom: 10,
              }}
            >
              <CartesianGrid
                strokeDasharray="4 4"
                vertical={false}
              />

              <XAxis
                dataKey="periode"
                tick={{
                  fontSize: 11,
                }}
                tickLine={false}
                axisLine={false}
              />

              <YAxis
                tick={{
                  fontSize: 11,
                }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) =>
                  formatShortNumber(value)
                }
              />

              <Tooltip
                content={<ForecastTooltip />}
                cursor={{
                  strokeDasharray: "4 4",
                }}
              />

              <Legend
                verticalAlign="top"
                height={40}
                iconType="circle"
              />

              <Line
                type="monotone"
                dataKey="forecast"
                name="Forecast"
                stroke="#2563eb"
                strokeWidth={3}
                dot={{
                  r: 4,
                  strokeWidth: 2,
                  fill: "#ffffff",
                }}
                activeDot={{
                  r: 7,
                }}
              >
                <LabelList
                  dataKey="forecast"
                  position="top"
                  content={
                    <ChartValueLabel
                      fill="#1d4ed8"
                      formatter={formatShortNumber}
                      position="top"
                    />
                  }
                />
              </Line>

              <Line
                type="monotone"
                dataKey="po"
                name="PO"
                stroke="#16a34a"
                strokeWidth={3}
                dot={{
                  r: 4,
                  strokeWidth: 2,
                  fill: "#ffffff",
                }}
                activeDot={{
                  r: 7,
                }}
              >
                <LabelList
                  dataKey="po"
                  position="bottom"
                  content={
                    <ChartValueLabel
                      fill="#047857"
                      formatter={formatShortNumber}
                      position="bottom"
                    />
                  }
                />
              </Line>
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

/* =========================
   FORECAST ACCURACY
========================= */

function AccuracyChart({ data = [] }) {
  return (
    <div className="chart-card">
      <div className="chart-header">
        <div>
          <h3>Forecast Accuracy</h3>

          <p>
            Tingkat akurasi forecast berdasarkan periode
          </p>
        </div>
      </div>

      <div className="chart-container">
        {data.length === 0 ? (
          <div className="empty-chart">
            Tidak ada data untuk ditampilkan
          </div>
        ) : (
          <ResponsiveContainer
            width="100%"
            height="100%"
            minWidth={0}
            minHeight={260}
          >
            <LineChart
              data={data}
              margin={{
                top: 30,
                right: 25,
                left: 10,
                bottom: 10,
              }}
            >
              <CartesianGrid
                strokeDasharray="4 4"
                vertical={false}
              />

              <XAxis
                dataKey="periode"
                tick={{
                  fontSize: 11,
                }}
                tickLine={false}
                axisLine={false}
              />

              <YAxis
                domain={[0, 100]}
                tick={{
                  fontSize: 11,
                }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) =>
                  `${value}%`
                }
              />

              <Tooltip
                content={<AccuracyTooltip />}
                cursor={{
                  strokeDasharray: "4 4",
                }}
              />

              <Line
                type="monotone"
                dataKey="accuracy"
                name="Accuracy"
                stroke="#7c3aed"
                strokeWidth={3}
                dot={{
                  r: 4,
                  strokeWidth: 2,
                  fill: "#ffffff",
                }}
                activeDot={{
                  r: 7,
                }}
              >
                <LabelList
                  dataKey="accuracy"
                  position="top"
                  content={
                    <ChartValueLabel
                      fill="#6d28d9"
                      formatter={formatPercentValue}
                      position="top"
                    />
                  }
                />
              </Line>
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

/* =========================
   EXPORT
========================= */

export {
  ForecastChart,
  AccuracyChart,
};