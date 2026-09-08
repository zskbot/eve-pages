// ---------------------------------------------------------------------------
// Velclaw Workspace — standalone client
// ---------------------------------------------------------------------------

let DATA = null;
let activePath = null;
let dirty = false;
let statusTimer = null;

const ICON_DIR = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h5l2 2h9v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z"/></svg>`;
const ICON_DIR_OPEN = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h5l2 2h9v3H2V6a2 2 0 0 1 2-2Z"/><path d="M2 9h20l-2 11H4Z"/></svg>`;
const ICON_FILE = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`;
const ICON_CHEVRON_R = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>`;
const ICON_CHEVRON_D = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>`;
const ICON_USER = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;
const ICON_BOT = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/><path d="M12 7v4"/><line x1="8" y1="16" x2="8" y2="16"/><line x1="16" y1="16" x2="16" y2="16"/></svg>`;
const ICON_CHECK = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`;
const ICON_X = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`;

init();

async function api(path, options = {}) {
  const res = await fetch(path, { ...options, headers: { "content-type": "application/json", ...(options.headers || {}) } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

async function init() {
  try {
    DATA = await api("data.json");
  } catch {
    DATA = { fileTree: [], fileContents: {}, chat: { initialMessages: [] }, dashboard: { deployStatus: { label: "Unknown" }, tools: [], connections: [], models: [], logs: [] } };
  }
  setupTabs();
  setupFilesPanel();
  setupChatPanel();
  setupDashboardPanel();
  refreshWorkspaceStatus();
  statusTimer = setInterval(refreshWorkspaceStatus, 30000);
}

function setupTabs() {
  const navBtns = document.querySelectorAll(".nav-btn");
  navBtns.forEach((btn) => btn.addEventListener("click", () => {
    navBtns.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    document.querySelectorAll(".panel").forEach((p) => p.classList.remove("active"));
    document.getElementById(`panel-${btn.dataset.tab}`).classList.add("active");
  }));
}

function setupFilesPanel() {
  const drawer = document.getElementById("drawerOverlay");
  const codeArea = document.getElementById("codeArea");
  const saveBtn = document.getElementById("saveBtn");
  const fileTitle = document.getElementById("fileTitle");

  document.getElementById("openDrawerBtn").addEventListener("click", () => drawer.classList.add("open"));
  document.getElementById("closeDrawerBtn").addEventListener("click", () => drawer.classList.remove("open"));
  document.getElementById("drawerBackdrop").addEventListener("click", () => drawer.classList.remove("open"));

  codeArea.addEventListener("input", () => {
    dirty = true;
    saveBtn.disabled = false;
    fileTitle.innerHTML = `${escapeHtml(activePath || "")} <span class="dirty-dot">•</span>`;
  });

  saveBtn.addEventListener("click", async () => {
    if (!activePath) return;
    saveBtn.disabled = true;
    try {
      await api("/api/workspace/file", { method: "POST", body: JSON.stringify({ path: activePath, content: codeArea.value }) });
      dirty = false;
      fileTitle.textContent = activePath;
      appendLog(`Saved ${activePath}`);
    } catch (e) {
      dirty = true;
      saveBtn.disabled = false;
      appendLog(`Save failed: ${e.message}`, true);
    }
  });

  renderTree(DATA.fileTree || [], document.getElementById("fileTree"), 0);
  const first = findFirstFile(DATA.fileTree || []);
  if (first) selectFile(first);
}

function findFirstFile(nodes) {
  for (const n of nodes) {
    if (n.type === "file") return n.path;
    if (n.children) { const f = findFirstFile(n.children); if (f) return f; }
  }
  return null;
}

function renderTree(nodes, container, depth) {
  nodes.forEach((node) => {
    const li = document.createElement("li");
    if (node.type === "dir") {
      const btn = document.createElement("button");
      btn.className = "tree-dir-btn";
      btn.style.paddingLeft = `${8 + depth * 14}px`;
      let open = depth === 0;
      const childUl = document.createElement("ul");
      renderTree(node.children || [], childUl, depth + 1);
      childUl.style.display = open ? "block" : "none";
      const paint = () => { btn.innerHTML = `${open ? ICON_CHEVRON_D : ICON_CHEVRON_R}${open ? ICON_DIR_OPEN : ICON_DIR}<span>${escapeHtml(node.name)}</span>`; };
      paint();
      btn.addEventListener("click", () => { open = !open; childUl.style.display = open ? "block" : "none"; paint(); });
      li.appendChild(btn); li.appendChild(childUl);
    } else {
      const btn = document.createElement("button");
      btn.className = "tree-file-btn";
      btn.dataset.path = node.path;
      btn.style.paddingLeft = `${8 + depth * 14}px`;
      btn.innerHTML = `${ICON_FILE}<span>${escapeHtml(node.name)}</span>`;
      btn.addEventListener("click", () => { selectFile(node.path); document.getElementById("drawerOverlay").classList.remove("open"); });
      li.appendChild(btn);
    }
    container.appendChild(li);
  });
}

async function selectFile(path) {
  if (dirty && !confirm("File chưa lưu. Mở file khác và bỏ thay đổi?")) return;
  activePath = path;
  dirty = false;
  document.getElementById("fileTitle").textContent = path;
  document.getElementById("saveBtn").disabled = true;
  const area = document.getElementById("codeArea");
  area.value = "Loading…";
  try {
    const result = await api(`/api/workspace/file?path=${encodeURIComponent(path)}`);
    area.value = result.content;
  } catch {
    area.value = (DATA.fileContents && DATA.fileContents[path]) || "// File not available\n";
  }
  document.querySelectorAll(".tree-file-btn").forEach((b) => b.classList.toggle("active", b.dataset.path === path));
}

function setupChatPanel() {
  const messagesEl = document.getElementById("chatMessages");
  const input = document.getElementById("chatInput");
  const sendBtn = document.getElementById("sendBtn");
  (DATA.chat?.initialMessages || []).forEach((m) => appendMessage(messagesEl, m.role, m.text));
  input.addEventListener("input", () => { sendBtn.disabled = input.value.trim().length === 0; });
  input.addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } });
  sendBtn.addEventListener("click", send);

  async function send() {
    const text = input.value.trim(); if (!text) return;
    appendMessage(messagesEl, "user", text); input.value = ""; sendBtn.disabled = true;
    const typing = document.createElement("div"); typing.className = "typing"; typing.innerHTML = `${ICON_BOT}<span>Velclaw đang xử lý…</span>`; messagesEl.appendChild(typing); messagesEl.scrollTop = messagesEl.scrollHeight;
    try {
      const result = await api("/api/agent/chat", { method:"POST", body:JSON.stringify({ message:text, path:activePath, model:document.getElementById("modelSelect")?.value || undefined }) });
      typing.remove();
      const payload = result.data || result;
      const answer = payload.response || payload.message || payload.output || payload.content || (result.configured === false ? "Agent chưa được cấu hình. Đặt VELCLAW_AGENT_URL cho server." : JSON.stringify(payload));
      appendMessage(messagesEl, "agent", answer);
    } catch (e) { typing.remove(); appendMessage(messagesEl, "agent", `Lỗi agent: ${e.message}`); }
    finally { sendBtn.disabled = input.value.trim().length === 0; }
  }
}

