import Constants from 'expo-constants';

const GEMINI_API_KEY = 
  process.env.EXPO_PUBLIC_GEMINI_API_KEY ||
  (Constants.expoConfig?.extra as any)?.GEMINI_API_KEY ||
  '';

export async function getGeminiInsight({ sensor, history, rainHistory, type = 'water' }: { sensor: any; history: any[]; rainHistory?: { label: string; value: number }[]; type?: 'water' | 'rainfall' }) {
  // Safety: ensure sensor and history have safe defaults
  const safeSensor = sensor || { id: 'S-001', label: 'Unknown', water: 0, rainfall: 0, status: 'normal' };
  const safeHistory = Array.isArray(history) ? history.filter(h => h != null) : [];
  const safeRainHistory = Array.isArray(rainHistory) ? rainHistory.filter(h => h != null) : [];

  const waterSeries = safeHistory.map(h => `${h.label}: ${h.water ?? 0}cm`).join(', ') || 'No data';
  // Prefer the real rainfall history from the weather API; fall back to per-point history
  const rainSeries = safeRainHistory.length > 0
    ? safeRainHistory.map(h => `${h.label}: ${h.value ?? 0}mm`).join(', ')
    : (safeHistory.map(h => `${h.label}: ${h.rainfall ?? 0}mm/hr`).join(', ') || 'No data');

  const rainTotal = safeRainHistory.reduce((a, h) => a + (h.value ?? 0), 0);
  const rainPeak = safeRainHistory.length ? Math.max(...safeRainHistory.map(h => h.value ?? 0)) : 0;

  const prompt = type === 'water'
    ? `You are an emergency advisor for flood-prone residents in Cavite, Philippines. Analyze the WATER LEVEL data and give ACTIONABLE ADVICE.

The water level is measured in centimeters relative to GROUND LEVEL (0 cm = ground). Negative values mean water is below ground; positive means above ground. Scale: -40cm SAFE, -20cm WATCH (rising), 0cm LOW (at ground), 40cm WARNING, 90cm RELOCATE, 150cm CRITICAL.

Sensor id: ${safeSensor.id}
Location: ${safeSensor.label}
Current water level: ${safeSensor.water}cm
Recent water levels: ${waterSeries}
Recent rainfall (weather API): ${rainSeries}
Rainfall so far this period: total ~${Math.round(rainTotal * 10) / 10}mm, peak ${Math.round(rainPeak * 10) / 10}mm

Give DIRECT, ACTIONABLE ADVICE to residents. Use simple language. Be specific. Format as:

⚠️ SITUATION:
- Describe what's happening right now (e.g., "Water level is rising and approaching danger zone")

🚨 WHAT YOU SHOULD DO NOW:
- List 3-4 specific actions (e.g., "Move to the 2nd floor", "Unplug appliances", "Evacuate NOW")

🎒 WHAT TO PREPARE:
- List items to grab or prepare (e.g., "Pack water, food, medicine, phone charger, IDs in a waterproof bag")

📍 EVACUATION ADVICE:
- Should they evacuate? If yes, say so clearly
- If not yet, what's the trigger to evacuate?

Keep it short, urgent, and clear. No technical jargon. No markdown formatting. Write like you're texting a neighbor during a flood.`
    : `You are an emergency advisor for flood-prone residents in Cavite, Philippines. Analyze the RAINFALL data and give ACTIONABLE ADVICE.

Sensor id: ${safeSensor.id}
Location: ${safeSensor.label}
Current rainfall intensity: ${safeSensor.rainfall}mm/hr
Recent rainfall history (from weather API): ${rainSeries}
Rainfall so far this period: total ~${Math.round(rainTotal * 10) / 10}mm, peak ${Math.round(rainPeak * 10) / 10}mm
Also, current sensed water level: ${safeSensor.water}cm relative to ground (0cm = ground level)

Give DIRECT, ACTIONABLE ADVICE to residents. Use simple language. Be specific. Format as:

⚠️ SITUATION:
- Describe what's happening (e.g., "Heavy rain is intensifying, flooding likely within 1-2 hours")

🚨 WHAT YOU SHOULD DO NOW:
- List 3-4 specific actions based on current rainfall intensity
- Include things like "Move your car to higher ground", "Don't cross flooded streets", "Charge your phone now"

🎒 WHAT TO PREPARE:
- Emergency bag contents
- Things to secure in your home
- Documents to protect

📍 SHOULD YOU EVACUATE?
- Clear yes/no/not yet based on rainfall intensity
- What to watch for as a trigger

Keep it short, urgent, and clear. No technical jargon. No markdown formatting. Write like you're warning a neighbor.`;

  // Try Gemini API if key is available
  if (GEMINI_API_KEY) {
    try {
      const result = await callGeminiAPI(prompt);
      if (result) return result;
    } catch (err) {
      console.warn('[gemini] API call failed, using local fallback:', err);
    }
  }

  // Fallback: generate local insight
  return generateLocalInsight(type, safeSensor, safeHistory, safeRainHistory);
}

