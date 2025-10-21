// /api/home.js – liefert index.html als HTML (Failsafe)
import fs from "fs";
import path from "path";

export default function handler(req, res) {
  try {
    const filePath = path.join(process.cwd(), "index.html");
    const html = fs.readFileSync(filePath, "utf8");
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.status(200).send(html);
  } catch (err) {
    res.status(500).send(`<pre>Fehler: index.html nicht gefunden\n${err?.message || err}</pre>`);
  }
}
