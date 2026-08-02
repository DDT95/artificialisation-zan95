const BOUNDS_95 = [[48.89,1.60],[49.25,2.60]];
const CEREMA_API = "https://apidf-preprod.cerema.fr";
const usageLabels = {conso_hab:"Habitat",conso_act:"Activité",conso_mix:"Mixte",conso_infra:"Infrastructures",conso_inc:"Non déterminé"};
const usageColors = {conso_hab:"#000091",conso_act:"#e1000f",conso_mix:"#7a5af8",conso_infra:"#009081",conso_inc:"#94a3b8"};
const zoneLabels = {U:"Zone urbaine (U)",AU:"À urbaniser (AU)",A:"Agricole (A)",N:"Naturelle (N)"};
const zoneColors = {U:"#b8752a",AU:"#c3992a",A:"#18753c",N:"#0078f3"};

// Nomenclature officielle OCS GE (IGN) — couleurs RGB du descriptif de contenu v1.1.
const CS_NOMENCLATURE = {
  "CS1.1.1.1":{label:"Zones bâties",color:"rgb(255,55,122)",group:"Surfaces anthropisées"},
  "CS1.1.1.2":{label:"Zones non bâties imperméabilisées",color:"rgb(255,145,145)",group:"Surfaces anthropisées"},
  "CS1.1.2.1":{label:"Zones à matériaux minéraux",color:"rgb(255,255,153)",group:"Surfaces anthropisées"},
  "CS1.1.2.2":{label:"Zones à autres matériaux composites",color:"rgb(166,77,0)",group:"Surfaces anthropisées"},
  "CS1.2.1":{label:"Sols nus",color:"rgb(204,204,204)",group:"Surfaces naturelles"},
  "CS1.2.2":{label:"Surfaces d’eau",color:"rgb(0,204,242)",group:"Surfaces naturelles"},
  "CS1.2.3":{label:"Névés et glaciers",color:"rgb(166,230,204)",group:"Surfaces naturelles"},
  "CS2.1.1.1":{label:"Peuplements de feuillus",color:"rgb(128,255,0)",group:"Végétation ligneuse"},
  "CS2.1.1.2":{label:"Peuplements de conifères",color:"rgb(0,166,0)",group:"Végétation ligneuse"},
  "CS2.1.1.3":{label:"Peuplements mixtes",color:"rgb(128,190,0)",group:"Végétation ligneuse"},
  "CS2.1.2":{label:"Formations arbustives",color:"rgb(166,255,128)",group:"Végétation ligneuse"},
  "CS2.1.3":{label:"Autres formations ligneuses (vignes…)",color:"rgb(230,128,0)",group:"Végétation ligneuse"},
  "CS2.2.1":{label:"Formations herbacées (prairies, cultures)",color:"rgb(204,242,77)",group:"Végétation non ligneuse"},
  "CS2.2.2":{label:"Autres formations non ligneuses",color:"rgb(204,255,204)",group:"Végétation non ligneuse"}
};
const US_NOMENCLATURE = {
  "US1":{label:"Production primaire (agriculture, sylviculture…)",color:"rgb(255,255,168)"},
  "US2":{label:"Production secondaire (industrie)",color:"rgb(230,0,77)"},
  "US3":{label:"Production tertiaire (commerces, services)",color:"rgb(230,0,120)"},
  "US4":{label:"Réseaux de transport et infrastructures",color:"rgb(204,0,0)"},
  "US5":{label:"Usage résidentiel",color:"rgb(230,77,120)"},
  "US6":{label:"Autre usage",color:"rgb(200,200,0)"},
  "US1.1":{label:"Agriculture",color:"rgb(255,255,168)"},
  "US1.2":{label:"Sylviculture",color:"rgb(0,128,0)"},
  "US1.3":{label:"Activités d’extraction",color:"rgb(166,0,204)"},
  "US1.4":{label:"Pêche et aquaculture",color:"rgb(0,0,153)"},
  "US1.5":{label:"Autres productions primaires",color:"rgb(153,102,51)"},
  "US235":{label:"Production secondaire, tertiaire ou résidentiel",color:"rgb(230,0,77)"},
  "US4.1.1":{label:"Réseaux routiers",color:"rgb(204,0,0)"},
  "US4.1.2":{label:"Réseaux ferrés",color:"rgb(90,90,90)"},
  "US4.1.3":{label:"Réseaux aériens",color:"rgb(230,204,230)"},
  "US4.1.4":{label:"Réseaux fluvial et maritime",color:"rgb(0,102,255)"},
  "US4.1.5":{label:"Autres réseaux de transport",color:"rgb(102,0,51)"},
  "US4.2":{label:"Services logistiques et stockage",color:"rgb(255,0,0)"},
  "US4.3":{label:"Réseaux d’utilité publique",color:"rgb(255,75,0)"},
  "US6.1":{label:"Zone en transition",color:"rgb(255,77,255)"},
  "US6.2":{label:"Zone abandonnée",color:"rgb(64,64,64)"},
  "US6.3":{label:"Sans usage",color:"rgb(240,240,40)"},
  "US6.4":{label:"Usage inconnu",color:"rgb(255,204,0)"}
};
function csInfo(code){return CS_NOMENCLATURE[code]||{label:code||"Non renseigné",color:"#94a3b8"}}
function usInfo(code){return US_NOMENCLATURE[code]||{label:code||"Non renseigné",color:"#94a3b8"}}

