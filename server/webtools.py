import asyncio
from ddgs import DDGS

def _search(q):
    with DDGS() as d:
        return [{"title":x.get("title",""),"url":x.get("href",""),"snippet":x.get("body","")} for x in d.text(q,max_results=6)]

async def web_search(q:str):
    if not q.strip(): return []
    try:
        return await asyncio.to_thread(_search,q)
    except Exception:
        return []
