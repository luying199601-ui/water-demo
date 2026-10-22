/**
 * Water Environment Decision Support – globe dashboard UI
 * Facility coordinates below are APPROXIMATE VISUAL DEMONSTRATION POSITIONS.
 * Only site IDs present in the app's SITES collection are configured facilities.
 */
(function (global) {
  "use strict";

  // Display-only example locations, NOT a validated inventory or geospatial reference.
  const EXAMPLES = [
    {id:"qinshan",name:"秦山核电站",lat:30.435,lng:120.941,priority:10},
    {id:"dayawan",name:"大亚湾核电站",lat:22.59,lng:114.54,priority:10},
    {id:"sanmen",name:"三门核电站",lat:29.10,lng:121.63,priority:9},
    {id:"tianwan",name:"田湾核电站",lat:34.68,lng:119.46,priority:9},
    {id:"hongyanhe",name:"红沿河核电站",lat:39.80,lng:121.48,priority:9},
    {id:"fuqing",name:"福清核电站",lat:25.44,lng:119.45,priority:9},
    {id:"ningde",name:"宁德核电站",lat:27.05,lng:119.67,priority:8},
    {id:"yangjiang",name:"阳江核电站",lat:21.71,lng:111.98,priority:9},
    {id:"fangchenggang",name:"防城港核电站",lat:21.66,lng:108.55,priority:9},
    {id:"taishan",name:"台山核电站",lat:21.91,lng:112.98,priority:8},
    {id:"haiyang",name:"海阳核电站",lat:36.71,lng:121.43,priority:8},
    {id:"changjiang",name:"昌江核电站",lat:19.46,lng:108.90,priority:8},
    {id:"xudabao",name:"徐大堡核电站",lat:40.33,lng:120.52,priority:6}
  ];
  const state={globe:null,pick:null,sites:[],borders:true,facilities:true,pov:{lat:28,lng:110,altitude:2.2},labelNodes:[],dataLoaded:false,mouseAt:0};
  const $=id=>document.getElementById(id);
  function configured(id){return state.sites.some(s=>s.id===id);}
  function ensureStatus(){
    const x=$("globe-load-state");
    if(x)x.textContent=state.dataLoaded?"三维地球 · 边界已加载":"三维地球 · 正在加载边界";
  }
  function markerHTML(d){
    const node=document.createElement("div");
    const isConfigured=configured(d.id);
    node.className="globe-site"+(isConfigured?" is-configured":"");
    node.dataset.id=d.id;
    node.setAttribute("role","button");
    node.setAttribute("tabindex","0");
    node.setAttribute("title",d.name+(isConfigured?" · 已配置厂址":" · 展示示意点"));
    const dot=document.createElement("span");
    dot.className="globe-site-dot";
    const label=document.createElement("span");
    label.className="globe-site-label";
    label.textContent=d.name;
    node.appendChild(dot);node.appendChild(label);
    node.addEventListener("click",ev=>{ev.stopPropagation();choose(d);});
    node.addEventListener("keydown",ev=>{if(ev.key==="Enter"||ev.key===" "){ev.preventDefault();choose(d);}});
    state.labelNodes.push({node,d,label});
    return node;
  }
  function choose(d){
    if(state.pick)state.pick(d.lat,d.lng,d.name);
    if(typeof global.finishMapPick==="function")global.finishMapPick();
  }
  function angleDistance(a,b,c,d){
    const p=Math.PI/180,dl=(d-b)*p;
    const cosine=Math.sin(a*p)*Math.sin(c*p)+Math.cos(a*p)*Math.cos(c*p)*Math.cos(dl);
    return Math.acos(Math.max(-1,Math.min(1,cosine)))/p;
  }
  function visibility(){
    const zoom=state.pov.altitude||2.2;
    const maxAngle=zoom>2.4?65:zoom>1.5?73:zoom>.75?85:95;
    const allowLabels=zoom<3.6;
    const maxLabels=zoom>1.75?8:zoom>.9?11:16;
    let count=0;
    const ordered=state.labelNodes.slice().sort((a,b)=>b.d.priority-a.d.priority);
    const visible=new Set();
    for(const item of ordered){
      const dist=angleDistance(state.pov.lat,state.pov.lng,item.d.lat,item.d.lng);
      if(dist<maxAngle&&count<maxLabels&&allowLabels){visible.add(item.d.id);count++;}
    }
    for(const item of state.labelNodes){
      item.node.classList.toggle("only-dot",!visible.has(item.d.id));
    }
  }
  function renderHTMLSites(){
    if(!state.globe)return;
    state.labelNodes=[];
    if(!state.facilities){state.globe.htmlElementsData([]);return;}
    state.globe
      .htmlLat("lat").htmlLng("lng").htmlAltitude(.013)
      .htmlElement(markerHTML).htmlTransitionDuration(0)
      .htmlElementsData(EXAMPLES);
    visibility();
  }
  function refreshPoints(selected,sites){
    if(!state.globe)return;
    if(selected){
      state.globe.pointsData([{name:selected.name,lat:selected.lat,lng:selected.lng,selected:true}]);
    }else{
      state.globe.pointsData([]);
    }
    state.sites=sites||state.sites;
    visibility();
  }
  function selectFacility(id){return EXAMPLES.find(x=>x.id===id)||null;}
  function showFac(on){
    state.facilities=!!on;
    renderHTMLSites();
    const count=$("facility-layer-count");
    if(count)count.textContent=state.facilities?EXAMPLES.length+" 个示意点":"已隐藏";
  }
  function showBorders(on){
    state.borders=!!on;
    if(state.globe&&state.borders&&state.countryFeatures)state.globe.polygonsData(state.countryFeatures);
    else if(state.globe)state.globe.polygonsData([]);
  }
  function loadBorders(){
    fetch("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json")
      .then(r=>{if(!r.ok)throw Error("countries TopoJSON "+r.status);return r.json();})
      .then(topology=>{
        if(!global.topojson)throw Error("Missing topojson client");
        state.countryFeatures=global.topojson.feature(topology,topology.objects.countries).features;
        state.dataLoaded=true;ensureStatus();showBorders(state.borders);
      })
      .catch(err=>{
        console.warn("国家边界展示数据加载失败（地图仍可使用）",err);
        state.dataLoaded=false;const el=$("globe-load-state");
        if(el)el.textContent="三维地球 · 边界离线";
      });
  }
  function setCamera(pov){
    if(!pov)return;
    state.pov={lat:pov.lat,lng:pov.lng,altitude:pov.altitude};
    const lat=$("camera-lat"),lng=$("camera-lng"),alt=$("camera-alt");
    if(lat)lat.textContent=(Math.abs(pov.lat)).toFixed(2)+"°"+(pov.lat>=0?"N":"S");
    if(lng)lng.textContent=(Math.abs(pov.lng)).toFixed(2)+"°"+(pov.lng>=0?"E":"W");
    if(alt)alt.textContent=(Number(pov.altitude)).toFixed(2)+" R";
    visibility();
  }
  function hoverGeo(event){
    if(!state.globe)return;
    const now=performance.now();
    if(now-state.mouseAt<75)return;
    state.mouseAt=now;
    const rect=$("map").getBoundingClientRect();
    const pos=state.globe.toGlobeCoords(event.clientX-rect.left,event.clientY-rect.top);
    const field=$("cursor-location");
    if(!field)return;
    if(pos){const x=Math.abs(pos.lat).toFixed(3)+(pos.lat>=0?"°N":"°S"),y=Math.abs(pos.lng).toFixed(3)+(pos.lng>=0?"°E":"°W");field.textContent=x+" / "+y;}
    else field.textContent="移至球面查看位置";
  }
  function toggleFullscreen(){
    if(!document.fullscreenElement){
      const element=document.getElementById("main-interface");
      if(element&&element.requestFullscreen)element.requestFullscreen().catch(()=>{});
    }else if(document.exitFullscreen)document.exitFullscreen().catch(()=>{});
  }
  function attach(globe, opts){
    state.globe=globe;state.pick=opts.pick;state.sites=opts.sites||[];
    globe
      .polygonGeoJsonGeometry("geometry")
      .polygonCapColor("rgba(0,27,41,0.004)")
      .polygonSideColor("rgba(0,27,41,0.004)")
      .polygonStrokeColor("rgba(148,193,219,0.38)")
      .polygonAltitude(.0018).polygonCapCurvatureResolution(5)
      .polygonsTransitionDuration(0)
      .onPolygonClick((d,event,coords)=>{if(coords)choose({lat:coords.lat,lng:coords.lng,name:"地图选点"});})
      .onZoom(setCamera);
    // Keep geographic picking functional when current lines intercept globe clicks.
    globe.onPathClick((d,event,coords)=>{if(coords)choose({lat:coords.lat,lng:coords.lng,name:"地图选点"});});
    renderHTMLSites();
    refreshPoints(opts.selected||null,opts.sites||[]);
    setCamera(globe.pointOfView());
    $("map").addEventListener("pointermove",hoverGeo,{passive:true});
    loadBorders();
    ensureStatus();
  }
  global.WaterDashboard={attach,refreshPoints,selectFacility,showFacilities:showFac,showBorders,toggleFullscreen,setCamera,facilityList:EXAMPLES};
})(window);