const sources = [
  {id:"conso_communes",title:"Consommation d’espace communale",date:"Cumul 2011-2024",group:"Trajectoire ZAN",color:"#000091",kind:"choropleth",count:"183 communes",active:true,producer:"Cerema · Indicateurs fonciers"},
  {id:"couverture",title:"Occupation du sol (OCS GE)",date:"Millésime 2024-2026",group:"Occupation du sol",color:"#8a5a44",kind:"wmts",wmtsLayer:"OCSGE.COUVERTURE.2024-2026",count:"Couche IGN nationale",active:false,producer:"IGN · Géoplateforme"},
  {id:"artif",title:"Espaces artificialisés (OCS GE)",date:"Millésime 2024-2026",group:"Occupation du sol",color:"#c65f52",kind:"wmts",wmtsLayer:"OCSGE.ARTIF.2024-2026",count:"Zones construites identifiées",active:false,producer:"IGN · Géoplateforme"},
  {id:"friches",title:"Friches recensées",date:"Cartofriches · actualisation continue",group:"Potentiels fonciers",color:"#b8752a",kind:"friches",api:`${CEREMA_API}/cartofriches/geofriches/`,count:"— sites",active:true,producer:"Cerema · Cartofriches"}
];

const themeGuide = {
  conso_communes:{short:"Chaque commune colorée selon l’ENAF consommé depuis 2011",what:"Cette carte cumule, commune par commune, les espaces naturels, agricoles et forestiers consommés entre 2011 et la dernière année connue.",read:"Plus une commune est foncée, plus elle a consommé d’espace en valeur absolue. Cliquez sur une commune pour voir son détail annuel et son objectif ZAN."},
  couverture:{short:"Nature physionomique du sol : bâti, sol nu, végétation, eau…",what:"L’occupation du sol à grande échelle (OCS GE) de l’IGN décrit ce qui recouvre chaque point du territoire, indépendamment de son usage.",read:"Elle sert de socle national pour mesurer les évolutions du bâti et des espaces naturels, agricoles et forestiers dans le temps."},
  artif:{short:"Zones identifiées comme construites par l’OCS GE",what:"Cette couche isole les espaces considérés comme artificialisés : bâti, voirie, parkings et autres surfaces imperméabilisées.",read:"Elle permet de visualiser directement l’empreinte construite du territoire, millésime par millésime."},
  friches:{short:"Sites recensés dans l’inventaire national Cartofriches",what:"Une friche est un site bâti ou non, autrefois utilisé, aujourd’hui vacant ou sous-occupé, avec un potentiel de renouvellement urbain.",read:"La fiche indique la surface, le zonage d’urbanisme applicable et l’état de connaissance de la pollution des sols lorsqu’il est renseigné."}
};

const state = {friches:null,communeCache:{},departementConso:null,charts:[],legendId:null};
const map = L.map("map",{zoomControl:false,preferCanvas:true,minZoom:6,maxZoom:19});
map.invalidateSize();
map.fitBounds(BOUNDS_95);
map.createPane("maskPane");map.getPane("maskPane").style.zIndex=420;map.getPane("maskPane").style.pointerEvents="none";
map.createPane("boundaryPane");map.getPane("boundaryPane").style.zIndex=430;map.getPane("boundaryPane").style.pointerEvents="none";
L.control.zoom({position:"bottomright"}).addTo(map);
L.control.scale({imperial:false,position:"bottomright"}).addTo(map);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:19,className:"neutral-tiles",attribution:'© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> · Données DDT 95'}).addTo(map);

const layers = {};

function safe(v){return v===null||v===undefined||v===""?"Non renseigné":String(v)}
function htmlSafe(v){return safe(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c])}
function fmtM2(v){return Number.isFinite(v)?`${Math.round(v).toLocaleString("fr-FR")} m²`:"Non renseignée"}
function fmtHa(v){return Number.isFinite(v)?`${(v/10000).toLocaleString("fr-FR",{maximumFractionDigits:1})} ha`:"—"}

function wmtsLayer(source){
  return L.tileLayer(`https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=${source.wmtsLayer}&STYLE=normal&TILEMATRIXSET=PM_6_16&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&FORMAT=image/png`,{minZoom:6,maxZoom:19,maxNativeZoom:16,opacity:source.id==="couverture"?.62:.72,attribution:"IGN · Géoplateforme"});
}