async function callGeminiAPI(prompt: string): Promise<string | null> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 600,
        },
      }),
    });

    if (!response.ok) {
      // Try fallback model
      const fallbackResult = await tryFallbackModel(prompt);
      if (fallbackResult) return fallbackResult;
      console.warn('[gemini] API responded', response.status);
      return null;
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

    if (text && text.length > 30) {
      return cleanText(text);
    }

    return null;
  } catch (err: any) {
    if (err.name === 'AbortError') {
      console.warn('[gemini] Request timed out');
    }
    // Try fallback model
    const fallbackResult = await tryFallbackModel(prompt);
    if (fallbackResult) return fallbackResult;
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function tryFallbackModel(prompt: string): Promise<string | null> {
  const fallbackModels = ['gemini-1.5-flash', 'gemini-1.5-flash-latest'];
  
  for (const model of fallbackModels) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000);

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 600 },
        }),
      });

      clearTimeout(timeout);

      if (!response.ok) continue;

      const data = await response.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      if (text && text.length > 30) return cleanText(text);
    } catch {
      continue;
    }
  }

  return null;
}

function cleanText(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^#{1,3}\s*/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function generateLocalInsight(type: string, safeSensor: any, safeHistory: any[], safeRainHistory: { label: string; value: number }[] = []): string {
  if (type === 'water') {
    const waterLevel = safeSensor.water ?? 0;
    const trend = safeHistory.length >= 2
      ? (safeHistory[safeHistory.length - 1]?.water ?? 0) > (safeHistory[safeHistory.length - 2]?.water ?? 0) ? 'rising'
      : (safeHistory[safeHistory.length - 1]?.water ?? 0) < (safeHistory[safeHistory.length - 2]?.water ?? 0) ? 'falling' : 'stable'
      : 'unknown';

    let situation = '';
    let actions = '';
    let prepare = '';
    let evacuate = '';

    if (waterLevel < 0) {
      situation = `Water level is below ground (${waterLevel}cm). Safe — no flood threat at this time.`;
      actions = '• Continue normal activities\n• Keep monitoring for updates\n• Make sure your go-bag is ready just in case';
      prepare = '• No urgent preparation needed\n• Good time to restock your emergency kit';
      evacuate = '• No need to evacuate\n• Stay aware of weather forecasts';
    } else if (waterLevel < 40) {
      situation = `Water has reached ground level (${waterLevel}cm). ${trend === 'rising' ? 'It is still going up.' : 'It appears stable for now.'}`;
      actions = '• Stay alert and monitor updates frequently\n• Move valuables away from the ground floor\n• Charge your phone and power bank now\n• Know your evacuation route';
      prepare = '• Pack a go-bag: water, food, medicine, IDs, phone charger\n• Move important documents to a high shelf or waterproof bag\n• Secure outdoor items that could float away';
      evacuate = '• Not yet — but be ready to leave quickly\n• If water rises past 40cm, prepare to evacuate';
    } else if (waterLevel < 90) {
      situation = `⚠️ Water level is HIGH (${waterLevel}cm above ground) and ${trend === 'rising' ? 'STILL RISING' : 'holding steady'}. Flooding in low areas is likely.`;
      actions = '• Move to the 2nd floor if you have one\n• Unplug appliances and turn off main electrical switch\n• Do NOT cross flooded roads or walkways\n• Keep your phone charged and accessible';
      prepare = '• Grab your go-bag NOW\n• Water, food for 3 days, medicine, flashlight, power bank\n• Put IDs and cash in a ziplock bag\n• Wear closed shoes, not slippers';
      evacuate = '• BE READY TO EVACUATE at any moment\n• If water reaches your door, LEAVE IMMEDIATELY\n• Head to your nearest evacuation center';
    } else {
      situation = `🚨 DANGER! Water level is CRITICAL (${waterLevel}cm above ground) and ${trend === 'rising' ? 'STILL RISING' : 'at dangerous levels'}. Severe flooding is happening or imminent.`;
      actions = '• EVACUATE NOW if you haven\'t already\n• If trapped, go to the highest point and signal for help\n• Use the SOS button to alert rescue teams\n• Do NOT attempt to walk or drive through floodwater';
      prepare = '• Take your go-bag and LEAVE\n• Bring phone, medicine, water, and nothing else\n• Help elderly neighbors evacuate too';
      evacuate = '• YES — EVACUATE IMMEDIATELY\n• Go to your nearest evacuation center\n• If you can\'t leave, go to the rooftop and call for help';
    }

    return `⚠️ SITUATION:\n${situation}\n\n🚨 WHAT YOU SHOULD DO NOW:\n${actions}\n\n🎒 WHAT TO PREPARE:\n${prepare}\n\n📍 EVACUATION ADVICE:\n${evacuate}`;
  }

  // Rainfall — prefer the real weather-API history for the trend
  const rainfall = safeSensor.rainfall ?? 0;
  const rainSeriesVals = safeRainHistory.length >= 2
    ? safeRainHistory.map(h => h.value ?? 0)
    : safeHistory.map(h => h.rainfall ?? 0);
  const trend = rainSeriesVals.length >= 2
    ? rainSeriesVals[rainSeriesVals.length - 1] > rainSeriesVals[rainSeriesVals.length - 2] ? 'increasing'
    : rainSeriesVals[rainSeriesVals.length - 1] < rainSeriesVals[rainSeriesVals.length - 2] ? 'decreasing' : 'stable'
    : 'unknown';

  let situation = '';
  let actions = '';
  let prepare = '';
  let evacuate = '';

  if (rainfall < 7.5) {
    situation = 'Light rain. No flood threat from rainfall at this time.';
    actions = '• Continue normal activities\n• Bring an umbrella if going outside\n• Monitor weather updates';
    prepare = '• No urgent preparation needed\n• Good time to check your emergency supplies';
    evacuate = '• No need to evacuate\n• Stay aware if rain intensifies';
  } else if (rainfall < 15) {
    situation = `Moderate rain (${rainfall}mm/hr) and ${trend === 'increasing' ? 'getting heavier' : 'steady'}. Water may accumulate in low areas.`;
    actions = '• Avoid low-lying streets and underpasses\n• Don\'t park your car in flood-prone areas\n• Stay indoors if possible\n• Charge your devices now';
    prepare = '• Pack a go-bag: water, food, medicine, flashlight, phone charger\n• Move ground-floor items to higher shelves\n• Secure important documents in waterproof bags';
    evacuate = '• Not yet — but stay ready\n• If rain keeps intensifying, prepare to leave\n• Watch for rising water in your area';
  } else if (rainfall < 30) {
    situation = `⚠️ Heavy rain (${rainfall}mm/hr) and ${trend === 'increasing' ? 'INTENSIFYING' : 'sustained'}. Flash flooding possible within 1-2 hours.`;
    actions = '• Stay indoors — do NOT go outside\n• Move to the 2nd floor if water is entering\n• Do NOT cross flooded roads (6 inches can knock you down)\n• Keep phone charged and SOS ready';
    prepare = '• Grab your go-bag NOW\n• Wear closed shoes and long pants\n• Put phone, IDs, cash in a ziplock bag\n• Unplug electronics from outlets near the floor';
    evacuate = '• BE READY — if water enters your home, LEAVE\n• Know where your evacuation center is\n• Don\'t wait for the water to get knee-deep';
  } else {
    situation = `🚨 EXTREME RAIN (${rainfall}mm/hr)! ${trend === 'increasing' ? 'Still getting worse.' : 'Dangerously heavy.'} Severe flooding is imminent or occurring.`;
    actions = '• EVACUATE to higher ground NOW\n• If trapped, go UP not out\n• Use SOS button to alert rescue teams\n• Do NOT attempt to drive or walk through floodwater';
    prepare = '• Take ONLY essentials: phone, medicine, water\n• Leave furniture and belongings — your life is more important\n• Help neighbors who need assistance';
    evacuate = '• YES — EVACUATE IMMEDIATELY\n• Head to your nearest evacuation center NOW\n• If you cannot leave, go to your roof and call for rescue';
  }

  return `⚠️ SITUATION:\n${situation}\n\n🚨 WHAT YOU SHOULD DO NOW:\n${actions}\n\n🎒 WHAT TO PREPARE:\n${prepare}\n\n📍 SHOULD YOU EVACUATE?\n${evacuate}`;
}
