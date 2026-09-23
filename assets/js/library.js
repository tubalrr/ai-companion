const input=document.getElementById("fileInput");
const itemsEl=document.getElementById("items");
const empty=document.getElementById("empty");
const emptyTitle=document.getElementById("emptyTitle");
const emptyText=document.getElementById("emptyText");
const search=document.getElementById("search");
const sort=document.getElementById("sort");
const drop=document.getElementById("drop");
const toast=document.getElementById("toast");
const modal=document.getElementById("promptModal");
const previewModal=document.getElementById("previewModal");
const previewBody=document.getElementById("previewBody");
const promptTitle=document.getElementById("promptTitle");
const promptText=document.getElementById("promptText");
const savePromptBtn=document.getElementById("savePrompt");
const allCount=document.getElementById("allCount");
const fileCount=document.getElementById("fileCount");
const imageCount=document.getElementById("imageCount");
const promptCount=document.getElementById("promptCount");
const result=document.getElementById("result");
const heading=document.getElementById("heading");
const statAll=document.getElementById("statAll");
const statFiles=document.getElementById("statFiles");
const statImages=document.getElementById("statImages");
const statPrompts=document.getElementById("statPrompts");

let data=[];
try{data=JSON.parse(localStorage.getItem("aiLibrary")||"[]")}catch(e){data=[]}
let filter="all",view="grid";
const DB="AICompanionLibraryDB",STORE="files";

function db(){
 return new Promise((res,rej)=>{
  const r=indexedDB.open(DB,1);
  r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains(STORE))r.result.createObjectStore(STORE)};
  r.onsuccess=()=>res(r.result); r.onerror=()=>rej(r.error);
 });
}
async function putFile(id,file){
 const d=await db(); return new Promise((res,rej)=>{
  const r=d.transaction(STORE,"readwrite").objectStore(STORE).put(file,id);
  r.onsuccess=()=>res(); r.onerror=()=>rej(r.error);
 });
}
async function getFile(id){
 const d=await db(); return new Promise((res,rej)=>{
  const r=d.transaction(STORE,"readonly").objectStore(STORE).get(id);
  r.onsuccess=()=>res(r.result); r.onerror=()=>rej(r.error);
 });
}
async function delFile(id){
 const d=await db(); return new Promise(res=>{
  const r=d.transaction(STORE,"readwrite").objectStore(STORE).delete(id);
  r.onsuccess=()=>res();
 });
}
async function clearFiles(){
 const d=await db(); return new Promise(res=>{
  const r=d.transaction(STORE,"readwrite").objectStore(STORE).clear(); r.onsuccess=()=>res();
 });
}
const esc=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const save=()=>localStorage.setItem("aiLibrary",JSON.stringify(data));
const sizeText=n=>n<1048576?Math.max(1,Math.round(n/1024))+" KB":(n/1048576).toFixed(1)+" MB";
const notify=s=>{toast.textContent=s;toast.classList.add("show");clearTimeout(window.libraryToast);window.libraryToast=setTimeout(()=>toast.classList.remove("show"),2200)};

function counts(){
 const files=data.filter(x=>x.type==="files").length;
 const images=data.filter(x=>x.type==="images").length;
 const prompts=data.filter(x=>x.type==="prompts").length;
 [allCount,statAll].forEach(e=>e.textContent=data.length);
 [fileCount,statFiles].forEach(e=>e.textContent=files);
 [imageCount,statImages].forEach(e=>e.textContent=images);
 [promptCount,statPrompts].forEach(e=>e.textContent=prompts);
}

function sorted(list){
 return [...list].sort((a,b)=>{
  if(sort.value==="name")return a.name.localeCompare(b.name);
  if(sort.value==="size")return (b.size||0)-(a.size||0);
  if(sort.value==="oldest")return (a.createdAt||0)-(b.createdAt||0);
  return (b.createdAt||0)-(a.createdAt||0);
 });
}

async function render(){
 counts();
 const q=search.value.trim().toLowerCase();
 const shown=sorted(data.filter(x=>(filter==="all"||x.type===filter)&&x.name.toLowerCase().includes(q)));
 result.textContent=shown.length+" item"+(shown.length===1?"":"s");
 empty.classList.toggle("show",shown.length===0);
 if(shown.length===0){
  emptyTitle.textContent=q?"No matching items":"Your library is empty";
  emptyText.textContent=q?"Try another search or clear the filter.":"Upload something to start building your library.";
 }
 itemsEl.classList.toggle("list",view==="list");
 itemsEl.innerHTML=shown.map(x=>{
  const label=x.type==="images"?"IMAGE":x.type==="prompts"?"PROMPT":"FILE";
  const action=x.type==="prompts"?"View":"Open";
  return '<article class="item">'+
   '<div class="thumb '+(x.type==="images"?"image":"")+'" '+(x.preview?'style="background-image:url('+x.preview+')"':'')+'>'+
   '<span class="type-badge">'+label+"</span>"+
   (!x.preview?(x.type==="images"?"▧":x.type==="prompts"?"✦":"▤"):"")+
   "</div>"+
   '<div class="info"><div class="name" title="'+esc(x.name)+'">'+esc(x.name)+'</div><div class="meta">'+esc(x.meta||"Library item")+"</div></div>"+
   '<div class="actions"><button data-open="'+x.id+'">'+action+'</button><button data-del="'+x.id+'">Delete</button></div>"+
   "</article>";
 }).join("");
 itemsEl.querySelectorAll("[data-del]").forEach(b=>b.onclick=async()=>{
  const x=data.find(v=>v.id===b.dataset.del);
  if(!x)return;
  if(x.type!=="prompts")await delFile(x.id);
  data=data.filter(v=>v.id!==b.dataset.del); save(); render(); notify("Removed from library");
 });
 itemsEl.querySelectorAll("[data-open]").forEach(b=>b.onclick=()=>openItem(b.dataset.open));
}

