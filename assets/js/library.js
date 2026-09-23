const input = document.getElementById('fileInput');
const itemsEl = document.getElementById('items');
const empty = document.getElementById('empty');
const emptyTitle = document.getElementById('emptyTitle');
const emptyText = document.getElementById('emptyText');
const search = document.getElementById('search');
const sort = document.getElementById('sort');
const drop = document.getElementById('drop');
const toast = document.getElementById('toast');
const modal = document.getElementById('promptModal');
const previewModal = document.getElementById('previewModal');
const previewBody = document.getElementById('previewBody');
const promptTitle = document.getElementById('promptTitle');
const promptText = document.getElementById('promptText');
const savePromptBtn = document.getElementById('savePrompt');
const allCount = document.getElementById('allCount');
const fileCount = document.getElementById('fileCount');
const imageCount = document.getElementById('imageCount');
const promptCount = document.getElementById('promptCount');
const result = document.getElementById('result');
const heading = document.getElementById('heading');
const statAll = document.getElementById('statAll');
const statFiles = document.getElementById('statFiles');
const statImages = document.getElementById('statImages');
const statPrompts = document.getElementById('statPrompts');
const statStorage = document.getElementById('statStorage');
const storageFill = document.getElementById('storageFill');
const storageMeta = document.getElementById('storageMeta');
const starCount = document.getElementById('starCount');
const trashCount = document.getElementById('trashCount');
const emptyTrashBtn = document.getElementById('emptyTrash');
const folderBar = document.getElementById('folderBar');
const newFolderBtn = document.getElementById('newFolder');
const folderModal = document.getElementById('folderModal');
const closeFolder = document.getElementById('closeFolder');
const createFolderBtn = document.getElementById('createFolder');
const folderName = document.getElementById('folderName');
const selectModeBtn = document.getElementById('selectMode');
const smartOrganizeBtn = document.getElementById('smartOrganize');
const bulkBar = document.getElementById('bulkBar');
const selectedCount = document.getElementById('selectedCount');
const bulkStar = document.getElementById('bulkStar');
const bulkDelete = document.getElementById('bulkDelete');
const bulkDownload = document.getElementById('bulkDownload');
const cancelSelect = document.getElementById('cancelSelect');
const contextMenu = document.getElementById('contextMenu');

let data = [];
try {
  data = JSON.parse(localStorage.getItem('aiLibrary') || '[]');
  if (!Array.isArray(data)) data = [];
} catch (_) {
  data = [];
}
let trash = [];
try {
  trash = JSON.parse(localStorage.getItem('aiLibraryTrash') || '[]');
  if (!Array.isArray(trash)) trash = [];
} catch (_) {
  trash = [];
}

let filter = 'all';
let view = 'grid';
let activeFolder = 'all';
let selectMode = false;
const selected = new Set();
let contextId = null;
let folders = [];
try { folders = JSON.parse(localStorage.getItem('aiLibraryFolders') || '[]'); } catch (_) { folders = []; }
if (!Array.isArray(folders)) folders = [];
const DB_NAME = 'AICompanionLibraryDB';
const STORE_NAME = 'files';

function db() {
  return new Promise(function (resolve, reject) {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = function () {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = function () { resolve(request.result); };
    request.onerror = function () { reject(request.error); };
  });
}

async function putFile(id, file) {
  const database = await db();
  return new Promise(function (resolve, reject) {
    const request = database.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME).put(file, id);
    request.onsuccess = function () { resolve(); };
    request.onerror = function () { reject(request.error); };
  });
}

async function getFile(id) {
  const database = await db();
  return new Promise(function (resolve, reject) {
    const request = database.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(id);
    request.onsuccess = function () { resolve(request.result); };
    request.onerror = function () { reject(request.error); };
  });
}

async function delFile(id) {
  const database = await db();
  return new Promise(function (resolve, reject) {
    const request = database.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME).delete(id);
    request.onsuccess = function () { resolve(); };
    request.onerror = function () { reject(request.error); };
  });
}

