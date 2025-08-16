// ====== CONFIG pdf.js (CDN ya cargado) ======
const { GlobalWorkerOptions, getDocument } = pdfjsLib;
GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.9.179/pdf.worker.min.js";

// ====== DOM refs ======
const pdfInput = document.getElementById("pdfInput");
const statusEl = document.getElementById("status");
const generateBtn = document.getElementById("generateBtn");
const numQuestionsEl = document.getElementById("numQuestions");

const quizEl = document.getElementById("quiz");
const pillEl = document.getElementById("pill");
const questionEl = document.getElementById("question");
const optionsEl = document.getElementById("options");
const feedbackEl = document.getElementById("feedback");
const checkBtn = document.getElementById("checkBtn");
const nextBtn = document.getElementById("nextBtn");
const progressEl = document.getElementById("progress");

const resultsEl = document.getElementById("results");
const scoreEl = document.getElementById("score");
const restartBtn = document.getElementById("restartBtn");

// ====== Estado ======
let rawText = "";
let questions = [];
let idx = 0;
let selected = null;
let score = 0;

// ====== Utilidades ======
const STOPWORDS = new Set("de,la,que,el,en,y,a,los,del,se,las,por,un,para,con,no,una,su,al,lo,como,mas,o,pero,sus,le,ya,si,porque,cuando,muy,sin,sobre,tambien,me,hasta,hoy,hay,desde,todo,nos,durante,uno,otro,otros,otras,entre,asi,esto,esta,estas,estos,esa,ese,eso,son,ser,es,han,ha,he,sea,segun,puede,pueden,cada,datos,informacion".split(","));
const CONFUSERS = {
  RAM: ["ROM", "Flash", "Caché"],
  ROM: ["RAM", "SSD", "HDD"],
  SSD: ["HDD", "DVD", "Disquete"],
  HDD: ["SSD", "NVMe", "USB"],
  CPU: ["GPU", "NPU", "Chipset"],
  BIOS: ["Firmware", "UEFI", "SO"],
  Entrada: ["Salida", "E/S", "Almacenamiento"],
  Salida: ["Entrada", "E/S", "Procesamiento"],
  Firmware: ["Software de aplicación", "Driver", "Sistema Operativo"],
};

function pick(arr, n){
  const a=[...arr], out=[];
  while(a.length && out.length<n){ out.push(a.splice(Math.floor(Math.random()*a.length),1)[0]); }
  return out;
}

function topKeywords(text, k=30){
  const freq = new Map();
  const words = text.replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9\-\/]/g, " ").split(/\s+/).filter(Boolean);
  for(const w of words){
    const key = w.trim().replace(/[.,;:()]/g, "");
    if(!key) continue;
    const lower = key.toLowerCase();
    if(STOPWORDS.has(lower)) continue;
    const token = /[A-Z]{2,}/.test(key) ? key : lower;
    freq.set(token, (freq.get(token)||0)+1);
  }
  return [...freq.entries()].sort((a,b)=>b[1]-a[1]).slice(0,k).map(([w])=>w);
}

function sentenceSplit(text){
  return text.replace(/\s+/g," ")
             .split(/(?<=[.!?])\s+(?=[A-ZÁÉÍÓÚÜÑ])/)
             .map(s=>s.trim())
             .filter(s=>s.length>40 && /[a-zA-ZÁÉÍÓÚÜÑ]/.test(s));
}

function makeDistractors(sentence, keywords){
  const opts=[];
  const target = keywords.find(k=>new RegExp(`\\b${k}\\b`,"i").test(sentence));
  if(target && CONFUSERS[target]){
    for(const c of pick(CONFUSERS[target],3)){
      opts.push(sentence.replace(new RegExp(target, "gi"), c));
    }
  }
  while(opts.length<3){
    const tweaks=[
      sentence.replace(/(siempre|suele|puede|a veces)/i,"nunca"),
      sentence.replace(/(no|nunca) /i, ""),
      sentence.replace(/(alta|baja|rápida|lenta)/i, m=> (m.toLowerCase()==="alta"?"baja":"alta")),
    ];
    const cand=pick(tweaks,1)[0];
    if(!opts.includes(cand) && cand!==sentence) opts.push(cand);
  }
  return opts.slice(0,3);
}

function summarizeForPill(sentences, i){
  const chunk = sentences.slice(Math.max(0,i-1), Math.min(sentences.length,i+2));
  const text = chunk.join(" ");
  return text.length>280? text.slice(0,270).trim()+"…" : text;
}

