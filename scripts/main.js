const chartCont = document.getElementById("ChartCont");
var datastore = {};
var activeClub = null;
var loadClub = null;
var activeWeek = null;
var clubMode = false;

async function loadData(clubid) {
  let canv = document.getElementById("myChart");
  if (!canv) {
    canv = document.createElement("canvas");
    canv.id = "myChart";
    chartCont.appendChild(canv);
  }

  const dataPath = `data/clubdata_${clubid}_${activeWeek.toLowerCase()}.json`;

  try {
    const response = await fetch(dataPath);
    if (!response.ok) throw new Error(`Could not load ${dataPath}`);
    datastore = await response.json();
    
    activeClub = clubid;
    visualize(datastore);

  } catch (err) {
    console.error("Error loading club data:", err);
  }
}

function attemptReload() {
  if (activeWeek && loadClub) {
    if (loadClub !== activeClub || datastore === null) {
      loadData(loadClub);
    }
  }
}

function toggleFullscreen() {
  const app = document.getElementById('app-container');
  if (!document.fullscreenElement) {
    app.requestFullscreen().catch(err => {
      console.error(`Error attempting to enable fullscreen: ${err.message}`);
    });
  } else {
    document.exitFullscreen();
  }
}

document.addEventListener('fullscreenchange', () => {
  const btn = document.getElementById('fullscreen-btn');
  btn.innerText = document.fullscreenElement ? "✖ Exit Fullscreen" : "⛶ Fullscreen";
});

(() => {
  const sidebar = document.getElementById('sidebar');
  const toggleBtn = document.getElementById('sidebar-toggle');

  toggleBtn.addEventListener('click', () => {
    sidebar.classList.toggle('collapsed');
    if (sidebar.classList.contains('collapsed')) {
      toggleBtn.innerText = '▶';
    } else {
      toggleBtn.innerText = '◀';
    }
    setTimeout(() => {
      const ctx = document.getElementById('myChart');
      if (ctx && ctx._chart) {
        ctx._chart.resize();
      }
    }, 310);
  });

  const bottomPanel = document.getElementById('bottom-panel');
  const bottomToggle = document.getElementById('bottom-toggle');

  bottomToggle.addEventListener('click', () => {
    bottomPanel.classList.toggle('collapsed');
    if (bottomPanel.classList.contains('collapsed')) {
      bottomToggle.innerText = '▲';
    } else {
      bottomToggle.innerText = '▼';
    }
    setTimeout(() => {
      const ctx = document.getElementById('myChart');
      if (ctx && ctx._chart) {
        ctx._chart.resize();
      }
    }, 310);
  });
  
  document.getElementById('fullscreen-btn').addEventListener('click', toggleFullscreen);

  const w = document.getElementById("week-select");
  const r = document.getElementById("club-select");

  function weekSelect(t, v) {
    for (let e of t.parentElement.children) e.classList.remove("active");
    t.classList.add("active");
    activeWeek = v;
  }

  function clubSelect(t, v) {
    for (let e of t.parentElement.children) e.classList.remove("active");
    t.classList.add("active");
    loadClub = v;
  }

  WeekID.forEach((v, index) => {
    let opt = document.createElement("button");
    opt.innerText = `Week ${index + 1}`; 
    opt.classList.add("ui-btn");
    
    opt.onclick = function() { 
      weekSelect(this, v);
      if (activeClub) {
        loadData(activeClub);
      }
    }
    
    w.appendChild(opt);
    if (!activeWeek) weekSelect(opt, v);
  });

  const introScreen = document.getElementById('intro-screen');
  const dashboardView = document.getElementById('dashboard-view');
  const closeChartBtn = document.getElementById('close-chart-btn');

  for (let k in Club_Opts) {
    let n = Club_Opts[k];
    let opt = document.createElement("button");
    opt.innerText = n;
    opt.classList.add("ui-btn");
    
    opt.onclick = function() { 
      clubSelect(this, k);
      introScreen.classList.add('hidden');
      dashboardView.classList.remove('hidden');
      loadData(k);
    }
    r.appendChild(opt);
  }

  closeChartBtn.addEventListener('click', () => {
    dashboardView.classList.add('hidden');
    introScreen.classList.remove('hidden');
    for (let e of r.children) {
      e.classList.remove("active");
    }

    activeClub = null;
    loadClub = null;
    datastore = {};
  });
})();