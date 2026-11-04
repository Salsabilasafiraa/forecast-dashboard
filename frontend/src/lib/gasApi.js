const GAS_API_URL = (import.meta.env.VITE_GAS_URL || "").trim();

function isPlaceholderGasUrl(value) {
  return !value || value.includes("YOUR_SCRIPT_ID") || value.includes("script.google.com/macros/s/") === false && value.includes("https://") === false;
}

function ensureGasUrl() {
  if (!GAS_API_URL || isPlaceholderGasUrl(GAS_API_URL)) {
    throw new Error(
      "VITE_GAS_URL belum diatur dengan URL Google Apps Script Web App yang valid. Buka file .env, isi URL web app Apps Script, lalu restart aplikasi."
    );
  }

  return GAS_API_URL.replace(/\/$/, "");
}

async function callGas(action, payload = {}) {
  let url;

  try {
    url = ensureGasUrl();
  } catch (error) {
    if (action === "read") {
      return {
        success: true,
        data: [],
        sourceData: [],
        message: error.message,
      };
    }

    throw error;
  }

  const isRead = action === "read";

  const response = await fetch(
    isRead ? `${url}?action=${encodeURIComponent(action)}` : url,
    {
      method: isRead ? "GET" : "POST",
      headers: isRead
        ? undefined
        : {
            "Content-Type": "application/json",
          },
      body: isRead ? undefined : JSON.stringify({ action, ...payload }),
      cache: "no-store",
    }
  );

  const data = await response.json().catch(() => ({}));

  if (!response.ok || data.success === false) {
    throw new Error(
      data.message || `Request Google Apps Script gagal: ${action}`
    );
  }

  return data;
}

export async function readDataFromGas() {
  return callGas("read");
}

export async function writeDataToGas(action, payload = {}) {
  return callGas(action, payload);
}
