// index.js – Frontend-Version: nur POST an /api/generate senden

async function generatePlan() {
  const inputEl = document.getElementById("wunsch");   // <input id="wunsch">
  const outEl   = document.getElementById("ausgabe");  // <div id="ausgabe">
  const prompt  = (inputEl?.value || "").trim();

  if (!prompt) {
    outEl.textContent = "Bitte gib deinen Wunsch ein.";
    return;
  }

  outEl.textContent = "⏳ Plane deinen Tag…";

  try {
    const resp = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userMessage: prompt }) // << genau so erwartet es /api/generate
    });

    const data = await resp.json();
    if (!resp.ok || data.error) {
      outEl.textContent = "❌ " + (data.error || `Fehler: ${resp.status}`);
      return;
    }

    // Antwort rendern (HTML enthalten → innerHTML)
    outEl.innerHTML = data.output;
  } catch (err) {
    outEl.textContent = "❌ Netzwerk-/Serverfehler: " + (err?.message || err);
  }
}

// Falls du einen Button hast:
const btn = document.getElementById("generateBtn"); // <button id="generateBtn">
if (btn) btn.addEventListener("click", generatePlan);

// Optional: Enter-Taste im Input triggert den Button
const inputEl = document.getElementById("wunsch");
if (inputEl) {
  inputEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter") generatePlan();
  });
}
