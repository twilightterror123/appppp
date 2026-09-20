import os, json, pathlib
import httpx
from .webtools import web_search as run_web_search

BASE=os.getenv("PROVIDER_BASE_URL","http://localhost:11434/v1").rstrip("/")
KEY=os.getenv("PROVIDER_API_KEY","ollama")
MODEL=os.getenv("MODEL","llama3.2:3b")
IMAGE_URL=os.getenv("IMAGE_PROVIDER_URL","").rstrip("/")
IMAGE_KEY=os.getenv("IMAGE_PROVIDER_KEY",KEY)

DEFAULT_SYSTEM="""You are NEW AI, a capable general-purpose assistant.
Be accurate, useful, direct and transparent. Think through tasks carefully before answering.
Handle writing, explanations, math, programming, debugging, planning, structured data, files and creative work.
When tools are available, use them instead of pretending. Never claim an action or source that did not happen.
For current or changing facts, use web search when requested or enabled and distinguish retrieved facts from your reasoning.
Protect secrets. Never expose provider keys, admin keys, or private data.
When generating code, prefer complete runnable files, safe defaults, validation, error handling and tests.
When the user asks for a project, return a clear architecture and complete implementation rather than vague pseudocode.
Respect safety boundaries and refuse dangerous operational instructions while still helping with safe alternatives."""

def load_training_seed():
    p=pathlib.Path(__file__).resolve().parent.parent/"training"/"knowledge.jsonl"
    rows=[]
    try:
        for line in p.read_text(encoding="utf-8").splitlines():
            if line.strip():
                rows.append(json.loads(line))
    except Exception:
        pass
    return rows

SEED=load_training_seed()
SEED_TEXT="\n\nBEHAVIOR SEED:\n"+"\n".join(f"- {x.get('instruction')}: {x.get('response')}" for x in SEED[:100])

class AIEngine:
    model=MODEL
    def status(self):
        return {"base_url":BASE,"model":MODEL,"image":bool(IMAGE_URL),"training_seed_items":len(SEED)}
    async def chat(self,messages:list[dict],model=None,temperature=None,max_tokens=None,web_search=False,system=None):
        sys=(system or DEFAULT_SYSTEM)+SEED_TEXT
        msgs=[{"role":"system","content":sys}]
        sources=[]
        last=next((str(m.get("content","")) for m in reversed(messages) if m.get("role")=="user"),"")
        if web_search:
            hits=await run_web_search(last)
            if hits:
                context="\n\nRETRIEVED WEB SOURCES:\n"+"\n".join(f"- {h['title']} | {h['url']}\n{h.get('snippet','')}" for h in hits)
                msgs[0]["content"]+=context
                sources=hits
        msgs.extend(messages)
        payload={"model":model or MODEL,"messages":msgs}
        if temperature is not None: payload["temperature"]=temperature
        if max_tokens is not None: payload["max_tokens"]=max_tokens
        async with httpx.AsyncClient(timeout=float(os.getenv("AI_TIMEOUT","180"))) as c:
            try:
                r=await c.post(BASE+"/chat/completions",headers={"Authorization":f"Bearer {KEY}"},json=payload)
                r.raise_for_status()
                data=r.json()
                text=data["choices"][0]["message"]["content"]
            except Exception as e:
                text=f"NEW AI konnte den Modellserver nicht erreichen. Prüfe PROVIDER_BASE_URL, PROVIDER_API_KEY und MODEL.\n\nStatus: {type(e).__name__}"
                return {"text":text,"sources":[]}
        return {"text":text,"sources":sources}
    async def image(self,prompt,model,size,n):
        if not IMAGE_URL:
            raise RuntimeError("Image provider not configured")
        payload={"model":model or os.getenv("IMAGE_MODEL","image-model"),"prompt":prompt,"size":size,"n":n}
        async with httpx.AsyncClient(timeout=180) as c:
            r=await c.post(IMAGE_URL+"/images/generations",headers={"Authorization":f"Bearer {IMAGE_KEY}"},json=payload)
            r.raise_for_status()
            return r.json()
