import OpenAI from "openai";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ ok: false, error: "Method not allowed" });
    }

    const { prompt = "" } = req.body || {};
    const useMock = (process.env.USE_MOCK || "true").toLowerCase() === "true";

    if (useMock) {
      // einfache Stadt-Erkennung (nur für Demo)
      const m = prompt.match(/in\s+([A-Za-zÀ-ÖØ-öø-ÿ\s]+?)(?:\s|,|$)/i);
      const city = m ? m[1].trim() : "Berlin";

      const MOCK = `
Kurz & knackig: Dein DayFlow – Beispielausgabe (Mock) für **${city}**.

## Tagesablauf
**Route Tag 1:** [Google Maps](https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(city)}&destination=${encodeURIComponent(city+" Hauptattraktion")}&waypoints=${encodeURIComponent("Spot B")}%7C${encodeURIComponent("Spot C")}%7C${encodeURIComponent("Restaurant D")}%7C${encodeURIComponent("Spot E")})

A. 🕘 09:00 — [Startpunkt ${city} Zentrum](https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(city+" Zentrum")})
✨ Perfekter Einstieg
🚶 10 Min
`.trim();

      return res.status(200).json({ ok: true, content: MOCK });
    }

    // --- Echtbetrieb (siehe Option C) ---
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const completion = await client.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system",
          content: "Du bist DayFlow. Erzeuge strikt formatierte Tagesrouten (A–F Stopps, identische Maps-Links, einzeiliger Routenlink, Abschlusstabelle)." },
        { role: "user", content: prompt }
      ]
    });
    const content = completion.choices?.[0]?.message?.content || "Keine Ausgabe erhalten.";
    return res.status(200).json({ ok: true, content });
  } catch (err) {
    return res.status(200).json({ ok: false, error: err?.message || "Unknown error" });
  }
}
