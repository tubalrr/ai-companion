import "dotenv/config";
import express from "express";
import cors from "cors";
import OpenAI from "openai";
import path from "node:path";
import { fileURLToPath } from "node:url";

const app = express();
const port = Number(process.env.PORT || 3000);
const model = process.env.OPENAI_MODEL || "gpt-5.6-luna";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

if (!process.env.OPENAI_API_KEY) {
  console.warn("OPENAI_API_KEY is not set. Add it to server/.env before starting the server.");
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

app.use(express.json({ limit: "1mb" }));

const allowedOrigin = process.env.FRONTEND_ORIGIN || true;
app.use(cors({
  origin: allowedOrigin
}));

app.get("/api/health", (_req, res) => {
  res.json({
    ok: Boolean(process.env.OPENAI_API_KEY),
    model,
    service: "AI Companion backend"
  });
});

app.post("/api/chat", async (req, res) => {
  try {
    const messages = Array.isArray(req.body?.messages) ? req.body.messages : [];
    if (!messages.length) {
      return res.status(400).json({ error: "messages is required" });
    }

    const safeMessages = messages
      .filter(m => m && (m.role === "user" || m.role === "assistant"))
      .slice(-20)
      .map(m => ({
        role: m.role,
        content: String(m.content || "").slice(0, 12000)
      }));

    const response = await openai.responses.create({
      model,
      instructions: "You are AI Companion, a helpful, clear, friendly assistant. Do not claim to have performed actions you did not perform.",
      input: safeMessages,
      max_output_tokens: 1200
    });

    res.json({
      ok: true,
      text: response.output_text || ""
    });
  } catch (error) {
    console.error("AI request failed:", error);
    res.status(500).json({
      ok: false,
      error: "AI request failed",
      detail: process.env.NODE_ENV === "production" ? undefined : error.message
    });
  }
});

app.use(express.static(root));

app.listen(port, () => {
  console.log(`AI Companion running at http://localhost:${port}`);
});
