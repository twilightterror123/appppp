import * as webllm from "https://esm.run/@mlc-ai/web-llm";

const MODEL="Llama-3.2-1B-Instruct-q4f16_1-MLC";
let engine=null, chromeSession=null, mode="";
let chat=JSON.parse(localStorage.getItem("newai_chat")||"[]");
const $=id=>document.getElementById(id), messages=$("messages"), input=$("input");

function add(role,text){
  $("welcome")?.remove();
  const row=document.createElement("div"); row.className="msg "+(role==="user"?"user":"");
  const b=document.createElement("div"); b.className="bubble"; b.textContent=text; row.appendChild(b);
  messages.appendChild(row); messages.scrollTop=messages.scrollHeight; return b;
}
function setState(t){$("state").textContent=t;$("progress")&&($("progress").textContent=t);}
function save(){localStorage.setItem("newai_chat",JSON.stringify(chat.slice(-40)));localStorage.setItem("newai_model",MODEL);}

async function start(){
  if(engine||chromeSession)return;
  try{
    if(globalThis.LanguageModel){
      setState("Browser-KI wird geprüft …");
      const availability=await LanguageModel.availability({
        expectedInputs:[{type:"text",languages:["de","en"]}],
        expectedOutputs:[{type:"text",languages:["de","en"]}]
      });
      if(availability!=="unavailable"){
        setState(availability==="downloading"?"Chrome-KI wird geladen …":"Chrome-KI wird gestartet …");
        chromeSession=await LanguageModel.create({
          monitor(m){
            m.addEventListener("downloadprogress",e=>setState("Chrome-KI lädt: "+Math.round(e.loaded*100)+"%"));
          }
        });
        mode="chrome"; setState("bereit"); $("welcome")?.remove(); return;
      }
    }
  }catch(e){console.warn("Chrome AI unavailable",e)}

  try{
    setState("Lokales Modell wird geladen …");
    engine=await webllm.CreateMLCEngine(MODEL,{
      initProgressCallback:p=>setState("KI wird geladen: "+Math.round((p.progress||0)*100)+"%")
    });
    mode="webllm"; setState("bereit"); $("welcome")?.remove();
  }catch(e){
    setState("KI konnte nicht geladen werden");
    add("assistant","Das Gerät kann die lokale KI gerade nicht starten. Prüfe, ob WebGPU im Browser verfügbar ist.");
  }
}
async function localAnswer(t){
  if(!engine&&!chromeSession)await start();
  if(chromeSession){
    return await chromeSession.prompt(t);
  }
  if(engine){
    const arr=[{role:"system",content:"You are NEW AI. Be helpful, accurate, calm and honest. Answer in the user's language. Do not claim internet access or tools you did not use."},...chat.map(x=>({role:x.role,content:x.content}))];
    const out=await engine.chat.completions.create({messages:arr,temperature:.55,max_tokens:900});
    return out.choices?.[0]?.message?.content||"Keine Antwort.";
  }
  return "Keine lokale KI verfügbar.";
}
async function send(){
  const t=input.value.trim(); if(!t)return;
  add("user",t); input.value="";
  chat.push({role:"user",content:t});
  const out=add("assistant","…");
  try{
    if(/^rechne\s+/i.test(t)){
      const expr=t.replace(/^rechne\s+/i,"").replace(/,/g,".");
      if(/^[0-9+\-*/().%\s]+$/.test(expr)){out.textContent="Ergebnis: "+Function("return "+expr)();chat.push({role:"assistant",content:out.textContent});save();return}
    }
    if(/^(uhrzeit|wie spät|wie spät ist es)/i.test(t)){out.textContent=new Date().toLocaleTimeString("de-DE");chat.push({role:"assistant",content:out.textContent});save();return}
    const ans=await localAnswer(t); out.textContent=ans; chat.push({role:"assistant",content:ans}); save();
  }catch(e){out.textContent="Fehler: "+e.message}
}
function showChat(){document.querySelectorAll(".nav").forEach(x=>x.classList.remove("active"));document.querySelector('[data-view="chat"]').classList.add("active");$("panelView").classList.add("hidden");$("chatView").classList.remove("hidden")}
function panel(html){$("chatView").classList.add("hidden");$("panelView").classList.remove("hidden");$("panelView").innerHTML=html}
function modelsView(){panel('<h2>Modelle</h2><div class="card"><b>Automatisch</b><p class="small">NEW AI nutzt zuerst die integrierte Chrome-KI, wenn sie auf dem Gerät verfügbar ist. Sonst wird Llama 3.2 1B lokal über WebGPU geladen.</p></div>')}
function apiView(){panel('<h2>API</h2><div class="card"><b>Kein Setup im Browser</b><p class="small">Die Web-App selbst braucht keine Backend-URL und keinen API-Key. Das optionale Server-Gateway im Repository bleibt für externe Bots verfügbar.</p></div>')}
function aboutView(){panel('<h2>System</h2><div class="card"><p>NEW AI ist bewusst schwarz und schlicht.</p><p class="small">Lokale KI kann ohne API-Schlüssel funktionieren. Die genaue Stärke und Geschwindigkeit hängt vom Gerät und vom verfügbaren Modell ab.</p></div>')}
document.querySelectorAll(".nav").forEach(b=>b.onclick=()=>{const v=b.dataset.view;if(v==="chat")showChat();if(v==="models")modelsView();if(v==="api")apiView();if(v==="about")aboutView()});
$("newChat").onclick=()=>{chat=[];save();messages.innerHTML='<div class="welcome" id="welcome"><h1>Wie kann ich helfen?</h1><p>Die lokale KI startet automatisch.</p><div id="progress" class="progress"></div></div>';start()};
$("send").onclick=send; input.onkeydown=e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send()}};
$("web").onclick=()=>window.open("https://www.google.com/search?q="+encodeURIComponent(input.value||"NEW AI"),"_blank");
$("image").onclick=()=>add("assistant","Echte Bildgenerierung braucht ein Bildmodell. Dieses reine lokale Textmodell erzeugt keine Bilddateien.");
$("file").onchange=e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{chat.push({role:"user",content:"Dateiinhalt:\n"+String(r.result).slice(0,50000)});add("assistant","Datei geladen: "+f.name);save()};r.readAsText(f)};
for(const m of chat.slice(-20))add(m.role,m.content);
start();
