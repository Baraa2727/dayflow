// api/generate.js – Serverless-API für Vercel
import OpenAI from "openai";

const MOCK_TEXT = `
Kurz & knackig: Dein DayFlow – Beispielausgabe (Mock).

## Tagesablauf
**Route Tag 1:** [Google Maps](https://www.google.com/maps/dir/?api=1&origin=Brandenburger+Tor+Berlin&destination=East+Side+Gallery+Berlin&waypoints=Reichstag%7CMonbijoupark%7CHackesche+H%C3%B6fe%7CMarkthalle+Neun)

A. 🕘 09:00 — [Brandenburger Tor](https://www.google.com/maps/search/?api=1&query=Brandenburger+Tor+Berlin)
✨ Wahrzeichen & klassischer Startpunkt
🚶 10 Min
`.trim();

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ ok: false, error: 'Method not allowed' });
    }
    const useMock = (process.env.USE_MOCK || "true").toLowerCase() === "true";

    if (useMock) {
      return res.status(200).json({ ok: true, content: MOCK_TEXT });
    }

    // Echtbetrieb (später, wenn USE_MOCK=false und OPENAI_API_KEY gesetzt)
    const { prompt = "Erstelle eine einfache Tagesroute" } = req.body || {};
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
    return res.status(200).json({
      ok: false,
      error: err?.response?.data?.error?.message || err?.message || "Unknown error"
    });
  }
}
