ENABLE_ANALYSIS = false
POINT_DEBUG = false

function getColorFromID(id) {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz1234567890'
  const r = [];
  for (let c of id) {
    r.push(letters.indexOf(c))
  }

  let a = (r[1] * r[2] * r[0]) % 256
  let b = (r[3] * r[4] * r[7]) % 256
  let c = (r[6] * r[7] * r[5]) % 256
  
  return '#' + a.toString(16).padStart(2, '0') + b.toString(16).padStart(2, '0') + c.toString(16).padStart(2, '0')
}

const isActive = (ctx) => (ctx.p0.parsed?.x & 1) || (ctx.p1.parsed?.x & 1) || (ctx.p0.parsed?.y != ctx.p1.parsed?.y)
const skipColor = (ctx) => isActive(ctx) ? undefined : ctx.p0.options.borderColor + '29';
const skipDash = (ctx) => isActive(ctx) ? undefined : [5, 5];

const tracked = {
  elements: {}
}

const renderHooks = {
  update: [],
  load: [],
  register: function(key, fnc) {
    this[key].push(fnc)
  },
  run: function(key) {
    for (let fnc of this[key]) fnc()
  }
}

function track_click(e) {
  tracked.elements = {};
  for (let elem of e.chart.getActiveElements()) {
    const idx = elem.datasetIndex;
    tracked.elements[idx] = elem.element.raw;
  }

  const intersected = e.chart.getElementsAtEventForMode(e.native, 'nearest', { intersect: true }, false);
  
  if (intersected.length > 0) {
    const el = intersected[0];
    const dataset = e.chart.data.datasets[el.datasetIndex];
    const rawData = dataset.data[el.index];

    const memberName = dataset.memberName;
    
    if (dataset.memberId === 'average') return;

    const memberId = dataset.memberId;
    const x = rawData.x;
    const y = rawData.y;
	if (POINT_DEBUG) {
		document.getElementById('modal-memberId').innerText = memberId;
		document.getElementById('modal-x').innerText = x;
		document.getElementById('modal-y').innerText = y;

		
		const jsonSnippet = {
		  "clubName": Club_Opts[activeClub],
		  "memberName": memberName,
		  "memberId": memberId,
		  "club": activeClub,
		  "week": activeWeek,
		  "x": x,
		  "y": y,
		  "text": "Review this point",
		  "type": "flag"
		};
		
		document.getElementById('modal-json-output').value = JSON.stringify(jsonSnippet, null, 2) + ",";
		document.getElementById('annotation-modal').classList.remove('modal-hidden');
	}
  }
}

window.closeModal = function() {
  document.getElementById('annotation-modal').classList.add('modal-hidden');
}

window.copyModalJson = function() {
  const textarea = document.getElementById('modal-json-output');
  textarea.select();
  document.execCommand("copy");
  
  const copyBtn = document.querySelector('.copy-btn');
  const oldText = copyBtn.innerText;
  copyBtn.innerText = "Copied!";
  setTimeout(() => copyBtn.innerText = oldText, 1000);
}

function gen_text(tooltipItems) {
  console.log(tooltipItems)
  return "X"
}

function gen_footer(tooltipItems) {
  let diffs = []
  for (let item of tooltipItems) {
    const idx = item.datasetIndex
    if (tracked.elements[idx]) {
      let a = tracked.elements[idx]
      let b = item.element.raw
      let x = b.x > a.x ? 1 : -1
      diffs.push([(b.y - a.y) * x, (b.x - a.x) * x])
    }
  }
  if (diffs.length > 0) {
    let _strs = []
    for (let _ of diffs) {
      let pts = _[0] 
      let m = Math.round(_[1] / 60 / 1000)
      let ttime = m + 'm'
      if (m > 60) {
        let h = Math.floor(m / 60)
        m = m % 60
        ttime = `${h}h ${m}m`
      }
      _strs.push(`Gained ${pts} in ${ttime}`)
    }
    return _strs.join("\n")
  }
  return null
}

function analyzeBehavior(pointsData) {
  if (!ENABLE_ANALYSIS) return []
  let flags = [];
  let cmEvents = []; 
  
  for (let i = 1; i < pointsData.length; i++) {
    let prev = pointsData[i - 1];
    let curr = pointsData[i];
    
    let pointsGained = curr.y - prev.y;
    let timeElapsedMins = (curr.x - prev.x) / (1000 * 60);

    if (pointsGained <= 0) continue;

    
    if (pointsGained >= 10000 && timeElapsedMins <= 70) {
      flags.push({ time: curr.x, y: curr.y, reason: "Impossible Speed (>10k in 70m)" });
    }

    
    if (pointsGained >= 2500 && pointsGained <= 2700 && timeElapsedMins <= 20) {
      flags.push({ time: curr.x, y: curr.y, reason: "Suspected Double Drinks" });
    }

    
    if (pointsGained === 400) {
      
      let recentCM = cmEvents.find(t => (curr.x - t) < 86400000);
      
      if (recentCM) { 
        flags.push({ time: curr.x, y: curr.y, reason: "Repeated CM 400 Glitch (<24h)" });
      }
      
      cmEvents.push(curr.x); 
    }
  }
  
  return flags;
}

