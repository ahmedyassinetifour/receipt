import express from "express";
import bodyParser from "body-parser";
import { chromium } from "playwright";

const app = express();

// ---------- LAUNCH CHROMIUM ONCE ----------
let browser;

(async () => {
  try {
    console.log("Launching Chromium (one-time startup)...");
    browser = await chromium.launch({
      headless: true,
    });
    console.log("Chromium launched and ready.");
  } catch (err) {
    console.error("Failed to launch Chromium:", err);
  }
})();

// ---------- CORS ----------
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

app.use(bodyParser.json({ limit: "5mb" }));

// ---------- PDF ENDPOINT ----------
app.post("/generate-pdf", async (req, res) => {
  try {
    const { html } = req.body;
    if (!html) return res.status(400).json({ error: "Missing HTML" });

    if (!browser) {
      console.error("Browser not ready yet!");
      return res.status(503).json({ error: "PDF engine not ready. Try again in a moment." });
    }

    console.log("Generating PDF...");

    const page = await browser.newPage();

    // Load HTML
    await page.setContent(html, { waitUntil: "networkidle" });

    // Inject fonts + RTL fixes
    await page.addStyleTag({
      content: `
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&family=Amiri+Quran:wght@400;700&display=swap');
        body { 
          font-family: 'IBM Plex Sans Arabic', sans-serif; 
        }
        [dir="rtl"] {
          direction: rtl;
          text-align: right;
        }
        [dir="rtl"] * {
          font-family: 'Amiri Quran', serif !important;
        }
      `,
    });

    // Give fonts a moment
    await page.waitForTimeout(500);

    // Generate PDF
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: '20px',
        bottom: '20px',
        left: '20px',
        right: '20px'
      }
    });

    await page.close();

    console.log("PDF generation complete.");

    // Send PDF
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": "inline; filename=receipt.pdf",
    });

    res.send(pdfBuffer);

  } catch (error) {
    console.error("PDF generation failed:", error);
    res.status(500).json({ error: "PDF generation failed", details: error.message });
  }
});

// ---------- SERVER ----------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 PDF Server running on port ${PORT}`));
