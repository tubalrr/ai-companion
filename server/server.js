import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import OpenAI from "openai";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import pg from "pg";
const { Pool } = pg;
import path from "node:path";
import { fileURLToPath } from "node:url";

const app = express();
const port = Number(process.env.PORT || 3000);
const model = process.env.GEMINI_MODEL || "gemini-3.8-flash";
const jwtSecret = process.env.JWT_SECRET;
const pool = process.env.DATABASE_URL ? new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false
}) : null;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

if (!process.env.GEMINI_API_KEY) console.warn("GEMINI_API_KEY is not set. Add it to server/.env before starting the server.");
const openai = process.env.GEMINI_API_KEY ? new OpenAI({
  apiKey: process.env.GEMINI_API_KEY,
  baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/"
}) : null;

app.use(express.json({ limit: "12mb" }));
app.use(cookieParser());

const allowedOrigins = (process.env.FRONTEND_ORIGIN || "").split(",").map(x => x.trim()).filter(Boolean);
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error("Origin not allowed"));
  },
  credentials: true
}));
app.use((req,res,next)=>{ if(req.path.startsWith("/api/")) res.setHeader("Cache-Control","no-store"); next(); });

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: "draft-8", legacyHeaders: false });
const chatLimiter = rateLimit({ windowMs: 60 * 1000, limit: 30, standardHeaders: "draft-8", legacyHeaders: false });
const GUEST_DAILY_CHAT_LIMIT = 10;
const guestChatUsage = new Map();

function guestChatAllowed(req){
  const key=String(req.ip||req.headers["x-forwarded-for"]||"unknown").split(",")[0].trim();
  const today=new Date().toISOString().slice(0,10);
  const current=guestChatUsage.get(key);
  if(!current || current.day!==today){
    guestChatUsage.set(key,{day:today,count:1});
    return {allowed:true,remaining:GUEST_DAILY_CHAT_LIMIT-1};
  }
  if(current.count>=GUEST_DAILY_CHAT_LIMIT){
    return {allowed:false,remaining:0};
  }
  current.count+=1;
  return {allowed:true,remaining:GUEST_DAILY_CHAT_LIMIT-current.count};
}

setInterval(()=>{
  const today=new Date().toISOString().slice(0,10);
  for(const [key,value] of guestChatUsage){
    if(value.day!==today) guestChatUsage.delete(key);
  }
},60*60*1000).unref();

async function initAuthDb(){
  if(!pool) return;
  await pool.query(`
    CREATE EXTENSION IF NOT EXISTS pgcrypto;
    CREATE TABLE IF NOT EXISTS users (
      id BIGSERIAL PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      display_name TEXT NOT NULL,
      plan TEXT NOT NULL DEFAULT 'free',
      trial_started_at TIMESTAMPTZ,
      trial_ends_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    ALTER TABLE users ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'free';
    ALTER TABLE users ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMPTZ;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;
    CREATE TABLE IF NOT EXISTS conversations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS messages (
      id BIGSERIAL PRIMARY KEY,
      conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role TEXT NOT NULL CHECK (role IN ('user','assistant')),
      content TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS conversations_user_updated_idx ON conversations(user_id, updated_at DESC);
    CREATE INDEX IF NOT EXISTS messages_conversation_idx ON messages(conversation_id, id);
    CREATE TABLE IF NOT EXISTS library_assets (
      id UUID NOT NULL,
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      size BIGINT NOT NULL DEFAULT 0,
      created_at BIGINT NOT NULL,
      updated_at BIGINT NOT NULL,
      state TEXT NOT NULL CHECK (state IN ('active','trash')),
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      mime_type TEXT,
      file_data BYTEA,
      PRIMARY KEY (user_id, id)
    );
    CREATE INDEX IF NOT EXISTS library_assets_user_updated_idx ON library_assets(user_id, updated_at DESC);
  `);
}