async function clearFiles() {
  const database = await db();
  return new Promise(function (resolve, reject) {
    const request = database.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME).clear();
    request.onsuccess = function () { resolve(); };
    request.onerror = function () { reject(request.error); };
  });
}

function esc(value) {
  return String(value).replace(/[&<>"']/g, function (character) {
    const entities = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    };
    return entities[character];
  });
}

function save() {
  localStorage.setItem('aiLibrary', JSON.stringify(data));
}
function saveTrash() { localStorage.setItem('aiLibraryTrash', JSON.stringify(trash)); }
function trashSize() { return trash.reduce(function(sum, item){ return sum + (item.size || 0); }, 0); }
function moveToTrash(items) {
  const now = Date.now();
  items.forEach(function(item){
    trash.push(Object.assign({}, item, { deletedAt: now, previousFolderId: item.folderId || 'all' }));
  });
  saveTrash();
}
async function restoreFromTrash(id) {
  const item = trash.find(function(value){ return value.id === id; });
  if (!item) return false;
  const restored = Object.assign({}, item);
  delete restored.deletedAt;
  delete restored.previousFolderId;
  if (item.previousFolderId && item.previousFolderId !== 'all' && folders.some(function(f){ return f.id === item.previousFolderId; })) restored.folderId = item.previousFolderId;
  else if (item.previousFolderId === 'all') delete restored.folderId;
  data.push(restored);
  trash = trash.filter(function(value){ return value.id !== id; });
  save(); saveTrash();
  return true;
}
async function permanentlyDelete(id) {
  try { await delFile(id); } catch (_) {}
  trash = trash.filter(function(value){ return value.id !== id; });
  saveTrash();
}
async function cleanupTrash() {
  const cutoff = Date.now() - (30 * 24 * 60 * 60 * 1000);
  const expired = trash.filter(function(item){ return (item.deletedAt || 0) < cutoff; });
  if (!expired.length) return;
  for (const item of expired) { try { await delFile(item.id); } catch (_) {} }
  trash = trash.filter(function(item){ return (item.deletedAt || 0) >= cutoff; });
  saveTrash();
}
function saveFolders() { localStorage.setItem('aiLibraryFolders', JSON.stringify(folders)); }
function folderNameFor(id) {
  const folder = folders.find(function (f) { return f.id === id; });
  return folder ? folder.name : 'All items';
}
function renderFolders() {
  if (!folderBar) return;
  folderBar.innerHTML = '<button class="' + (activeFolder === 'all' ? 'active' : '') + '" data-folder="all">⌂ All files</button>' +
    folders.map(function (folder) {
      return '<button class="' + (activeFolder === folder.id ? 'active' : '') + '" data-folder="' + esc(folder.id) + '">📁 ' + esc(folder.name) + '</button>';
    }).join('');
  folderBar.querySelectorAll('[data-folder]').forEach(function (button) {
    button.onclick = function () {
      activeFolder = button.dataset.folder;
      renderFolders();
      cleanupTrash().then(render);
    };
  });
}

function sizeText(bytes) {
  if (bytes < 1048576) return Math.max(1, Math.round(bytes / 1024)) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
}

function notify(message) {
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(window.libraryToast);
  window.libraryToast = setTimeout(function () {
    toast.classList.remove('show');
  }, 2200);
}

function counts() {
  const files = data.filter(function (item) { return item.type === 'files'; }).length;
  const images = data.filter(function (item) { return item.type === 'images'; }).length;
  const prompts = data.filter(function (item) { return item.type === 'prompts'; }).length;
  const starred = data.filter(function (item) { return item.favorite; }).length;
  const storage = data.reduce(function (sum, item) { return sum + (item.size || 0); }, 0);
  [allCount, statAll].forEach(function (element) { element.textContent = data.length; });
  [fileCount, statFiles].forEach(function (element) { element.textContent = files; });
  [imageCount, statImages].forEach(function (element) { element.textContent = images; });
  [promptCount, statPrompts].forEach(function (element) { element.textContent = prompts; });
  if (starCount) starCount.textContent = starred;
  if (trashCount) trashCount.textContent = trash.length;
  if (statStorage) statStorage.textContent = sizeText(storage);
  if (storageFill) storageFill.style.width = Math.min(100, (storage / (100 * 1024 * 1024)) * 100) + '%';
  if (storageMeta) storageMeta.textContent = storage ? 'Local • ' + sizeText(storage) + ' used' : 'Stored on this device';
}

