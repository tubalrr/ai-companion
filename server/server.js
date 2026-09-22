import "dotenv/config";
import express from "express";
import cors from "cors";
import OpenAI from "openai";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import pg from "pg";
const { Pool } = pg;
import path from "node:path";
import { fileURLToPath } from "node:url";

const app = express();
const port = Number(process.env.PORT || 3000);
const model = process.env.OPENAI_MODEL || "gpt-5.6-luna";
const jwtSecret = process.env.JWT_SECRET;
const pool = process.env.DATABASE_URL ? new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false }) : null;
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
  origin: allowedOrigin,
  credentials: true
}));
app.use((req,res,next)=>{
  if(req.path.startsWith("/api/")) res.setHeader("Cache-Control","no-store");
  next();
});


// Real user authentication
async function initAuthDb(){
  if(!pool) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id BIGSERIAL PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      display_name TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}
function signUser(user){
  if(!jwtSecret) throw new Error("JWT_SECRET is not configured");
  return jwt.sign({sub:String(user.id),email:user.email},jwtSecret,{expiresIn:"7d"});
}
function setAuthCookie(res,token){
  res.cookie("ai_companion_session",token,{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",maxAge:7*24*60*60*1000,path:"/"});
}
function readToken(req){
  const raw=req.headers.cookie?.split(";").map(x=>x.trim()).find(x=>x.startsWith("ai_companion_session="));
  return raw ? decodeURIComponent(raw.split("=").slice(1).join("=")) : null;
}
async function requireAuth(req,res,next){
  try{
    const token=readToken(req);
    if(!token||!jwtSecret) return res.status(401).json({error:"Authentication required"});
    const decoded=jwt.verify(token,jwtSecret);
    const result=await pool.query("SELECT id,email,display_name,created_at FROM users WHERE id=$1",[decoded.sub]);
    if(!result.rows[0]) return res.status(401).json({error:"User not found"});
    req.user=result.rows[0];
    next();
  }catch(e){ return res.status(401).json({error:"Invalid or expired session"}); }
}

app.post("/api/auth/register",async(req,res)=>{
  try{
    if(!pool) return res.status(503).json({error:"Database is not configured"});
    const email=String(req.body?.email||"").trim().toLowerCase();
    const password=String(req.body?.password||"");
    const displayName=String(req.body?.displayName||email.split("@")[0]||"AI User").trim().slice(0,40);
    if(!/^\\S+@\\S+\\.\\S+$/.test(email)||password.length<8) return res.status(400).json({error:"Use a valid email and a password with at least 8 characters"});
    const hash=await bcrypt.hash(password,12);
    const result=await pool.query("INSERT INTO users(email,password_hash,display_name) VALUES($1,$2,$3) RETURNING id,email,display_name,created_at",[email,hash,displayName]);
    const user=result.rows[0];
    setAuthCookie(res,signUser(user));
    res.status(201).json({ok:true,user});
  }catch(e){
    if(e.code==="23505") return res.status(409).json({error:"An account with that email already exists"});
    console.error(e);res.status(500).json({error:"Registration failed"});
  }
});

app.post("/api/auth/login",async(req,res)=>{
  try{
    if(!pool) return res.status(503).json({error:"Database is not configured"});
    const email=String(req.body?.email||"").trim().toLowerCase();
    const password=String(req.body?.password||"");
    const result=await pool.query("SELECT id,email,password_hash,display_name,created_at FROM users WHERE email=$1",[email]);
    const user=result.rows[0];
    if(!user||!(await bcrypt.compare(password,user.password_hash))) return res.status(401).json({error:"Invalid email or password"});
    delete user.password_hash;
    setAuthCookie(res,signUser(user));
    res.json({ok:true,user});
  }catch(e){console.error(e);res.status(500).json({error:"Login failed"});}
});

app.get("/api/auth/me",async(req,res)=>{
  try{
    if(!pool) return res.status(503).json({error:"Database is not configured"});
    const token=readToken(req);
    if(!token||!jwtSecret) return res.status(401).json({error:"Not logged in"});
    const decoded=jwt.verify(token,jwtSecret);
    const result=await pool.query("SELECT id,email,display_name,created_at FROM users WHERE id=$1",[decoded.sub]);
    if(!result.rows[0]) return res.status(401).json({error:"Not logged in"});
    res.json({ok:true,user:result.rows[0]});
  }catch(e){res.status(401).json({error:"Not logged in"});}
});

app.post("/api/auth/logout",(_req,res)=>{
  res.clearCookie("ai_companion_session",{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:"/"});
  res.json({ok:true});
});

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

initAuthDb().then(()=>{
  app.listen(port,()=>console.log(`AI Companion running at http://localhost:${port}`));
}).catch(error=>{
  console.error("Database initialization failed:",error);
  process.exit(1);
});
