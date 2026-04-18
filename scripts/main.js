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
  const mainContent = document.getElementById('main-content');
  const sidebar = document.getElementById('sidebar');
  const toggleBtn = document.getElementById('sidebar-toggle');

  toggleBtn.addEventListener('click', () => {
    sidebar.classList.toggle('collapsed');
    mainContent.classList.toggle('collapsed');
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
        window.location.hash = `${activeClub}_${v.toLowerCase()}`;
        loadData(activeClub);
      }
    }
    
    w.appendChild(opt);
    if (!activeWeek) weekSelect(opt, v);
  });

  const introScreen = document.getElementById('intro-screen');
  const dashboardView = document.getElementById('dashboard-view');
  const closeChartBtn = document.getElementById('close-chart-btn');

  for (let k in ClubID) {
    let n = ClubID[k];
    let opt = document.createElement("button");
    opt.innerText = n;
    opt.classList.add("ui-btn");
    
    opt.onclick = function() { 
      clubSelect(this, k);
      window.location.hash = `${k}_${activeWeek.toLowerCase()}`;
      
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

  function handleHash() {
    const hash = window.location.hash.substring(1); 
    if (!hash || !hash.includes('_')) return;

    const [clubId, weekId] = hash.split('_');
    if (activeClub === clubId && activeWeek?.toLowerCase() === weekId.toLowerCase()) {
      return;
    }

    const weekBtns = document.querySelectorAll('#week-select .ui-btn');
    weekBtns.forEach((btn, index) => {
      if (weekId.toLowerCase() === `w${index + 1}`) {
        weekSelect(btn, WeekID[index]);
      }
    });

    const clubBtns = document.querySelectorAll('#club-select .ui-btn');
    const clubName = ClubID[clubId.toLowerCase()];
    
    clubBtns.forEach(btn => {
      if (btn.innerText === clubName) {
        introScreen.classList.add('hidden');
        dashboardView.classList.remove('hidden');
        clubSelect(btn, clubId.toLowerCase());
        loadData(clubId.toLowerCase());
      }
    });
  }

  window.addEventListener('hashchange', handleHash);
  setTimeout(handleHash, 500);

  document.addEventListener('click', (e) => {
    if (e.target.tagName === 'A' && e.target.getAttribute('href').startsWith('#')) {
      setTimeout(handleHash, 10);
    }
  });
})();