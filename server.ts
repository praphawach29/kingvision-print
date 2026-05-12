
import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  const supabaseUrl = process.env.VITE_SUPABASE_URL || "";
  const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  const adminDb = supabaseUrl && supabaseServiceRole
    ? createClient(supabaseUrl, supabaseServiceRole)
    : null;

  app.post("/api/ai/chat", async (req, res) => {
    try {
      if (!adminDb) {
        return res.status(500).json({ error: "Supabase service role is not configured" });
      }

      const { messages } = req.body as { messages: any[] };
      const latestText =
        messages?.[messages.length - 1]?.parts?.find((p: any) => typeof p.text === "string")?.text || "";

      const { data: aiRows, error: aiErr } = await adminDb
        .from("store_settings")
        .select("ai_provider, ai_model, ai_enabled");
      if (aiErr) throw aiErr;

      const ai = aiRows?.[0] || { ai_provider: "gemini", ai_model: "gemini-1.5-flash", ai_enabled: true };
      const provider = (ai.ai_provider || "gemini").toLowerCase();
      const model = ai.ai_model || "gemini-1.5-flash";
      const apiKey = process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY;

      if (ai.ai_enabled === false) {
        return res.json({
          candidates: [{ content: { parts: [{ text: "ระบบแชตบอทยังไม่เปิดใช้งานในหน้าตั้งค่าครับ" }] } }],
          functionCalls: []
        });
      }

      if (!apiKey) {
        return res.status(400).json({ error: "Missing AI API key. Please configure in Admin Settings." });
      }

      let text = "";
      if (provider === "openai") {
        const r = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: "system", content: "You are Nong King, a Thai sales assistant for KingVision Print. Reply in Thai politely and concise." },
              { role: "user", content: latestText }
            ]
          })
        });
        const j: any = await r.json();
        if (!r.ok) throw new Error(j?.error?.message || "OpenAI request failed");
        text = j?.choices?.[0]?.message?.content || "";
      } else if (provider === "anthropic") {
        const r = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01"
          },
          body: JSON.stringify({
            model,
            max_tokens: 500,
            system: "You are Nong King, a Thai sales assistant for KingVision Print. Reply in Thai politely and concise.",
            messages: [{ role: "user", content: latestText }]
          })
        });
        const j: any = await r.json();
        if (!r.ok) throw new Error(j?.error?.message || "Anthropic request failed");
        text = j?.content?.[0]?.text || "";
      } else {
        const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: latestText }] }],
            systemInstruction: {
              parts: [{ text: "You are Nong King, a Thai sales assistant for KingVision Print. Reply in Thai politely and concise." }]
            }
          })
        });
        const j: any = await r.json();
        if (!r.ok) throw new Error(j?.error?.message || "Gemini request failed");
        text = j?.candidates?.[0]?.content?.parts?.[0]?.text || "";
      }

      return res.json({
        candidates: [{ content: { parts: [{ text }] } }],
        functionCalls: []
      });
    } catch (error: any) {
      console.error("AI Chat Error:", error.message);
      return res.status(500).json({ error: error.message });
    }
  });

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