async function fetchJson(url,attempts=3){
  let lastError;
  for(let i=0;i<attempts;i++){
    try{const r=await fetch(url);if(!r.ok)throw new Error(`${url} → ${r.status}`);return await r.json()}
    catch(e){lastError=e;if(i<attempts-1)await new Promise(res=>setTimeout(res,500*(i+1)))}
  }
  throw lastError;
}
async function loadFriches(){
  if(state.friches)return state.friches;
  const url=`${sources.find(s=>s.id==="friches").api}?coddep=95&page_size=300&fields=all`;
  const d=await fetchJson(url);
  state.friches=d;
  document.getElementById("frichesCount").textContent=`${d.features.length} friches recensées`;
  const countLabel=sources.find(s=>s.id==="friches");countLabel.count=`${d.features.length} sites`;
  return d;
}

function friceStyle(f){const c=zoneColors[f.properties.urba_zone_type]||"#8a5a44";return {color:c,weight:1.5,fillColor:c,fillOpacity:.35}}
function frichePoint(f,latlng){
  const c=zoneColors[f.properties.urba_zone_type]||"#8a5a44";
  return L.circleMarker(latlng,{radius:6,weight:2,color:"#fff",fillColor:c,fillOpacity:.95});
}
function centroid(geometry){
  const rings=geometry.type==="Polygon"?[geometry.coordinates[0]]:geometry.coordinates.map(p=>p[0]);
  let x=0,y=0,n=0;
  rings.forEach(ring=>ring.forEach(([lon,lat])=>{x+=lon;y+=lat;n++}));
  return [x/n,y/n];
}

async function loadLayer(source){
  if(layers[source.id])return layers[source.id];
  if(source.kind==="wmts"){layers[source.id]=wmtsLayer(source);return layers[source.id]}
  if(source.kind==="friches"){
    const data=await loadFriches();
    const onEach=(f,l)=>{l.on("click",e=>{L.DomEvent.stopPropagation(e);openFriche(f)});l.bindTooltip(f.properties.site_nom||f.properties.comm_nom||"Friche",{sticky:true})};
    // Points dérivés du centroïde de chaque polygone, visibles à toute échelle.
    const centroidData={type:"FeatureCollection",features:data.features.map(f=>({type:"Feature",properties:f.properties,geometry:{type:"Point",coordinates:centroid(f.geometry)}}))};
    const dots=L.geoJSON(centroidData,{pointToLayer:frichePoint,onEachFeature:onEach});
    const polygons=L.geoJSON(data,{style:friceStyle,onEachFeature:onEach});
    layers[source.id]=L.layerGroup([polygons,dots]);
    return layers[source.id];
  }
  if(source.kind==="choropleth"){
    if(!state.communes)throw new Error("Limites communales indisponibles");
    document.getElementById("mapStatus").textContent="Calcul de la consommation d’espace pour les 183 communes…";
    const ranking=await rankCommunes();
    const byCode={};ranking.forEach(r=>byCode[r.code]=r.total);
    const breaks=choroBreaks(ranking.map(r=>r.total));
    const data={type:"FeatureCollection",features:state.communes.features.map(f=>({type:"Feature",properties:{...f.properties,total:byCode[f.properties.code]||0},geometry:f.geometry}))};
    layers[source.id]=L.geoJSON(data,{
      style:f=>({color:"#fff",weight:.8,fillColor:choroColor(f.properties.total,breaks),fillOpacity:.78}),
      onEachFeature:(f,l)=>{
        l.bindTooltip(`<b>${f.properties.nom}</b><br>${fmtHa(f.properties.total)} consommés depuis 2011`,{sticky:true});
        l.on("click",e=>{L.DomEvent.stopPropagation(e);openCommune(f.properties.nom,f.properties.code)});
        l.on("mouseover",()=>l.setStyle({weight:2.5,color:"#070047"}));
        l.on("mouseout",()=>l.setStyle({weight:.8,color:"#fff"}));
      }
    });
    state.choroBreaks=breaks;
    return layers[source.id];
  }
}

const CHORO_RAMP=["#dbe4f0","#a9c0e0","#6f95cc","#3a63a8","#0c2c6b"];
function choroBreaks(values){
  const sorted=values.filter(v=>v>0).sort((a,b)=>a-b);
  if(!sorted.length)return [0,0,0,0];
  const q=p=>sorted[Math.min(sorted.length-1,Math.floor(p*sorted.length))];
  return [q(.2),q(.4),q(.6),q(.8)];
}
function choroColor(v,breaks){
  if(!v)return "#eef1f6";
  for(let i=0;i<breaks.length;i++)if(v<=breaks[i])return CHORO_RAMP[i];
  return CHORO_RAMP[CHORO_RAMP.length-1];
}