function sorted(list) {
  return list.slice().sort(function (a, b) {
    if (sort.value === 'name') return String(a.name).localeCompare(String(b.name));
    if (sort.value === 'size') return (b.size || 0) - (a.size || 0);
    if (sort.value === 'oldest') return (a.createdAt || 0) - (b.createdAt || 0);
    return (b.createdAt || 0) - (a.createdAt || 0);
  });
}

function itemMarkup(item) {
  const isTrash = filter === 'trash';
  const label = item.type === 'images' ? 'IMAGE' : item.type === 'prompts' ? 'PROMPT' : 'FILE';
  const action = item.type === 'prompts' ? 'View' : 'Open';
  const aiAction = item.type === 'prompts' ? 'Use prompt' : 'Ask AI';
  const favorite = item.favorite ? '★' : '☆';
  const checked = selected.has(item.id) ? ' checked' : '';
  const tags = (item.tags || []).slice(0,3).map(function(tag){ return '<span class="tag">#' + esc(tag) + '</span>'; }).join('');
  const favoriteClass = item.favorite ? ' is-favorite' : '';
  const preview = item.preview ? ' style="background-image:url(' + item.preview + ')"' : '';
  const icon = item.preview ? '' : (item.type === 'images' ? '▧' : item.type === 'prompts' ? '✦' : '▤');
  const trashMeta = isTrash ? '<div class="trash-meta">Deleted ' + esc(new Date(item.deletedAt || Date.now()).toLocaleDateString()) + ' • recoverable for 30 days</div>' : '';
  return '<article class="item' + (isTrash ? ' is-trash' : '') + '" data-item-id="' + esc(item.id) + '">' +
    '<div class="thumb ' + (item.type === 'images' ? 'image' : '') + '"' + preview + '>' +
      (selectMode ? '<label class="select-check"><input type="checkbox" data-select="' + esc(item.id) + '"' + checked + '><span></span></label>' : '') +
      '<span class="type-badge">' + label + '</span>' + (!isTrash ? '<button type="button" class="favorite' + favoriteClass + '" data-favorite="' + esc(item.id) + '" aria-label="Toggle favorite">' + favorite + '</button>' : '') + icon +
    '</div>' +
    '<div class="info"><div class="folder-label">' + esc(folderNameFor(item.folderId)) + '</div><div class="name" title="' + esc(item.name) + '">' + esc(item.name) + '</div>' +
      '<div class="meta">' + esc(item.meta || 'Library item') + '</div><div class="tags">' + tags + '</div>' + trashMeta + '</div>' +
    '<div class="actions">' + (isTrash ? '<button type="button" data-restore="' + esc(item.id) + '">Restore</button><button type="button" data-permanent="' + esc(item.id) + '">Delete forever</button>' : '<button type="button" data-ai="' + esc(item.id) + '">' + aiAction + '</button><button type="button" data-open="' + esc(item.id) + '">' + action + '</button><button type="button" data-del="' + esc(item.id) + '">Delete</button>') + '</div>' +
  '</article>';
}

