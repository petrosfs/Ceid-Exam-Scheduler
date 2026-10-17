import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { parseExamsFromPdf } from "./services/gemini";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Increase limit for PDF Base64 uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // API routes FIRST
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.post("/api/parse-exams", async (req, res) => {
    try {
      const { base64Data } = req.body;
      if (!base64Data) {
        return res.status(400).json({ error: { message: "No file data received" } });
      }
      
      const exams = await parseExamsFromPdf(base64Data);
      res.json({ exams });
    } catch (error: any) {
      console.error("API error parsing PDF:", error);
      res.status(500).json({ 
        error: { 
          message: error.message || "Failed to process the PDF after multiple attempts." 
        } 
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*all", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
