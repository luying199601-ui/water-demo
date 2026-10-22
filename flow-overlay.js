/* Demonstration-only ocean currents. Not observational or forecast data.
   Base = visible blue fatlines; tracer = animated 1px dashed lines.
   Globe.gl fatlines do NOT support dashed animation, hence the two layers.
*/
(function(global){
'use strict';
const BASINS=[
  [23,33,122,134,4.0],[32,40,121,128,3.9],[7,24,111,122,4.0],
  [18,30,123,131,4.0],[9,31,129,151,3.8],[31,46,139,160,3.3],
  [36,45,130,139,3.4],[9,20,85,95,2.2],[9,22,61,73,2.0],
  [-15,8,62,103,1.8],[10,42,151,176,1.6],
  [10,50,-166,-116,1.3],[8,49,-62,-18,1.2],
  [-43,-6,-140,-87,1.2],[-40,-7,-41,5,1.2],[-44,-15,45,100,1.2]
];
const TARGET={low:130,medium:265,high:440};
const R=Math.PI/180;
const state={globe:null,land:null,mask:false,enabled:true,playing:true,density:'high',count:0,error:''};
const frac=n=>{const x=Math.sin(n*127.1+19.87)*43758.54;return x-Math.floor(x);};
function nearSea(a,b){return BASINS.some(z=>a>=z[0]&&a<=z[1]&&b>=z[2]&&b<=z[3]);}
function contain(poly,a,b){
 let v=false;
 for(let i=0,j=poly.length-1;i<poly.length;j=i++){
   const q=poly[i],p=poly[j];
   if((q[1]>a)!==(p[1]>a)&&b<(p[0]-q[0])*(a-q[1])/(p[1]-q[1])+q[0])v=!v;
 }
 return v;
}
function indexLand(geometry){
 if(!geometry)return [];
 const polygons=geometry.type==='MultiPolygon'?geometry.coordinates:[geometry.coordinates];
 return polygons.filter(r=>r&&r[0]).map(r=>{
   let minLat=90,maxLat=-90,minLng=180,maxLng=-180;
   for(const p of r[0]){
     minLat=Math.min(minLat,p[1]);maxLat=Math.max(maxLat,p[1]);
     minLng=Math.min(minLng,p[0]);maxLng=Math.max(maxLng,p[0]);
   }
   return {rings:r,minLat,maxLat,minLng,maxLng};
 });
}
function isLand(a,b){
 if(!state.mask||!state.land)return false;
 for(const p of state.land){
   if(a<p.minLat||a>p.maxLat||b<p.minLng||b>p.maxLng)continue;
   if(!contain(p.rings[0],a,b))continue;
   let hole=false;
   for(let j=1;j<p.rings.length;j++)if(contain(p.rings[j],a,b)){hole=true;break;}
   if(!hole)return true;
 }
 return false;
}
function ocean(a,b){return nearSea(a,b)&&!isLand(a,b);}
function current(a,b){
 let u=-.43+.17*Math.cos(2*a*R)+.19*Math.sin(2.7*b*R);
 let v=.28*Math.cos((2*a+b)*R)+.12*Math.sin(4.4*b*R);
 const band=Math.exp(-Math.pow((b-122-.38*(a-22))/5.2,2))*Math.exp(-Math.pow((a-28)/17,2));
 u+=1.12*band;v+=.83*band;
 return {u,v,speed:Math.hypot(u,v)};
}
function trace(a,b,seed){
 const points=[[a,b]],step=.25+.08*frac(seed+111),max=19+Math.floor(17*frac(seed+222));
 for(let k=0;k<max;k++){
   const q=current(a,b);if(q.speed<.04)break;
   const na=a+q.v/q.speed*step;
   const nb=b+q.u/q.speed*step/Math.max(.45,Math.cos(a*R));
   if(Math.abs(na)>68||Math.abs(nb)>178||!ocean((a+na)/2,(b+nb)/2)||!ocean(na,nb))break;
   points.push([na,nb]);a=na;b=nb;
 }
 return points.length>=5?points:null;
}
function streamlines(){
 const starts=[];
 for(let i=0;i<BASINS.length;i++){
   const z=BASINS[i],grid=z[4]>3?1.03:2.25;
   for(let a=z[0]+.3;a<z[1]-.3;a+=grid){
     for(let b=z[2]+.3;b<z[3]-.3;b+=grid){
       const seed=i*100000+Math.round((a+90)*91)+Math.round((b+180)*59);
       const la=a+(frac(seed+2)-.5)*.72*grid;
       const lo=b+(frac(seed+7)-.5)*.72*grid;
       if(!ocean(la,lo))continue;
       starts.push({a:la,b:lo,seed,score:z[4]+frac(seed+29)*.5});
     }
   }
 }
 starts.sort((a,b)=>b.score-a.score);
 const out=[];
 for(const p of starts){
   if(out.length>=TARGET[state.density])break;
   const points=trace(p.a,p.b,p.seed);
   if(points)out.push({points,speed:current(p.a,p.b).speed,phase:frac(p.seed+44)*.2,time:2250+Math.round(frac(p.seed+55)*1800)});
 }
 return out;
}
function syncButton(){
 const btn=document.getElementById('flow-mini-toggle');
 if(btn){
   btn.title=state.enabled
     ?'海流示意已开启：'+state.count+' 条球面流线（非实测）'
     :'点击开启球面海流演示';
   btn.dataset.flowCount=String(state.count);
 }
}
function paint(){
 if(!state.globe)return;
 if(!state.enabled){
   state.globe.pathsData([]);state.globe.arcsData([]);state.count=0;syncButton();return;
 }
 try{
   let paths=streamlines();
   if(paths.length<20&&state.mask){state.mask=false;paths=streamlines();}
   const data=[];
   for(const p of paths){data.push({...p,kind:'base'},{...p,kind:'spark'});}
   state.globe.pathsData(data);
   const tracers=[];
   for(let i=0;i<paths.length;i+=2){
     const p=paths[i],points=p.points;
     if(points.length<5)continue;
     const end=points[points.length-1];
     tracers.push({
       startLat:points[0][0],startLng:points[0][1],
       endLat:end[0],endLng:end[1],
       speed:p.speed,phase:p.phase,time:p.time
     });
   }
   state.globe.arcsData(tracers);
   state.count=paths.length;syncButton();
   if(!paths.length)console.warn('No water paths generated for the example basins.');
 }catch(error){
   state.error=String(error);console.warn('OceanFlow mask fallback',error);
   state.mask=false;
   const paths=streamlines();
   state.globe.pathsData(paths.flatMap(p=>[{...p,kind:'base'},{...p,kind:'spark'}]));
   state.globe.arcsData(paths.filter((_,i)=>i%2===0).map(p=>{
      const end=p.points[p.points.length-1];
      return {startLat:p.points[0][0],startLng:p.points[0][1],endLat:end[0],endLng:end[1],speed:p.speed,phase:p.phase,time:p.time};
   }));
   state.count=paths.length;syncButton();
 }
}
function attach(globe){
 state.globe=globe;
 globe.pathPoints('points').pathPointLat(p=>p[0]).pathPointLng(p=>p[1])
   .pathPointAlt(.015).pathResolution(1.5)
   .pathColor(d=>d.kind==='base'?'#279ee0':d.speed>.75?'#efffff':'#97edff')
   .pathStroke(d=>d.kind==='base'?.13:null)
   .pathDashLength(d=>d.kind==='base'?1:.055)
   .pathDashGap(d=>d.kind==='base'?0:.065)
   .pathDashInitialGap(d=>d.kind==='base'?0:d.phase)
   .pathDashAnimateTime(d=>d.kind==='spark'&&state.playing?d.time:0)
   .pathTransitionDuration(0);
 globe.arcColor(d=>d.speed>.75?'#ecffff':'#59d7ff')
   .arcAltitude(.018)
   .arcStartAltitude(.015).arcEndAltitude(.015)
   .arcStroke(null)
   .arcDashLength(.13).arcDashGap(.19)
   .arcDashInitialGap(d=>d.phase)
   .arcDashAnimateTime(d=>state.playing?d.time:0)
   .arcsTransitionDuration(0);
 paint(); // Draw without waiting for world-atlas download.
}
function setLand(geometry){
 try{state.land=indexLand(geometry);state.mask=state.land.length>0;}
 catch(error){state.mask=false;state.land=null;console.warn(error);}
 paint();
}
function landFailed(){state.land=null;state.mask=false;paint();}
function setEnabled(v){state.enabled=Boolean(v);paint();}
function setDensity(v){if(!(v in TARGET))return;state.density=v;paint();}
function togglePlay(){
 state.playing=!state.playing;
 if(state.globe){
   state.globe.pathDashAnimateTime(d=>d.kind==='spark'&&state.playing?d.time:0);
   state.globe.arcDashAnimateTime(d=>state.playing?d.time:0);
 }
 const b=document.getElementById('flow-play');
 if(b)b.innerHTML=state.playing?'<i class="fas fa-pause"></i> 暂停动画':'<i class="fas fa-play"></i> 继续播放';
}
global.OceanFlow={attach,setLand,landFailed,setEnabled,setDensity,togglePlay,getStats:()=>({count:state.count,enabled:state.enabled,mask:state.mask,error:state.error})};
})(window);