function appendMessage(container, role, text) {
  const row = document.createElement("div"); row.className = `msg-row ${role}`;
  const avatar = document.createElement("div"); avatar.className = `avatar ${role}`; avatar.innerHTML = role === "user" ? ICON_USER : ICON_BOT;
  const bubble = document.createElement("div"); bubble.className = `bubble ${role}`; bubble.textContent = text;
  row.appendChild(avatar); row.appendChild(bubble); container.appendChild(row); container.scrollTop = container.scrollHeight;
}

function setupDashboardPanel() {
  const d = DATA.dashboard || {};
  document.getElementById("deployStatus").textContent = d.deployStatus?.label || "Checking…";
  const toolsList = document.getElementById("toolsList"); (d.tools || []).forEach((t) => toolsList.appendChild(statusRow(t.name, t.status)));
  const connList = document.getElementById("connectionsList"); (d.connections || []).forEach((c) => connList.appendChild(statusRow(c.name, c.status)));
  const modelSelect = document.getElementById("modelSelect"); (d.models || []).forEach((m) => { const opt=document.createElement("option"); opt.value=m; opt.textContent=m; modelSelect.appendChild(opt); });
  document.getElementById("editInstructionsBtn").addEventListener("click", () => { document.querySelector('.nav-btn[data-tab="files"]').click(); selectFile("agent/instructions.md"); });
  const logsList = document.getElementById("logsList"); (d.logs || []).forEach((l) => appendDashboardLog(logsList, l.text, l.level === "error", l.time));
}

async function refreshWorkspaceStatus() {
  try {
    const s = await api("/api/workspace/status");
    const label = document.getElementById("deployStatus");
    if (label) label.textContent = s.agent?.configured ? "Velclaw Agent connected" : "Workspace online · Agent not configured";
    const status = document.querySelector(".chat-header .status");
    if (status) { status.textContent = s.agent?.configured ? "● connected" : "● offline"; status.style.color = s.agent?.configured ? "var(--teal)" : "var(--text-dim)"; }
  } catch {
    const label = document.getElementById("deployStatus"); if (label) label.textContent = "Backend offline";
  }
}

function appendDashboardLog(container, text, error=false, time=new Date().toLocaleTimeString()) {
  const row=document.createElement("div"); row.className=`log-row ${error ? "error" : ""}`; const t=document.createElement("span"); t.className="time"; t.textContent=time; const x=document.createElement("span"); x.className="text"; x.textContent=text; row.append(t,x); container.appendChild(row);
}
function appendLog(text,error=false) { const el=document.getElementById("logsList"); if (el) appendDashboardLog(el,text,error); }
function statusRow(name,status) { const active=status === "active"; const row=document.createElement("div"); row.className=`status-row ${active ? "active" : ""}`; row.innerHTML=`<span class="name">${escapeHtml(name)}</span>${active ? ICON_CHECK : ICON_X}`; return row; }
function escapeHtml(value) { return String(value).replace(/[&<>'"]/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;","\"":"&quot;"}[c])); }
