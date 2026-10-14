// Serve only this site's three existing public movie files, in seekable chunks.
const files = new Set([
 '1-OTa0ES7ZYRftKb5Z5FfU_HtRacXkQPR',
 '1gFKEmtw1mpIGN_MJvYB1Y8k3jeCOStog',
 '15rQCRnzoEcDPoPrsYWoi-wR2nID4tjAY'
]);
export default async (request) => {
 if (!['GET','HEAD'].includes(request.method)) return new Response('Method not allowed',{status:405});
 const id=new URL(request.url).searchParams.get('id');
 if(!files.has(id))return new Response('Video not found',{status:404});
 const range=request.headers.get('range')||'bytes=0-';
 const match=/^bytes=(\d+)-(\d*)$/.exec(range);
 if(!match)return new Response('Unsupported range',{status:416});
 const start=Number(match[1]),requestedEnd=match[2]?Number(match[2]):Infinity;
 if(!Number.isSafeInteger(start)||requestedEnd<start)return new Response('Invalid range',{status:416});
 const end=Math.min(requestedEnd,start+4*1024*1024-1);
 try{
  const upstream=await fetch(`https://drive.usercontent.google.com/download?id=${encodeURIComponent(id)}&export=download&confirm=t`,{headers:{Range:`bytes=${start}-${end}`},signal:AbortSignal.timeout(25000)});
  if(upstream.status===416)return new Response(null,{status:416,headers:{'Content-Range':upstream.headers.get('content-range')||'bytes */0'}});
  if(upstream.status!==206||!upstream.headers.get('content-type')?.startsWith('video/')){await upstream.body?.cancel();return new Response('Video source unavailable',{status:502})}
  const headers=new Headers({'Content-Type':'video/mp4','Accept-Ranges':'bytes','Cache-Control':'public, max-age=300','X-Content-Type-Options':'nosniff'});
  for(const key of ['Content-Length','Content-Range'])if(upstream.headers.has(key))headers.set(key,upstream.headers.get(key));
  if(request.method==='HEAD'){await upstream.body?.cancel();return new Response(null,{status:206,headers})}
  return new Response(upstream.body,{status:206,headers});
 }catch{return new Response('Video source temporarily unavailable',{status:502})}
};
