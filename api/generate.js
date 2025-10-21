import fs from "fs";
import path from "path";

export default async function handler(req, res) {
  try {
    // 1) Nur POST zulassen
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Nur POST-Anfragen erlaubt" });
    }

    // 2) Mock-Modus prüfen
    if (process.env.USE_MOCK === "true") {
      return res.status(200).json({
        output: "🧪 MOCK aktiv — bitte USE_MOCK=false setzen, um die echte API zu verwenden."
      });
    }

    // 3) Prompt aus Datei laden
    const promptPath = path.join(process.cwd(), "api", "prompt", "DayFlow_MasterPrompt");
    const MASTER_PROMPT = fs.readFileSync(promptPath, "utf8");

    // 4) userMessage aus Body lesen
    const { userMessage } = req.body || {};
    if (!userMessage) {
      return res.status(400).json({ error: "userMessage fehlt" });
    }

    // 5) OpenAI API aufrufen
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.7,
        messages: [
          { role: "system", content: MASTER_PROMPT },
          { role: "user", content: userMessage },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({ error: errorText || "Fehler bei OpenAI" });
    }

    const data = await response.json();
    const output = data.choices?.[0]?.message?.content ?? "";

    // 6) Ausgabe an Frontend zurückgeben
    return res.status(200).json({ output });
  } catch (error) {
    console.error("Fehler:", error);
    return res.status(500).json({ error: "Interner Serverfehler" });
  }
}
