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

  // Cartographic labels are rendered on the globe only; they are not site/model records.
  const PLACES = [
    {name:"中国",lat:36,lng:103,kind:"country"},
    {name:"蒙古",lat:46.9,lng:104.9,kind:"country"},
    {name:"俄罗斯",lat:53.5,lng:109.0,kind:"country"},
    {name:"印度",lat:22,lng:79.2,kind:"country"},
    {name:"巴基斯坦",lat:29,lng:69,kind:"country"},
    {name:"哈萨克斯坦",lat:48,lng:68,kind:"country"},
    {name:"缅甸",lat:21.7,lng:95.9,kind:"country"},
    {name:"泰国",lat:16,lng:101,kind:"country"},
    {name:"越南",lat:16.8,lng:106.8,kind:"country"},
    {name:"老挝",lat:19.5,lng:102.6,kind:"country"},
    {name:"韩国",lat:36.1,lng:128,kind:"country"},
    {name:"日本",lat:37,lng:138.8,kind:"country"},
    {name:"菲律宾",lat:12.9,lng:122,kind:"country"},
    {name:"尼泊尔",lat:28.2,lng:83.6,kind:"country"},
    {name:"北京",lat:39.9,lng:116.41,kind:"city"},
    {name:"上海",lat:31.2,lng:121.47,kind:"city"},
    {name:"广州",lat:23.1,lng:113.26,kind:"city"},
    {name:"成都",lat:30.67,lng:104.06,kind:"city"},
    {name:"重庆",lat:29.56,lng:106.55,kind:"city"},
    {name:"武汉",lat:30.58,lng:114.3,kind:"city"},
    {name:"西安",lat:34.27,lng:108.96,kind:"city"},
    {name:"南京",lat:32.06,lng:118.8,kind:"city"},
    {name:"杭州",lat:30.27,lng:120.16,kind:"city"},
    {name:"太原",lat:37.86,lng:112.55,kind:"city"},
    {name:"兰州",lat:36.06,lng:103.82,kind:"city"},
    {name:"昆明",lat:25.04,lng:102.72,kind:"city"},
    {name:"哈尔滨",lat:45.75,lng:126.64,kind:"city"},
    {name:"沈阳",lat:41.8,lng:123.43,kind:"city"},
    {name:"拉萨",lat:29.65,lng:91.1,kind:"city"},
    {name:"乌鲁木齐",lat:43.83,lng:87.62,kind:"city"},
    {name:"台北",lat:25.03,lng:121.57,kind:"city"},
    {name:"首尔",lat:37.57,lng:126.98,kind:"city"},
    {name:"东京",lat:35.68,lng:139.76,kind:"city"},
    {name:"黄海",lat:35.6,lng:124.8,kind:"sea"},
    {name:"东海",lat:27.7,lng:126.3,kind:"sea"},
    {name:"南海",lat:15.2,lng:115.0,kind:"sea"},
    {name:"日本海",lat:40.6,lng:134.5,kind:"sea"},
    {name:"孟加拉湾",lat:16,lng:89.0,kind:"sea"},
    {name:"菲律宾海",lat:18.8,lng:133.4,kind:"sea"}
  ];

  const state={globe:null,pick:null,sites:[],borders:true,facilities:true,selected:null,pov:{lat:30,lng:108,altitude:1.25},labelNodes:[],geoNodes:[],dataLoaded:false,mouseAt:0};
  const $=id=>document.getElementById(id);
  function configured(id){return state.sites.some(s=>s.id===id);}
  function ensureStatus(){
    const x=$("globe-load-state");
    if(x)x.textContent=state.dataLoaded?"三维地球 · 边界已加载":"三维地球 · 正在加载边界";
  }
  function markerHTML(d){
    const node=document.createElement("div");
    if(d.kind==="selected"){
      const pin=document.createElement("div");
      pin.className="map-selected-pin";
      pin.title="当前选定的模拟位置";
      pin.setAttribute("aria-hidden","true");
      const ring=document.createElement("span");
      ring.className="selected-pin-ring";
      const core=document.createElement("span");
      core.className="selected-pin-core";
      pin.appendChild(ring);pin.appendChild(core);
      return pin;
    }
    if(d.kind){
      const geo=document.createElement("div");
      geo.className="globe-geo-label globe-geo-"+d.kind;
      geo.textContent=d.name;
      geo.setAttribute("aria-hidden","true");
      state.geoNodes.push({node:geo,d});
      return geo;
    }
    const isConfigured=configured(d.id);
    const active=state.selected&&Math.abs(state.selected.lat-d.lat)<.0001&&Math.abs(state.selected.lng-d.lng)<.0001;
    node.className="globe-site"+(isConfigured?" is-configured":"")+(active?" is-selected":"");
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
    const zoom=state.pov.altitude||1.25;
    const maxAngle=zoom>2.4?65:zoom>1.5?72:zoom>.7?84:89;
    const maxLabels=zoom>2.3?9:zoom>1.7?11:15;
    let count=0;
    const ordered=state.labelNodes.slice().sort((a,b)=>b.d.priority-a.d.priority);
    const visible=new Set();
    for(const item of ordered){
      const dist=angleDistance(state.pov.lat,state.pov.lng,item.d.lat,item.d.lng);
      if(dist<maxAngle&&count<maxLabels){visible.add(item.d.id);count++;}
    }
    for(const item of state.labelNodes){
      item.node.classList.toggle("only-dot",!visible.has(item.d.id));
    }
    const canShowGeo=zoom<2.6;
    for(const item of state.geoNodes){
      const d=angleDistance(state.pov.lat,state.pov.lng,item.d.lat,item.d.lng);
      // Hide city labels when too far away; nation and waterbody labels stay visible longer.
      const allowance=item.d.kind==="city"?(zoom>1.55?42:68):maxAngle;
      item.node.style.display=(canShowGeo&&d<allowance)?"":"none";
    }
  }
  function renderHTMLSites(){
    if(!state.globe)return;
    state.labelNodes=[];
    state.geoNodes=[];
    const hasMatchingFacility=state.selected&&EXAMPLES.some(d=>
      Math.abs(d.lat-state.selected.lat)<.0001&&Math.abs(d.lng-state.selected.lng)<.0001);
    // A subtle HTML dot replaces the oversized 3D pin at arbitrary locations.
    const chosen=(state.selected&&!hasMatchingFacility)
      ? [{lat:state.selected.lat,lng:state.selected.lng,kind:"selected"}]
      : [];
    const items=(state.facilities?EXAMPLES:[]).concat(PLACES,chosen);
    state.globe
      .htmlLat("lat").htmlLng("lng").htmlAltitude(.016)
      .htmlElement(markerHTML).htmlTransitionDuration(0)
      .htmlElementsData(items);
    visibility();
  }
  function refreshPoints(selected,sites){
    if(!state.globe)return;
    state.selected=selected||null;
    state.sites=sites||state.sites;
    // Do not use pointsData: the 3D cylinders look disproportionately large.
    state.globe.pointsData([]);
    renderHTMLSites();
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
    // Use the same local GeoJSON file as the inland/ocean classifier.
    // No remote TopoJSON or additional CDN dependency.
    if(!global.LandGeo){
      const el=$("globe-load-state");
      if(el)el.textContent="三维地球 · 本地边界未加载";
      return;
    }
    global.LandGeo.init()
      .then(()=>{
        state.countryFeatures=global.LandGeo.getFeatures();
        state.dataLoaded=true;
        ensureStatus();
        showBorders(state.borders);
      })
      .catch(err=>{
        console.warn("本地地理数据未就绪",err);
        state.dataLoaded=false;
        const el=$("globe-load-state");
        if(el)el.textContent="三维地球 · 边界数据暂不可用";
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
    if(typeof global.updateLocationCardPosition==="function"){
      global.updateLocationCardPosition();
    }
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
      .polygonStrokeColor("rgba(203,205,164,0.52)")
      .polygonAltitude(.0015).polygonCapCurvatureResolution(4)
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