function buildAnnotations(manualAnnotations) {
  let annotationsArray = [];

  manualAnnotations.forEach((anno) => {
    let memberColor = getColorFromID(anno.memberId);

    
    if (anno.range && anno.range.length === 2) {
      
      
      let boxConfig = {
        type: 'box',
        xMin: anno.range[0],
        xMax: anno.range[1],
        backgroundColor: memberColor + '33', 
        borderColor: memberColor,
        borderWidth: 1,
        label: {
          display: true,
          content: [anno.text],
          position: { x: 'center', y: 'start' }, 
          yAdjust: -20, 
          color: memberColor,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          font: { size: 11, weight: 'bold' },
          padding: 4,
          borderRadius: 4,
          borderWidth: 1,
          borderColor: memberColor
        }
      };

      
      if (anno.yRange && anno.yRange.length === 2) {
        boxConfig.yMin = Math.min(anno.yRange[0], anno.yRange[1]);
        boxConfig.yMax = Math.max(anno.yRange[0], anno.yRange[1]);
      }

      annotationsArray.push(boxConfig);
      
    } 
    
    else if (anno.x && anno.y) {
      annotationsArray.push({
        type: 'label',
        xValue: anno.x,
        yValue: anno.y,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        color: '#fff',
        font: { size: 11, weight: 'bold' },
        content: [anno.text],
        padding: 4,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: memberColor,
        yAdjust: -20, 
        callout: { display: true, borderColor: memberColor, borderWidth: 1 }
      });
    }
  });

  return annotationsArray;
}

const PRE_GRAP = 300000 + 1000

const insert = (arr, idx, ni) => [ ...arr.slice(0, idx), ni, ...arr.slice(idx) ]