async function openItem(id){
 const x=data.find(v=>v.id===id); if(!x)return;
 const f=await getFile(id); if(!f)return notify("File is unavailable");
 if(x.type==="prompts"){
  const text=await f.text();
  previewBody.innerHTML='<p class="preview-title">'+esc(x.name)+'</p><p class="preview-meta">Saved prompt</p><div class="preview-text">'+esc(text)+'</div>';
  previewModal.classList.add("open"); return;
 }
 if(x.type==="images"){
  const url=URL.createObjectURL(f);
  previewBody.innerHTML='<p class="preview-title">'+esc(x.name)+'</p><p class="preview-meta">'+esc(x.meta||"Image")+'</p><img class="preview-image" alt="'+esc(x.name)+'">';
  const img=previewBody.querySelector("img"); img.src=url;
  previewModal.classList.add("open");
  img.onload=()=>URL.revokeObjectURL(url); return;
 }
 const url=URL.createObjectURL(f);
 previewBody.innerHTML='<p class="preview-title">'+esc(x.name)+'</p><p class="preview-meta">'+esc(x.meta||"File")+'</p><div class="preview-text">This file is stored safely in your local Library.</div><div class="actions" style="padding:14px 0 0"><button id="downloadPreview">Download file</button></div>';
 previewModal.classList.add("open");
 previewBody.querySelector("#downloadPreview").onclick=()=>{
  const a=document.createElement("a");a.href=url;a.download=x.name;document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),3000);
 };
}

async function add(files){
 const list=[...files]; if(!list.length)return;
 for(const f of list){
  const id=crypto.randomUUID();
  await putFile(id,f);
  const isImage=f.type.startsWith("image/");
  const x={id,name:f.name,type:isImage?"images":"files",size:f.size,createdAt:Date.now(),meta:sizeText(f.size)+" • "+new Date().toLocaleDateString()};
  if(isImage){
   const r=new FileReader();
   x.preview=await new Promise(resolve=>{r.onload=()=>resolve(r.result);r.readAsDataURL(f)});
  }
  data.push(x);
 }
 save(); render(); notify(list.length+" item"+(list.length===1?"":"s")+" added");
}

document.getElementById("uploadBtn").onclick=()=>input.click();
drop.onclick=()=>input.click();
input.onchange=()=>{if(input.files.length)add(input.files);input.value=""};
drop.ondragover=e=>{e.preventDefault();drop.classList.add("drag")};
drop.ondragleave=()=>drop.classList.remove("drag");
drop.ondrop=e=>{e.preventDefault();drop.classList.remove("drag");if(e.dataTransfer.files.length)add(e.dataTransfer.files)};
search.oninput=render;
sort.onchange=render;

document.querySelectorAll("nav button").forEach(b=>b.onclick=()=>{
 document.querySelectorAll("nav button").forEach(x=>x.classList.remove("active"));
 b.classList.add("active"); filter=b.dataset.filter;
 heading.textContent=b.dataset.filter==="all"?"All items":b.dataset.filter.charAt(0).toUpperCase()+b.dataset.filter.slice(1);
 render();
});
document.querySelectorAll(".views button").forEach(b=>b.onclick=()=>{
 document.querySelectorAll(".views button").forEach(x=>x.classList.remove("active"));
 b.classList.add("active");view=b.dataset.view;render();
});

document.getElementById("clear").onclick=async()=>{
 if(data.length&&confirm("Clear all local library items?")){
  data=[];save();await clearFiles();render();notify("Library cleared");
 }
};

document.getElementById("savePromptOpen").onclick=()=>{
 promptTitle.value="";promptText.value="";delete savePromptBtn.dataset.edit;modal.classList.add("open");promptTitle.focus();
};
document.getElementById("closePrompt").onclick=()=>modal.classList.remove("open");
document.getElementById("closePreview").onclick=()=>{previewModal.classList.remove("open");previewBody.innerHTML=""};
savePromptBtn.onclick=async()=>{
 const title=promptTitle.value.trim()||"Untitled prompt",text=promptText.value.trim();
 if(!text)return notify("Write a prompt first");
 const id=savePromptBtn.dataset.edit||crypto.randomUUID();
 await putFile(id,new Blob([text],{type:"text/plain"}));
 const old=data.find(v=>v.id===id);
 if(old){old.name=title;old.meta="Saved prompt • "+new Date().toLocaleDateString();old.createdAt=Date.now();old.size=text.length}
 else data.push({id,name:title,type:"prompts",meta:"Saved prompt • "+new Date().toLocaleDateString(),createdAt:Date.now(),size:text.length});
 save();modal.classList.remove("open");render();notify("Prompt saved");
};
modal.onclick=e=>{if(e.target===modal)modal.classList.remove("open")};
previewModal.onclick=e=>{if(e.target===previewModal){previewModal.classList.remove("open");previewBody.innerHTML=""}};
document.addEventListener("keydown",e=>{
 if(e.key==="Escape"){modal.classList.remove("open");previewModal.classList.remove("open");previewBody.innerHTML=""}
});
render();