async function render() {
  counts();
  renderFolders();
  if (bulkBar) {
    bulkBar.classList.toggle('show', selectMode);
    if (selectedCount) selectedCount.textContent = selected.size + ' selected';
  }
  const query = search.value.trim().toLowerCase();
  const source = filter === 'trash' ? trash : data;
  const shown = sorted(source.filter(function (item) {
    const matchesFilter = filter === 'trash' ? true : (filter === 'all' || (filter === 'starred' ? item.favorite === true : item.type === filter));
    const matchesFolder = filter === 'trash' ? true : (activeFolder === 'all' || item.folderId === activeFolder);
    const matchesQuery = String(item.name || '').toLowerCase().includes(query) || (item.tags || []).some(function (tag) { return String(tag).toLowerCase().includes(query); });
    return matchesFilter && matchesFolder && matchesQuery;
  }));

  result.textContent = shown.length + ' item' + (shown.length === 1 ? '' : 's');
  empty.classList.toggle('show', shown.length === 0);
  if (shown.length === 0) {
    emptyTitle.textContent = query ? 'No matching items' : filter === 'starred' ? 'Nothing starred yet' : filter === 'trash' ? 'Trash is empty' : 'Your library is ready';
    emptyText.textContent = query ? 'Try another search or clear the filter.' : filter === 'starred' ? 'Star important files and prompts to keep them close.' : filter === 'trash' ? 'Deleted items stay here for 30 days before automatic cleanup.' : 'Upload files or save a prompt to build your personal AI workspace.';
  }
  itemsEl.classList.toggle('list', view === 'list');
  itemsEl.innerHTML = shown.map(itemMarkup).join('');

  itemsEl.querySelectorAll('[data-del]').forEach(function (button) {
    button.onclick = async function () {
      const item = data.find(function (value) { return value.id === button.dataset.del; });
      if (!item) return;
      moveToTrash([item]);
      data = data.filter(function (value) { return value.id !== button.dataset.del; });
      save();
      await render();
      notify('Moved to Trash');
    };
  });
  itemsEl.querySelectorAll('[data-restore]').forEach(function(button){
    button.onclick = async function(){
      if (await restoreFromTrash(button.dataset.restore)) { await render(); notify('Restored to Library'); }
    };
  });
  itemsEl.querySelectorAll('[data-permanent]').forEach(function(button){
    button.onclick = async function(){
      if (!confirm('Permanently delete this item? This cannot be undone.')) return;
      await permanentlyDelete(button.dataset.permanent);
      await render();
      notify('Permanently deleted');
    };
  });

  itemsEl.querySelectorAll('[data-favorite]').forEach(function (button) {
    button.onclick = function (event) {
      event.stopPropagation();
      const item = data.find(function (value) { return value.id === button.dataset.favorite; });
      if (!item) return;
      item.favorite = !item.favorite;
      save();
      render();
      notify(item.favorite ? 'Added to Starred' : 'Removed from Starred');
    };
  });

  itemsEl.querySelectorAll('[data-select]').forEach(function (box) {
    box.onchange = function () {
      if (box.checked) selected.add(box.dataset.select); else selected.delete(box.dataset.select);
      if (selectedCount) selectedCount.textContent = selected.size + ' selected';
    };
  });
  itemsEl.querySelectorAll('.item').forEach(function (card) {
    card.oncontextmenu = function (event) {
      if (filter === 'trash') return;
      event.preventDefault();
      contextId = card.dataset.itemId;
      if (contextMenu) {
        contextMenu.hidden = false;
        contextMenu.style.left = Math.min(event.clientX, window.innerWidth - 190) + 'px';
        contextMenu.style.top = Math.min(event.clientY, window.innerHeight - 240) + 'px';
      }
    };
  });
  itemsEl.querySelectorAll('[data-ai]').forEach(function (button) {
    button.onclick = function (event) {
      event.stopPropagation();
      const item = data.find(function (value) { return value.id === button.dataset.ai; });
      if (!item) return;
      sessionStorage.setItem('aiCompanionLibraryContext', JSON.stringify({
        id: item.id, name: item.name, type: item.type, size: item.size || 0,
        meta: item.meta || '', tags: item.tags || [], folder: folderNameFor(item.folderId)
      }));
      location.href = '../index.html?libraryAsset=' + encodeURIComponent(item.id);
    };
  });

  itemsEl.querySelectorAll('[data-ai]').forEach(function (button) {
    button.onclick = function (event) {
      event.stopPropagation();
      const item = data.find(function (value) { return value.id === button.dataset.ai; });
      if (!item) return;
      sessionStorage.setItem('aiCompanionLibraryContext', JSON.stringify({
        id: item.id, name: item.name, type: item.type, size: item.size || 0,
        meta: item.meta || '', tags: item.tags || [], folder: folderNameFor(item.folderId)
      }));
      location.href = '../index.html?libraryAsset=' + encodeURIComponent(item.id);
    };
  });

  itemsEl.querySelectorAll('[data-open]').forEach(function (button) {
    button.onclick = function () { openItem(button.dataset.open); };
  });
}

