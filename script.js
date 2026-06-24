const URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vR9TmuIYc5_n77zqGnAncqb3qgG5z7JPKh3k5lbXmLdztFQOuFeh3Tm8DRiny8HlySCW4EzUi1V6lje/pub?output=csv";

let data = [];
let charts = {};
let filters = { Empresa: [], Nivel: [], Material: [] };

/* LOAD */
Papa.parse(URL, {
  download: true,
  header: true,
  skipEmptyLines: true,
  complete: res => {
    data = res.data.map(cleanRow).filter(r => r.Cantidad > 0);
    init();
  }
});

function cleanRow(r) {
  return {
    Empresa: (r.Empresa || "").trim(),
    Tecnologia: (r.Tecnologia || "").trim(),
    Material: (r.Material || "").trim(),
    Nivel: (r.Nivel || "").trim(),
    Cantidad: parseFloat((r.Cantidad_m || "0").replace(/,/g, "")) || 0
  };
}

/* INIT */
function init() {
  buildFilters();
  render();
}

/* FILTER UI */
function buildFilters() {
  createBtns("empresaFilter", unique("Empresa"), "Empresa");
  createBtns("nivelFilter", unique("Nivel"), "Nivel");
  createBtns("materialFilter", unique("Material"), "Material");

  document.getElementById("resetBtn").onclick = () => {
    filters = { Empresa: [], Nivel: [], Material: [] };
    document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
    render();
  };
}

function createBtns(id, list, key) {
  const el = document.getElementById(id);

  list.forEach(v => {
    const b = document.createElement("button");
    b.className = "filter-btn";
    b.innerText = v;

    b.onclick = () => {
      b.classList.toggle("active");

      if (filters[key].includes(v))
        filters[key] = filters[key].filter(x => x !== v);
      else
        filters[key].push(v);

      render();
    };

    el.appendChild(b);
  });
}

function unique(k) {
  return [...new Set(data.map(d => d[k]).filter(Boolean))];
}

/* DATA */
function filtered() {
  return data.filter(d =>
    (!filters.Empresa.length || filters.Empresa.includes(d.Empresa)) &&
    (!filters.Nivel.length || filters.Nivel.includes(d.Nivel)) &&
    (!filters.Material.length || filters.Material.includes(d.Material))
  );
}

/* RENDER */
function render() {
  const d = filtered();

  updateKPIs(d);
  updateRanking(d);
  drawCharts(d);
}

/* KPIS */
function updateKPIs(d) {
  let total = 0, emp = new Set(), tec = {}, niv = {};

  d.forEach(x => {
    total += x.Cantidad;
    emp.add(x.Empresa);
    tec[x.Tecnologia] = (tec[x.Tecnologia] || 0) + x.Cantidad;
    niv[x.Nivel] = (niv[x.Nivel] || 0) + x.Cantidad;
  });

  set("totalKPI", total);
  set("empresasKPI", emp.size);
  set("topTecKPI", top(tec));
  set("topNivelKPI", top(niv));
}

function set(id, val) {
  document.getElementById(id).innerText =
    typeof val === "number" ? Math.round(val).toLocaleString() : val;
}

function top(obj) {
  return Object.keys(obj).reduce((a,b)=> obj[a]>obj[b]?a:b,"-");
}

/* RANK */
function updateRanking(d) {
  const t = group(d,"Tecnologia");
  const el = document.getElementById("rankingTable");
  el.innerHTML = "";

  Object.entries(t).sort((a,b)=>b[1]-a[1]).slice(0,10)
    .forEach((r,i)=>{
      el.innerHTML += `<tr><td>${i+1}</td><td>${r[0]}</td><td>${Math.round(r[1]).toLocaleString()}</td></tr>`;
    });
}

/* GROUP */
function group(d, k) {
  return d.reduce((a,x)=>{
    a[x[k]] = (a[x[k]]||0)+x.Cantidad;
    return a;
  },{});
}

/* CHARTS */
function drawCharts(d) {
  Object.values(charts).forEach(c => c?.destroy());

  charts.tech = chart("techChart","bar", group(d,"Tecnologia"));
  charts.mat = chart("materialChart","pie", group(d,"Material"));
  charts.niv = chart("nivelChart","bar", group(d,"Nivel"));
}

function chart(id, type, obj) {
  return new Chart(document.getElementById(id), {
    type,
    data: {
      labels: Object.keys(obj),
      datasets: [{ data: Object.values(obj) }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false
    }
  });
}
