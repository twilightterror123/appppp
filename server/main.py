import os
import secrets
import sqlite3
import hashlib
from fastapi import FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from .core import AIEngine

DB=os.getenv("NEWAI_DB","newai.db")
ADMIN_KEY=os.getenv("NEWAI_ADMIN_KEY","")
engine=AIEngine()

app=FastAPI(title="NEW AI API",version="1.1.0")
app.add_middleware(CORSMiddleware,allow_origins=os.getenv("CORS_ORIGINS","*").split(","),allow_credentials=True,allow_methods=["*"],allow_headers=["*"])

def db():
    c=sqlite3.connect(DB)
    c.execute("CREATE TABLE IF NOT EXISTS api_keys(id INTEGER PRIMARY KEY,key_hash TEXT UNIQUE,label TEXT,created_at DATETIME DEFAULT CURRENT_TIMESTAMP,revoked INTEGER DEFAULT 0)")
    c.execute("CREATE TABLE IF NOT EXISTS memory(id INTEGER PRIMARY KEY,key_hash TEXT,name TEXT UNIQUE,value TEXT,updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)")
    c.commit()
    return c
def h(k:str)->str:return hashlib.sha256(k.encode()).hexdigest()
def auth(authorization:str|None,x_api_key:str|None)->str:
    k=x_api_key or (authorization[7:] if authorization and authorization.lower().startswith("bearer ") else "")
    c=db(); row=c.execute("SELECT 1 FROM api_keys WHERE key_hash=? AND revoked=0",(h(k),)).fetchone(); c.close()
    if not k or not row: raise HTTPException(401,"Invalid API key")
    return k

class Message(BaseModel):
    role:str
    content:object
class ChatRequest(BaseModel):
    model:str|None=None
    messages:list[Message]=Field(min_length=1)
    temperature:float|None=None
    max_tokens:int|None=None
    web_search:bool=False
    system:str|None=None
class ImageRequest(BaseModel):
    prompt:str=Field(min_length=1,max_length=4000)
    model:str|None=None
    size:str="1024x1024"
    n:int=Field(default=1,ge=1,le=4)
class MemoryRequest(BaseModel):
    name:str=Field(min_length=1,max_length=100)
    value:str=Field(max_length=20000)

@app.get("/health")
def health(): return {"ok":True,"service":"new-ai","provider":engine.status()}
@app.get("/v1/models")
def models(): return {"object":"list","data":[{"id":engine.model,"object":"model","owned_by":"new-ai"}]}

@app.post("/v1/chat/completions")
async def chat(req:ChatRequest,authorization:str|None=Header(default=None),x_api_key:str|None=Header(default=None)):
    auth(authorization,x_api_key)
    result=await engine.chat([m.model_dump() for m in req.messages],model=req.model,temperature=req.temperature,max_tokens=req.max_tokens,web_search=req.web_search,system=req.system)
    return {"id":"chatcmpl-"+secrets.token_hex(8),"object":"chat.completion","choices":[{"index":0,"message":{"role":"assistant","content":result["text"]},"finish_reason":"stop"}],"sources":result["sources"],"model":req.model or engine.model}

@app.post("/v1/images/generations")
async def images(req:ImageRequest,authorization:str|None=Header(default=None),x_api_key:str|None=Header(default=None)):
    auth(authorization,x_api_key)
    try:return await engine.image(req.prompt,req.model,req.size,req.n)
    except RuntimeError as e:raise HTTPException(503,str(e))

@app.post("/v1/code/generate")
async def code_generate(req:ChatRequest,authorization:str|None=Header(default=None),x_api_key:str|None=Header(default=None)):
    auth(authorization,x_api_key)
    system=(req.system or "")+"\nYou are NEW AI Code mode. Build complete, secure, runnable projects. Return file trees and full files when appropriate. Never invent secrets."
    r=await engine.chat([m.model_dump() for m in req.messages],model=req.model,temperature=req.temperature,max_tokens=req.max_tokens,web_search=req.web_search,system=system)
    return {"object":"code.result","text":r["text"],"sources":r["sources"]}

@app.get("/v1/memory")
def memory_get(authorization:str|None=Header(default=None),x_api_key:str|None=Header(default=None)):
    k=auth(authorization,x_api_key); c=db(); rows=c.execute("SELECT name,value,updated_at FROM memory WHERE key_hash=? ORDER BY name",(h(k),)).fetchall(); c.close()
    return {"memory":[{"name":r[0],"value":r[1],"updated_at":r[2]} for r in rows]}

@app.post("/v1/memory")
def memory_put(req:MemoryRequest,authorization:str|None=Header(default=None),x_api_key:str|None=Header(default=None)):
    k=auth(authorization,x_api_key); c=db(); kh=h(k)
    c.execute("INSERT INTO memory(key_hash,name,value) VALUES(?,?,?) ON CONFLICT(name) DO UPDATE SET value=excluded.value,updated_at=CURRENT_TIMESTAMP",(kh,req.name,req.value)); c.commit(); c.close()
    return {"ok":True}

@app.delete("/v1/memory")
def memory_delete(name:str|None=None,authorization:str|None=Header(default=None),x_api_key:str|None=Header(default=None)):
    k=auth(authorization,x_api_key); c=db()
    if name:c.execute("DELETE FROM memory WHERE key_hash=? AND name=?",(h(k),name))
    else:c.execute("DELETE FROM memory WHERE key_hash=?",(h(k),))
    c.commit(); c.close(); return {"ok":True}

@app.post("/admin/keys")
def create_key(label:str="discord",x_admin_key:str|None=Header(default=None)):
    if not ADMIN_KEY or not secrets.compare_digest(x_admin_key or "",ADMIN_KEY):raise HTTPException(403,"Invalid admin key")
    plain="newai_"+secrets.token_urlsafe(32); c=db()
    c.execute("INSERT INTO api_keys(key_hash,label) VALUES(?,?)",(h(plain),label)); c.commit(); c.close()
    return {"api_key":plain,"label":label,"warning":"Save this key now. Only its hash is stored."}

@app.get("/admin/keys")
def list_keys(x_admin_key:str|None=Header(default=None)):
    if not ADMIN_KEY or not secrets.compare_digest(x_admin_key or "",ADMIN_KEY):raise HTTPException(403,"Invalid admin key")
    c=db(); rows=c.execute("SELECT id,label,created_at,revoked FROM api_keys ORDER BY id DESC").fetchall(); c.close()
    return {"keys":[{"id":r[0],"label":r[1],"created_at":r[2],"revoked":bool(r[3])} for r in rows]}

@app.post("/admin/keys/{key_id}/revoke")
def revoke(key_id:int,x_admin_key:str|None=Header(default=None)):
    if not ADMIN_KEY or not secrets.compare_digest(x_admin_key or "",ADMIN_KEY):raise HTTPException(403,"Invalid admin key")
    c=db(); c.execute("UPDATE api_keys SET revoked=1 WHERE id=?",(key_id,)); c.commit(); c.close(); return {"ok":True}

if __name__=="__main__":
    import uvicorn
    uvicorn.run("server.main:app",host=os.getenv("HOST","0.0.0.0"),port=int(os.getenv("PORT","8000")))
