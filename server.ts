
import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // LINE Messaging API Proxy
  app.post("/api/line-notify", async (req, res) => {
    try {
      const { to, messages, channelAccessToken } = req.body;

      if (!channelAccessToken) {
        return res.status(400).json({ error: "Missing Channel Access Token" });
      }

      const response = await fetch("https://api.line.me/v2/bot/message/push", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${channelAccessToken}`
        },
        body: JSON.stringify({
          to,
          messages
        })
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(JSON.stringify(result));
      }

      res.status(200).json(result);
    } catch (error: any) {
      console.error("LINE Notify Error:", error.message);
      res.status(500).json({ error: error.message });
    }
  });

  // Download Product SQL FIle
  app.get("/api/download-sql", (req, res) => {
    try {
      const filePath = path.join(process.cwd(), "insert_products.sql");
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.sendFile(filePath);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Download Categories SQL File
  app.get("/api/download-categories-sql", (req, res) => {
    try {
      const filePath = path.join(process.cwd(), "insert_categories.sql");
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.sendFile(filePath);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Download Brands SQL File
  app.get("/api/download-brands-sql", (req, res) => {
    try {
      const filePath = path.join(process.cwd(), "insert_brands.sql");
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.sendFile(filePath);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
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
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
