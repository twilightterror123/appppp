import os, json
from typing import Any
import httpx
from .webtools import web_search

BASE=os.getenv("PROVIDER_BASE_URL","http://localhost:11434/v1").rstrip("/")
KEY=os.getenv("PROVIDER_API_KEY","ollama")
MODEL=os.getenv("MODEL","llama3.2:3b")
IMAGE_URL=os.getenv("IMAGE_PROVIDER_URL","").rstrip("/")
IMAGE_KEY=os.getenv("IMAGE_PROVIDER_KEY",KEY)

SYSTEM="""You are NEW AI, a general-purpose assistant. Be accurate, useful, concise when simple and detailed when needed.
Capabilities exposed by this server may include web search, image generation, file/code workflows and memory.
Never claim a tool was used if it was not. Never invent sources. Keep secrets private.
When web sources are supplied, ground time-sensitive claims in them and mention uncertainty when needed."""

class AIEngine:
    model=MODEL
    def status(self):
        return {"base_url":BASE,"model":MODEL,"image":bool(IMAGE_URL)}
    async def chat(self,messages:list[dict],model=None,temperature=None,max_tokens=None,web_search=False,system=None):
        msgs=[{"role":"system","content":system or SYSTEM}]
        sources=[]
        last=next((m.get("content","") for m in reversed(messages) if m.get("role")=="user"),"")
        if web_search:
            hits=await web_search(last)
            if hits:
                context="\n\nWEB SOURCES:\n"+"\n".join(f"- {h['title']} | {h['url']}\n{h.get('snippet','')}" for h in hits)
                msgs[0]["content"]+=context
                sources=hits
        msgs.extend(messages)
        payload={"model":model or MODEL,"messages":msgs}
        if temperature is not None: payload["temperature"]=temperature
        if max_tokens is not None: payload["max_tokens"]=max_tokens
        async with httpx.AsyncClient(timeout=float(os.getenv("AI_TIMEOUT","180"))) as c:
            try:
                r=await c.post(BASE+"/chat/completions",headers={"Authorization":f"Bearer {KEY}"},json=payload)
                r.raise_for_status(); data=r.json()
            except Exception as e:
                return {"text":f"NEW AI konnte den Modellserver nicht erreichen. Prüfe PROVIDER_BASE_URL/MODEL.\n\nTechnischer Status: {type(e).__name__}", "sources":[]}
        return {"text":data["choices"][0]["message"]["content"],"sources":sources}
    async def image(self,prompt,model,size,n):
        if not IMAGE_URL: raise Exception("Image provider not configured. Set IMAGE_PROVIDER_URL and IMAGE_PROVIDER_KEY.")
        payload={"model":model or os.getenv("IMAGE_MODEL","image-model"),"prompt":prompt,"size":size,"n":n}
        async with httpx.AsyncClient(timeout=180) as c:
            r=await c.post(IMAGE_URL+"/images/generations",headers={"Authorization":f"Bearer {IMAGE_KEY}"},json=payload)
            r.raise_for_status(); return r.json()
