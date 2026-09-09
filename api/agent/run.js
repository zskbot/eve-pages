export default async function handler(req,res){
 if(req.method==='OPTIONS')return res.status(204).end();
 const agentUrl=(process.env.VELCLAW_AGENT_URL||'').replace(/\/$/,'');
 if(!agentUrl)return res.status(503).json({ok:false,configured:false,error:'VELCLAW_AGENT_URL is not configured'});
 const taskId=new URL(req.url,'http://localhost').searchParams.get('taskId');
 const action=new URL(req.url,'http://localhost').searchParams.get('action');
 try{
  const headers={'content-type':'application/json','accept':'text/event-stream, application/json'};
  if(process.env.VELCLAW_AGENT_TOKEN)headers.authorization=`Bearer ${process.env.VELCLAW_AGENT_TOKEN}`;
  if(req.headers.cookie)headers.cookie=req.headers.cookie;
  headers['x-velclaw-agent-mode']='build';

  if(req.method==='GET'){
   const target=taskId?`${agentUrl}/${encodeURIComponent(taskId)}`:`${agentUrl}${new URL(req.url,'http://localhost').search}`;
   const upstream=await fetch(target,{method:'GET',headers,signal:AbortSignal.timeout(120000)});
   const text=await upstream.text();let data;try{data=JSON.parse(text)}catch{data={response:text}};
   return res.status(upstream.status).json({ok:upstream.ok,configured:true,data:upstream.ok?data:undefined,task:data?.task,error:upstream.ok?undefined:(data?.error||`agent returned ${upstream.status}`)});
  }

  if(req.method==='DELETE'){
   if(!taskId)return res.status(400).json({ok:false,error:'taskId is required'});
   const upstream=await fetch(`${agentUrl}/${encodeURIComponent(taskId)}`,{method:'PATCH',headers,body:JSON.stringify({action:action||'stop'}),signal:AbortSignal.timeout(120000)});
   const text=await upstream.text();let data;try{data=JSON.parse(text)}catch{data={response:text}};
   return res.status(upstream.status).json({ok:upstream.ok,configured:true,data:upstream.ok?data:undefined,task:data?.task,error:upstream.ok?undefined:(data?.error||`agent returned ${upstream.status}`)});
  }

  if(req.method!=='POST')return res.status(405).json({ok:false,error:'method not allowed'});
  const body={...(req.body||{}),mode:'build',capabilities:{tool_calls:true,filesystem:true,terminal:true,runtime:true,preview:true,ci:true,git:true}};
  const upstream=await fetch(agentUrl,{method:'POST',headers,body:JSON.stringify(body),signal:AbortSignal.timeout(120000)});
  const contentType=upstream.headers.get('content-type')||'';
  if(contentType.includes('text/event-stream')&&upstream.body){
   res.status(upstream.status);res.setHeader('content-type','text/event-stream; charset=utf-8');res.setHeader('cache-control','no-cache, no-transform');res.setHeader('connection','keep-alive');
   const reader=upstream.body.getReader();
   try{while(true){const {done,value}=await reader.read();if(done)break;res.write(Buffer.from(value));}}finally{res.end();}
   return;
  }
  const text=await upstream.text();let data;try{data=JSON.parse(text)}catch{data={response:text}};
  const task=data?.task||data?.data?.task;
  return res.status(upstream.status).json({ok:upstream.ok,configured:true,data:upstream.ok?data:undefined,task,taskId:task?.id||data?.taskId||data?.data?.taskId,error:upstream.ok?undefined:(data?.error||`agent returned ${upstream.status}`)});
 }catch(e){return res.status(502).json({ok:false,configured:true,error:e.message})}
}