async function setLayer(source,on){
  const control=document.getElementById(`layer-${source.id}`);
  control.disabled=true;
  if(on)document.getElementById("mapStatus").textContent=`Chargement : ${source.title}…`;
  try{
    const layer=await loadLayer(source);
    if(on)layer.addTo(map);else map.removeLayer(layer);
    document.getElementById("mapStatus").textContent=on?`${source.title} affiché · ${source.count}`:"Couche retirée de la carte";
    refreshLegend();
  }catch(e){
    if(layers[source.id])map.removeLayer(layers[source.id]);
    control.checked=false;refreshLegend();
    document.getElementById("mapStatus").textContent=`Impossible d’afficher cette couche : ${source.title}. Réessayez dans un instant.`;
    console.error(e);
  }finally{control.disabled=false}
}

function openFriche(feature){
  const p=feature.properties||{};
  const title=p.site_nom||`Friche · ${p.comm_nom||"commune inconnue"}`;
  const cards=[
    ["Commune",p.comm_nom],
    ["Surface du site",fmtM2(p.site_surface)],
    ["Type de friche",p.site_type],
    ["Statut",p.site_statut],
    ["Occupation actuelle",p.site_occupation],
    ["Zonage d’urbanisme",p.urba_zone_lib||zoneLabels[p.urba_zone_type]],
    ["Pollution des sols",p.sol_pollution_existe],
    ["Producteur de la donnée",p.source_nom],
  ].filter(([,v])=>v!==null&&v!==undefined&&v!=="");
  const guide=themeGuide.friches;
  document.getElementById("detailContent").innerHTML=`<span class="detail-tag">Potentiels fonciers · ${p.source_nom||"Cartofriches"}</span><h2>${htmlSafe(title)}</h2><p class="subtitle">Friche · commune de ${htmlSafe(p.comm_nom)}</p><section class="theme-explainer"><strong>Ce que montre cette donnée</strong><p>${guide.what}</p><small>${guide.read}</small></section><div class="property-grid">${cards.map(([k,v])=>`<div class="property"><small>${htmlSafe(k)}</small><strong>${htmlSafe(v)}</strong></div>`).join("")}</div><a class="source-link" target="_blank" rel="noopener" href="${p.source_url||"https://cartofriches.cerema.fr/cartofriches/"}">Consulter Cartofriches ↗</a>`;
  document.getElementById("detailPanel").classList.add("open");
}

async function identifyOcsGe(latlng){
  const d=0.002;
  const bbox=`${latlng.lat-d},${latlng.lng-d},${latlng.lat+d},${latlng.lng+d}`;
  const url=`https://data.geopf.fr/wms-r/wms?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetFeatureInfo&LAYERS=OCSGE.COUVERTURE.2024-2026&QUERY_LAYERS=OCSGE.COUVERTURE.2024-2026&STYLES=&CRS=EPSG:4326&BBOX=${bbox}&WIDTH=101&HEIGHT=101&I=50&J=50&FORMAT=image/png&INFO_FORMAT=application/json&FEATURE_COUNT=1`;
  const d2=await fetchJson(url,2);
  return d2.features?.[0]?.properties||null;
}
function openIdentify(latlng,props){
  const cs=csInfo(props?.code_cs),us=usInfo(props?.code_us);
  document.getElementById("detailContent").innerHTML=props?`<span class="detail-tag">Occupation du sol · IGN OCS GE ${props.millesime||""}</span><h2>${htmlSafe(cs.label)}</h2><p class="subtitle">Point cliqué sur la carte · ${latlng.lat.toFixed(5)}, ${latlng.lng.toFixed(5)}</p><div class="property-grid"><div class="property" style="border-top-color:${cs.color}"><small>Couverture du sol</small><strong>${htmlSafe(cs.label)}</strong></div><div class="property" style="border-top-color:${us.color}"><small>Usage du sol</small><strong>${htmlSafe(us.label)}</strong></div><div class="property"><small>Surface de la parcelle</small><strong>${fmtM2(props.aire)}</strong></div><div class="property"><small>Artificialisation</small><strong>${props.artif==="artif"?"Sol artificialisé":"Sol non artificialisé"}</strong></div></div><a class="source-link" target="_blank" rel="noopener" href="https://data.geopf.fr/annexes/ressources/legendes/OCSGE.COUVERTURE-legend.png">Voir la légende complète IGN ↗</a>`
    :`<span class="detail-tag">Occupation du sol · IGN OCS GE</span><h2>Aucune donnée à ce point</h2><p class="subtitle">Essayez de cliquer un peu plus près d’une zone colorée, ou zoomez davantage.</p>`;
  document.getElementById("detailPanel").classList.add("open");
}
map.on("click",async e=>{
  const active=["couverture","artif"].some(id=>document.getElementById(`layer-${id}`)?.checked);
  if(!active)return;
  document.getElementById("detailContent").innerHTML=`<span class="detail-tag">Occupation du sol · IGN OCS GE</span><h2>Identification…</h2><p class="subtitle">Interrogation de la couche au point cliqué.</p>`;
  document.getElementById("detailPanel").classList.add("open");
  try{const props=await identifyOcsGe(e.latlng);openIdentify(e.latlng,props)}
  catch(err){document.getElementById("detailContent").innerHTML=`<span class="detail-tag">Occupation du sol · IGN OCS GE</span><h2>Identification indisponible</h2><p class="subtitle">Le service d’identification IGN n’a pas répondu. Réessayez dans un instant.</p>`}
});

