const $=s=>document.querySelector(s), $$=s=>document.querySelectorAll(s);
const data={
 KI:{icon:"✦",title:"KI-Zentrale",text:"Deine zentrale Oberfläche für Assistent, Suche und Systemhilfe.",content:"<strong>Bereit.</strong><br>Stelle später Fragen, suche Inhalte oder steuere Funktionen über eine einheitliche Oberfläche."},
 Fotos:{icon:"▣",title:"Fotos",text:"Eine ruhige Galerie für deine Bilder.",content:"<strong>Galerie-Demo</strong><br>In einer späteren echten App können hier freigegebene Bilder des Geräts angezeigt werden."},
 Dateien:{icon:"⌁",title:"Dateien",text:"Dateien und Ordner übersichtlich organisiert.",content:"<strong>Dateiübersicht</strong><br>Start · Bilder · Downloads · Dokumente<br><br>Diese Web-Demo greift nicht auf private Tablet-Dateien zu."},
 Musik:{icon:"♫",title:"Musik",text:"Ein minimalistischer Player für deine Musik.",content:"<strong>Keine Wiedergabe</strong><br>Wähle später einen Titel und steuere Wiedergabe, Lautstärke und Fortschritt."},
 Browser:{icon:"◌",title:"Browser",text:"Schneller Zugang zum Internet.",content:"<strong>Web</strong><br>Der Prototyp bleibt bewusst lokal und enthält keine fremden Webseiten im Systemfenster."},
 Einstellungen:{icon:"⚙",title:"Einstellungen",text:"System, Darstellung und Datenschutz an einem Ort.",content:"<strong>Darstellung</strong><br>Animationen · Helligkeit · Sprache Deutsch<br><br><strong>Datenschutz</strong><br>Die Website verändert kein Android-System."}
};
function openApp(name){const d=data[name]||data.KI;$("#modalIcon").textContent=d.icon;$("#modalEyebrow").textContent="APP · NEW SYSTEM";$("#modalTitle").textContent=d.title;$("#modalText").textContent=d.text;$("#modalContent").innerHTML=d.content;$("#modal").classList.add("open");$("#modal").setAttribute("aria-hidden","false")}
function closeModal(){$("#modal").classList.remove("open");$("#modal").setAttribute("aria-hidden","true")}
$$("[data-app]").forEach(el=>el.addEventListener("click",()=>openApp(el.dataset.app)));
$$("[data-close]").forEach(el=>el.addEventListener("click",closeModal));
$$("[data-open]").forEach(el=>el.addEventListener("click",()=>document.getElementById(el.dataset.open).scrollIntoView({behavior:"smooth"})));
document.addEventListener("keydown",e=>{if(e.key==="Escape")closeModal()});
function time(){const d=new Date(),s=d.toLocaleTimeString("de-DE",{hour:"2-digit",minute:"2-digit"});$("#clock").textContent=s;$("#miniTime").textContent=s}
time();setInterval(time,1000);
$("#themeBtn").addEventListener("click",()=>{document.body.classList.toggle("bright");$("#themeBtn").querySelector("span").textContent=document.body.classList.contains("bright")?"Dunkel":"Ansicht"});
$("#playPreview").addEventListener("click",()=>{const b=$("#playPreview");b.textContent="✓ Vorschau läuft";setTimeout(()=>b.textContent="▶ Vorschau starten",4500)});
$$(".quick").forEach(q=>q.addEventListener("click",()=>q.classList.toggle("active")));
