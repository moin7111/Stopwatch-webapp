const express = require("express");
const path = require("path");
const app = express();

app.use(express.json());

// statische Dateien ausliefern (HTML, CSS, JS)
app.use(express.static(path.join(__dirname)));

// Beispiel-API (GET)
app.get("/api/status", (req, res) => {
  res.json({ ok: true, uptime: process.uptime() });
});

// Health-Check für Render
app.get("/health", (req, res) => {
  res.send("ok");
});

// Render setzt PORT automatisch
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server läuft auf Port ${port}`);
});
