import express from "express";
import bodyParser from "body-parser";
import { chromium } from "playwright";

const app = express();

// Enable CORS for Angular app
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

app.use(bodyParser.json({ limit: "5mb" }));

app.post("/generate-pdf", async (req, res) => {
  try {
    const { html } = req.body;
    if (!html) return res.status(400).json({ error: "Missing HTML" });

    console.log("Starting PDF generation...");
    console.log("HTML content length:", html.length);
    console.log("Contains RTL:", html.includes('dir="rtl"'));

    const browser = await chromium.launch({
      headless: true,
    });

    const page = await browser.newPage();

    await page.setContent(html, { waitUntil: "networkidle" });

    // Add font support matching the template exactly
    await page.addStyleTag({
      content: `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Amiri+Quran:wght@400;700&display=swap');
        body { 
          font-family: 'Inter', sans-serif; 
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

    // Wait for fonts to load
    await page.waitForTimeout(1000);
    
    // Check if fonts are loaded
    const fontCheck = await page.evaluate(() => {
      const testEl = document.createElement('div');
      testEl.style.fontFamily = 'Amiri Quran, serif';
      testEl.textContent = 'اختبار';
      document.body.appendChild(testEl);
      const computedStyle = window.getComputedStyle(testEl);
      const fontFamily = computedStyle.fontFamily;
      document.body.removeChild(testEl);
      return fontFamily;
    });
    console.log("Font check result:", fontCheck);

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

    await browser.close();

    console.log("PDF generated successfully!");

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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 PDF Server running on port ${PORT}`));

