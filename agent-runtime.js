(()=>{
 const $=id=>document.getElementById(id);
 let running=false,sessionId=null;
 const inputs=()=>[$('builderPrompt'),$('chatInput')].filter(Boolean);
 const buttons=()=>[$('builderSendBtn'),$('sendBtn')].filter(Boolean);
 function workspace(){
  let w=$('buildWorkspace');
  if(w)return w;
  w=document.createElement('section');w.id='buildWorkspace';w.className='build-workspace';w.setAttribute('aria-label','Build workspace');
  w.innerHTML=`<header class="build-workspace-head"><div><button id="buildBackBtn" class="build-back" type="button">← Builder</button><span class="build-title" id="buildTitle">New build</span></div><div class="build-state" id="buildState">● generating</div></header><div class="build-workspace-body"><section class="build-chat"><div class="build-chat-head"><strong>Velclaw Agent</strong><span id="buildChatStatus">working</span></div><div class="build-chat-messages" id="buildMessages"></div><div class="build-composer"><textarea id="buildInput" rows="1" placeholder="Ask Velclaw to change the app…"></textarea><button id="buildSend" class="send-btn" type="button" disabled>↑</button></div></section><section class="build-preview"><div class="preview-head"><strong>Preview</strong><span id="previewStatus">Waiting for runtime</span></div><div class="preview-frame" id="previewFrame"><div class="preview-empty"><b>Preview will appear here</b><span>Velclaw will start the runtime and attach the live preview when the agent reports a URL.</span></div></div></section></div>`;
  $('panel-builder')?.appendChild(w);
  $('buildBackBtn').onclick=()=>{w.classList.remove('active');$('panel-builder')?.classList.remove('building')};
  const bi=$('buildInput'),bs=$('buildSend');bi.oninput=()=>bs.disabled=!bi.value.trim()||running;bi.onkeydown=e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();run(bi.value.trim())}};bs.onclick=()=>run(bi.value.trim());
  return w;
 }
 function showWorkspace(text){const w=workspace();w.classList.add('active');$('panel-builder')?.classList.add('building');$('buildTitle').textContent=text.length>46?text.slice(0,46)+'…':text;$('buildState').textContent='● generating';$('buildChatStatus').textContent='working';$('previewStatus').textContent='Waiting for runtime';$('buildMessages').innerHTML='';$('previewFrame').innerHTML='<div class="preview-empty"><b>Building your project…</b><span>The agent is planning, editing files and running validation.</span></div>';return w}
 function activity(){return $('buildActivity')||(()=>{const x=document.createElement('div');x.id='buildActivity';x.className='chat-activity';const m=$('buildMessages');m?.appendChild(x);return x})()}
 function addStep(kind,title,detail='',state='running'){const row=document.createElement('div');row.className=`agent-step ${state}`;row.dataset.kind=kind;row.innerHTML=`<span class="agent-step-dot"></span><div><b>${title}</b>${detail?`<small>${detail}</small>`:''}</div><span class="agent-step-state">${state==='done'?'✓':state==='error'?'!':'…'}</span>`;activity().appendChild(row);activity().scrollTop=activity().scrollHeight;return row}
 function finishStep(row,state,detail){if(!row)return;row.className=`agent-step ${state}`;const mark=row.querySelector('.agent-step-state');if(mark)mark.textContent=state==='done'?'✓':state==='error'?'!':'…';if(detail){let s=row.querySelector('small');if(!s){s=document.createElement('small');row.querySelector('div').appendChild(s)}s.textContent=detail}}
 function mirror(role,text){
  const bm=$('buildMessages');if(bm){const row=document.createElement('div');row.className=`msg-row ${role}`;const av=document.createElement('div');av.className='avatar';av.textContent=role==='user'?'U':'V';const b=document.createElement('div');b.className=`bubble ${role}`;b.textContent=text;row.append(av,b);bm.appendChild(row);bm.scrollTop=bm.scrollHeight}
  const legacy=$('builderMessages');if(legacy){const row=document.createElement('div');row.className=`msg-row ${role}`;const av=document.createElement('div');av.className='avatar';av.textContent=role==='user'?'U':'V';const b=document.createElement('div');b.className=`bubble ${role}`;b.textContent=text;row.append(av,b);legacy.appendChild(row);legacy.scrollTop=legacy.scrollHeight}
  if(window.appendMessage)window.appendMessage(role,text);
 }
 function setPreview(url){if(!url)return;const frame=$('previewFrame');if(frame){frame.innerHTML=`<iframe title="Velclaw live preview" src="${String(url).replace(/"/g,'&quot;')}" loading="eager"></iframe>`}$('previewStatus').textContent='Live preview';}
 function parseEvent(ev){if(!ev)return;let type=ev.type||ev.event||ev.kind||'message';let data=ev.data??ev;try{if(typeof data==='string')data=JSON.parse(data)}catch{};
  if(type==='tool_call'||type==='tool'||type==='command'){const name=data.name||data.tool||'run_command';const detail=data.command||data.input||data.args||'';addStep('tool',name,typeof detail==='string'?detail:JSON.stringify(detail));return}
  if(type==='tool_result'||type==='command_result'){const steps=[...activity().querySelectorAll('.agent-step.running')];finishStep(steps.at(-1),'done',String(data.output||data.result||'Completed').slice(0,180));return}
  if(type==='file_write'||type==='file_edit'||type==='edit'||type==='patch'){addStep('edit','Editing code',data.path||data.file||'workspace');return}
  if(type==='runtime'||type==='run'){addStep('run','Running project',data.command||data.url||'runtime');if(data.url)setPreview(data.url);return}
  if(type==='test'||type==='ci'){addStep('test','Testing changes',data.command||data.status||'validation');return}
  if(type==='preview'){addStep('preview','Preview updated',data.url||'live preview');if(data.url)setPreview(data.url);return}
  if(type==='reasoning'||type==='thinking'){addStep('think','Working',data.text||data.message||'Analyzing next action');return}
  if(type==='done'||type==='complete'){[...activity().querySelectorAll('.agent-step.running')].forEach(s=>finishStep(s,'done'));$('buildState').textContent='● ready';$('buildChatStatus').textContent='complete';running=false;return}
  if(type==='error'){[...activity().querySelectorAll('.agent-step.running')].forEach(s=>finishStep(s,'error',data.message||data.error||'Agent error'));$('buildState').textContent='● error';$('buildChatStatus').textContent='failed';running=false;return}
  const text=data.text||data.message||data.response||data.output;if(text)mirror('agent',text)
 }
 async function run(text){if(!text||running)return;running=true;sessionId=sessionId||crypto.randomUUID();showWorkspace(text);inputs().forEach(i=>i.value='');buttons().forEach(b=>b.disabled=true);mirror('user',text);activity().innerHTML='';addStep('plan','Planning','Inspecting requirements and workspace');
  try{const r=await fetch('/api/agent/run',{method:'POST',headers:{'content-type':'application/json','accept':'text/event-stream, application/json'},body:JSON.stringify({message:text,path:window.activePath||null,model:window.DATA?.dashboard?.models?.[0]||null,sessionId,mode:'build',workflow:['plan','inspect','edit','run','test','fix','review','preview']})});
   if(!r.ok)throw new Error((await r.text())||`HTTP ${r.status}`);const ct=r.headers.get('content-type')||'';
   if(ct.includes('text/event-stream')&&r.body){const reader=r.body.getReader(),dec=new TextDecoder();let buf='';while(true){const {done,value}=await reader.read();if(done)break;buf+=dec.decode(value,{stream:true});const chunks=buf.split(/\n\n/);buf=chunks.pop()||'';for(const chunk of chunks){const line=chunk.split('\n').find(x=>x.startsWith('data:'));if(line){try{parseEvent(JSON.parse(line.slice(5).trim()))}catch{}}}}}
   else{const j=await r.json();const d=j.data||j;for(const e of d.events||[])parseEvent(e);const answer=d.response||d.message||d.output||d.assistant?.text;if(answer)mirror('agent',answer)}
   [...activity().querySelectorAll('.agent-step.running')].forEach(s=>finishStep(s,'done'));if($('buildState')?.textContent.includes('generating')){$('buildState').textContent='● ready';$('buildChatStatus').textContent='complete'}
  }catch(e){[...activity().querySelectorAll('.agent-step.running')].forEach(s=>finishStep(s,'error',e.message));$('buildState').textContent='● error';$('buildChatStatus').textContent='failed';mirror('agent',`Build error: ${e.message}`)}finally{running=false;buttons().forEach(b=>b.disabled=false);const ready=inputs().some(i=>i.value.trim());buttons().forEach(b=>b.disabled=!ready)}
 }
 function boot(){const bp=$('builderPrompt'),bs=$('builderSendBtn'),ci=$('chatInput'),cs=$('sendBtn');if(bp&&bs){bs.disabled=!bp.value.trim();bp.oninput=()=>bs.disabled=!bp.value.trim();bp.onkeydown=e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();run(bp.value.trim())}};bs.onclick=()=>run(bp.value.trim())}if(ci&&cs){cs.disabled=!ci.value.trim();ci.oninput=()=>cs.disabled=!ci.value.trim();ci.onkeydown=e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();run(ci.value.trim())}};cs.onclick=()=>run(ci.value.trim())}}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
