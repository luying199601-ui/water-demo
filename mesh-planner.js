/* Map interaction and preview meshes. These are NOT validated solver grids. */
(function(global){
'use strict';
const D=Math.PI/180,K=111.195,$=id=>document.getElementById(id);
const S={globe:null,canvas:null,ctx:null,hit:null,mode:null,point:null,type:null,region:null,draw:false,start:null,drag:null,step:2,width:160,cross:4,rivers:[],riverLines:[],riverCount:0,gridCount:0,nx:0,ny:0,status:'',source:null,loading:false,version:0,onchange:null};
const fmt=n=>Number(n.toFixed(2));
const W=r=>(r.e-r.w)*K*Math.cos((r.n+r.s)/2*D);
const H=r=>(r.n-r.s)*K;
const dk=(p,q)=>Math.hypot((q.lng-p.lng)*K*Math.cos((p.lat+q.lat)/2*D),(q.lat-p.lat)*K);
const inside=(p,r)=>p.lat>=r.s&&p.lat<=r.n&&p.lng>=r.w&&p.lng<=r.e;
function status(){const r=S.region;return {type:S.type,mode:S.mode,ready:!!r&&(S.type!=='river'||S.riverLines.length>0),loading:S.loading,source:S.source,region:r?{...r}:null,widthKm:r?fmt(W(r)):0,heightKm:r?fmt(H(r)):0,areaKm2:r?fmt(W(r)*H(r)):0,cols:S.nx,rows:S.ny,cells:S.gridCount,riverSections:S.riverCount,resolutionKm:S.step,widthM:S.width,crossCount:S.cross,status:S.status,drawing:S.draw};}
function refresh(){paint();if(S.onchange)S.onchange(status());}
function rect(p,q){if(!p||!q)return null;const r={s:Math.min(p.lat,q.lat),n:Math.max(p.lat,q.lat),w:Math.min(p.lng,q.lng),e:Math.max(p.lng,q.lng)};return r.n-r.s>.001&&r.e-r.w>.001&&r.e-r.w<10?r:null;}
function defaultRect(p,size){const a=size/(2*K),b=size/(2*K*Math.max(.25,Math.cos(p.lat*D)));return {s:p.lat-a,n:p.lat+a,w:p.lng-b,e:p.lng+b};}
function calculate(){if(!S.region){S.nx=0;S.ny=0;S.gridCount=0;return;}S.nx=Math.max(1,Math.ceil(W(S.region)/S.step));S.ny=Math.max(1,Math.ceil(H(S.region)/S.step));S.gridCount=S.nx*S.ny;}
function screen(lat,lng){const p=S.globe&&S.globe.getScreenCoords(lat,lng,.018);return p&&Number.isFinite(p.x)&&Number.isFinite(p.y)?p:null;}
function path(coords,color,width){if(!S.ctx||coords.length<2)return;const ctx=S.ctx;ctx.beginPath();let started=false;for(const p of coords){const v=screen(p[0],p[1]);if(!v){started=false;continue;}if(!started){ctx.moveTo(v.x,v.y);started=true;}else ctx.lineTo(v.x,v.y);}ctx.lineWidth=width;ctx.strokeStyle=color;ctx.stroke();}
function paint(){
 if(!S.globe||!S.ctx)return;
 const map=$('map'),canvas=S.canvas,w=map.clientWidth,h=map.clientHeight;
 if(!w||!h)return;const ratio=Math.min(2,global.devicePixelRatio||1);
 if(canvas.width!==Math.round(w*ratio)||canvas.height!==Math.round(h*ratio)){canvas.width=Math.round(w*ratio);canvas.height=Math.round(h*ratio);canvas.style.width=w+'px';canvas.style.height=h+'px';}
 const ctx=S.ctx;ctx.setTransform(ratio,0,0,ratio,0,0);ctx.clearRect(0,0,w,h);
 if(!S.region)return;
 const r=S.region;path([[r.s,r.w],[r.n,r.w],[r.n,r.e],[r.s,r.e],[r.s,r.w]],'#fba85f',2.5);
 if(!S.drag){
   if(S.type==='river'){for(const line of S.riverLines)path(line,'rgba(67,239,244,.82)',1.0);}
   else{
     const nx=Math.min(42,S.nx),ny=Math.min(42,S.ny);
     for(let i=0;i<=nx;i++){const x=r.w+(r.e-r.w)*i/Math.max(1,nx);path([[r.s,x],[r.n,x]],'rgba(59,230,246,.65)',.75);}
     for(let j=0;j<=ny;j++){const y=r.s+(r.n-r.s)*j/Math.max(1,ny);path([[y,r.w],[y,r.e]],'rgba(59,230,246,.65)',.75);}
   }
 }
 const v=screen(r.n,r.w);if(v&&!S.drag){const label=fmt(W(r))+' × '+fmt(H(r))+' km';ctx.font='12px sans-serif';const tw=ctx.measureText(label).width,x=Math.max(10,Math.min(w-tw-20,v.x)),y=Math.max(24,Math.min(h-12,v.y-10));ctx.fillStyle='rgba(6,24,43,.85)';ctx.fillRect(x-5,y-14,tw+10,19);ctx.fillStyle='#e4fcff';ctx.fillText(label,x,y);}
}
function where(evt){const b=$('map').getBoundingClientRect();return S.globe.toGlobeCoords(evt.clientX-b.left,evt.clientY-b.top);}
function down(evt){if(!S.draw)return;const p=where(evt);if(!p)return;evt.preventDefault();S.start=p;S.drag=p;if(S.hit.setPointerCapture)S.hit.setPointerCapture(evt.pointerId);}
function move(evt){if(!S.start)return;const p=where(evt);if(!p)return;S.drag=p;S.region=rect(S.start,p);if(S.type!=='river')calculate();paint();}
function up(evt){if(!S.start)return;const p=where(evt)||S.drag;S.region=rect(S.start,p);S.start=null;S.drag=null;S.draw=false;S.hit.style.pointerEvents='none';if(!S.region){S.status='区域太小，请重新框选';refresh();return;}S.status='已确定模拟区域';if(S.type==='river')getRivers();else{calculate();refresh();}}
function attach(globe){
 S.globe=globe;const map=$('map-container');
 S.canvas=document.createElement('canvas');S.canvas.className='mesh-canvas';S.ctx=S.canvas.getContext('2d');map.appendChild(S.canvas);
 S.hit=document.createElement('div');S.hit.className='mesh-hit';S.hit.style.pointerEvents='none';map.appendChild(S.hit);
 for(const [name,fn] of [['pointerdown',down],['pointermove',move],['pointerup',up],['pointercancel',up]])S.hit.addEventListener(name,fn);
 const controls=globe.controls&&globe.controls();if(controls&&controls.addEventListener)controls.addEventListener('change',paint);
 global.addEventListener('resize',paint);
 paint();
}
function cancel(){S.draw=false;S.start=null;S.drag=null;if(S.hit)S.hit.style.pointerEvents='none';refresh();}
function clear(){S.version++;cancel();S.region=null;S.source=null;S.rivers=[];S.riverLines=[];S.gridCount=0;S.riverCount=0;S.nx=0;S.ny=0;S.loading=false;}
function activate(p,mode){
 const old=S.point&&S.mode===mode&&p&&Math.abs(S.point.lat-p.lat)<1e-8&&Math.abs(S.point.lng-p.lng)<1e-8;
 if(old)return status();
 clear();S.point=p?{...p}:null;S.mode=mode;S.type=['fine','fast'].includes(mode)?'preset':['riverSimple','riverFast'].includes(mode)?'river':['oceanEuler','oceanLagrange'].includes(mode)?'ocean':null;
 if(S.type==='preset'&&p){S.region=defaultRect(p,18);S.step=1.5;S.source='illustrative';S.status='厂址网格仅为示意：未接入厂址实际网格文件。';calculate();}
 else if(S.type==='ocean'){S.step=2;S.status='点击“框选矩形”并在地球上拖动鼠标确定模拟区域。';}
 else if(S.type==='river'){S.step=400;S.width=160;S.cross=4;S.status='框选河段，系统将尝试读取 OSM 河网中心线并生成河道导向网格预览。';}
 refresh();return status();
}
function drawBegin(){if(!S.hit)return;S.draw=true;S.status='在地球上按住鼠标拖动绘制矩形';S.hit.style.pointerEvents='auto';refresh();}
function initial(){if(!S.point)return;cancel();S.region=defaultRect(S.point,S.type==='river'?12:20);S.source=S.type==='preset'?'illustrative':'generated';if(S.type==='river')getRivers();else {calculate();S.status='已生成以选点为中心的矩形模拟区域';refresh();}}
function resolution(v){v=Number(v);if(!Number.isFinite(v)||v<.05||v>100)return;S.step=v;if(S.type!=='river')calculate();refresh();}
function riverParams(along,width,cross){along=Number(along);width=Number(width);cross=Number(cross);if(!(along>=50&&along<=10000&&width>=10&&width<=10000&&cross>=1&&cross<=20))return;S.step=along;S.width=width;S.cross=Math.floor(cross);if(S.rivers.length)meshRiver();else refresh();}
function crossSection(p,q,t,offset){
 const lat=p.lat+(q.lat-p.lat)*t,lng=p.lng+(q.lng-p.lng)*t,cl=Math.max(.25,Math.cos(lat*D)),east=(q.lng-p.lng)*cl,north=q.lat-p.lat,len=Math.hypot(east,north)||1;
 return [lat+(east/len)*(offset/1000/K),lng-(north/len)*(offset/1000/K/cl)];
}
function meshRiver(){
 const lines=[];let sections=0,cells=0;
 for(const way of S.rivers)for(let i=1;i<way.length;i++){
   const a=way[i-1],b=way[i],distance=dk(a,b);
   if(!distance||distance>20)continue;
   const n=Math.max(1,Math.min(100,Math.ceil(distance*1000/S.step)));
   let last=null;
   for(let k=0;k<=n;k++){
     const t=k/n,pos={lat:a.lat+(b.lat-a.lat)*t,lng:a.lng+(b.lng-a.lng)*t};
     if(!inside(pos,S.region)){last=null;continue;}
     const row=Array.from({length:S.cross+1},(_,j)=>crossSection(a,b,t,(j/S.cross-.5)*S.width));
     if(lines.length<1200)lines.push(row);
     if(last){for(let j=0;j<row.length;j++)if(lines.length<1200)lines.push([last[j],row[j]]);cells+=S.cross;}
     last=row;sections++;
   }
 }
 S.riverLines=lines;S.gridCount=cells;S.riverCount=sections;S.loading=false;S.source=S.source==='imported'?'imported':'osm';
 S.status=sections
   ?'已根据'+(S.source==='imported'?'导入的河网':'OSM 河网')+'中心线生成网格预览；河宽由用户设置，未考虑真实河道岸线和水深。'
   :'框选范围内未找到可用于离散的河道中心线。';
 refresh();
}
async function getRivers(){
 if(S.type!=='river'||!S.region)return;
 const r=S.region;
 if(W(r)*H(r)>5000||r.n-r.s>1||r.e-r.w>1.2){S.status='范围超过河网在线查询上限（约 5000 km²）；请缩小框选区域。';S.loading=false;S.riverLines=[];S.gridCount=0;refresh();return;}
 const req=++S.version;S.loading=true;S.source=null;S.riverLines=[];S.gridCount=0;S.status='正在获取 OpenStreetMap 河网…';refresh();
 const bbox=[r.s,r.w,r.n,r.e].map(x=>x.toFixed(6)).join(',');
 const q='[out:json][timeout:20];way["waterway"~"^(river|stream|canal)$"]('+bbox+');out geom 250;';
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),24000);
 try{
   const res=await fetch('https://overpass-api.de/api/interpreter',{method:'POST',body:'data='+encodeURIComponent(q),headers:{'Content-Type':'application/x-www-form-urlencoded'},signal:controller.signal});
   if(!res.ok)throw Error(String(res.status));const data=await res.json();if(req!==S.version)return;
   S.rivers=(data.elements||[]).filter(x=>Array.isArray(x.geometry)&&x.geometry.length>=2).map(x=>x.geometry.map(p=>({lat:p.lat,lng:p.lon})));
   if(S.rivers.length)meshRiver();else {S.loading=false;S.status='OSM 未返回可用的河道中心线；请调整区域或接入其他河网数据。';refresh();}
 }catch(error){if(req!==S.version)return;S.loading=false;S.status='河网查询失败或超时。请缩小范围后重试（外部 Overpass 服务可能不稳定）。';refresh();}
 finally{clearTimeout(timeout);}
}
function importRiverGeoJSON(json){
 if(S.type!=='river'||!S.region)return {ok:false,error:'请先选择河流模式并确定模拟区域'};
 const features=json&&json.type==='FeatureCollection'?json.features:[json];
 const rows=[];
 for(const feature of features){
   const g=feature&&feature.type==='Feature'?feature.geometry:feature;
   if(!g)continue;
   const chains=g.type==='LineString'?[g.coordinates]:g.type==='MultiLineString'?g.coordinates:[];
   for(const chain of chains){
     if(!Array.isArray(chain)||chain.length<2)continue;
     const way=chain.map(p=>({lat:Number(p[1]),lng:Number(p[0])})).filter(p=>Number.isFinite(p.lat)&&Number.isFinite(p.lng));
     if(way.length>=2)rows.push(way);
   }
 }
 if(!rows.length)return {ok:false,error:'GeoJSON 文件没有 LineString 或 MultiLineString 河道中心线'};
 ++S.version;S.rivers=rows;S.source='imported';meshRiver();
 return {ok:true,ways:rows.length};
}
function onchange(fn){S.onchange=fn;}
global.MeshPlanner={attach,activate,drawBegin,cancel,initial,resolution,riverParams,getRivers,importRiverGeoJSON,clear,paint,status,onchange};
})(window);
