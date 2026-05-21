// ═══════════════════════════════════════════════════════
// CLAUDY — Schedule Module (v2 - fixed rendering)
// ═══════════════════════════════════════════════════════
const Schedule = (() => {
  let selectedDay = new Date().getDay();

  function render() {
    renderDayScroller();
    renderTimeline(selectedDay);
    renderHomeSchedule();
  }

  function renderDayScroller() {
    const scroller = document.getElementById('day-scroller');
    if (!scroller) return;
    const days = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
    const now = new Date();
    scroller.innerHTML = days.map((d,i) => {
      const date = new Date(now);
      date.setDate(now.getDate() - now.getDay() + i);
      return `<div class="day-pill ${i===selectedDay?'active':''}" onclick="Schedule.selectDay(${i})">
        <span class="day-num">${date.getDate()}</span>
        <span>${d}</span>
      </div>`;
    }).join('');
  }

  function selectDay(dow) {
    selectedDay = dow;
    renderDayScroller();
    renderTimeline(dow);
  }

  function timeToMins(t) {
    if (!t) return 0;
    const [h,m] = t.split(':').map(Number);
    return h*60+m;
  }

  function fmtTime(t) {
    const [h,m] = t.split(':').map(Number);
    const ap = h<12?'am':'pm';
    const h12 = h%12||12;
    return `${h12}:${String(m).padStart(2,'0')}${ap}`;
  }

  function renderTimeline(dow) {
    const tl = document.getElementById('timeline-full');
    if (!tl) return;

    const blocks = FIXED_SCHEDULE[dow]||[];
    const tasks = (DB.get('tasks')||[]).filter(t=>t.time&&!t.postponed&&!t.done);
    const now = new Date();
    const nowMins = now.getHours()*60 + now.getMinutes();
    const isToday = dow === now.getDay();

    // Type → style mapping
    const typeStyle = {
      class:   { cls:'class',   dot:'fixed' },
      fixed:   { cls:'fixed',   dot:'fixed' },
      gym:     { cls:'gym',     dot:''      },
      travel:  { cls:'free',    dot:''      },
      personal:{ cls:'free',    dot:''      },
      sleep:   { cls:'free',    dot:''      },
      free:    { cls:'free',    dot:''      },
      project: { cls:'task',    dot:''      },
      trading: { cls:'task',    dot:''      },
    };

    let html = '';
    let renderedBlocks = new Set();

    // Render from 6:00 to 01:30 next day in 30-min slots
    for (let slot=360; slot<1500; slot+=30) {
      const slotH = Math.floor(slot/60)%24;
      const slotM = slot%60;
      const timeLabel = `${String(slotH).padStart(2,'0')}:${String(slotM).padStart(2,'0')}`;
      const slotMinsNorm = slot%1440; // normalized to 0-1440

      // Find block covering this slot
      let matchBlock = null;
      for (const b of blocks) {
        const bs = timeToMins(b.time);
        let be = timeToMins(b.end);
        // Handle midnight crossing
        if (be <= bs) be += 1440;
        // Normalize slot for comparison
        let slotCheck = slotMinsNorm;
        if (slotCheck < bs && bs > 1200) slotCheck += 1440;
        if (slotCheck >= bs && slotCheck < be) { matchBlock = b; break; }
      }

      // Find task at this slot
      const matchTask = tasks.find(t => {
        const [th,tm] = t.time.split(':').map(Number);
        const taskMins = th*60+tm;
        return Math.abs(taskMins - slotMinsNorm) < 30;
      });

      const isPast = isToday && slotMinsNorm < nowMins && slotMinsNorm > 300;
      const isCurrent = isToday && slotMinsNorm <= nowMins && slotMinsNorm+30 > nowMins;

      const dotClass = isCurrent ? 'current' : isPast ? 'past' : (matchBlock?.type==='class'||matchBlock?.type==='fixed') ? 'fixed' : '';

      let content = '';
      const blockKey = matchBlock ? `${matchBlock.time}-${matchBlock.label}` : null;

      if (matchBlock && !renderedBlocks.has(blockKey)) {
        renderedBlocks.add(blockKey);
        const st = typeStyle[matchBlock.type]||{cls:'free',dot:''};
        content = `<div class="tl-event ${st.cls}" style="${isPast?'opacity:0.45':''}">
          <div class="tl-event-title">${matchBlock.label}</div>
          <div class="tl-event-sub">${fmtTime(matchBlock.time)} → ${fmtTime(matchBlock.end)}</div>
        </div>`;
      } else if (matchBlock && renderedBlocks.has(blockKey)) {
        // continuation — skip rendering, just add line
        html += `<div class="tl-row">
          <div class="tl-time-col" style="color:var(--text4)">${timeLabel}</div>
          <div class="tl-stem"><div class="tl-dot" style="background:var(--border)"></div><div class="tl-line"></div></div>
          <div class="tl-block-wrap"></div>
        </div>`;
        continue;
      } else if (matchTask) {
        renderedBlocks.clear(); // reset block tracking
        content = `<div class="tl-event task">
          <div class="tl-event-title">${matchTask.title}</div>
          <div class="tl-event-sub">${matchTask.time} · ${matchTask.cat}</div>
        </div>`;
      } else {
        renderedBlocks.clear();
        content = `<div class="tl-event free">Libre</div>`;
      }

      html += `<div class="tl-row">
        <div class="tl-time-col" style="${isCurrent?'color:var(--accent2);font-weight:500':''}${isPast?';color:var(--text4)':''}">${timeLabel}</div>
        <div class="tl-stem">
          <div class="tl-dot ${dotClass}" style="${isCurrent?'box-shadow:0 0 0 3px rgba(124,110,245,0.2)':''}"></div>
          <div class="tl-line"></div>
        </div>
        <div class="tl-block-wrap">${content}</div>
      </div>`;
    }

    tl.innerHTML = html;

    // Scroll to current time
    if (isToday) {
      setTimeout(() => {
        const rows = tl.querySelectorAll('.tl-row');
        const currentIdx = Math.floor((nowMins - 360) / 30);
        if (rows[currentIdx]) rows[currentIdx].scrollIntoView({behavior:'smooth', block:'center'});
      }, 300);
    }
  }

  function renderHomeSchedule() {
    const el = document.getElementById('home-schedule');
    if (!el) return;
    const dow = new Date().getDay();
    const blocks = FIXED_SCHEDULE[dow]||[];
    const now = new Date();
    const nowMins = now.getHours()*60 + now.getMinutes();

    // Show next 4 upcoming blocks
    const upcoming = blocks.filter(b => {
      const bMins = timeToMins(b.time);
      const adjustedMins = bMins < 360 ? bMins + 1440 : bMins;
      const adjustedNow = nowMins < 360 ? nowMins + 1440 : nowMins;
      return adjustedMins >= adjustedNow - 30;
    }).slice(0, 4);

    const typeColors = {
      class:'var(--accent)',fixed:'var(--green)',gym:'var(--amber)',
      travel:'var(--text3)',personal:'var(--blue)',sleep:'var(--pink)',
      free:'var(--text4)',project:'#F87171',trading:'var(--teal)'
    };

    el.innerHTML = upcoming.length ? upcoming.map(b => {
      const bMins = timeToMins(b.time);
      const adjustedBMins = bMins < 360 ? bMins + 1440 : bMins;
      const adjustedNow = nowMins < 360 ? nowMins + 1440 : nowMins;
      const isCurrent = adjustedBMins <= adjustedNow && adjustedBMins+90 > adjustedNow;
      const color = typeColors[b.type]||'var(--text2)';
      return `<div class="home-sched-item" style="${isCurrent?'border-color:'+color+';border-width:1px':''}">
        <div class="home-sched-dot" style="background:${color}${isCurrent?';box-shadow:0 0 6px '+color:''}"></div>
        <span class="home-sched-time">${b.time}</span>
        <span class="home-sched-label">${b.label}</span>
        ${isCurrent?`<span style="font-size:10px;color:${color};font-weight:500">Ahora</span>`:''}
      </div>`;
    }).join('') : `<div style="text-align:center;padding:16px;font-size:13px;color:var(--text3)">Sin actividades próximas hoy</div>`;
  }

  return { render, renderDayScroller, renderTimeline, renderHomeSchedule, selectDay };
})();