async function visualize(datastore) {
 tracked.elements = {};
  const data = {
    datasets: []
  };
  
  let manualAnnotations = [];

  try {
    const res = await fetch('data/manual_annotations.json');
    if (res.ok) {
      let allAnnotations = await res.json();
      manualAnnotations = allAnnotations.filter(anno => {
        if (anno.club && anno.club !== activeClub) return false;
        if (anno.week && anno.week !== activeWeek) return false;
        if (!datastore.datasets[anno.memberId]) return false;
        return true;
      });
    }
  } catch (e) {
    console.warn("Could not load manual annotations, skipping.", e);
  }
  let chartAnnotations = buildAnnotations(manualAnnotations);

  let clubText = "";
  try {
    const textRes = await fetch('data/texts.json');
    if (textRes.ok) {
      let allTexts = await textRes.json();

      let matchedText = allTexts.find(t => t.club === activeClub && t.week === activeWeek);
      
      if (matchedText) {
        clubText = matchedText.text;
      }
    }
  } catch (e) {
    console.warn("Could not load texts.json, skipping.", e);
  }

  
  const notesArea = document.getElementById('notes-area');
  const bottomPanel = document.getElementById('bottom-panel');
  const bottomToggle = document.getElementById('bottom-toggle');

  if (clubText !== "") {
    notesArea.textContent = clubText;
    bottomPanel.classList.remove('hidden');
    bottomPanel.classList.remove('collapsed');
    if(bottomToggle) bottomToggle.innerText = '▼';
  } else {
    notesArea.value = "";
    bottomPanel.classList.add('hidden');
    bottomPanel.classList.add('collapsed');
    if(bottomToggle) bottomToggle.innerText = '▲';
  }

  for (let id in datastore.datasets) {
    let v = datastore.datasets[id];
    let isSuspicious = false;
    
    if (id != 'average') {
      let pre = v[0]
      let inserts = []
      
      
      let flags = analyzeBehavior(v);
      if (flags.length > 0) isSuspicious = true;

      
      flags.forEach(flag => {
        chartAnnotations.push({
          type: 'point',
          xValue: flag.time,
          yValue: flag.y,
          backgroundColor: '#ff0044',
          borderColor: 'white',
          borderWidth: 2,
          radius: 6,
          label: {
            display: true,
            content: flag.reason,
            backgroundColor: '#ff0044',
            position: 'end'
          }
        });
      });
    }

    let p = datastore.profiles[id];

    let d = {
      memberId: id,
      memberName: p?.name || id,
      data: v,
      fill: false,
      tension: 0.1,
      borderWidth: isSuspicious ? 3 : 2, 
      radius: isSuspicious ? 2 : 0, 
      order: isSuspicious ? 0 : 1 
    }
    
    if (id == 'average') {
      d.label = "Average Points"
      d.borderColor = '#f009'
      d.color = 'gray'
      d.fill = true
      d.borderWidth = 1
    } else {
      let p = datastore.profiles[id]
      let baseLabel = p?.name ? `${p.name} | Lv ${p.lvl}` : id;
      d.label = isSuspicious ? `⚠️ ${baseLabel} (FLAGGED)` : baseLabel;
      
      let col = getColorFromID(id);
      d.borderColor = isSuspicious ? '#ff0044' : col;
      d.color = isSuspicious ? '#ff0044' : col;
      
      d.segment = {
        borderColor: ctx => skipColor(ctx),
        borderDash: ctx => skipDash(ctx),
      }
    }
    
    data.datasets.push(d)
  }

  const ctx = document.getElementById('myChart');
  if (ctx._chart) ctx._chart.destroy()

  const labelSort = (a,b) => {
    let x = data.datasets[a.datasetIndex]
    let y = data.datasets[b.datasetIndex]
    let xl = x.data[x.data.length - 1]
    let yl = y.data[y.data.length - 1]
    return yl.y - xl.y
  }

  const labelAdjust = (lbl, dset) => {
    lbl.fillStyle = lbl.strokeStyle
    lbl.text = lbl.text.split('|')
    return lbl
  }
  
ctx._chart = new Chart(ctx, {
    type: 'line',
    data: data,
    radius: 0,
    defaults: { 
      color: '#f0f0f0' // GLOBAL TEXT COLOR
    },
    options: {
      layout: {
        padding: {
          left: 10,
          right: 30, // Room for the legend
          top: 20,   // Room for the top labels
          bottom: 10
        }
      },
      responsive: true,
      maintainAspectRatio: false,
      onClick: track_click,
      interaction: { 
        intersect: false, 
        mode: "nearest"
      },
      plugins: {
        legend: { 
          display: true,
          position: 'right',
          labels: {
            color: '#ffffff', // MEMBER NAMES COLOR
            pointStyle: 'circle',
            usePointStyle: true,
            boxHeight: 5,
            sort: labelSort,
            filter: labelAdjust
          }
        },
        title: {
          display: true,
          color: '#00e0ff', // CLUB NAME COLOR
          text: Club_Opts[activeClub]
        },
        tooltip: {
          callbacks: {
            footer: gen_footer,
            text: gen_text
          },
          usePointStyle: true
        },
        annotation: {
          annotations: chartAnnotations
        },
        zoom: {
          limits: {
            x: {min: 'original', max: 'original', minRange: 1000 * 60 * 60 * 16},
            y: {min: 'original', max: 'original', minRange: 8000} 
          },
          pan: {
            enabled: true,
            mode: 'xy',  
          },
          zoom: {
            wheel: { enabled: true },
            pinch: { enabled: true },
            mode: 'xy',
            speed: 0.1
          }
        }
      },
      scales: {
        x: {
          display: true,
          bounds: 'data',
          type: 'time',
          title: {
            display: false, // Change to true if you want the word 'Time' to appear
            text: 'Time',
            color: '#ffcc00' // 'TIME' WORD COLOR
          },
          ticks: {
            color: '#ffffff' // TIME FRAME NUMBERS COLOR
          },
          time: {
            unit: 'hour',
            displayFormats: { hour: 'dd/MM HH:mm' },
            tooltipFormat: 'dd/MM HH:mm'
          }
        },
        y: {
          display: true,
          bounds: 'ticks',
          afterFit: (axis) => { 
            axis.width = 75; 
          },
          title: {
            display: true,
            text: 'Points',
            color: '#00e0ff'
          },
          grid: {
            color: function(context) {
              if (context.tick.value % 1000) return '#3332';
              return '#5337';
            },
          },
          ticks: {
            padding: 5,
            includeBounds: true,
            autoSkip: false,
            color: '#ffffff',
            callback: function(value) {
              if (value % 1000) return '';
              return value;
            },
          },
        }
      }
    },
  });
  renderHooks.run("load")
}

window.addEventListener("resize", function(event) {
  const ctx = document.getElementById('myChart');
  if (ctx && ctx._chart) {
    ctx._chart.resize();
  }
});