async function fetchConsoEspace(echelle,code){
  const cacheKey=`${echelle}:${code}`;
  if(state.communeCache[cacheKey])return state.communeCache[cacheKey];
  const d=await fetchJson(`${CEREMA_API}/indicateurs/conso_espace/${echelle}/${code}/?ordering=annee`);
  state.communeCache[cacheKey]=d.results||[];
  return state.communeCache[cacheKey];
}

function zanTarget(rows){
  const ref=rows.filter(r=>r.annee>=2011&&r.annee<=2020);
  const avg=ref.length?ref.reduce((a,r)=>a+r.naf_arti,0)/ref.length:null;
  return avg===null?null:avg*0.5;
}

async function mapWithConcurrency(items,limit,worker){
  const results=new Array(items.length);let i=0;
  async function run(){while(i<items.length){const idx=i++;results[idx]=await worker(items[idx],idx)}}
  await Promise.all(Array.from({length:Math.min(limit,items.length)},run));
  return results;
}

async function rankCommunes(){
  if(state.communeRanking)return state.communeRanking;
  const list=(state.communes?.features||[]).map(f=>({nom:f.properties.nom,code:f.properties.code}));
  const rows=await mapWithConcurrency(list,20,async c=>{
    try{const r=await fetchConsoEspace("communes",c.code);return {nom:c.nom,code:c.code,total:r.reduce((a,x)=>a+x.naf_arti,0)}}
    catch(e){return {nom:c.nom,code:c.code,total:0}}
  });
  state.communeRanking=rows.filter(r=>r.total>0).sort((a,b)=>b.total-a.total);
  return state.communeRanking;
}

const IDF_DEPARTEMENTS={"75":"Paris","77":"Seine-et-Marne","78":"Yvelines","91":"Essonne","92":"Hauts-de-Seine","93":"Seine-Saint-Denis","94":"Val-de-Marne","95":"Val-d’Oise"};
async function regionalComparison(){
  if(state.regional)return state.regional;
  const codes=Object.keys(IDF_DEPARTEMENTS);
  const rows=await mapWithConcurrency(codes,8,async code=>{
    try{const r=await fetchConsoEspace("departements",code);const ref=r.filter(x=>x.annee>=2011&&x.annee<=2020);const avg=ref.length?ref.reduce((a,x)=>a+x.naf_arti,0)/ref.length:0;return {code,nom:IDF_DEPARTEMENTS[code],avg}}
    catch(e){return {code,nom:IDF_DEPARTEMENTS[code],avg:0}}
  });
  state.regional=rows.sort((a,b)=>b.avg-a.avg);
  return state.regional;
}

async function openCommune(nom,code){
  document.getElementById("detailContent").innerHTML=`<span class="detail-tag">Trajectoire ZAN · Cerema</span><h2>${htmlSafe(nom)}</h2><p class="subtitle">Consommation d’espace communale</p><p class="subtitle">Chargement des données…</p>`;
  document.getElementById("detailPanel").classList.add("open");
  try{
    const rows=await fetchConsoEspace("communes",code);
    if(!rows.length){document.getElementById("detailContent").innerHTML+=`<p class="subtitle">Aucune donnée de consommation d’espace publiée pour cette commune.</p>`;return}
    const target=zanTarget(rows);
    const total=rows.reduce((a,r)=>a+r.naf_arti,0);
    const recent=rows.filter(r=>r.annee>=Math.max(...rows.map(r=>r.annee))-2);
    const recentAvg=recent.length?recent.reduce((a,r)=>a+r.naf_arti,0)/recent.length:0;
    const guide=themeGuide.friches;
    document.getElementById("detailContent").innerHTML=`<span class="detail-tag">Trajectoire ZAN · Cerema</span><h2>${htmlSafe(nom)}</h2><p class="subtitle">Consommation d’espace communale · ${rows[0].annee}-${rows[rows.length-1].annee}</p><div class="property-grid"><div class="property"><small>ENAF consommés depuis ${rows[0].annee}</small><strong>${fmtHa(total)}</strong></div><div class="property"><small>Moyenne 3 dernières années</small><strong>${fmtHa(recentAvg)}/an</strong></div>${target!==null?`<div class="property"><small>Objectif ZAN 2021-2031</small><strong>${fmtHa(target)}/an max</strong></div>`:""}</div><div class="trajectory-card"><strong>Historique annuel</strong>${rows.slice().reverse().map(r=>`<div class="trajectory-row"><time>${r.annee}</time><span>ENAF consommés</span><b>${fmtHa(r.naf_arti)}</b></div>`).join("")}</div><a class="source-link" target="_blank" rel="noopener" href="https://artificialisation.developpement-durable.gouv.fr/mesurer/donnees?code=${code}&echelle=communes">Consulter la fiche officielle ↗</a>`;
  }catch(e){
    document.getElementById("detailContent").innerHTML+=`<p class="subtitle">Les données de consommation d’espace sont momentanément indisponibles pour cette commune.</p>`;
    console.error(e);
  }
}

