import Constants from 'expo-constants';

export async function getGeminiInsight({ sensor, history, type = 'water' }: { sensor: any; history: any[]; type?: 'water' | 'rainfall' }) {
  // Read API key from Expo `extra` first, then runtime env fallbacks.
  const extra = (Constants.expoConfig?.extra || Constants.manifest?.extra || {}) as { GEMINI_API_KEY?: string };
  const API_KEY = extra.GEMINI_API_KEY || process.env.EXPO_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY || '';
  if (!API_KEY) throw new Error('Missing Gemini API key. Set GEMINI_API_KEY in env or expo extra.');
  const models = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash-latest', 'gemini-1.5-flash', 'gemini-1.5-pro'];

  const waterSeries = history.map(h => `${h.label}: ${h.water}m`).join(', ');
  const rainSeries  = history.map(h => `${h.label}: ${h.rainfall}mm/hr`).join(', ');

  let prompt = '';
  if (type === 'water') {
    prompt = `You are an expert hydrologist analyzing WATER LEVEL data for local residents.

Sensor id: ${sensor.id}
Location: ${sensor.label}
Current water level: ${sensor.water}m
Recent water levels: ${waterSeries}

PROVIDE A STRUCTURED SUMMARY focused on WATER LEVEL RISK with these sections (use bullets for clarity):

CURRENT RISK LEVEL:
- State if water is Safe, Moderate, or High risk based on water level

WHAT THIS WATER LEVEL MEANS:
- Explain in plain language what the current ${sensor.water}m water level means for residents
- No technical jargon

WATER LEVEL TREND:
- Is water rising, falling, or stable?
- What does this trend suggest about flood risk?

RECOMMENDED ACTIONS:
- Provide 2-3 bullet points with practical steps residents should take based on water levels

Keep the language simple and direct. Make it easy for residents to understand.`;
  } else {
    prompt = `You are an expert hydrologist analyzing RAINFALL INTENSITY data for local residents.

Sensor id: ${sensor.id}
Location: ${sensor.label}
Current rainfall intensity: ${sensor.rainfall}mm/hr
Recent rainfall: ${rainSeries}

PROVIDE A STRUCTURED SUMMARY focused on RAINFALL RISK with these sections (use bullets for clarity):

CURRENT RAINFALL LEVEL:
- State if rainfall is Light, Moderate, Heavy, or Extreme

WHAT THIS RAINFALL MEANS:
- Explain in plain language what ${sensor.rainfall}mm/hr rainfall means for this location
- Describe the flooding risk this rainfall creates

RAINFALL TREND:
- Is rainfall increasing, decreasing, or stable?
- What does this trend suggest?

RECOMMENDED ACTIONS:
- Provide 2-3 bullet points with practical steps residents should take based on rainfall

Keep the language simple and direct. Make it easy for residents to understand.`;
  }

  function normalizeInsightText(text: string) {
    return text
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/__(.*?)__/g, '$1')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/^\s*[-*#]+\s*/gm, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  // Local fallback: structured bulleted summary if API fails
  function generateLocalInsight() {
    if (type === 'water') {
      const waterLevel = sensor.water;
      const trend = history.length >= 2
        ? history[history.length - 1].water > history[history.length - 2].water ? 'rising'
        : history[history.length - 1].water < history[history.length - 2].water ? 'falling' : 'stable'
        : 'unknown';

      let riskLabel = 'Safe';
      let meaning = 'Water levels are low and safe.';
      let actions = '• Continue monitoring.\n• No immediate action needed.';
      
      if (waterLevel < 2.0) {
        riskLabel = 'Safe';
        meaning = 'Water levels are low and safe.';
        actions = '• Continue routine monitoring.\n• No immediate action needed.';
      } else if (waterLevel < 3.0) {
        riskLabel = 'Moderate';
        meaning = 'Water levels are elevated. There is some flood risk.';
        actions = '• Stay alert and monitor updates.\n• Avoid low-lying areas.\n• Have an evacuation plan ready.';
      } else if (waterLevel < 4.0) {
        riskLabel = 'High';
        meaning = 'Water levels are rising into the warning zone. Significant flood risk.';
        actions = '• Prepare to evacuate.\n• Move valuables to higher ground.\n• Stay close to your evacuation route.';
      } else {
        riskLabel = 'High';
        meaning = 'Water levels are at critical threshold. Immediate flood risk.';
        actions = '• Evacuate to higher ground immediately if instructed by authorities.\n• Do not wait.\n• Follow official evacuation orders.';
      }

      const trendText = trend === 'rising' ? 'Water is rising' : trend === 'falling' ? 'Water is falling' : 'Water level is stable';
      
      return `CURRENT RISK LEVEL:\n• ${riskLabel}\n\nWHAT THIS WATER LEVEL MEANS:\n• ${meaning}\n\nWATER LEVEL TREND:\n• ${trendText} over the recent period.\n\nRECOMMENDED ACTIONS:\n${actions}`;
    } else {
      const rainfall = sensor.rainfall;
      const trend = history.length >= 2
        ? history[history.length - 1].rainfall > history[history.length - 2].rainfall ? 'increasing'
        : history[history.length - 1].rainfall < history[history.length - 2].rainfall ? 'decreasing' : 'stable'
        : 'unknown';

      let rainfallLevel = 'Light';
      let meaning = 'Light rainfall — safe conditions.';
      let actions = '• Continue normal activities.\n• Monitor forecasts.';
      
      if (rainfall < 7.5) {
        rainfallLevel = 'Light';
        meaning = 'Light rainfall — safe conditions.';
        actions = '• Continue normal activities.\n• Monitor forecasts.';
      } else if (rainfall < 15) {
        rainfallLevel = 'Moderate';
        meaning = 'Moderate rainfall — water building up in low areas.';
        actions = '• Avoid driving through flooded areas.\n• Move outdoor items to higher ground.\n• Be ready to leave if needed.';
      } else if (rainfall < 30) {
        rainfallLevel = 'Heavy';
        meaning = 'Heavy rainfall — flash flood risk.';
        actions = '• Stay indoors.\n• Avoid flooded roads.\n• Be prepared to evacuate.';
      } else {
        rainfallLevel = 'Extreme';
        meaning = 'Extreme rainfall — severe flooding expected.';
        actions = '• Evacuate immediately if instructed.\n• Move to higher ground now.\n• Follow official guidance.';
      }

      const trendText = trend === 'increasing' ? 'Rainfall is increasing' : trend === 'decreasing' ? 'Rainfall is decreasing' : 'Rainfall is stable';
      
      return `CURRENT RAINFALL LEVEL:\n• ${rainfallLevel}\n\nWHAT THIS RAINFALL MEANS:\n• ${meaning}\n\nRAINFALL TREND:\n• ${trendText} over the recent period.\n\nRECOMMENDED ACTIONS:\n${actions}`;
    }
  }

  const requestBody = {
    contents: [
      {
        role: 'user',
        parts: [{ text: prompt }],
      },
    ],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 300,
    },
  };

  let lastError = '';

  // Helper to fetch JSON safely
  async function fetchJson(url: string, opts?: any) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10s
    try {
      const res = await fetch(url, { signal: controller.signal, ...(opts || {}) });
      let data: any = null;
      try { data = await res.json(); } catch (e) { data = null; }
      return { res, data };
    } finally {
      clearTimeout(timeout);
    }
  }

  // Try to list available models first (v1beta then v1). This helps detect which models
  // exist for this API key and which API version to call.
  let availableModels: string[] = [];
  for (const ver of ['v1beta', 'v1']) {
    try {
      const listUrl = `https://generativelanguage.googleapis.com/${ver}/models?key=${API_KEY}`;
      const { res, data } = await fetchJson(listUrl, { method: 'GET' });
      if (res.ok && Array.isArray(data?.models)) {
        availableModels = data.models.map((m: any) => m.name || m.model || '').filter(Boolean);
        break;
      }
    } catch (e) {
      // ignore and fallback
    }
  }

  const candidateModels = availableModels.length ? models.filter(m => availableModels.includes(m) || availableModels.includes(`models/${m}`)) : models;

  // Try combinations of API versions and method names to be resilient to provider changes.
  const apiVersions = ['v1beta', 'v1'];
  const methods = ['generateContent', 'generateText'];

  for (const model of candidateModels) {
    for (const ver of apiVersions) {
      for (const method of methods) {
        const url = `https://generativelanguage.googleapis.com/${ver}/models/${model}:${method}?key=${API_KEY}`;
        try {
          // Debug: which attempt we're making
          // eslint-disable-next-line no-console
          console.debug('[gemini] trying', { model, ver, method, url });
          const { res, data } = await fetchJson(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
          });

          if (!res.ok) {
            // Capture the server message for debugging and try other combinations.
            lastError = `Model ${model} (${ver}) ${method} responded ${res.status}: ${JSON.stringify(data)}`;
            continue;
          }

          // Attempt multiple known response shapes (be defensive).
          const text =
            data?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text || '').join('') ||
            data?.candidates?.[0]?.content?.parts?.[0]?.text ||
            data?.generations?.[0]?.text ||
            data?.output?.[0]?.content?.text ||
            data?.outputText ||
            data?.text ||
            '';

          if (!text) {
            lastError = `Model ${model} (${ver}) ${method} returned unexpected response: ${JSON.stringify(data)}`;
            continue;
          }

          return normalizeInsightText(String(text));
        } catch (err: any) {
          lastError = `Model ${model} (${ver}) ${method} failed: ${err?.message || String(err)}`;
          // eslint-disable-next-line no-console
          console.error('[gemini] attempt failed', lastError);
        }
      }
    }
  }

  // Return an informative string so the UI can display the failure reason instead of throwing.
  // eslint-disable-next-line no-console
  console.error('[gemini] all attempts failed', lastError);
  // As a last resort, try the Responses API which some models expose instead of model-specific methods.
  for (const ver of ['v1beta', 'v1']) {
    try {
      const respUrl = `https://generativelanguage.googleapis.com/${ver}/responses:generate?key=${API_KEY}`;
      // eslint-disable-next-line no-console
      console.debug('[gemini] trying responses.generate', { url: respUrl });
      const body = {
        model: `models/${candidateModels[0] || models[0]}`,
        input: prompt,
        temperature: 0.2,
        maxOutputTokens: 300,
      };
      const { res, data } = await fetchJson(respUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        lastError = `Responses API (${ver}) responded ${res.status}: ${JSON.stringify(data)}`;
        continue;
      }

      const text =
        data?.output?.[0]?.content?.map((c: any) => c?.text || '').join('') ||
        data?.outputText ||
        data?.response?.content?.[0]?.text ||
        data?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text || '').join('') ||
        '';

      if (text) return normalizeInsightText(String(text));
      lastError = `Responses API (${ver}) returned unexpected body: ${JSON.stringify(data)}`;
    } catch (e: any) {
      lastError = `Responses API (${ver}) failed: ${e?.message || String(e)}`;
      // eslint-disable-next-line no-console
      console.error('[gemini] responses.generate failed', lastError);
    }
  }

  // Final fallback: generate a local insight based on water level or rainfall
  // eslint-disable-next-line no-console
  console.warn('[gemini] API unreachable, using local fallback insight', { type, value: type === 'water' ? sensor.water : sensor.rainfall });
  return generateLocalInsight();
}
