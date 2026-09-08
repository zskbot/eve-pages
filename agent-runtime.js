(()=>{
 const $=id=>document.getElementById(id);
 let running=false,sessionId=null;
 const inputs=()=>[$('builderPrompt'),$('chatInput')].filter(Boolean);
 const buttons=()=>[$('builderSendBtn'),$('sendBtn')].filter(Boolean);
 function activity(){return $('chatActivity')||(()=>{const x=document.createElement('div');x.id='chatActivity';x.className='chat-activity';const m=$('chatMessages');m?.parentElement?.insertBefore(x,m);return x})()}
 function addStep(kind,title,detail='',state='running'){const row=document.createElement('div');row.className=`agent-step ${state}`;row.dataset.kind=kind;row.innerHTML=`<span class="agent-step-dot"></span><div><b>${title}</b>${detail?`<small>${detail}</small>`:''}</div><span class="agent-step-state">${state==='done'?'✓':state==='error'?'!':'…'}</span>`;activity().appendChild(row);activity().scrollTop=activity().scrollHeight;return row}
 function finishStep(row,state,detail){if(!row)return;row.className=`agent-step ${state}`;const mark=row.querySelector('.agent-step-state');if(mark)mark.textContent=state==='done'?'✓':state==='error'?'!':'…';if(detail){let s=row.querySelector('small');if(!s){s=document.createElement('small');row.querySelector('div').appendChild(s)}s.textContent=detail}}
 function mirror(role,text){if(window.appendMessage)window.appendMessage(role,text);const bm=$('builderMessages');if(bm&&role){const row=document.createElement('div');row.className=`msg-row ${role}`;const av=document.createElement('div');av.className='avatar';av.textContent=role==='user'?'U':'V';const b=document.createElement('div');b.className=`bubble ${role}`;b.textContent=text;row.append(av,b);bm.appendChild(row);bm.scrollTop=bm.scrollHeight}}
 function parseEvent(ev){if(!ev)return;let type=ev.type||ev.event||ev.kind||'message';let data=ev.data??ev;try{if(typeof data==='string')data=JSON.parse(data)}catch{};
  if(type==='tool_call'||type==='tool'||type==='command'){const name=data.name||data.tool||'run_command';const detail=data.command||data.input||data.args||'';addStep('tool',name,typeof detail==='string'?detail:JSON.stringify(detail));return}
  if(type==='tool_result'||type==='command_result'){const steps=[...activity().querySelectorAll('.agent-step.running')];finishStep(steps.at(-1),'done',String(data.output||data.result||'Completed').slice(0,180));return}
  if(type==='file_write'||type==='file_edit'||type==='edit'||type==='patch'){addStep('edit','Editing code',data.path||data.file||'workspace');return}
  if(type==='runtime'||type==='run'){addStep('run','Running project',data.command||data.url||'runtime');return}
  if(type==='test'||type==='ci'){addStep('test','Testing changes',data.command||data.status||'validation');return}
  if(type==='preview'){addStep('preview','Preview updated',data.url||'live preview');return}
  if(type==='reasoning'||type==='thinking'){addStep('think','Working',data.text||data.message||'Analyzing next action');return}
  if(type==='done'||type==='complete'){[...activity().querySelectorAll('.agent-step.running')].forEach(s=>finishStep(s,'done'));running=false;return}
  if(type==='error'){[...activity().querySelectorAll('.agent-step.running')].forEach(s=>finishStep(s,'error',data.message||data.error||'Agent error'));running=false;return}
  const text=data.text||data.message||data.response||data.output;if(text)mirror('agent',text)
 }
 async function run(text){if(!text||running)return;running=true;sessionId=sessionId||crypto.randomUUID();inputs().forEach(i=>i.value='');buttons().forEach(b=>b.disabled=true);mirror('user',text);activity().innerHTML='';addStep('plan','Planning','Inspecting requirements and workspace');
  try{const r=await fetch('/api/agent/run',{method:'POST',headers:{'content-type':'application/json','accept':'text/event-stream, application/json'},body:JSON.stringify({message:text,path:window.activePath||null,model:window.DATA?.dashboard?.models?.[0]||null,sessionId,mode:'build',workflow:['plan','inspect','edit','run','test','fix','review','preview']})});
   if(!r.ok)throw new Error((await r.text())||`HTTP ${r.status}`);const ct=r.headers.get('content-type')||'';
   if(ct.includes('text/event-stream')&&r.body){const reader=r.body.getReader(),dec=new TextDecoder();let buf='';while(true){const {done,value}=await reader.read();if(done)break;buf+=dec.decode(value,{stream:true});const chunks=buf.split(/\n\n/);buf=chunks.pop()||'';for(const chunk of chunks){const line=chunk.split('\n').find(x=>x.startsWith('data:'));if(line){try{parseEvent(JSON.parse(line.slice(5).trim()))}catch{}}}}}
   else{const j=await r.json();const d=j.data||j;for(const e of d.events||[])parseEvent(e);const answer=d.response||d.message||d.output||d.assistant?.text;if(answer)mirror('agent',answer)}
   [...activity().querySelectorAll('.agent-step.running')].forEach(s=>finishStep(s,'done'));
  }catch(e){[...activity().querySelectorAll('.agent-step.running')].forEach(s=>finishStep(s,'error',e.message));mirror('agent',`Build error: ${e.message}`)}finally{running=false;buttons().forEach(b=>b.disabled=false);const ready=inputs().some(i=>i.value.trim());buttons().forEach(b=>b.disabled=!ready)}
 }
 function boot(){const bp=$('builderPrompt'),bs=$('builderSendBtn'),ci=$('chatInput'),cs=$('sendBtn');if(bp&&bs){bs.disabled=!bp.value.trim();bp.oninput=()=>bs.disabled=!bp.value.trim();bp.onkeydown=e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();run(bp.value.trim())}};bs.onclick=()=>run(bp.value.trim())}if(ci&&cs){cs.disabled=!ci.value.trim();ci.oninput=()=>cs.disabled=!ci.value.trim();ci.onkeydown=e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();run(ci.value.trim())}};cs.onclick=()=>run(ci.value.trim())}}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