function signUser(user){
  if(!jwtSecret) throw new Error("JWT_SECRET is not configured");
  return jwt.sign({sub:String(user.id),email:user.email},jwtSecret,{expiresIn:"7d"});
}
function setAuthCookie(res,token){
  res.cookie("ai_companion_session",token,{
    httpOnly:true, secure:process.env.NODE_ENV==="production", sameSite:process.env.NODE_ENV==="production" ? "none" : "lax",
    maxAge:7*24*60*60*1000, path:"/"
  });
}
function getRequestTokens(req){
  const tokens=[];
  const authHeader=String(req.headers.authorization||"");
  if(authHeader.startsWith("Bearer ")){
    const bearer=authHeader.slice(7).trim();
    if(bearer) tokens.push(bearer);
  }
  const raw=req.headers.cookie?.split(";").map(x=>x.trim()).find(x=>x.startsWith("ai_companion_session="));
  if(raw){
    const cookieToken=decodeURIComponent(raw.split("=").slice(1).join("="));
    if(cookieToken && !tokens.includes(cookieToken)) tokens.push(cookieToken);
  }
  return tokens;
}
async function authenticateRequest(req){
  if(!jwtSecret||!pool) return null;
  for(const token of getRequestTokens(req)){
    try{
      const decoded=jwt.verify(token,jwtSecret);
      const result=await pool.query(
        "SELECT id,email,display_name,plan,trial_started_at,trial_ends_at,created_at FROM users WHERE id=$1",
        [decoded.sub]
      );
      if(result.rows[0]) return result.rows[0];
    }catch{}
  }
  return null;
}
async function requireAuth(req,res,next){
  try{
    const user=await authenticateRequest(req);
    if(!user) return res.status(401).json({error:"Authentication required"});
    req.user=user;
    next();
  }catch{ return res.status(401).json({error:"Authentication required"}); }
}
function accountStatus(user){
  const now=Date.now();
  const trialEnds=user.trial_ends_at ? new Date(user.trial_ends_at).getTime() : 0;
  const trialActive=trialEnds>now;
  return {
    plan:user.plan==="premium" ? "premium" : (trialActive ? "premium_trial" : "free"),
    premium: user.plan==="premium" || trialActive,
    trialActive,
    trialStartedAt:user.trial_started_at,
    trialEndsAt:user.trial_ends_at
  };
}

app.post("/api/auth/register", authLimiter, async(req,res)=>{
  try{
    if(!pool) return res.status(503).json({error:"Database is not configured"});
    const email=String(req.body?.email||"").trim().toLowerCase();
    const password=String(req.body?.password||"");
    const displayName=String(req.body?.displayName||email.split("@")[0]||"AI User").trim().slice(0,40);
    if(!/^\S+@\S+\.\S+$/.test(email)||password.length<8)
      return res.status(400).json({error:"Use a valid email and a password with at least 8 characters"});
    const hash=await bcrypt.hash(password,12);
    const result=await pool.query(
      "INSERT INTO users(email,password_hash,display_name) VALUES($1,$2,$3) RETURNING id,email,display_name,plan,trial_started_at,trial_ends_at,created_at",
      [email,hash,displayName]
    );
    const user=result.rows[0];
    const token=signUser(user);
    setAuthCookie(res,token);
    res.status(201).json({ok:true,user,account:accountStatus(user),token});
  }catch(e){
    if(e.code==="23505") return res.status(409).json({error:"An account with that email already exists"});
    console.error(e); res.status(500).json({error:"Registration failed"});
  }
});

app.post("/api/auth/login", authLimiter, async(req,res)=>{
  try{
    if(!pool) return res.status(503).json({error:"Database is not configured"});
    const email=String(req.body?.email||"").trim().toLowerCase();
    const password=String(req.body?.password||"");
    const result=await pool.query("SELECT id,email,password_hash,display_name,plan,trial_started_at,trial_ends_at,created_at FROM users WHERE email=$1",[email]);
    const user=result.rows[0];
    if(!user||!(await bcrypt.compare(password,user.password_hash))) return res.status(401).json({error:"Invalid email or password"});
    delete user.password_hash;
    const token=signUser(user);
    setAuthCookie(res,token);
    res.json({ok:true,user,account:accountStatus(user),token});
  }catch(e){ console.error(e); res.status(500).json({error:"Login failed"}); }
});

app.get("/api/auth/me",async(req,res)=>{
  try{
    if(!pool) return res.status(503).json({error:"Database is not configured"});
    const user=await authenticateRequest(req);
    if(!user) return res.status(401).json({error:"Not logged in"});
    const sessionToken=signUser(user);
    res.json({ok:true,user,account:accountStatus(user),token:sessionToken});
  }catch{ res.status(401).json({error:"Not logged in"}); }
});

app.post("/api/auth/logout",authLimiter,(_req,res)=>{
  res.clearCookie("ai_companion_session",{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:process.env.NODE_ENV==="production" ? "none" : "lax",path:"/"});
  res.json({ok:true});
});

app.get("/api/account/plan", requireAuth, (req,res)=>{
  res.json({ok:true,account:accountStatus(req.user)});
});

