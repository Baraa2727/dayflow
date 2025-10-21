// /api/generate.js
import fs from "fs";
import path from "path";

export default async function handler(req, res) {
  try {
    // ✅ Nur POST erlauben
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Nur POST-Anfragen erlaubt" });
    }

    // ✅ Body lesen
    const { userMessage } = req.body || {};
    if (!userMessage) {
      return res.status(400).json({ error: "userMessage fehlt" });
    }

    // ✅ MOCK MODUS – wenn USE_MOCK=true
    if (process.env.USE_MOCK === "true") {
      const mock = `🧪 **MOCK-Antwort** – Beispielplan

A. ☕ [Café Beispiel](https://www.google.com/maps/search/?api=1&query=Cafe+Beispiel+Strasse+1+12345+Stadt+DE)

::contentReference[oaicite:0]{index=0}


B. 🏛 [Museum Beispiel](https://www.google.com/maps/search/?api=1&query=Museum+Beispiel+Platz+2+12345+Stadt+DE)

::contentReference[oaicite:1]{index=1}


C. 🍝 [Trattoria Beispiel](https://www.google.com/maps/search/?api=1&query=Trattoria+Beispiel+Gasse+3+12345+Stadt+DE)

::contentReference[oaicite:2]{index=2}


D. 🌳 [Park Beispiel](https://www.google.com/maps/search/?api=1&query=Park+Beispiel+Allee+4+12345+Stadt+DE)

::contentReference[oaicite:3]{index=3}


Route Tag 1: [Google Maps](https://www.google.com/maps/dir/?api=1&origin=Cafe+Beispiel+Strasse+1+12345+Stadt+DE&destination=Park+Beispiel+Allee+4+12345+Stadt+DE&waypoints=Museum+Beispiel+Platz+2+12345+Stadt+DE%7CTrattoria+Beispiel+Gasse+3+12345+Stadt+DE&travelmode=walking)

*bitte überprüfe route, adressen und namen — die KI kann vereinzelt fehler machen.*`;
      return res.status(200).json({ output: mock, mock: true });
    }

    // ✅ Prompt-Datei laden
    const promptPath = path.join(process.cwd(), "api", "prompt", "DayFlow_MasterPrompt");
    let MASTER_PROMPT = "";
    try {
      MASTER_PROMPT = fs.readFileSync(promptPath, "utf8");
    } catch (e) {
      return res.status(500).json({
        error: `Prompt-Datei nicht gefunden: ${promptPath}`
      });
    }

    // ✅ OpenAI-Aufruf (wenn Mock aus ist)
    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.7,
        messages: [
          { role: "system", content: MASTER_PROMPT },
          { role: "user", content: userMessage }
        ]
      })
    });

    if (!resp.ok) {
      const err = await resp.text();
      return res.status(resp.status).json({ error: err || "OpenAI Fehler" });
    }

    const data = await resp.json();
    const msg = data?.choices?.[0]?.message?.content ?? "";
    return res.status(200).json({ output: msg, mock: false });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Serverfehler" });
  }
}
