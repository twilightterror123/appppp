import os, aiohttp, discord
from discord.ext import commands

TOKEN=os.environ["DISCORD_BOT_TOKEN"]
NEWAI_URL=os.getenv("NEWAI_URL","http://localhost:8000")
NEWAI_KEY=os.environ["NEWAI_API_KEY"]

intents=discord.Intents.default()
intents.message_content=True
bot=commands.Bot(command_prefix="!",intents=intents)

@bot.event
async def on_ready(): print(f"NEW AI Discord online as {bot.user}")

async def ask(text):
    payload={"model":"new-ai","messages":[{"role":"user","content":text}]}
    headers={"Authorization":f"Bearer {NEWAI_KEY}","Content-Type":"application/json"}
    async with aiohttp.ClientSession() as s:
        async with s.post(NEWAI_URL+"/v1/chat/completions",json=payload,headers=headers,timeout=180) as r:
            data=await r.json()
            if r.status>=400: raise RuntimeError(data)
            return data["choices"][0]["message"]["content"]

@bot.command()
async def ai(ctx,*,prompt):
    msg=await ctx.send("⏳ NEW AI denkt …")
    try:
        answer=await ask(prompt)
        await msg.edit(content=answer[:1900])
    except Exception as e:
        await msg.edit(content=f"Fehler: {type(e).__name__}")

bot.run(TOKEN)