async function openItem(id) {
  const item = data.find(function (value) { return value.id === id; });
  if (!item) return;
  let file;
  try { file = await getFile(id); } catch (_) { file = null; }
  if (!file) return notify('File is unavailable');

  if (item.type === 'prompts') {
    const text = await file.text();
    previewBody.innerHTML = '<p class="preview-title">' + esc(item.name) + '</p>' +
      '<p class="preview-meta">Saved prompt</p>' +
      '<div class="preview-text">' + esc(text) + '</div>';
    previewModal.classList.add('open');
    return;
  }

  const url = URL.createObjectURL(file);
  if (item.type === 'images') {
    previewBody.innerHTML = '<p class="preview-title">' + esc(item.name) + '</p>' +
      '<p class="preview-meta">' + esc(item.meta || 'Image') + '</p>' +
      '<img class="preview-image" alt="' + esc(item.name) + '">';
    const image = previewBody.querySelector('img');
    image.src = url;
    previewModal.classList.add('open');
    image.onload = function () { URL.revokeObjectURL(url); };
    return;
  }

  previewBody.innerHTML = '<p class="preview-title">' + esc(item.name) + '</p>' +
    '<p class="preview-meta">' + esc(item.meta || 'File') + '</p>' +
    '<div class="preview-text">This file is stored safely in your local Library.</div>' +
    '<div class="actions" style="padding:14px 0 0"><button type="button" id="downloadPreview">Download file</button></div>';
  previewModal.classList.add('open');
  previewBody.querySelector('#downloadPreview').onclick = function () {
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = item.name;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 3000);
  };
}

async function add(files) {
  const list = Array.from(files || []);
  if (!list.length) return;
  for (const file of list) {
    const id = crypto.randomUUID();
    await putFile(id, file);
    const isImage = file.type.startsWith('image/');
    const item = {
      id: id,
      name: file.name,
      type: isImage ? 'images' : 'files',
      size: file.size,
      createdAt: Date.now(),
      meta: sizeText(file.size) + ' • ' + new Date().toLocaleDateString()
    };
    if (isImage) {
      item.preview = await new Promise(function (resolve) {
        const reader = new FileReader();
        reader.onload = function () { resolve(reader.result); };
        reader.readAsDataURL(file);
      });
    }
    data.push(item);
  }
  save();
  await render();
  notify(list.length + ' item' + (list.length === 1 ? '' : 's') + ' added');
}