async function search(){
  const q=document.getElementById("searchInput").value.trim();if(!q)return;
  const box=document.getElementById("searchResults");
  try{
    const r=await fetch(`https://geo.api.gouv.fr/communes?nom=${encodeURIComponent(q)}&codeDepartement=95&fields=nom,code,centre&boost=population&limit=6`);
    const items=await r.json();
    box.innerHTML=items.length?items.map((c,i)=>`<button data-i="${i}">${c.nom}</button>`).join(""):"<button>Aucune commune trouvée dans le Val-d’Oise</button>";
    box.hidden=false;
    box.querySelectorAll("button[data-i]").forEach(b=>b.onclick=()=>{
      const c=items[+b.dataset.i];
      if(c.centre)map.flyTo([c.centre.coordinates[1],c.centre.coordinates[0]],13);
      openCommune(c.nom,c.code);
      box.hidden=true;
    });
  }catch(e){box.innerHTML="<button>Recherche momentanément indisponible</button>";box.hidden=false}
}

function refreshLegend(){
  const active=[...sources].reverse().filter(s=>document.getElementById(`layer-${s.id}`)?.checked&&layers[s.id]&&map.hasLayer(layers[s.id]));
  if(active.length)renderLegend(active);
  else{state.legendId=null;document.getElementById("mapLegend").innerHTML=`<div class="legend-empty"><strong>Lecture de la carte</strong><span>Activez une couche pour afficher sa légende.</span></div>`}
}
function renderLegend(activeSources){
  const list=Array.isArray(activeSources)?activeSources:[activeSources];
  const el=document.getElementById("mapLegend");
  state.legendId=list[0]?.id;
  el.innerHTML=list.map(source=>{
    let rows,link="";
    if(source.id==="friches")rows=[["#8a5a44","Friche recensée (couleur = zonage)"]];
    else if(source.id==="conso_communes"){
      const b=state.choroBreaks||[0,0,0,0];
      rows=[["#eef1f6","Aucune donnée"],[CHORO_RAMP[0],`< ${fmtHa(b[0])}`],[CHORO_RAMP[1],`${fmtHa(b[0])} – ${fmtHa(b[1])}`],[CHORO_RAMP[2],`${fmtHa(b[1])} – ${fmtHa(b[2])}`],[CHORO_RAMP[3],`${fmtHa(b[2])} – ${fmtHa(b[3])}`],[CHORO_RAMP[4],`> ${fmtHa(b[3])}`]];
    }
    else if(source.id==="couverture")rows=Object.values(CS_NOMENCLATURE).map(v=>[v.color,v.label]);
    else if(source.id==="artif")rows=[["rgb(255,55,122)","Sol artificialisé"],["#eef1f6","Sol non artificialisé (fond neutre)"]];
    else rows=[[source.color,source.title]];
    const hint=source.kind==="wmts"?`<p style="margin:8px 0 0;font-size:9px;line-height:1.4;color:#647381">Cliquez n’importe où sur la carte pour identifier précisément le point (couverture, usage, surface).</p>`:"";
    return `<div class="legend-content"><strong>${source.title}</strong>${rows.map(([c,l])=>`<span><i style="background:${c}"></i>${l}</span>`).join("")}${hint}${link}</div>`;
  }).join("");
}

function renderLayers(){
  const groups=[...new Set(sources.map(s=>s.group))];
  document.getElementById("layerList").innerHTML=groups.map(g=>`<section class="layer-group"><div class="group-title">${g}</div>${sources.filter(s=>s.group===g).map(s=>`<label class="layer-row" style="--layer-color:${s.color}"><input id="layer-${s.id}" type="checkbox" ${s.active?"checked":""}><span class="layer-label"><strong>${s.title}</strong><small>${s.count} · ${s.date}</small><span class="layer-help">${themeGuide[s.id]?.short||""}</span></span><span class="legend-swatch" style="background:${s.color}"></span></label>`).join("")}</section>`).join("");
  sources.forEach(s=>document.getElementById(`layer-${s.id}`).addEventListener("change",e=>setLayer(s,e.target.checked)));
}

