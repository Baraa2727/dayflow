import fs from "fs";
import path from "path";

export default async function handler(req, res) {
  try {
    const { userMessage } = req.body;

    if (!userMessage) {
      return res.status(400).json({ error: "userMessage fehlt" });
    }

    // 🧭 1. Master Prompt aus Datei laden
    const promptPath = path.join(process.cwd(), "prompts", "DayFlow_MasterPrompt.txt");
    const MASTER_PROMPT = fs.readFileSync(promptPath, "utf8");

    // 🧠 2. OpenAI API Call
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini", // oder "gpt-4" oder ein anderes Modell
        temperature: 0.7,
        messages: [
          { role: "system", content: MASTER_PROMPT },
          { role: "user", content: userMessage }
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({ error: errorText });
    }

    // 📨 3. Antwort zurückgeben
    const data = await response.json();
    const msg = data?.choices?.[0]?.message?.content ?? "";
    return res.status(200).json({ output: msg });
  } catch (error) {
    console.error("Fehler:", error);
    return res.status(500).json({ error: "Interner Serverfehler" });
  }
}
