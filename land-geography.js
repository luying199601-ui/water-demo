/* Self-hosted land/ocean classification for map point selection.
   Based on locally served world-land.geojson, independent of external CDN services.
   Cartographic coastline scale: global overview only; ambiguous coasts can be overridden.
*/
(function(global){
'use strict';
const state={ready:false,features:[],polygons:[],error:null,promise:null};
function classifyRing(coords,lat,lng){
 let inside=false;
 for(let i=0,j=coords.length-1;i<coords.length;j=i++){
   const p=coords[i],q=coords[j];
   if((p[1]>lat)!==(q[1]>lat)&&lng<(q[0]-p[0])*(lat-p[1])/(q[1]-p[1])+p[0])inside=!inside;
 }
 return inside;
}
function makeIndex(collection){
 const polygons=[];
 for(const feature of collection.features||[]){
   const g=feature.geometry;if(!g)continue;
   const parts=g.type==='Polygon'?[g.coordinates]:g.type==='MultiPolygon'?g.coordinates:[];
   for(const rings of parts){
     if(!rings.length)continue;
     let minLat=90,maxLat=-90,minLng=180,maxLng=-180;
     for(const p of rings[0]){
       minLat=Math.min(minLat,p[1]);maxLat=Math.max(maxLat,p[1]);
       minLng=Math.min(minLng,p[0]);maxLng=Math.max(maxLng,p[0]);
     }
     polygons.push({rings,minLat,maxLat,minLng,maxLng});
   }
 }
 return polygons;
}
function classify(lat,lng){
 lat=Number(lat);lng=Number(lng);
 if(!state.ready||!Number.isFinite(lat)||!Number.isFinite(lng))return null;
 for(const poly of state.polygons){
   if(lat<poly.minLat||lat>poly.maxLat||lng<poly.minLng||lng>poly.maxLng)continue;
   if(!classifyRing(poly.rings[0],lat,lng))continue;
   let hole=false;
   for(let i=1;i<poly.rings.length;i++){if(classifyRing(poly.rings[i],lat,lng)){hole=true;break;}}
   if(!hole)return 'inland';
 }
 return 'ocean';
}
function toGeometry(){
 if(!state.ready)return null;
 const coordinates=[];
 for(const feature of state.features){
   const g=feature.geometry;if(!g)continue;
   if(g.type==='Polygon')coordinates.push(g.coordinates);
   else if(g.type==='MultiPolygon')coordinates.push(...g.coordinates);
 }
 return {type:'MultiPolygon',coordinates};
}
function init(){
 if(state.promise)return state.promise;
 state.promise=fetch('world-land.geojson?v=1')
   .then(res=>{if(!res.ok)throw new Error('Local land dataset: HTTP '+res.status);return res.json();})
   .then(data=>{
     if(data.type!=='FeatureCollection'||!Array.isArray(data.features))throw Error('Invalid local land geometry');
     state.features=data.features;
     state.polygons=makeIndex(data);
     state.ready=state.polygons.length>0;
     if(!state.ready)throw Error('Empty land geometry');
     state.error=null;
     return state;
   })
   .catch(error=>{state.error=String(error);state.promise=null;throw error;});
 return state.promise;
}
global.LandGeo={init,classify,toGeometry,getFeatures:()=>state.features,getStatus:()=>({ready:state.ready,polygons:state.polygons.length,error:state.error})};
})(window);