app.post("/api/trial/start", requireAuth, async(req,res)=>{
  try{
    if(req.user.plan==="premium")
      return res.json({ok:true,account:accountStatus(req.user),message:"Premium is already active."});
    if(req.user.trial_started_at)
      return res.status(409).json({error:"Your free trial has already been used.",account:accountStatus(req.user)});
    const result=await pool.query(
      "UPDATE users SET plan='free', trial_started_at=NOW(), trial_ends_at=NOW()+INTERVAL '7 days' WHERE id=$1 AND trial_started_at IS NULL RETURNING id,email,display_name,plan,trial_started_at,trial_ends_at,created_at",
      [req.user.id]
    );
    if(!result.rows[0]) return res.status(409).json({error:"Your free trial has already been used."});
    res.json({ok:true,account:accountStatus(result.rows[0]),message:"Your 7-day Premium free trial has started."});
  }catch(e){ console.error(e); res.status(500).json({error:"Could not start the free trial"}); }
});

app.get("/api/conversations", requireAuth, async (req,res)=>{
  try{
    const result=await pool.query("SELECT id,title,created_at,updated_at FROM conversations WHERE user_id=$1 ORDER BY updated_at DESC LIMIT 100",[req.user.id]);
    res.json({ok:true,conversations:result.rows});
  }catch(e){console.error(e);res.status(500).json({error:"Could not load conversations"});}
});
app.post("/api/conversations", requireAuth, async (req,res)=>{
  try{
    const title=String(req.body?.title||"New conversation").trim().slice(0,200)||"New conversation";
    const result=await pool.query("INSERT INTO conversations(user_id,title) VALUES($1,$2) RETURNING id,title,created_at,updated_at",[req.user.id,title]);
    res.status(201).json({ok:true,conversation:result.rows[0]});
  }catch(e){console.error(e);res.status(500).json({error:"Could not create conversation"});}
});
app.get("/api/conversations/:id/messages", requireAuth, async (req,res)=>{
  try{
    const result=await pool.query("SELECT m.id,m.role,m.content,m.created_at FROM messages m JOIN conversations c ON c.id=m.conversation_id WHERE m.conversation_id=$1 AND c.user_id=$2 ORDER BY m.id ASC",[req.params.id,req.user.id]);
    res.json({ok:true,messages:result.rows});
  }catch(e){console.error(e);res.status(500).json({error:"Could not load messages"});}
});
app.post("/api/conversations/:id/messages", requireAuth, async (req,res)=>{
  try{
    const role=req.body?.role;
    const content=String(req.body?.content||"").trim();
    if((role!=="user"&&role!=="assistant")||!content) return res.status(400).json({error:"Valid role and content are required"});
    const owned=await pool.query("SELECT id FROM conversations WHERE id=$1 AND user_id=$2",[req.params.id,req.user.id]);
    if(!owned.rows[0]) return res.status(404).json({error:"Conversation not found"});
    const result=await pool.query("INSERT INTO messages(conversation_id,user_id,role,content) VALUES($1,$2,$3,$4) RETURNING id,role,content,created_at",[req.params.id,req.user.id,role,content]);
    await pool.query("UPDATE conversations SET updated_at=NOW() WHERE id=$1",[req.params.id]);
    res.status(201).json({ok:true,message:result.rows[0]});
  }catch(e){console.error(e);res.status(500).json({error:"Could not save message"});}
});