document.getElementById('uploadBtn').onclick = function () { input.click(); };
if (newFolderBtn) newFolderBtn.onclick = function () { folderName.value = ''; folderModal.classList.add('open'); folderName.focus(); };
if (closeFolder) closeFolder.onclick = function () { folderModal.classList.remove('open'); };
if (createFolderBtn) createFolderBtn.onclick = function () {
  const name = folderName.value.trim();
  if (!name) return notify('Enter a folder name');
  folders.push({ id: crypto.randomUUID(), name: name, createdAt: Date.now() });
  saveFolders(); folderModal.classList.remove('open'); renderFolders(); notify('Folder created');
};
if (selectModeBtn) selectModeBtn.onclick = function () { selectMode = !selectMode; if (!selectMode) selected.clear(); selectModeBtn.textContent = selectMode ? '✓ Selecting' : '☑ Select'; render(); };
if (cancelSelect) cancelSelect.onclick = function () { selectMode = false; selected.clear(); if (selectModeBtn) selectModeBtn.textContent = '☑ Select'; render(); };
if (bulkStar) bulkStar.onclick = function () {
  data.forEach(function(item){ if(selected.has(item.id)) item.favorite = true; }); save(); render(); notify('Selected items starred');
};
if (bulkDelete) bulkDelete.onclick = async function () {
  if (!selected.size || !confirm(filter === 'trash' ? 'Permanently delete selected trash items?' : 'Move selected library items to Trash?')) return;
  const ids = Array.from(selected);
  if (filter === 'trash') {
    for (const id of ids) await permanentlyDelete(id);
  } else {
    const moved = data.filter(function(item){ return selected.has(item.id); });
    moveToTrash(moved);
    data = data.filter(function(item){ return !selected.has(item.id); });
    save();
  }
  selected.clear(); await render(); notify(ids.length + (filter === 'trash' ? ' items permanently deleted' : ' items moved to Trash'));
};
if (bulkDownload) bulkDownload.onclick = async function () {
  const ids = Array.from(selected);
  if (!ids.length) return notify('Select items first');
  for (const id of ids) {
    const item = data.find(function(v){ return v.id === id; }); if (!item) continue;
    const file = await getFile(id); if (!file) continue;
    const url = URL.createObjectURL(file); const a = document.createElement('a');
    a.href = url; a.download = item.name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function(){ URL.revokeObjectURL(url); }, 2000);
  }
  notify(ids.length + ' download' + (ids.length === 1 ? '' : 's') + ' started');
}
if (smartOrganizeBtn) smartOrganizeBtn.onclick = function () {
  const map = { files: 'Documents', images: 'Images', prompts: 'Prompts' };
  let changed = 0;
  Object.keys(map).forEach(function(type) {
    let folder = folders.find(function(f){ return f.name.toLowerCase() === map[type].toLowerCase(); });
    if (!folder) { folder = { id: crypto.randomUUID(), name: map[type], createdAt: Date.now() }; folders.push(folder); }
    data.forEach(function(item){ if(item.type === type && item.folderId !== folder.id){ item.folderId = folder.id; changed++; } });
  });
  saveFolders(); save(); activeFolder = 'all'; renderFolders(); render(); notify(changed ? 'Library organized by type' : 'Library is already organized');
};
if (contextMenu) contextMenu.querySelectorAll('[data-context]').forEach(function(button){
  button.onclick = async function(){
    const item = data.find(function(v){ return v.id === contextId; });
    contextMenu.hidden = true; if (!item) return;
    const action = button.dataset.context;
    if(action === 'ai'){
      sessionStorage.setItem('aiCompanionLibraryContext', JSON.stringify({id:item.id,name:item.name,type:item.type,size:item.size||0,meta:item.meta||'',tags:item.tags||[],folder:folderNameFor(item.folderId)}));
      location.href = '../index.html?libraryAsset=' + encodeURIComponent(item.id);
      return;
    }
    if(action === 'open') return openItem(item.id);
    if(action === 'star'){ item.favorite = !item.favorite; save(); render(); return notify(item.favorite ? 'Added to Starred' : 'Removed from Starred'); }
    if(action === 'rename'){ const name = prompt('Rename item', item.name); if(name && name.trim()){ item.name = name.trim(); save(); render(); notify('Renamed'); } return; }
    if(action === 'copy'){ try { await navigator.clipboard.writeText(item.name); notify('Name copied'); } catch (_) { notify('Clipboard unavailable'); } return; }
    if(action === 'tag'){ const tag = prompt('Add a tag (without #)', (item.tags || []).join(', ')); if(tag !== null){ item.tags = tag.split(',').map(function(v){ return v.trim().replace(/^#/, ''); }).filter(Boolean).slice(0,8); save(); render(); notify('Tags updated'); } return; }
    if(action === 'delete'){ try { await delFile(item.id); } catch (_) {} data = data.filter(function(v){ return v.id !== item.id; }); save(); render(); notify('Removed from library'); }
  };
});
document.addEventListener('click', function(event){ if(contextMenu && !contextMenu.hidden && !contextMenu.contains(event.target)) contextMenu.hidden = true; });
const dropUpload = document.getElementById('dropUpload');
const emptyUpload = document.getElementById('emptyUpload');
if (dropUpload) dropUpload.onclick = function (event) { event.stopPropagation(); input.click(); };
if (emptyUpload) emptyUpload.onclick = function () { input.click(); };
drop.onclick = function () { input.click(); };
input.onchange = function () {
  if (input.files.length) add(input.files);
  input.value = '';
};
drop.ondragover = function (event) { event.preventDefault(); drop.classList.add('drag'); };
drop.ondragleave = function () { drop.classList.remove('drag'); };
drop.ondrop = function (event) {
  event.preventDefault();
  drop.classList.remove('drag');
  if (event.dataTransfer.files.length) add(event.dataTransfer.files);
};
search.oninput = render;
sort.onchange = render;
document.addEventListener('keydown', function (event) {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault();
    search.focus();
    search.select();
  }
});

document.querySelectorAll('nav button').forEach(function (button) {
  button.onclick = function () {
    document.querySelectorAll('nav button').forEach(function (navButton) { navButton.classList.remove('active'); });
    button.classList.add('active');
    filter = button.dataset.filter;
    heading.textContent = filter === 'all' ? 'All items' : filter === 'starred' ? 'Starred' : filter.charAt(0).toUpperCase() + filter.slice(1);
    render();
  };
});

document.querySelectorAll('.views button').forEach(function (button) {
  button.onclick = function () {
    document.querySelectorAll('.views button').forEach(function (viewButton) { viewButton.classList.remove('active'); });
    button.classList.add('active');
    view = button.dataset.view;
    render();
  };
});

document.getElementById('clear').onclick = async function () {
  if (!data.length || !confirm('Move all local library items to Trash?')) return;
  moveToTrash(data);
  data = [];
  save();
  activeFolder = 'all';
  filter = 'trash';
  document.querySelectorAll('nav button').forEach(function(navButton){ navButton.classList.toggle('active', navButton.dataset.filter === 'trash'); });
  heading.textContent = 'Trash';
  await render();
  notify('Library moved to Trash');
};
if (emptyTrashBtn) emptyTrashBtn.onclick = async function(){
  if (!trash.length || !confirm('Empty Trash permanently? This cannot be undone.')) return;
  const count = trash.length;
  for (const item of trash) { try { await delFile(item.id); } catch (_) {} }
  trash = [];
  saveTrash();
  filter = 'trash';
  await render();
  notify(count + ' items permanently deleted');
};

document.getElementById('savePromptOpen').onclick = function () {
  promptTitle.value = '';
  promptText.value = '';
  delete savePromptBtn.dataset.edit;
  modal.classList.add('open');
  promptTitle.focus();
};
document.getElementById('closePrompt').onclick = function () { modal.classList.remove('open'); };
document.getElementById('closePreview').onclick = function () {
  previewModal.classList.remove('open');
  previewBody.innerHTML = '';
};

savePromptBtn.onclick = async function () {
  const title = promptTitle.value.trim() || 'Untitled prompt';
  const text = promptText.value.trim();
  if (!text) return notify('Write a prompt first');
  const id = savePromptBtn.dataset.edit || crypto.randomUUID();
  await putFile(id, new Blob([text], { type: 'text/plain' }));
  const old = data.find(function (value) { return value.id === id; });
  if (old) {
    old.name = title;
    old.meta = 'Saved prompt • ' + new Date().toLocaleDateString();
    old.createdAt = Date.now();
    old.size = text.length;
  } else {
    data.push({ id: id, name: title, type: 'prompts', meta: 'Saved prompt • ' + new Date().toLocaleDateString(), createdAt: Date.now(), size: text.length });
  }
  save();
  modal.classList.remove('open');
  await render();
  notify('Prompt saved');
};

modal.onclick = function (event) {
  if (event.target === modal) modal.classList.remove('open');
};
previewModal.onclick = function (event) {
  if (event.target === previewModal) {
    previewModal.classList.remove('open');
    previewBody.innerHTML = '';
  }
};
document.addEventListener('keydown', function (event) {
  if (event.key === 'Escape') {
    if (contextMenu) contextMenu.hidden = true;
    modal.classList.remove('open');
    previewModal.classList.remove('open');
    previewBody.innerHTML = '';
  }
});

render();
