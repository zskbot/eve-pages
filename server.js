import http from "node:http";
import { readFile, writeFile, stat } from "node:fs/promises";
import path from "node:path";
import { URL } from "node:url";

const ROOT = path.resolve(process.env.WORKSPACE_ROOT || process.cwd());
const PORT = Number(process.env.PORT || 8080);
const AGENT_URL = (process.env.VELCLAW_AGENT_URL || "").replace(/\/$/, "");
const AGENT_TOKEN = process.env.VELCLAW_AGENT_TOKEN || "";
const MAX_BODY = 2 * 1024 * 1024;
const MIME = { ".html":"text/html; charset=utf-8", ".js":"text/javascript; charset=utf-8", ".css":"text/css; charset=utf-8", ".json":"application/json; charset=utf-8", ".svg":"image/svg+xml", ".gif":"image/gif", ".png":"image/png", ".jpg":"image/jpeg", ".ico":"image/x-icon", ".md":"text/markdown; charset=utf-8", ".txt":"text/plain; charset=utf-8" };

const json = (res, status, data) => { res.writeHead(status, { "content-type":"application/json; charset=utf-8", "cache-control":"no-store" }); res.end(JSON.stringify(data)); };
const readBody = async (req) => { let size=0, chunks=[]; for await (const chunk of req) { size += chunk.length; if (size > MAX_BODY) throw new Error("request body too large"); chunks.push(chunk); } return Buffer.concat(chunks).toString("utf8"); };
const safePath = (p) => { if (typeof p !== "string" || !p || p.includes("\\0")) throw new Error("invalid path"); const full=path.resolve(ROOT, p); if (full !== ROOT && !full.startsWith(ROOT + path.sep)) throw new Error("path escapes workspace"); return full; };
const listTree = async (dir, rel="") => { const entries = await stat(dir).then(async () => { const { readdir } = await import("node:fs/promises"); return readdir(dir, { withFileTypes:true }); }).catch(() => []); const out=[]; for (const e of entries) { if (e.name === ".git" || e.name === "node_modules") continue; const rp = rel ? `${rel}/${e.name}` : e.name; if (e.isDirectory()) out.push({ name:e.name, path:rp, type:"dir", children:await listTree(path.join(dir,e.name),rp) }); else out.push({ name:e.name, path:rp, type:"file" }); } return out; };

async function agentChat(body) {
  if (!AGENT_URL) return { ok:false, configured:false, error:"VELCLAW_AGENT_URL is not configured" };
  const headers = { "content-type":"application/json", accept:"application/json" };
  if (AGENT_TOKEN) headers.authorization = `Bearer ${AGENT_TOKEN}`;
  const r = await fetch(AGENT_URL, { method:"POST", headers, body:JSON.stringify(body), signal:AbortSignal.timeout(120000) });
  const text = await r.text();
  let data; try { data=JSON.parse(text); } catch { data={ response:text }; }
  if (!r.ok) return { ok:false, configured:true, status:r.status, error:data?.error || `agent returned ${r.status}`, data };
  return { ok:true, configured:true, data };
}

async function api(req, res, url) {
  if (url.pathname === "/api/workspace/file" && req.method === "GET") {
    const p=url.searchParams.get("path"); if (!p) return json(res,400,{error:"path is required"});
    try { const full=safePath(p); const s=await stat(full); if (!s.isFile()) return json(res,400,{error:"not a file"}); return json(res,200,{ok:true,path:p,content:await readFile(full,"utf8"),size:s.size,mtime:s.mtime.toISOString()}); } catch(e) { return json(res,404,{error:e.message}); }
  }
  if (url.pathname === "/api/workspace/file" && req.method === "POST") {
    try { const b=JSON.parse(await readBody(req)); const p=b.path; if (!p || typeof b.content !== "string") return json(res,400,{error:"path and string content are required"}); const full=safePath(p); const parent=path.dirname(full); const { mkdir }=await import("node:fs/promises"); await mkdir(parent,{recursive:true}); await writeFile(full,b.content,"utf8"); return json(res,200,{ok:true,path:p,mtime:(await stat(full)).mtime.toISOString()}); } catch(e) { return json(res,400,{error:e.message}); }
  }
  if (url.pathname === "/api/workspace/tree" && req.method === "GET") return json(res,200,{ok:true,root:ROOT,tree:await listTree(ROOT)});
  if (url.pathname === "/api/workspace/status" && req.method === "GET") {
    const s=await stat(ROOT); return json(res,200,{ok:true,workspace:ROOT,agent:{configured:Boolean(AGENT_URL),url:AGENT_URL ? new URL(AGENT_URL).origin : null},server:{pid:process.pid,node:process.version,uptime:process.uptime()},mtime:s.mtime.toISOString()});
  }
  if (url.pathname === "/api/agent/chat" && req.method === "POST") {
    try { const b=JSON.parse(await readBody(req)); if (!b.message || typeof b.message !== "string") return json(res,400,{error:"message is required"}); return json(res,200,await agentChat(b)); } catch(e) { return json(res,502,{ok:false,error:e.message}); }
  }
  if (url.pathname === "/api/health" && req.method === "GET") return json(res,200,{ok:true,service:"velclaw-workspace",agentConfigured:Boolean(AGENT_URL),time:new Date().toISOString()});
  return false;
}

const server=http.createServer(async (req,res)=>{
  try {
    const url=new URL(req.url,`http://${req.headers.host || "localhost"}`);
    if (url.pathname.startsWith("/api/")) { const handled=await api(req,res,url); if (handled !== false) return; return json(res,404,{error:"api route not found"}); }
    let p=decodeURIComponent(url.pathname); if (p === "/") p="/workspace.html";
    const full=safePath(p.replace(/^\//,"")); const s=await stat(full); if (!s.isFile()) return json(res,404,{error:"not found"});
    res.writeHead(200,{"content-type":MIME[path.extname(full).toLowerCase()] || "application/octet-stream","cache-control":"no-cache"}); res.end(await readFile(full));
  } catch(e) { if (!res.headersSent) json(res,404,{error:e.message}); else res.end(); }
});
server.listen(PORT,"0.0.0.0",()=>console.log(`Velclaw Workspace listening on http://0.0.0.0:${PORT}`));
