/* Animated ocean visualization — conceptual illustration, NOT observed/forecast currents. */
(function(global){
'use strict';
const GYRES=[
  [31,-155,43,22,1,.65],[34,-42,28,19,1,.56],
  [-27,-115,43,21,-1,.57],[-27,-19,31,19,-1,.54],
  [-26,74,42,22,-1,.59],[34,161,22,18,1,.32]
];
const LIMITS={low:110,medium:245,high:370};
const state={globe:null,polygons:null,enabled:true,playing:true,density:'medium',ready:false,count:0};
const rad=x=>x*Math.PI/180;
const wrap=x=>((x+180)%360+360)%360-180;
const noise=x=>{const v=Math.sin(x*127.1+19.87)*43758.545;return v-Math.floor(v);};
function indexLand(g){
  if(!g)return [];
  return (g.type==='MultiPolygon'?g.coordinates:[g.coordinates]).filter(p=>p.length).map(rings=>{
    const ys=rings[0].map(c=>c[1]),xs=rings[0].map(c=>c[0]);
    return {rings,a:Math.min(...ys),b:Math.max(...ys),c:Math.min(...xs),d:Math.max(...xs)};
  });
}
function inRing(r,lat,lng){
  let inside=false;
  for(let i=0,j=r.length-1;i<r.length;j=i++){
    const p=r[i],q=r[j];
    if((p[1]>lat)!==(q[1]>lat)&&lng<(q[0]-p[0])*(lat-p[1])/(q[1]-p[1])+p[0])inside=!inside;
  }
  return inside;
}
function isOcean(lat,lng){
  if(!state.polygons)return false;
  for(const poly of state.polygons){
    if(lat<poly.a||lat>poly.b||lng<poly.c||lng>poly.d)continue;
    if(!inRing(poly.rings[0],lat,lng))continue;
    let hole=false;
    for(let i=1;i<poly.rings.length;i++)if(inRing(poly.rings[i],lat,lng)){hole=true;break;}
    if(!hole)return false;
  }
  return true;
}
// Synthetic directional patterns provide interface context only, not geophysical predictions.
function field(lat,lng){
  const phi=rad(lat),abs=Math.abs(lat);
  let u=-.66*Math.max(0,1-abs/18)+.19*Math.cos(rad(lat*2.1));
  let v=.07*Math.sin(rad(lng*2.7+lat*1.2));
  for(const [clat,clon,rx,ry,sign,amp] of GYRES){
    const dx=wrap(lng-clon)*Math.cos(phi)/rx,dy=(lat-clat)/ry;
    const w=amp*Math.exp(-1.6*(dx*dx+dy*dy));
    u+=sign*dy*w;v-=sign*dx*w;
  }
  if(abs>48)u+=(lat<0?-.34:.12)*Math.exp(-Math.pow((abs-57)/12,2));
  return {u,v,speed:Math.hypot(u,v)};
}
function makeLine(lat,lng,key){
  const points=[[lat,lng]],count=13+Math.floor(noise(key+303)*8);
  for(let j=0;j<count;j++){
    const f=field(lat,lng);
    if(f.speed<.065)break;
    const step=.7+.23*noise(key+456);
    const ny=lat+(f.v/f.speed)*step;
    const nx=lng+(f.u/f.speed)*step/Math.max(.36,Math.cos(rad(lat)));
    if(ny>69||ny< -69||nx>177||nx< -177)break;
    if(!isOcean((lat+ny)/2,(lng+nx)/2)||!isOcean(ny,nx))break;
    points.push([ny,nx]);lat=ny;lng=nx;
  }
  return points.length>=7?points:null;
}
function lines(){
  const seeds=[];
  for(let lat=-65;lat<=65;lat+=5.5)for(let lng=-174;lng<=174;lng+=6.5){
    const key=Math.round((lat+70)*31)+Math.round((lng+180)*17);
    const a=lat+(noise(key+101)-.5)*4.5,b=lng+(noise(key+202)-.5)*5.5;
    if(a>67||a< -67||b>176||b< -176||!isOcean(a,b))continue;
    seeds.push({a,b,key,priority:noise(key+909)+(.16*(Math.abs(a)<38))});
  }
  seeds.sort((a,b)=>b.priority-a.priority);
  const out=[],limit=LIMITS[state.density],max=Math.min(seeds.length,Math.ceil(limit*3.6));
  for(let i=0;i<max&&out.length<limit;i++){
    const s=seeds[i],points=makeLine(s.a,s.b,s.key);
    if(!points)continue;
    const strength=Math.min(1,field(s.a,s.b).speed/1.1);
    out.push({points,strength,id:s.key,time:6600+Math.round(noise(s.key+10)*4600),phase:noise(s.key+20)*.18});
  }
  return out;
}
function status(text){
  const label=document.getElementById('flow-status');
  const count=document.getElementById('flow-count');
  const play=document.getElementById('flow-play');
  if(label)label.textContent=text||'全球海洋表层 · 概念演示';
  if(count)count.textContent=state.count+' 条演示流线';
  if(play){play.innerHTML=state.playing?'<i class="fas fa-pause"></i> 暂停动画':'<i class="fas fa-play"></i> 继续播放';play.setAttribute('aria-pressed',String(!state.playing));}
}
function motion(){
  if(state.globe)state.globe.pathDashAnimateTime(d=>(d.kind==='tracer'&&state.playing)?d.time:0);
}
function redraw(){
  if(!state.globe)return;
  if(!state.ready){state.globe.pathsData([]);state.count=0;status('海陆掩膜尚未加载');return;}
  if(!state.enabled){state.globe.pathsData([]);state.count=0;status('海流图层已关闭');return;}
  const group=lines(),paths=[];
  for(const d of group){paths.push({...d,kind:'base'},{...d,kind:'tracer'});}
  state.count=group.length;
  state.globe.pathsData(paths);motion();status();
}
function attach(globe){
  state.globe=globe;
  globe.pathPoints('points').pathPointLat(p=>p[0]).pathPointLng(p=>p[1])
    .pathPointAlt(.007).pathResolution(2)
    .pathColor(d=>d.kind==='base'?'#124b68':d.strength>.60?'#b4faff':d.strength>.30?'#56dffa':'#559dcc')
    .pathStroke(d=>d.kind==='base'?.051:.115)
    .pathDashLength(d=>d.kind==='base'?1:.095)
    .pathDashGap(d=>d.kind==='base'?0:.2)
    .pathDashInitialGap(d=>d.phase)
    .pathDashAnimateTime(d=>(d.kind==='tracer'&&state.playing)?d.time:0)
    .pathTransitionDuration(0).pathsData([]);
  status('正在加载全球海陆掩膜…');
}
function setLand(geometry){state.polygons=indexLand(geometry);state.ready=state.polygons.length>0;redraw();}
function landFailed(){state.ready=false;state.polygons=null;state.count=0;if(state.globe)state.globe.pathsData([]);status('海陆数据无法加载，流场已停用');}
function setEnabled(enabled){state.enabled=Boolean(enabled);redraw();}
function setDensity(value){if(!(value in LIMITS))return;state.density=value;redraw();}
function togglePlay(){state.playing=!state.playing;motion();status(state.enabled?'全球海洋表层 · 概念演示':'海流图层已关闭');}
global.OceanFlow={attach,setLand,landFailed,setEnabled,setDensity,togglePlay};
})(window);
