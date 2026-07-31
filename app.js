const BOUNDS_95 = [[48.89,1.60],[49.25,2.60]];
const CEREMA_API = "https://apidf-preprod.cerema.fr";
const usageLabels = {conso_hab:"Habitat",conso_act:"Activité",conso_mix:"Mixte",conso_infra:"Infrastructures",conso_inc:"Non déterminé"};
const usageColors = {conso_hab:"#000091",conso_act:"#e1000f",conso_mix:"#7a5af8",conso_infra:"#009081",conso_inc:"#94a3b8"};
const zoneLabels = {U:"Zone urbaine (U)",AU:"À urbaniser (AU)",A:"Agricole (A)",N:"Naturelle (N)"};
const zoneColors = {U:"#b8752a",AU:"#c3992a",A:"#18753c",N:"#0078f3"};

const sources = [
  {id:"couverture",title:"Occupation du sol (OCS GE)",date:"Millésime 2024-2026",group:"Occupation du sol",color:"#8a5a44",kind:"wmts",wmtsLayer:"OCSGE.COUVERTURE.2024-2026",count:"Couche IGN nationale",active:true,producer:"IGN · Géoplateforme"},
  {id:"artif",title:"Espaces artificialisés (OCS GE)",date:"Millésime 2024-2026",group:"Occupation du sol",color:"#c65f52",kind:"wmts",wmtsLayer:"OCSGE.ARTIF.2024-2026",count:"Zones construites identifiées",active:false,producer:"IGN · Géoplateforme"},
  {id:"friches",title:"Friches recensées",date:"Cartofriches · actualisation continue",group:"Potentiels fonciers",color:"#b8752a",kind:"friches",api:`${CEREMA_API}/cartofriches/geofriches/`,count:"— sites",active:true,producer:"Cerema · Cartofriches"}
];

const themeGuide = {
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
  return L.tileLayer(`https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=${source.wmtsLayer}&STYLE=normal&TILEMATRIXSET=PM_6_16&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&FORMAT=image/png`,{minZoom:6,maxZoom:16,opacity:.82,attribution:"IGN · Géoplateforme"});
}

async function loadFriches(){
  if(state.friches)return state.friches;
  const url=`${sources.find(s=>s.id==="friches").api}?coddep=95&page_size=300&fields=all`;
  const r=await fetch(url);if(!r.ok)throw new Error(`Cartofriches ${r.status}`);
  const d=await r.json();
  state.friches=d;
  document.getElementById("frichesCount").textContent=`${d.features.length} friches recensées`;
  const countLabel=sources.find(s=>s.id==="friches");countLabel.count=`${d.features.length} sites`;
  return d;
}

function friceStyle(){return {color:"#8a5a44",weight:1.5,fillColor:"#c65f52",fillOpacity:.42}}

async function loadLayer(source){
  if(layers[source.id])return layers[source.id];
  if(source.kind==="wmts"){layers[source.id]=wmtsLayer(source);return layers[source.id]}
  if(source.kind==="friches"){
    const data=await loadFriches();
    layers[source.id]=L.geoJSON(data,{style:friceStyle,onEachFeature:(f,l)=>{l.on("click",()=>openFriche(f));l.bindTooltip(f.properties.site_nom||f.properties.comm_nom||"Friche",{sticky:true})}});
    return layers[source.id];
  }
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

async function fetchConsoEspace(echelle,code){
  const cacheKey=`${echelle}:${code}`;
  if(state.communeCache[cacheKey])return state.communeCache[cacheKey];
  const r=await fetch(`${CEREMA_API}/indicateurs/conso_espace/${echelle}/${code}/?ordering=annee`);
  if(!r.ok)throw new Error(`Cerema ${r.status}`);
  const d=await r.json();
  state.communeCache[cacheKey]=d.results||[];
  return state.communeCache[cacheKey];
}

function zanTarget(rows){
  const ref=rows.filter(r=>r.annee>=2011&&r.annee<=2020);
  const avg=ref.length?ref.reduce((a,r)=>a+r.naf_arti,0)/ref.length:null;
  return avg===null?null:avg*0.5;
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
    const rows=source.id==="friches"?[["#c65f52","Friche recensée"]]:source.id==="artif"?[["#c65f52","Espace artificialisé identifié"]]:[["#8a5a44","Voir la légende IGN ↗"]];
    return `<div class="legend-content"><strong>${source.title}</strong>${rows.map(([c,l])=>`<span><i style="background:${c}"></i>${l}</span>`).join("")}${source.id!=="friches"?`<a href="https://data.geopf.fr/annexes/ressources/legendes/${source.wmtsLayer}-legend.png" target="_blank" rel="noopener" style="display:block;margin-top:8px;font-size:9px;color:#000091;font-weight:700">Voir la légende officielle ↗</a>`:""}</div>`;
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
    const [rows]=await Promise.all([fetchConsoEspace("departements","95"),loadFriches()]);
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
    const holes=[];communes.features.forEach(f=>{const g=f.geometry;if(g.type==="Polygon")holes.push(g.coordinates[0]);else if(g.type==="MultiPolygon")g.coordinates.forEach(p=>holes.push(p[0]))});
    L.geoJSON({type:"Feature",properties:{},geometry:{type:"Polygon",coordinates:[[[-180,-85],[180,-85],[180,85],[-180,85],[-180,-85]],...holes]}},{pane:"maskPane",interactive:false,className:"map-mask",style:{stroke:false,fillColor:"#e7ebf2",fillOpacity:.94,fillRule:"evenodd"}}).addTo(map);
    const territory=L.geoJSON(communes,{pane:"boundaryPane",interactive:false,style:{color:"#565b6c",weight:.7,opacity:.68,fillOpacity:0}}).addTo(map);
    map.invalidateSize();
    map.fitBounds(territory.getBounds(),{padding:[38,38]});
    document.getElementById("resetView").onclick=()=>map.fitBounds(territory.getBounds(),{padding:[28,28]});
  }catch(e){document.getElementById("resetView").onclick=()=>map.fitBounds(BOUNDS_95)}
  await Promise.allSettled(sources.filter(s=>s.active).map(s=>setLayer(s,true)));
  refreshLegend();
  document.getElementById("mapStatus").textContent="3 couches cartographiques prêtes · IGN Géoplateforme + Cerema";
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
