export default async function handler(req,res){
 if(req.method==='OPTIONS')return res.status(204).end();
 if(req.method!=='POST')return res.status(405).json({ok:false,error:'method not allowed'});
 const agentUrl=(process.env.VELCLAW_AGENT_URL||'').replace(/\/$/,'');
 if(!agentUrl)return res.status(503).json({ok:false,configured:false,error:'VELCLAW_AGENT_URL is not configured'});
 try{
  const headers={'content-type':'application/json','accept':'text/event-stream, application/json'};
  if(process.env.VELCLAW_AGENT_TOKEN)headers.authorization=`Bearer ${process.env.VELCLAW_AGENT_TOKEN}`;
  headers['x-velclaw-agent-mode']='build';
  const body={...(req.body||{}),mode:'build',capabilities:{tool_calls:true,filesystem:true,terminal:true,preview:true,ci:true}};
  const upstream=await fetch(agentUrl,{method:'POST',headers,body:JSON.stringify(body),signal:AbortSignal.timeout(120000)});
  const contentType=upstream.headers.get('content-type')||'';
  if(contentType.includes('text/event-stream')&&upstream.body){
   res.status(upstream.status);res.setHeader('content-type','text/event-stream; charset=utf-8');res.setHeader('cache-control','no-cache, no-transform');res.setHeader('connection','keep-alive');
   const reader=upstream.body.getReader();
   try{while(true){const {done,value}=await reader.read();if(done)break;res.write(Buffer.from(value));}}finally{res.end();}
   return;
  }
  const text=await upstream.text();let data;try{data=JSON.parse(text)}catch{data={response:text}};
  return res.status(upstream.status).json({ok:upstream.ok,configured:true,data:upstream.ok?data:undefined,error:upstream.ok?undefined:(data?.error||`agent returned ${upstream.status}`)});
 }catch(e){return res.status(502).json({ok:false,configured:true,error:e.message})}
}
