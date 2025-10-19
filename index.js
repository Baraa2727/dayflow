import OpenAI from "openai";
import dotenv from "dotenv";
dotenv.config();

const USE_MOCK = (process.env.USE_MOCK || "false").toLowerCase() === "true";

async function getDayFlowPlan(prompt) {
  if (USE_MOCK) {
    // ---- MOCK-ANTWORT (kostenlos, ohne API) ----
    return `
Kurz & knackig: Dein DayFlow für Berlin – kompakt geplant.

## Tagesablauf
**Route Tag 1:** [Google Maps](https://www.google.com/maps/dir/?api=1&origin=Brandenburger+Tor+Berlin&destination=East+Side+Gallery+Berlin&waypoints=Reichstagsgeb%C3%A4ude%7CMonbijoupark%7CHackesche+H%C3%B6fe%7CMarkthalle+Neun)

A. 🕘 09:00 — [Brandenburger Tor](https://www.google.com/maps/search/?api=1&query=Brandenburger+Tor+Berlin)  
✨ Wahrzeichen & klassischer Startpunkt  
🚶 10 Min

B. 🕙 10:00 — [Reichstagsgebäude](https://www.google.com/maps/search/?api=1&query=Reichstagsgeb%C3%A4ude+Berlin)  
✨ Kuppelblick (vorher Slots prüfen)  
🚶 12 Min

C. 🕚 11:30 — [Monbijoupark](https://www.google.com/maps/search/?api=1&query=Monbijoupark+Berlin)  
✨ Kurz verschnaufen am Wasser  
🚶 15 Min

D. 🕐 13:00 — [Markthalle Neun](https://www.google.com/maps/search/?api=1&query=Markthalle+Neun+Berlin)  
✨ Streetfood • Veggie-Optionen • €€  
🚶 18 Min

E. 🕓 15:00 — [Hackesche Höfe](https://www.google.com/maps/search/?api=1&query=Hackesche+H%C3%B6fe+Berlin)  
✨ Hinterhöfe & Boutiquen  
🚶 20 Min

F. 🕕 18:00 — [East Side Gallery](https://www.google.com/maps/search/?api=1&query=East+Side+Gallery+Berlin)  
✨ Open-Air-Galerie an der Spree

**Abschlusstabelle**

| A–F | Uhrzeit | Stopp (klickbar) | Adresse | Transfer |
|---|---|---|---|---|
| A | 09:00 | [Brandenburger Tor](https://www.google.com/maps/search/?api=1&query=Brandenburger+Tor+Berlin) | Pariser Platz, 10117 Berlin | 10 Min |
| B | 10:00 | [Reichstag](https://www.google.com/maps/search/?api=1&query=Reichstagsgeb%C3%A4ude+Berlin) | Platz der Republik 1 | 12 Min |
| C | 11:30 | [Monbijoupark](https://www.google.com/maps/search/?api=1&query=Monbijoupark+Berlin) | Monbijoustraße | 15 Min |
| D | 13:00 | [Markthalle Neun](https://www.google.com/maps/search/?api=1&query=Markthalle+Neun+Berlin) | Eisenbahnstr. 42 | 18 Min |
| E | 15:00 | [Hackesche Höfe](https://www.google.com/maps/search/?api=1&query=Hackesche+H%C3%B6fe+Berlin) | Rosenthaler Str. 40/41 | 20 Min |
| F | 18:00 | [East Side Gallery](https://www.google.com/maps/search/?api=1&query=East+Side+Gallery+Berlin) | Mühlenstr. | — |

☔ Plan B: [Deutsches Technikmuseum](https://www.google.com/maps/search/?api=1&query=Deutsches+Technikmuseum+Berlin) – Indoor, gute ÖPNV-Anbindung.
    `.trim();
  }

  // ---- ECHTBETRIEB (sobald Guthaben/Zahlung aktiv ist) ----
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const res = await client.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [
      {
        role: "system",
        content:
          "Du bist DayFlow. Erzeuge strikt formatierte Tagesrouten mit A–F Stopps, identischen Maps-Links (Titel & Bild) und einzeiligem Routenlink + Abschlusstabelle."
      },
      { role: "user", content: prompt }
    ]
  });
  return res.choices[0].message.content;
}

(async () => {
  const prompt = "Erstelle eine einfache Tagesroute für Berlin im DayFlow-Format.";
  try {
    const out = await getDayFlowPlan(prompt);
    console.log("\n✅ Ausgabe:\n");
    console.log(out);
  } catch (err) {
    console.error("\n❌ Fehler:", err?.message || err);
  }
})();