app.post("/api/library/sync", requireAuth, async(req,res)=>{
  const assets=Array.isArray(req.body?.assets)?req.body.assets:[];
  if(assets.length>100) return res.status(400).json({error:"Library sync is limited to 100 items per request"});
  const client=await pool.connect();
  try{
    await client.query("BEGIN");
    for(const asset of assets){
      const id=String(asset?.id||"");
      const name=String(asset?.name||"Untitled").slice(0,255);
      const type=String(asset?.type||"files").slice(0,40);
      const state=asset?.state==="trash"?"trash":"active";
      const size=Math.max(0,Number(asset?.size)||0);
      const createdAt=Math.max(0,Number(asset?.createdAt)||Date.now());
      const updatedAt=Math.max(createdAt,Number(asset?.updatedAt)||createdAt);
      const metadata=asset?.metadata&&typeof asset.metadata==="object"?asset.metadata:{};
      const mimeType=String(asset?.mimeType||"application/octet-stream").slice(0,120);
      const raw=String(asset?.dataBase64||"");
      let fileData=null;
      if(raw){
        if(raw.length>11000000) throw Object.assign(new Error("A library file is too large to sync"),{statusCode:413});
        fileData=Buffer.from(raw,"base64");
      }
      await client.query(
        "INSERT INTO library_assets(id,user_id,name,type,size,created_at,updated_at,state,metadata,mime_type,file_data) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) ON CONFLICT(user_id,id) DO UPDATE SET name=EXCLUDED.name,type=EXCLUDED.type,size=EXCLUDED.size,created_at=EXCLUDED.created_at,updated_at=EXCLUDED.updated_at,state=EXCLUDED.state,metadata=EXCLUDED.metadata,mime_type=EXCLUDED.mime_type,file_data=COALESCE(EXCLUDED.file_data,library_assets.file_data) WHERE EXCLUDED.updated_at >= library_assets.updated_at",
        [id,req.user.id,name,type,size,createdAt,updatedAt,state,metadata,mimeType,fileData]
      );
    }
    const result=await client.query("SELECT id,name,type,size,created_at,updated_at,state,metadata,mime_type,file_data FROM library_assets WHERE user_id=$1 ORDER BY updated_at DESC",[req.user.id]);
    await client.query("COMMIT");
    res.json({ok:true,assets:result.rows.map(row=>({
      id:row.id,name:row.name,type:row.type,size:Number(row.size||0),createdAt:Number(row.created_at||0),
      updatedAt:Number(row.updated_at||0),state:row.state,metadata:row.metadata||{},mimeType:row.mime_type||"application/octet-stream",
      dataBase64:row.file_data?Buffer.from(row.file_data).toString("base64"):null
    }))});
  }catch(e){
    await client.query("ROLLBACK");
    console.error(e); res.status(e.statusCode||500).json({error:e.statusCode===413?e.message:"Could not sync Library"});
  }finally{ client.release(); }
});

app.get("/api/library/file/:id", requireAuth, async(req,res)=>{
  try{
    const result=await pool.query("SELECT name,mime_type,file_data FROM library_assets WHERE id=$1 AND user_id=$2",[req.params.id,req.user.id]);
    const row=result.rows[0];
    if(!row||!row.file_data) return res.status(404).json({error:"File not found"});
    res.setHeader("Content-Type",row.mime_type||"application/octet-stream");
    res.setHeader("Content-Disposition",'inline; filename="' + String(row.name).replace(/["\\\r\n]/g,"_") + '"');
    res.send(row.file_data);
  }catch(e){console.error(e);res.status(500).json({error:"Could not load cloud file"});}
});

app.get("/api/health", (_req,res)=>res.json({ok:Boolean(process.env.GEMINI_API_KEY),model,provider:"gemini",service:"AI Companion backend"}));

app.post("/api/chat", chatLimiter, async(req,res)=>{
  try{
    const authenticatedUser=await authenticateRequest(req);
    if(!authenticatedUser){
      const usage=guestChatAllowed(req);
      if(!usage.allowed){
        return res.status(429).json({
          ok:false,
          error:"Guest daily limit reached",
          code:"GUEST_LIMIT_REACHED",
          limit:GUEST_DAILY_CHAT_LIMIT,
          remaining:0,
          message:"You can continue chatting after logging in."
        });
      }
      res.setHeader("X-Guest-Chats-Remaining",String(usage.remaining));
    }
    const messages=Array.isArray(req.body?.messages)?req.body.messages:[];
    if(!messages.length) return res.status(400).json({error:"messages is required"});
    const safeMessages=messages.filter(m=>m&&(m.role==="user"||m.role==="assistant")).slice(-20).map(m=>({role:m.role,content:String(m.content||"").slice(0,12000)}));
    if(!openai) return res.status(503).json({error:"AI service is not configured"});
    const response=await openai.chat.completions.create({
      model,
      messages:[
        {role:"system",content:"You are AI Companion, a helpful, clear, friendly assistant. Do not claim to have performed actions you did not perform."},
        ...safeMessages
      ],
      max_tokens:1200
    });
    res.json({ok:true,text:response.choices?.[0]?.message?.content||""});
  }catch(error){
    console.error("AI request failed:",error);
    res.status(500).json({ok:false,error:"AI request failed",detail:process.env.NODE_ENV==="production"?undefined:error.message});
  }
});

app.use(express.static(root));

app.listen(port,()=>{
  console.log(`AI Companion running at http://localhost:${port}`);
  initAuthDb().then(()=>{
    console.log("Database initialization complete");
  }).catch(error=>{
    console.error("Database initialization failed:",error);
    console.error("Guest chat remains available; account/cloud features will stay unavailable until the database is reachable.");
  });
});