function renderSources(){
  document.getElementById("sourceCards").innerHTML=sources.map(s=>`<article class="source-card"><div><h3>${s.title}</h3><p>${themeGuide[s.id]?.what||""}<br><b>Lecture :</b> ${themeGuide[s.id]?.read||""}<br>Producteur : ${s.producer} · ${s.date}</p><span class="source-status">Connectée à l’API</span></div><a href="${s.id==="friches"?"https://cartofriches.cerema.fr/cartofriches/":"https://artificialisation.developpement-durable.gouv.fr/"}" target="_blank" rel="noopener">Ouvrir ↗</a></article>`).join("")
  +`<article class="source-card"><div><h3>Consommation d’espace & trajectoire ZAN</h3><p>Indicateur annuel de consommation d’espaces naturels, agricoles et forestiers, calculé par le Cerema à partir des Fichiers fonciers (DGFiP).<br><b>Lecture :</b> utilisé pour la recherche communale et le tableau de bord.<br>Producteur : Cerema · DGALN · 2011-2024</p><span class="source-status">Connectée à l’API</span></div><a href="https://artificialisation.developpement-durable.gouv.fr/" target="_blank" rel="noopener">Ouvrir ↗</a></article>`;
}

async function buildDashboard(){
  const button=document.getElementById("openDashboard"),label=button.textContent;
  button.disabled=true;button.textContent="Préparation…";
  try{
    const [rows,,ranking,regional]=await Promise.all([fetchConsoEspace("departements","95"),loadFriches(),rankCommunes(),regionalComparison()]);
    rows.sort((a,b)=>a.annee-b.annee);
    const target=zanTarget(rows);
    const years=rows.map(r=>r.annee);
    const totals=rows.map(r=>r.naf_arti);
    const totalSince2011=rows.reduce((a,r)=>a+r.naf_arti,0);
    const last=rows[rows.length-1];
    const refAvg=rows.filter(r=>r.annee>=2011&&r.annee<=2020).reduce((a,r,_,arr)=>a+r.naf_arti/arr.length,0);
    const recentYears=rows.filter(r=>r.annee>=years[years.length-1]-2);
    const recentAvg=recentYears.reduce((a,r,_,arr)=>a+r.naf_arti/arr.length,0);
    const pctVsTarget=target?Math.round((recentAvg/target)*100):null;

    document.getElementById("dashboardKpis").innerHTML=[
      [fmtHa(totalSince2011),`ENAF consommés depuis ${years[0]}`,"Val-d’Oise · cumul"],
      [`${fmtHa(refAvg)}/an`,"rythme moyen 2011-2020","Décennie de référence ZAN"],
      [target?`${fmtHa(target)}/an`:"—","objectif maximal 2021-2031","Loi Climat et résilience · -50 %"],
      [`${state.friches.features.length}`,"friches recensées",`${fmtHa(state.friches.features.reduce((a,f)=>a+(f.properties.site_surface||0),0))} au total`]
    ].map(([v,l,s])=>`<article><strong>${v}</strong><span>${l}</span><small>${s}</small></article>`).join("");

    state.charts.forEach(c=>c.destroy());state.charts=[];
    const font={family:"Marianne"},common={responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{titleFont:font,bodyFont:font}},scales:{x:{grid:{display:false},ticks:{font}},y:{beginAtZero:true,grid:{color:"#edf1f3"},ticks:{font}}}};

    state.charts.push(new Chart(document.getElementById("trajectoryChart"),{type:"bar",data:{labels:years,datasets:[
      {label:"ENAF consommés (ha)",data:totals.map(v=>v/10000),backgroundColor:years.map(y=>y>=2021?"#c65f52":"#000091"),borderRadius:4},
      {label:"Objectif ZAN max (ha/an)",data:years.map(y=>y>=2021&&target?target/10000:null),type:"line",borderColor:"#18753c",borderDash:[6,4],pointRadius:0,tension:0}
    ]},options:{...common,plugins:{legend:{display:true,position:"bottom",labels:{boxWidth:12,font}},tooltip:common.plugins.tooltip},scales:{...common.scales,y:{...common.scales.y,title:{display:true,text:"Hectares",font}}}}}));

    const usageKeys=["conso_hab","conso_act","conso_mix","conso_infra","conso_inc"];
    state.charts.push(new Chart(document.getElementById("usageChart"),{type:"doughnut",data:{labels:usageKeys.map(k=>usageLabels[k]),datasets:[{data:usageKeys.map(k=>last[k]),backgroundColor:usageKeys.map(k=>usageColors[k]),borderColor:"#fff",borderWidth:3}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:"bottom",labels:{boxWidth:10,font}},tooltip:common.plugins.tooltip}}}));

    const zoneCounts={};state.friches.features.forEach(f=>{const z=f.properties.urba_zone_type||"Non renseigné";zoneCounts[z]=(zoneCounts[z]||0)+1});
    const zoneKeys=Object.keys(zoneCounts);
    state.charts.push(new Chart(document.getElementById("frichesChart"),{type:"bar",data:{labels:zoneKeys.map(k=>zoneLabels[k]||k),datasets:[{data:zoneKeys.map(k=>zoneCounts[k]),backgroundColor:zoneKeys.map(k=>zoneColors[k]||"#94a3b8"),borderRadius:5}]},options:{...common,indexAxis:"y"}}));

    const topCommunes=ranking.slice(0,12);
    state.charts.push(new Chart(document.getElementById("communesChart"),{type:"bar",data:{labels:topCommunes.map(c=>c.nom),datasets:[{data:topCommunes.map(c=>c.total/10000),backgroundColor:"#000091",borderRadius:4}]},options:{...common,indexAxis:"y",scales:{...common.scales,x:{...common.scales.x,title:{display:true,text:"Hectares cumulés",font}}}}}));

    state.charts.push(new Chart(document.getElementById("regionalChart"),{type:"bar",data:{labels:regional.map(d=>d.nom),datasets:[{data:regional.map(d=>d.avg/10000),backgroundColor:regional.map(d=>d.code==="95"?"#000091":"#c7d0e3"),borderRadius:5}]},options:{...common,scales:{...common.scales,y:{...common.scales.y,title:{display:true,text:"ha/an",font}}}}}));

    document.getElementById("insightValue").textContent=pctVsTarget!==null?`${pctVsTarget} %`:"—";
    document.getElementById("insightText").textContent=pctVsTarget!==null?`de l’objectif ZAN annuel est consommé en moyenne sur les 3 dernières années (${fmtHa(recentAvg)}/an, objectif max ${fmtHa(target)}/an). En ${last.annee}, ${fmtHa(last.naf_arti)} d’ENAF ont été consommés dans le Val-d’Oise.`:"Analyse en cours.";

    document.getElementById("dashboardDialog").showModal();
  }catch(e){
    console.error(e);
    document.getElementById("dashboardKpis").innerHTML="<p class=\"subtitle\">Le tableau de bord est momentanément indisponible.</p>";
    document.getElementById("dashboardDialog").showModal();
  }finally{button.disabled=false;button.textContent=label}
}

