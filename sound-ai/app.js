const $=id=>document.getElementById(id);
let ctx=new AudioContext(), buffer=null, file=null, result=null, resultUrl=null, history=JSON.parse(localStorage.getItem("sound_ai_versions")||"[]"), analysis=null;
let audioAI=null, aiLabels=[], aiReady=false, aiBusy=false;
const AI_MODEL="Xenova/ast-finetuned-audioset-10-10-0.4593";
async function loadAudioAI(){
  if(audioAI||aiBusy)return audioAI;
  aiBusy=true;
  $("engineState").textContent="Audio-KI lädt …";
  try{
    const mod=await import("https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1");
    const device=navigator.gpu?"webgpu":"wasm";
    const dtype=device==="webgpu"?"q4f16":"q4";
    audioAI=await mod.pipeline("audio-classification",AI_MODEL,{device,dtype,progress_callback:p=>{
      if(p?.progress!=null)$("engineState").textContent="Audio-KI "+Math.round(p.progress)+"%";
    }});
    aiReady=true;$("engineState").textContent="Audio-KI bereit";return audioAI;
  }catch(e){
    console.warn(e);$("engineState").textContent="DSP-Modus · KI nicht geladen";return null;
  }finally{aiBusy=false}
}
async function resample16k(buf){
  const target=16000,frames=Math.ceil(buf.duration*target);
  const off=new OfflineAudioContext(1,frames,target),src=off.createBufferSource(),mono=off.createBuffer(1,buf.length,buf.sampleRate),md=mono.getChannelData(0);
  for(let i=0;i<buf.length;i++){let s=0;for(let c=0;c<buf.numberOfChannels;c++)s+=buf.getChannelData(c)[i];md[i]=s/buf.numberOfChannels}
  src.buffer=mono;src.connect(off.destination);src.start();const out=await off.startRendering();return out.getChannelData(0);
}
async function aiUnderstand(buf){
  const pipe=await loadAudioAI();if(!pipe)return null;
  $("analysisBadge").textContent="AI analysiert …";
  const data=await resample16k(buf),max=16000*10,start=Math.max(0,Math.floor((data.length-max)/2)),clip=data.slice(start,start+max);
  const out=await pipe(clip,{top_k:8});aiLabels=out;
  const top=out.slice(0,5).map(x=>x.label+" "+Math.round(x.score*100)+"%").join(" · ");
  $("suggestions").innerHTML="<b>ECHTE AUDIO-KI:</b> "+top+"<br>Diese Modell-Ausgabe wird zusammen mit den Messwerten für den Auto-Mix verwendet.";
  $("analysisBadge").textContent="AI-Profil fertig";
  msg("Audio-KI analysiert: "+top);
  return out;
}
function aiRecipeAdjust(base,labels){
  const p={...base};if(!labels?.length)return p;
  const score=(keys)=>labels.filter(x=>keys.some(k=>String(x.label).toLowerCase().includes(k))).reduce((a,x)=>a+x.score,0);
  const music=score(["music","song","melody","instrument"]);
  const drums=score(["drum","beat","percussion"]);
  const bassAI=score(["bass","low frequency"]);
  const speech=score(["speech","conversation","voice"]);
  const noise=score(["noise","static","hum","wind"]);
  if(speech>.45){p.bass=Math.min(p.bass,4);p.reverb=Math.min(p.reverb,2);p.echo=0;p.comp=Math.min(p.comp,58);p.treble=Math.max(p.treble,1)}
  if(music>.35){p.stereo=Math.max(p.stereo,106);p.comp=Math.max(p.comp,52)}
  if(drums>.25){p.comp=Math.min(78,Math.max(p.comp,62));p.sat=Math.max(p.sat,4)}
  if(bassAI>.25)p.bass=Math.min(15,p.bass+3);
  if(noise>.25){p.lowcut=Math.max(35,p.lowcut);p.highcut=Math.min(19000,p.highcut);p.comp=Math.min(70,p.comp+4)}
  return p;
}
const presets={
clean:{gain:0,bass:0,mid:0,treble:2,comp:28,sat:0,limit:88,stereo:100,reverb:3,echo:0,speed:100,pitch:0,lowcut:35,highcut:20000},
loud:{gain:5,bass:4,mid:0,treble:2,comp:78,sat:8,limit:94,stereo:105,reverb:3,echo:1,speed:100,pitch:0,lowcut:35,highcut:19000},
bass:{gain:4,bass:11,mid:-1,treble:1,comp:68,sat:8,limit:94,stereo:105,reverb:4,echo:2,speed:100,pitch:0,lowcut:30,highcut:19000},
tiktok:{gain:5,bass:7,mid:0,treble:3,comp:82,sat:7,limit:95,stereo:110,reverb:5,echo:1,speed:104,pitch:.5,lowcut:35,highcut:19500},
club:{gain:4,bass:9,mid:-1,treble:2,comp:76,sat:12,limit:94,stereo:112,reverb:17,echo:6,speed:100,pitch:0,lowcut:28,highcut:20000},
slowed:{gain:3,bass:5,mid:0,treble:-1,comp:54,sat:3,limit:91,stereo:104,reverb:12,echo:4,speed:82,pitch:-1.5,lowcut:30,highcut:16000},
night:{gain:5,bass:4,mid:1,treble:5,comp:72,sat:5,limit:94,stereo:108,reverb:5,echo:1,speed:116,pitch:2,lowcut:35,highcut:20000}
};
function setv(id,v){$(id).value=v;refreshOne(id)}
function refreshOne(id){let v=Number($(id).value),t;if(id==="gain"||id==="bass"||id==="mid"||id==="treble")t=(v>=0?"+":"")+v.toFixed(1)+" dB";else if(id==="comp"||id==="sat")t=v+"%";else if(id==="limit"||id==="stereo"||id==="reverb"||id==="echo"||id==="speed")t=v+"%";else if(id==="pitch")t=(v>0?"+":"")+v+" st";else if(id==="lowcut")t=v+" Hz";else if(id==="highcut")t=v>=20000?"20 kHz":(v/1000).toFixed(1)+" kHz";else t=v.toFixed(2)+" s";$(id+"Out").textContent=t}
["start","end","gain","bass","mid","treble","comp","sat","limit","stereo","reverb","echo","speed","pitch","lowcut","highcut"].forEach(refreshOne);
function msg(text,user=false){const d=document.createElement("div");d.className="bubble "+(user?"userMsg":"aiMsg");d.textContent=text;$("chat").appendChild(d);$("chat").scrollTop=$("chat").scrollHeight}
function save(){localStorage.setItem("sound_ai_versions",JSON.stringify(history.slice(-20)))}
function autoRecipe(a){let p={...presets.clean};if(!a)return p;
const peak=a.peakDb,rms=a.rmsDb;
if(peak>-1.5)p.gain-=2;else if(rms<-22)p.gain+=4;else if(rms<-17)p.gain+=2;
p.comp=rms<-20?58:(rms>-13?48:64);
p.limit=92;p.stereo=108;p.lowcut=a.silenceRatio>.12?35:25;
p.bass=a.bassRatio<.10?5:(a.bassRatio>.34?-1:2);
p.mid=a.bassRatio>.34?-1:0;
p.treble=a.brightness<.16?3:(a.brightness>.55?-2:1);
p.sat=rms<-22?3:6;
p.reverb=3;p.echo=0;p.highcut=a.brightness>.7?18500:20000;
p.speed=a.dynamic>12?102:(a.dynamic<6?100:101);
p.pitch=a.brightness<.20?.5:(a.brightness>.62?-.5:0);
return p}
function apply(obj){Object.entries(obj).forEach(([k,v])=>setv(k,v));}
function analyze(buf){
 const data=buf.getChannelData(0),step=Math.max(1,Math.floor(data.length/120000));let peak=0,sum=0,sum2=0,bassSum=0,brightSum=0,silence=0,count=0;
 const nyq=buf.sampleRate/2;
 for(let i=0;i<data.length;i+=step){let v=data[i]||0,ab=Math.abs(v);peak=Math.max(peak,ab);sum+=v;sum2+=v*v;count++;if(ab<.01)silence++;const t=i/data.length;let lp=buf.sampleRate*(.04+0.14*t);bassSum+=ab*(lp<180?1:0);brightSum+=ab*(lp>4500?1:0)}
 const rms=Math.sqrt(sum2/count)||0,peakDb=20*Math.log10(Math.max(peak,1e-7)),rmsDb=20*Math.log10(Math.max(rms,1e-7)),bassRatio=bassSum/(bassSum+brightSum+1e-7),brightness=brightSum/(bassSum+brightSum+1e-7),silenceRatio=silence/count,dyn=peakDb-rmsDb;
 return {duration:buf.duration,peakDb,rmsDb,bassRatio,brightness,silenceRatio,dynamic:dyn,channels:buf.numberOfChannels};
}
function renderWave(){const c=$("wave"),x=c.getContext("2d"),w=Math.max(800,c.clientWidth*2),h=Math.max(180,c.clientHeight*2);c.width=w;c.height=h;x.clearRect(0,0,w,h);const d=buffer.getChannelData(0),step=Math.max(1,Math.floor(d.length/w));x.beginPath();for(let i=0;i<w;i++){let mn=1,mx=-1;for(let j=0;j<step;j++){const v=d[i*step+j]||0;mn=Math.min(mn,v);mx=Math.max(mx,v)}x.moveTo(i,h/2+mn*h*.4);x.lineTo(i,h/2+mx*h*.4)}x.strokeStyle="#888";x.stroke();updateSelection()}
function updateSelection(){if(!buffer)return;const s=+$("start").value/buffer.duration,e=+$("end").value/buffer.duration;$("sel").style.left=(s*100)+"%";$("sel").style.right=((1-e)*100)+"%"}
async function load(f){if(!f||!f.type.startsWith("audio/"))return;file=f;ctx.close().catch(()=>{});ctx=new AudioContext();const ab=await f.arrayBuffer();buffer=await ctx.decodeAudioData(ab.slice(0));$("playerCard").hidden=false;$("fileName").textContent=f.name;$("fileMeta").textContent=buffer.duration.toFixed(2)+" s · "+buffer.numberOfChannels+" ch · "+Math.round(buffer.sampleRate)+" Hz";$("fileState").textContent=f.name;const u=URL.createObjectURL(f);$("sourceAudio").src=u;$("start").max=buffer.duration;$("end").max=buffer.duration;$("start").value=0;$("end").value=buffer.duration;refreshOne("start");refreshOne("end");analysis=analyze(buffer);showAnalysis();renderWave();const p=aiRecipeAdjust(autoRecipe(analysis),await aiUnderstand(buffer));apply(p);$("analysisBadge").textContent="AI + Audio-Profil fertig";$("decision").hidden=false;$("advanced").hidden=true;$("suggestions").innerHTML+="<br><br><b>Auto-Mix:</b> komplette Grundmischung wurde anhand von Modell + Messwerten vorbereitet.";msg("Die echte Audio-KI ist fertig. Jetzt entscheidest du nur noch: LOUD, LOUDER, BASS, BASS BOOST oder MORE BASS.");}
function showAnalysis(){if(!analysis)return;const a=analysis;$("peak").textContent=a.peakDb.toFixed(1)+" dB";$("rms").textContent=a.rmsDb.toFixed(1)+" dB";$("bassMetric").textContent=Math.round(a.bassRatio*100)+"%";$("brightMetric").textContent=Math.round(a.brightness*100)+"%";$("aDuration").textContent=a.duration.toFixed(2)+" s";$("aPeak").textContent=a.peakDb.toFixed(2)+" dBFS";$("aRms").textContent=a.rmsDb.toFixed(2)+" dBFS";$("aDyn").textContent=a.dynamic.toFixed(2)+" dB";$("aBass").textContent=Math.round(a.bassRatio*100)+"%";$("aBright").textContent=Math.round(a.brightness*100)+"%";$("aSilence").textContent=Math.round(a.silenceRatio*100)+"%";$("aChannels").textContent=a.channels}
async function render(){
 if(!buffer){msg("Lade zuerst Audio.");return}const s=+$("start").value,e=+$("end").value;if(e<=s+.05){msg("Das Ende muss hinter dem Start liegen.");return}
 $("render").disabled=true;$("status").textContent="SOUND AI rendert …";
 const speed=+$("speed").value/100,pitch=+$("pitch").value,eff=speed*Math.pow(2,pitch/12),rate=buffer.sampleRate,duration=(e-s)/eff,tail=Math.max(.4,1+ +$("reverb").value/80 + +$("echo").value/60),frames=Math.ceil((duration+tail)*rate);
 const off=new OfflineAudioContext(2,frames,rate),src=off.createBufferSource();src.buffer=buffer;src.playbackRate.value=eff;src.detune.value=0;
 const lowCut=off.createBiquadFilter();lowCut.type="highpass";lowCut.frequency.value=+$("lowcut").value;
 const low=off.createBiquadFilter();low.type="lowshelf";low.frequency.value=160;low.gain.value=+$("bass").value;
 const mid=off.createBiquadFilter();mid.type="peaking";mid.frequency.value=1100;mid.Q.value=.9;mid.gain.value=+$("mid").value;
 const high=off.createBiquadFilter();high.type="highshelf";high.frequency.value=4200;high.gain.value=+$("treble").value;
 const highCut=off.createBiquadFilter();highCut.type="lowpass";highCut.frequency.value=+$("highcut").value;
 const comp=off.createDynamicsCompressor(),cr=+$("comp").value/100;comp.threshold.value=-34+20*(1-cr);comp.knee.value=8;comp.ratio.value=1+15*cr;comp.attack.value=.003;comp.release.value=.12;
 const g=off.createGain();g.gain.value=Math.pow(10,+$("gain").value/20);
 const master=off.createGain(),lim=+$("limit").value/100;master.gain.value=Math.min(1,lim+.08);
 src.connect(lowCut).connect(low).connect(mid).connect(high).connect(highCut).connect(comp).connect(g).connect(master).connect(off.destination);
 const sat=+$("sat").value/100;if(sat){const sh=off.createWaveShaper(),curve=new Float32Array(2048);for(let i=0;i<curve.length;i++){const z=i*2/curve.length-1;curve[i]=(1+sat*6)*z/(1+sat*6*Math.abs(z))}sh.curve=curve;sh.oversample="2x";g.disconnect();g.connect(sh).connect(master)}
 const echo=+$("echo").value/100;if(echo){const d=off.createDelay(1),eg=off.createGain();d.delayTime.value=.17;eg.gain.value=.28*echo;src.connect(d).connect(eg).connect(master)}
 const rev=+$("reverb").value/100;if(rev){const cv=off.createConvolver(),ir=off.createBuffer(2,Math.floor(rate*(.8+rev*.7)),rate);for(let ch=0;ch<2;ch++){const a=ir.getChannelData(ch);for(let i=0;i<a.length;i++)a[i]=(Math.random()*2-1)*Math.pow(1-i/a.length,2.6)}cv.buffer=ir;const rg=off.createGain();rg.gain.value=.3*rev;src.connect(cv).connect(rg).connect(master)}
 src.start(0,s,e);
 try{result=await off.startRendering();resultUrl=URL.createObjectURL(toWav(result));$("resultAudio").src=resultUrl;$("download").href=resultUrl;$("resultMeta").textContent=result.duration.toFixed(2)+" s · 16-bit WAV";$("output").hidden=false;$("status").textContent="Fertig.";history.push({name:file.name,time:new Date().toLocaleTimeString("de-DE"),settings:getSettings()});save();renderHistory();postReview(result)}catch(err){$("status").textContent="Renderfehler: "+err.message}finally{$("render").disabled=false}
}
function getSettings(){const o={};["start","end","gain","bass","mid","treble","comp","sat","limit","stereo","reverb","echo","speed","pitch","lowcut","highcut"].forEach(id=>o[id]=+$(id).value);return o}
function applyStereoAndPhase(b){const width=+$("stereo").value/100,protect=$("phase").checked,out=ctx.createBuffer(2,b.length,b.sampleRate);const l=b.numberOfChannels>1?b.getChannelData(0):b.getChannelData(0),r=b.numberOfChannels>1?b.getChannelData(1):l,ol=out.getChannelData(0),or=out.getChannelData(1);for(let i=0;i<b.length;i++){const mid=(l[i]+r[i])*.5,side=(l[i]-r[i])*.5,side2=protect?Math.max(-Math.abs(mid)*1.5,Math.min(Math.abs(mid)*1.5,side*width)):side*width;ol[i]=mid+side2;or[i]=mid-side2}return out}
function postReview(buf){const a=analyze(buf);let text="Version geprüft. ";if(a.peakDb>-1)text+="Peak ist sehr hoch. ";if(a.rmsDb<-19)text+="Noch recht leise. ";if(a.dynamic<5)text+="Dynamik stark verdichtet. ";if(!text.endsWith(". "))text+="Mix wirkt kontrolliert.";msg(text);$("aiState").textContent="Version analysiert."}
function toWav(b){const n=b.length,ch=2,buf=new ArrayBuffer(44+n*ch*2),v=new DataView(buf);write(v,0,"RIFF");v.setUint32(4,36+n*ch*2,true);write(v,8,"WAVE");write(v,12,"fmt ");v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,ch,true);v.setUint32(24,b.sampleRate,true);v.setUint32(28,b.sampleRate*ch*2,true);v.setUint16(32,ch*2,true);v.setUint16(34,16,true);write(v,36,"data");v.setUint32(40,n*ch*2,true);let o=44;for(let i=0;i<n;i++){for(let c=0;c<ch;c++){let x=b.numberOfChannels>1?b.getChannelData(c)[i]:b.getChannelData(0)[i];x=Math.max(-1,Math.min(1,x));v.setInt16(o,x<0?x*32768:x*32767,true);o+=2}}return new Blob([v],{type:"audio/wav"})}
function write(v,o,s){for(let i=0;i<s.length;i++)v.setUint8(o+i,s.charCodeAt(i))}
function command(t){
 const n=t.toLowerCase();let changed=false;
 const setPlus=(id,d,min,max)=>{setv(id,Math.max(min,Math.min(max,+$(id).value+d)));changed=true};
 if(/lauter|mehr laut|volume hoch/.test(n))setPlus("gain",2,-8,12);
 if(/leiser|volume runter/.test(n))setPlus("gain",-2,-8,12);
 if(/mehr bass|bass.*hoch|bass boost/.test(n))setPlus("bass",3,-12,15);
 if(/weniger bass|bass.*weg|bass raus/.test(n))setPlus("bass",-4,-12,15);
 if(/mehr höhen|klarer|brighter|heller/.test(n))setPlus("treble",2,-10,10);
 if(/weniger höhen|dunkler/.test(n))setPlus("treble",-2,-10,10);
 if(/clean|sauber|klar/.test(n)){setPlus("reverb",-5,0,100);setPlus("echo",-4,0,100);setPlus("sat",-8,0,100);setPlus("treble",1,-10,10)}
 if(/druck|punch|fett/.test(n)){setPlus("comp",10,0,100);setPlus("bass",2,-12,15);setPlus("gain",1,-8,12)}
 if(/hall|reverb/.test(n)&&/mehr|stärker|starker/.test(n))setPlus("reverb",8,0,100);
 if(/weniger hall|hall weg/.test(n))setv("reverb",0),changed=true;
 if(/echo/.test(n)&&/mehr|rein/.test(n))setPlus("echo",8,0,100);
 const sp=t.match(/(?:speed|tempo|geschwindigkeit)\s*(?:auf)?\s*(\d{2,3})\s*%?/i);if(sp){setv("speed",Math.max(70,Math.min(130,+sp[1])));changed=true}
 const pp=t.match(/pitch\s*(?:auf)?\s*(-?\d+(?:\.\d+)?)\s*(?:st|halbton|semitone)?/i);if(pp){setv("pitch",Math.max(-6,Math.min(6,+pp[1])));changed=true}
 const st=t.match(/(?:ab|von|start)\s*(\d+(?:\.\d+)?)\s*(?:s|sek|sekunden)?/i);if(st){setv("start",Math.max(0,Math.min(buffer?.duration||999,+st[1])));changed=true}
 const en=t.match(/(?:bis|ende)\s*(\d+(?:\.\d+)?)\s*(?:s|sek|sekunden)?/i);if(en){setv("end",Math.max(0,Math.min(buffer?.duration||999,+en[1])));changed=true}
 if(/auto|automatisch|mach alles/.test(n)&&analysis){apply(autoRecipe(analysis));changed=true}
 if(/tiktok/.test(n)){apply(presets.tiktok);changed=true}
 if(/club/.test(n)){apply(presets.club);changed=true}
 if(/slowed/.test(n)){apply(presets.slowed);changed=true}
 if(/nightcore/.test(n)){apply(presets.night);changed=true}
 if(changed){msg("Erledigt. Ich habe die Mix-Einstellungen angepasst. Rendere jetzt erneut, damit du die Änderung hörst.",false);return}
 if(/gut|perfekt/.test(n)){msg("Okay. Ich lasse diese Version unverändert.",false);return}
 if(/besser|noch mehr|härter|stärker/.test(n)){setPlus("gain",1,-8,12);setPlus("bass",1,-12,15);setPlus("comp",5,0,100);msg("Ich habe mehr Druck und Lautheit gegeben. Noch einmal rendern.",false);return}
 msg("Ich kann z. B. „mehr Bass“, „lauter“, „cleaner“, „mehr Druck“, „weniger Hall“, „Speed 110%“, „Pitch -2 st“, „ab 12 bis 48“ oder „mach alles automatisch“ verstehen.",false)
}
$("chatSend").onclick=()=>{const t=$("chatInput").value.trim();if(t){msg(t,true);$("chatInput").value="";command(t)}};$("chatInput").onkeydown=e=>{if(e.key==="Enter")$("chatSend").click()};
document.querySelectorAll(".quick button").forEach(b=>b.onclick=()=>{msg(b.dataset.q,true);command(b.dataset.q)});
document.querySelectorAll(".decisionGrid button").forEach(b=>b.onclick=async()=>{if(!buffer||!analysis)return;document.querySelectorAll(".decisionGrid button").forEach(x=>x.classList.remove("selected"));b.classList.add("selected");let p=autoRecipe(analysis),label=b.dataset.choice;
if(label==="loud"){p.gain+=2;p.comp=Math.min(100,p.comp+8)}
if(label==="louder"){p.gain+=4;p.comp=Math.min(100,p.comp+14);p.limit=96;p.sat=Math.min(100,p.sat+6)}
if(label==="bass"){p.bass+=4;p.comp=Math.min(100,p.comp+5)}
if(label==="bassboost"){p.bass+=8;p.comp=Math.min(100,p.comp+10);p.sat=Math.min(100,p.sat+4)}
if(label==="morebass"){p.bass+=12;p.comp=Math.min(100,p.comp+12);p.mid-=2}
p.gain=Math.min(12,p.gain);p.bass=Math.min(15,p.bass);apply(p);$("autoStatus").textContent="SOUND AI · "+label.toUpperCase()+" ausgewählt";$("advanced").hidden=false;$("status").textContent=label.toUpperCase()+" gewählt · automatische Version wird gerendert …";await render();});
document.querySelectorAll(".presets button").forEach(b=>b.onclick=()=>{const p=b.dataset.preset;if(p==="auto"&&analysis)apply(autoRecipe(analysis));else if(p!=="auto")apply(presets[p]);document.querySelectorAll(".presets button").forEach(x=>x.classList.remove("active"));b.classList.add("active")});
$("autoTune").onclick=()=>{if(analysis){apply(autoRecipe(analysis));msg("Auto-Mix neu berechnet.");}};
$("render").onclick=render;
$("advanced").hidden=true;$("decision").hidden=true;$("file").onchange=e=>load(e.target.files[0]);$("drop").onclick=()=>$("file").click();$("drop").ondragover=e=>e.preventDefault();$("drop").ondrop=e=>{e.preventDefault();load(e.dataTransfer.files[0])};$("play").onclick=()=>$("sourceAudio").play();$("start").oninput=updateSelection;$("end").oninput=updateSelection;
$("sourceA").onclick=()=>{$("sourceAudio").currentTime=0;$("sourceAudio").play()};
["start","end","gain","bass","mid","treble","comp","sat","limit","stereo","reverb","echo","speed","pitch","lowcut","highcut"].forEach(id=>$(id).addEventListener("input",refreshOne));$("resultB").onclick=()=>{$("resultAudio").currentTime=0;$("resultAudio").play()};
function renderHistory(){$("historyList").innerHTML=history.length?history.slice().reverse().map((x,i)=>'<div class="historyItem"><b>Version '+(history.length-i)+'</b> · '+x.name+'<div class="muted">'+x.time+'</div></div>').join(""):"Noch keine Render-Versionen."}
document.querySelectorAll(".nav").forEach(b=>b.onclick=()=>{document.querySelectorAll(".nav").forEach(x=>x.classList.remove("active"));b.classList.add("active");document.querySelectorAll(".view").forEach(v=>v.classList.add("hidden"));$(b.dataset.view).classList.remove("hidden")});
$("newProject").onclick=()=>location.reload();renderHistory();msg("Hi. Ich bin SOUND AI. Lade einen Song hoch – ich analysiere Lautheit, Dynamik, Bass, Helligkeit und Stille und baue daraus automatisch einen Remix.");