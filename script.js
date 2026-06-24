const URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vR9TmuIYc5_n77zqGnAncqb3qgG5z7JPKh3k5lbXmLdztFQOuFeh3Tm8DRiny8HlySCW4EzUi1V6lje/pub?output=csv";

let data = [];
let charts = {};
let filters = { Empresa: [], Nivel: [], Material: [] };

/* LOAD CSV */
Papa.parse(URL, {
  download: true,
  header: true,
  skipEmptyLines: true,
  complete: res => {

    console.log("RAW:", res.data.length);

    data = res.data.map(cleanRow).filter(r => r.Cantidad > 0);

    console.log("CLEAN:", data.length);

    init();
  }
});

/* LIMPIEZA */
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

/* FILTROS */
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
function filteredData() {
  return data.filter(d =>
    (!filters.Empresa.length || filters.Empresa.includes(d.Empresa)) &&
    (!filters.Nivel.length || filters.Nivel.includes(d.Nivel)) &&
    (!filters.Material.length || filters.Material.includes(d.Material))
  );
}

/* DASHBOARD */
function render() {
  const d = filteredData();

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

  setValue("totalKPI", total);
  setValue("empresasKPI", emp.size);
  setValue("topTecKPI", getTopValue(tec));
  setValue("topNivelKPI", getTopValue(niv));
}

function setValue(id, val) {
  document.getElementById(id).innerText =
    typeof val === "number" ? Math.round(val).toLocaleString() : val;
}

/* FIX DEL ERROR ORIGINAL */
function getTopValue(obj) {
  return Object.keys(obj).reduce((a,b)=> obj[a]>obj[b]?a:b,"-");
}

/* RANKING */
function updateRanking(d) {
  const grouped = group(d,"Tecnologia");
  const el = document.getElementById("rankingTable");
  el.innerHTML = "";

  Object.entries(grouped)
    .sort((a,b)=>b[1]-a[1])
    .slice(0,10)
    .forEach((r,i)=>{
      el.innerHTML += `
        <tr>
          <td>${i+1}</td>
          <td>${r[0]}</td>
          <td>${Math.round(r[1]).toLocaleString()}</td>
        </tr>`;
    });
}

/* GROUP */
function group(d, key) {
  return d.reduce((a,x)=>{
    a[x[key]] = (a[x[key]]||0)+x.Cantidad;
    return a;
  },{});
}

/* CHARTS */
function drawCharts(d) {
  Object.values(charts).forEach(c => c?.destroy());

  charts.tech = createChart("techChart","bar", group(d,"Tecnologia"));
  charts.mat = createChart("materialChart","pie", group(d,"Material"));
  charts.niv = createChart("nivelChart","bar", group(d,"Nivel"));
}

function createChart(id, type, dataset) {
  return new Chart(document.getElementById(id), {
    type,
    data: {
      labels: Object.keys(dataset),
      datasets: [{ data: Object.values(dataset) }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false
    }
  });
}
