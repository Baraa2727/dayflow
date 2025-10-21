// /api/generate.js
import fs from "fs";
import path from "path";

export default async function handler(req, res) {
  try {
    // 1) Nur POST zulassen
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Nur POST-Anfragen erlaubt" });
    }

    // 2) Body lesen (bei Next.js Pages API ist req.body i. d. R. schon geparst,
    //    aber wir fangen zur Sicherheit leere Bodies ab)
    const { userMessage } = req.body || {};
    if (!userMessage) {
      return res.status(400).json({ error: "userMessage fehlt" });
    }

    // 3) MOCK-MODUS: sofortige, stabile Demo-Antwort (keine OpenAI-Kosten)
    if (process.env.USE_MOCK === "true") {
      const mock = `**🧪 MOCK aktiv** — Beispielplan

Einleitung zur Stadt …  
City-Bilder …
Wettervorhersage …

**Tagesablauf**  
A. 08:30 — ☕ [Café Beispiel](https://www.google.com/maps/search/?api=1&query=Cafe+Beispiel+Strasse+1+12345+Stadt+DE)  

B. 10:00 — [Museum Beispiel](https://www.google.com/maps/search/?api=1&query=Museum+Beispiel+Platz+2+12345+Stadt+DE)  

C. 13:00 — 🍝 [Trattoria Beispiel](https://www.google.com/maps/search/?api=1&query=Trattoria+Beispiel+Gasse+3+12345+Stadt+DE)  

D. 15:00 — [Park Beispiel](https://www.google.com/maps/search/?api=1&query=Park+Beispiel+Allee+4+12345+Stadt+DE)  

E. 18:30 — 🍔 [Bunte Burger](https://www.google.com/maps/search/?api=1&query=Bunte+Burger+Strasse+5+12345+Stadt+DE)  
✨ Veganes Burger-Konzept mit herzlicher Atmosphäre – idealer Abschluss des Tages.  

F. 20:00 — [Rheinufer Beispiel](https://www.google.com/maps/search/?api=1&query=Rheinufer+Beispiel+Promenade+6+12345+Stadt+DE)  

G. 21:00 — 🍨 [Gelato Beispiel](https://www.google.com/maps/search/?api=1&query=Gelato+Beispiel+Strasse+7+12345+Stadt+DE)  


**Gesamt-Route:**  
Route Tag 1: [Google Maps](https://www.google.com/maps/dir/?api=1&origin=Cafe+Beispiel+Strasse+1+12345+Stadt+DE&destination=Gelato+Beispiel+Strasse+7+12345+Stadt+DE&waypoints=Museum+Beispiel+Platz+2+12345+Stadt+DE%7CTrattoria+Beispiel+Gasse+3+12345+Stadt+DE%7CPark+Beispiel+Allee+4+12345+Stadt+DE%7CBunte+Burger+Strasse+5+12345+Stadt+DE%7CRheinufer+Beispiel+Promenade+6+12345+Stadt+DE&travelmode=walking)

| Stopp | Uhrzeit | Stopp (klickbar) | Adresse | Transfer |
|---|---|---|---|---|
| A | 08:30 | [Café Beispiel](https://www.google.com/maps/search/?api=1&query=Cafe+Beispiel+Strasse+1+12345+Stadt+DE) | Straße 1, 12345 Stadt | Start |
| B | 10:00 | [Museum Beispiel](https://www.google.com/maps/search/?api=1&query=Museum+Beispiel+Platz+2+12345+Stadt+DE) | Platz 2, 12345 Stadt | 10 Min |
| C | 13:00 | [Trattoria Beispiel](https://www.google.com/maps/search/?api=1&query=Trattoria+Beispiel+Gasse+3+12345+Stadt+DE) | Gasse 3, 12345 Stadt | 12 Min |
| D | 15:00 | [Park Beispiel](https://www.google.com/maps/search/?api=1&query=Park+Beispiel+Allee+4+12345+Stadt+DE) | Allee 4, 12345 Stadt | 15 Min |
| E | 18:30 | [Bunte Burger](https://www.google.com/maps/search/?api=1&query=Bunte+Burger+Strasse+5+12345+Stadt+DE) | Straße 5, 12345 Stadt | 7 Min |
| F | 20:00 | [Rheinufer Beispiel](https://www.google.com/maps/search/?api=1&query=Rheinufer+Beispiel+Promenade+6+12345+Stadt+DE) | Promenade 6, 12345 Stadt | 12 Min |
| G | 21:00 | [Gelato Beispiel](https://www.google.com/maps/search/?api=1&query=Gelato+Beispiel+Strasse+7+12345+Stadt+DE) | Straße 7, 12345 Stadt | 6 Min |

*bitte überprüfe route, adressen und namen — die KI kann vereinzelt fehler machen.*`;

      return res.status(200).json({ output: mock, mock: true });
    }

    // 4) Prompt aus Datei laden
    const promptPath = path.join(process.cwd(), "api", "prompt", "DayFlow_MasterPrompt"); // <— dein Dateiname ohne .txt
    let MASTER_PROMPT = "";
    try {
      MASTER_PROMPT = fs.readFileSync(promptPath, "utf8");
    } catch (e) {
      return res.status(500).json({
        error: `Prompt-Datei nicht gefunden oder nicht lesbar: ${promptPath}. Bitte Pfad/Dateinamen prüfen.`
      });
    }

    // 5) OpenAI-Call
    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
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
      const err = await resp.text().catch(() => "");
      return res.status(resp.status).json({ error: err || "OpenAI-Fehler" });
    }

    const data = await resp.json();
    const msg = data?.choices?.[0]?.message?.content ?? "";
    return res.status(200).json({ output: msg, mock: false });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Serverfehler" });
  }
}
