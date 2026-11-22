// No build or dependencies. Node 20.12+ supports --env-file=.env.local.
const http=require('node:http');
const fs=require('node:fs/promises');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const backend='https://pinmap-backend.vercel.app';
const apiMethods=new Map([['/api/auth/config','GET'],['/api/billing/config','GET'],['/api/billing/account','GET'],['/api/map-config','GET'],['/api/auth/test-login','POST'],['/api/content-save','GET'],['/api/content-photo','GET']]);
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.geojson':'application/geo+json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.woff2':'font/woff2'};
const server=http.createServer(async(req,res)=>{
  const url=new URL(req.url,'http://localhost');
  if(apiMethods.has(url.pathname)){
    if(req.method!==apiMethods.get(url.pathname)){res.writeHead(405);res.end();return;}
    try{
      const headers={};
      if(req.headers.authorization)headers.Authorization=req.headers.authorization;
      if(req.method==='POST')headers['Content-Type']='application/json';
      // The only POST proxy is fixed-account login; never forward client credentials.
      const response=await fetch(backend+url.pathname+url.search,{method:req.method,headers,...(req.method==='POST'?{body:'{}'}:{}),signal:AbortSignal.timeout(35000)});
      res.writeHead(response.status,{'Content-Type':response.headers.get('Content-Type')||'application/json; charset=utf-8','Cache-Control':'no-store'});
      res.end(Buffer.from(await response.arrayBuffer()));
    }catch{res.writeHead(502,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify({error:'서버 연결을 확인해 주세요.'}));}
    return;
  }
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return;}
  try{
    let pathname=decodeURIComponent(url.pathname);
    if(pathname.split('/').some(segment=>segment.startsWith('.'))||(pathname.startsWith('/api/')||pathname.startsWith('/archive/')))throw new Error();
    const file=await fs.realpath(path.join(root,pathname==='/'?'index.html':pathname));
    if(!file.startsWith(root+path.sep))throw new Error();
    const body=await fs.readFile(file);
    res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});
    res.end(req.method==='HEAD'?undefined:body);
  }catch{res.writeHead(404,{'Content-Type':'text/plain'});res.end('Not found');}
});
server.listen(Number(process.env.PINMAP_DEV_PORT)||8095,'127.0.0.1',()=>console.log('Pinmap preview: http://127.0.0.1:'+server.address().port));
