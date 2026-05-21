// ═══════════════════════════════════════════════════════
// CLAUDY — Schedule Module
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
    const html = days.map((d,i)=>{
      const date = new Date(now);
      date.setDate(now.getDate() - now.getDay() + i);
      return `<div class="day-pill ${i===selectedDay?'active':''}" onclick="Schedule.selectDay(${i})">
        <span class="day-num">${date.getDate()}</span>
        <span>${d}</span>
      </div>`;
    }).join('');
    scroller.innerHTML = html;
  }

  function selectDay(dow) {
    selectedDay = dow;
    renderDayScroller();
    renderTimeline(dow);
  }

  function renderTimeline(dow) {
    const tl = document.getElementById('timeline-full');
    if (!tl) return;
    const blocks = FIXED_SCHEDULE[dow]||[];
    const tasks = DB.get('tasks').filter(t=>t.time&&!t.postponed);
    const now = new Date();
    const nowMins = now.getHours()*60 + now.getMinutes();
    const isToday = dow === new Date().getDay();

    // Build slot list 6:00 → 01:00
    const slots = [];
    for (let h=6;h<25;h++) {
      for (let m=0;m<60;m+=30) {
        const actualH = h%24;
        const mins = actualH*60+m;
        const timeStr = `${String(actualH).padStart(2,'0')}:${String(m).padStart(2,'0')}`;

        // Find matching fixed block
        let block = null;
        for (const b of blocks) {
          const bs = timeToMins(b.time), be = timeToMins(b.end);
          const adjBe = be<=bs?be+1440:be;
          const adjMins = mins<bs&&bs>1200?mins+1440:mins;
          if (adjMins>=bs && adjMins<adjBe) { block=b; break; }
        }

        // Find task at this time
        const task = tasks.find(t=>{
          const [th,tm]=t.time.split(':').map(Number);
          return th===actualH&&Math.abs(tm-m)<30;
        });

        const isPast = isToday && mins < nowMins;
        const isCurrent = isToday && mins <= nowMins && mins+30 > nowMins;

        slots.push({time:timeStr, block, task, isPast, isCurrent, mins});
      }
    }

    // Deduplicate consecutive same blocks
    let lastBlock = null;
    const html = slots.map(slot=>{
      let content = '';
      const dotClass = slot.isCurrent?'current':slot.isPast?'past':slot.block?.type==='class'||slot.block?.type==='fixed'?'fixed':'';

      if (slot.block && slot.block!==lastBlock) {
        lastBlock = slot.block;
        const typeClass = {class:'class',fixed:'fixed',gym:'gym',travel:'',personal:'',sleep:'',free:'free',project:'task',trading:'task'}[slot.block.type]||'task';
        content = `<div class="tl-event ${typeClass}">
          <div class="tl-event-title">${slot.block.label}</div>
          <div class="tl-event-sub">${slot.block.time} – ${slot.block.end}</div>
        </div>`;
      } else if (slot.block) {
        content = ''; // continuation
      } else if (slot.task) {
        lastBlock = null;
        content = `<div class="tl-event task">
          <div class="tl-event-title">${slot.task.title}</div>
          <div class="tl-event-sub">${slot.task.time} · ${slot.task.cat}</div>
        </div>`;
      } else {
        lastBlock = null;
        content = `<div class="tl-event free">Libre</div>`;
      }

      if (!content && slot.block) return '';

      return `<div class="tl-row">
        <div class="tl-time-col">${slot.time}</div>
        <div class="tl-stem">
          <div class="tl-dot ${dotClass}"></div>
          <div class="tl-line"></div>
        </div>
        <div class="tl-block-wrap">${content}</div>
      </div>`;
    }).join('');

    tl.innerHTML = html;
  }

  function renderHomeSchedule() {
    const el = document.getElementById('home-schedule');
    if (!el) return;
    const dow = new Date().getDay();
    const blocks = (FIXED_SCHEDULE[dow]||[]).slice(0,4);
    const now = new Date();
    const nowMins = now.getHours()*60+now.getMinutes();

    el.innerHTML = blocks.map(b=>{
      const bMins = timeToMins(b.time);
      const isPast = bMins+60 < nowMins;
      const typeColors = {class:'var(--accent)',fixed:'var(--green)',gym:'var(--amber)',travel:'var(--text3)',personal:'var(--blue)',sleep:'var(--pink)',free:'var(--text4)',project:'var(--red)',trading:'var(--teal)'};
      const color = typeColors[b.type]||'var(--text2)';
      return `<div class="home-sched-item" style="${isPast?'opacity:0.4':''}">
        <div class="home-sched-dot" style="background:${color}"></div>
        <span class="home-sched-time">${b.time}</span>
        <span class="home-sched-label">${b.label}</span>
      </div>`;
    }).join('');
  }

  function timeToMins(t) {
    const [h,m] = t.split(':').map(Number);
    return h*60+m;
  }

  return { render, renderDayScroller, renderTimeline, renderHomeSchedule, selectDay };
})();
