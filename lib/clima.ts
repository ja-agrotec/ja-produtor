// ============================================================
// Cliente do Open-Meteo (clima atual + previsao de N dias).
// Reutilizavel por /home e /ia-operacional.
//
// Endpoints:
//  - Geocoding: https://geocoding-api.open-meteo.com/v1/search
//  - Forecast:  https://api.open-meteo.com/v1/forecast
//
// Cache de coords por (cidade,estado) em sessionStorage pra evitar
// bater o geocoding API a cada navegacao.
// ============================================================

export type ClimaAtual = {
  temperatura: number | null;
  windspeed: number | null;
  weathercode: number | null;
};

export type DiaPrevisao = {
  data: string;          // YYYY-MM-DD
  weathercode: number;
  tempMax: number;
  tempMin: number;
  chuvaMm: number;
  ventoMaxKmh: number;
};

export type ClimaCompleto = {
  cidade: string;
  estado: string;
  lat: number;
  lon: number;
  atual: ClimaAtual | null;
  previsao: DiaPrevisao[];
};

const TZ = "America/Sao_Paulo";

async function geocodificar(cidade: string, estado: string): Promise<{ lat: number; lon: number } | null> {
  if (!cidade) return null;
  const cacheKey = `geo_${cidade}_${estado}`;
  if (typeof window !== "undefined") {
    try {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) return JSON.parse(cached);
    } catch { /* ignore */ }
  }
  try {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cidade)}&country=BR&count=1&language=pt`;
    const r = await fetch(url);
    const data = await r.json();
    const first = data?.results?.[0];
    if (!first?.latitude || !first?.longitude) return null;
    const coords = { lat: first.latitude, lon: first.longitude };
    if (typeof window !== "undefined") {
      try { sessionStorage.setItem(cacheKey, JSON.stringify(coords)); } catch { /* ignore */ }
    }
    return coords;
  } catch {
    return null;
  }
}

export async function buscarClima(
  cidade: string,
  estado: string,
  diasPrevisao: number = 5,
): Promise<ClimaCompleto> {
  const cidadeReal = cidade?.trim() || "Brasília";
  const estadoReal = estado?.trim() || "DF";

  const coords = (await geocodificar(cidadeReal, estadoReal)) || { lat: -15.78, lon: -47.92 };

  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}` +
    `&current_weather=true` +
    `&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max` +
    `&timezone=${encodeURIComponent(TZ)}` +
    `&forecast_days=${diasPrevisao}`;

  let atual: ClimaAtual | null = null;
  let previsao: DiaPrevisao[] = [];
  try {
    const r = await fetch(url);
    const data = await r.json();
    const cw = data?.current_weather;
    if (cw) {
      atual = {
        temperatura: cw.temperature ?? null,
        windspeed: cw.windspeed ?? null,
        weathercode: cw.weathercode ?? null,
      };
    }
    const d = data?.daily;
    if (d?.time?.length) {
      const n = d.time.length;
      for (let i = 0; i < n; i++) {
        previsao.push({
          data: d.time[i],
          weathercode: d.weathercode?.[i] ?? 0,
          tempMax: d.temperature_2m_max?.[i] ?? 0,
          tempMin: d.temperature_2m_min?.[i] ?? 0,
          chuvaMm: d.precipitation_sum?.[i] ?? 0,
          ventoMaxKmh: d.wind_speed_10m_max?.[i] ?? 0,
        });
      }
    }
  } catch {
    /* falha silenciosa: atual=null, previsao=[] */
  }

  return {
    cidade: cidadeReal,
    estado: estadoReal,
    lat: coords.lat,
    lon: coords.lon,
    atual,
    previsao,
  };
}

// WMO weather code -> icone emoji
export function iconeWmo(code: number | null | undefined): string {
  if (code == null) return "🌤";
  if (code === 0) return "☀️";
  if (code <= 3) return "⛅";
  if (code <= 48) return "🌫";
  if (code <= 67) return "🌧";
  if (code <= 77) return "🌨";
  if (code <= 82) return "🌧";
  if (code <= 86) return "🌨";
  if (code <= 99) return "⛈";
  return "🌤";
}

export function nomeDiaCurto(dataISO: string): string {
  try {
    const d = new Date(dataISO + "T12:00:00");
    const hoje = new Date();
    const ymd = (x: Date) =>
      `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
    if (ymd(d) === ymd(hoje)) return "Hoje";
    return d.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "");
  } catch {
    return dataISO;
  }
}