async function init(){
  renderLayers();renderSources();
  try{
    const r=await fetch("https://geo.api.gouv.fr/departements/95/communes?fields=nom,code,centre,contour&format=geojson&geometry=contour");
    const communes=await r.json();
    state.communes=communes;
    const holes=[];communes.features.forEach(f=>{const g=f.geometry;if(g.type==="Polygon")holes.push(g.coordinates[0]);else if(g.type==="MultiPolygon")g.coordinates.forEach(p=>holes.push(p[0]))});
    L.geoJSON({type:"Feature",properties:{},geometry:{type:"Polygon",coordinates:[[[-180,-85],[180,-85],[180,85],[-180,85],[-180,-85]],...holes]}},{pane:"maskPane",interactive:false,className:"map-mask",style:{stroke:false,fillColor:"#e7ebf2",fillOpacity:.94,fillRule:"evenodd"}}).addTo(map);
    const territory=L.geoJSON(communes,{pane:"boundaryPane",interactive:false,style:{color:"#565b6c",weight:.7,opacity:.68,fillOpacity:0}}).addTo(map);
    map.invalidateSize();
    map.fitBounds(territory.getBounds(),{padding:[38,38]});
    document.getElementById("resetView").onclick=()=>map.fitBounds(territory.getBounds(),{padding:[28,28]});
  }catch(e){document.getElementById("resetView").onclick=()=>map.fitBounds(BOUNDS_95)}
  await Promise.allSettled(sources.filter(s=>s.active).map(s=>setLayer(s,true)));
  refreshLegend();
  document.getElementById("mapStatus").textContent="4 couches cartographiques prêtes · IGN Géoplateforme + Cerema";
}

document.getElementById("searchButton").onclick=search;
document.getElementById("searchInput").addEventListener("keydown",e=>{if(e.key==="Enter")search()});
document.getElementById("resetPanel").onclick=()=>document.getElementById("resetView").click();
document.getElementById("closeDetail").onclick=()=>document.getElementById("detailPanel").classList.remove("open");
document.getElementById("clearLayers").onclick=()=>sources.forEach(s=>{const e=document.getElementById(`layer-${s.id}`);if(e.checked){e.checked=false;setLayer(s,false)}});
document.getElementById("openSources").onclick=()=>document.getElementById("sourcesDialog").showModal();
document.getElementById("openDashboard").onclick=buildDashboard;
document.querySelectorAll("[data-close]").forEach(b=>b.onclick=()=>document.getElementById(b.dataset.close).close());
const mobileLayers=document.getElementById("mobileLayers"),layerSidebar=document.getElementById("layerSidebar");
mobileLayers.onclick=()=>{const open=layerSidebar.classList.toggle("open");mobileLayers.setAttribute("aria-expanded",String(open));mobileLayers.textContent=open?"Fermer":"Données"};

init();