function generateHeuristicQuiz(text, desired=8){
  const sentences = sentenceSplit(text);
  const keywords = topKeywords(text, 30);
  const chosen = pick(sentences, Math.min(desired, sentences.length));
  return chosen.map((s, i)=>{
    const distractors = makeDistractors(s, keywords);
    const options = pick([s, ...distractors], 4);
    const correctIndex = Math.max(0, options.findIndex(o=>o===s));
    const key = keywords.find(k=>new RegExp(`\\b${k}\\b`,"i").test(s)) || "Tema";
    return {
      id: i+1,
      topic: key.toUpperCase(),
      pill: summarizeForPill(sentences, sentences.indexOf(s)),
      question: "¿Cuál de las siguientes afirmaciones coincide con el documento?",
      options,
      correctIndex,
      explanation: `La opción correcta proviene del texto del PDF (sección: ${key}).`,
    };
  });
}

// ====== IA real (opcional) ======
async function generateWithLLM(_text, _n){
  // Sustituye esto por tu endpoint si deseas usar OpenAI/otro LLM desde un backend propio.
  return null; // usamos heurística local por defecto
}

// ====== Flujo UI ======
pdfInput.addEventListener("change", async (e)=>{
  const file = e.target.files?.[0];
  if(!file){ return; }
  statusEl.textContent = "Leyendo PDF…";
  generateBtn.disabled = true;
  rawText = "";
  try{
    const buf = await file.arrayBuffer();
    const pdf = await getDocument({ data: buf }).promise;
    const pages=[];
    for(let p=1; p<=pdf.numPages; p++){
      const page = await pdf.getPage(p);
      const content = await page.getTextContent();
      const text = content.items.map(it => it.str || "").join(" ");
      pages.push(text);
    }
    rawText = pages.join("\n");
    statusEl.textContent = `PDF cargado: ${file.name}. Listo para generar preguntas.`;
    generateBtn.disabled = false;
  }catch(err){
    console.error(err);
    statusEl.textContent = "No se pudo leer el PDF. Prueba con otro archivo.";
  }
});

generateBtn.addEventListener("click", async ()=>{
  if(!rawText.trim()){ return; }
  const n = Math.max(4, Math.min(20, Number(numQuestionsEl.value)||8));
  statusEl.textContent = "Generando preguntas…";
  const viaLLM = await generateWithLLM(rawText, n);
  questions = viaLLM && viaLLM.length ? viaLLM : generateHeuristicQuiz(rawText, n);
  score=0; idx=0; selected=null;
  statusEl.textContent = "";
  resultsEl.classList.add("hidden");
  quizEl.classList.remove("hidden");
  renderQuestion();
});

function renderQuestion(){
  const q = questions[idx];
  pillEl.textContent = `💡 ${q.pill}`;
  questionEl.textContent = q.question;
  optionsEl.innerHTML = "";
  feedbackEl.textContent = "";
  checkBtn.disabled = true; nextBtn.disabled = true; selected=null;
  progressEl.textContent = `${idx+1}/${questions.length}`;
  q.options.forEach((opt, i)=>{
    const btn = document.createElement("button");
    btn.className = "option";
    btn.textContent = opt;
    btn.onclick = ()=>{
      [...optionsEl.children].forEach(b=>b.classList.remove("selected"));
      btn.classList.add("selected");
      selected = i; checkBtn.disabled = false;
    };
    optionsEl.appendChild(btn);
  });
}

checkBtn.addEventListener("click", ()=>{
  if(selected===null) return;
  const q = questions[idx];
  const children = [...optionsEl.children];
  children.forEach((btn, i)=>{
    if(i===q.correctIndex) btn.classList.add("correct");
    else if(i===selected) btn.classList.add("wrong");
    btn.disabled = true;
  });
  if(selected===q.correctIndex){
    feedbackEl.textContent = "✅ ¡Correcto!";
    score++;
  }else{
    feedbackEl.textContent = `❌ Incorrecto. Respuesta: ${q.options[q.correctIndex]}`;
  }
  nextBtn.disabled = false;
});

nextBtn.addEventListener("click", ()=>{
  if(idx < questions.length-1){
    idx++; renderQuestion();
  }else{
    quizEl.classList.add("hidden");
    resultsEl.classList.remove("hidden");
    scoreEl.textContent = `Aciertos: ${score}/${questions.length} (${Math.round(100*score/questions.length)}%)`;
  }
});

restartBtn.addEventListener("click", ()=>{
  resultsEl.classList.add("hidden");
  quizEl.classList.add("hidden");
  statusEl.textContent = "Sube un PDF para comenzar.";
});
