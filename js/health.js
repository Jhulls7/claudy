// ═══════════════════════════════════════════════════════
// CLAUDY — Health Module (v2)
// ═══════════════════════════════════════════════════════
const Health = (() => {
  let sleepStart = null; // timestamp cuando se fue a dormir

  function render() {
    const health = DB.get('health');
    const score = Engine.calculateHealthScore();
    const deficits = Engine.getDeficits();

    Engine.drawRing('health-main-ring', score,
      score>=75?'#22C55E':score>=50?'#F59E0B':'#EF4444', '#1F1F28');
    const sv = document.getElementById('health-score-val');
    if (sv) sv.textContent = score;

    // Métricas
    const recentSleep = (health.sleep||[]).slice(-1)[0];
    const todayWater = getTodayWater(health);
    const gymThisWeek = (health.gym_sessions||[]).filter(s=>(new Date()-new Date(s.date))<7*86400000).length;
    const recentMood = (health.mood||[]).slice(-1)[0];

    const metrics = [
      { icon:'😴', label:'Sueño anoche', val: recentSleep?`${recentSleep.hours}h`:'—', max:8, cur:recentSleep?.hours||0, color:'#A99DF7', status: !recentSleep?'warn':(recentSleep.hours>=6.5?'good':'bad') },
      { icon:'💧', label:'Agua hoy', val: `${todayWater.toFixed(1)}L`, max:2, cur:todayWater, color:'#3B82F6', status: todayWater>=2?'good':todayWater>=1?'warn':'bad' },
      { icon:'💪', label:'Gym esta semana', val:`${gymThisWeek}/3`, max:3, cur:gymThisWeek, color:'#F59E0B', status:gymThisWeek>=3?'good':gymThisWeek>=2?'warn':'bad' },
      { icon:'😊', label:'Ánimo hoy', val:recentMood?`${recentMood.score}/10`:'—', max:10, cur:recentMood?.score||0, color:'#22C55E', status:!recentMood?'warn':(recentMood.score>=7?'good':recentMood.score>=5?'warn':'bad') },
    ];

    const grid = document.getElementById('health-metrics-grid');
    if (grid) grid.innerHTML = metrics.map(m=>`
      <div class="metric-card">
        <div class="metric-header"><span class="metric-icon">${m.icon}</span><span class="metric-status ${m.status}"></span></div>
        <div class="metric-val">${m.val}</div>
        <div class="metric-lbl">${m.label}</div>
        <div class="metric-bar"><div class="metric-bar-fill" style="width:${Math.min(100,m.cur/m.max*100)}%;background:${m.color}"></div></div>
      </div>`).join('');

    renderLogForm(health, todayWater);

    // Déficits
    const dl = document.getElementById('deficit-list');
    if (dl) dl.innerHTML = deficits.length ? deficits.map(d=>`
      <div class="deficit-card">
        <span class="deficit-icon">${d.icon}</span>
        <span class="deficit-text">${d.text}</span>
        <button class="deficit-action">${d.action} →</button>
      </div>`).join('') : `<div style="text-align:center;padding:20px;color:var(--text3);font-size:13px">✅ Sin déficits detectados hoy</div>`;
  }

  function getTodayWater(health) {
    const today = new Date().toDateString();
    return (health.water||[])
      .filter(w => new Date(w.date).toDateString() === today)
      .reduce((a,b) => a + (b.liters||0), 0);
  }

  function renderLogForm(health, todayWater) {
    const logForm = document.getElementById('health-log-form');
    if (!logForm) return;

    const isSleeping = !!localStorage.getItem('claudy_sleep_start');
    const sleepStartTime = localStorage.getItem('claudy_sleep_start');
    const glasses = Math.round(todayWater / 0.25);

    // Peso semanal
    const lastWeightEntry = (health.weight_log||[]).slice(-1)[0];
    const daysSinceWeight = lastWeightEntry ? Math.floor((Date.now()-new Date(lastWeightEntry.date))/86400000) : 999;
    const showWeight = daysSinceWeight >= 7;

    logForm.innerHTML = `
      <!-- SUEÑO -->
      <div style="grid-column:1/-1">
        <div style="font-size:12px;color:var(--text2);margin-bottom:8px;font-weight:500">😴 Sueño</div>
        <div style="display:flex;gap:8px">
          ${!isSleeping
            ? `<button class="log-btn" style="flex:1;background:var(--accent-dim);color:var(--accent2);border:0.5px solid var(--accent)" onclick="Health.startSleep()">
                🌙 Me voy a dormir ahora
               </button>`
            : `<div style="flex:1;background:var(--green-dim);border:0.5px solid rgba(34,197,94,0.3);border-radius:var(--r3);padding:10px 14px;font-size:13px;color:var(--green)">
                😴 Durmiendo desde ${formatTime(sleepStartTime)}
               </div>
               <button class="log-btn" style="background:var(--green);border-color:var(--green);white-space:nowrap" onclick="Health.stopSleep()">
                ☀️ Me desperté
               </button>`
          }
        </div>
        ${lastWeightEntry ? `<div style="font-size:11px;color:var(--text3);margin-top:6px">Último registro: ${lastWeightEntry.hours}h el ${new Date(lastWeightEntry.date).toLocaleDateString('es')}</div>` : ''}
      </div>

      <!-- AGUA -->
      <div style="grid-column:1/-1">
        <div style="font-size:12px;color:var(--text2);margin-bottom:8px;font-weight:500">💧 Agua — ${todayWater.toFixed(2)}L hoy (${glasses} vaso${glasses!==1?'s':''})</div>
        <div style="display:flex;gap:8px;align-items:center">
          <div style="flex:1;background:var(--bg4);border-radius:var(--r3);height:8px;overflow:hidden">
            <div style="height:100%;width:${Math.min(100,todayWater/2*100)}%;background:${todayWater>=2?'var(--green)':todayWater>=1?'var(--blue)':'var(--amber)'};border-radius:var(--r3);transition:width 0.4s"></div>
          </div>
          <span style="font-size:11px;color:var(--text3);white-space:nowrap">Meta: 2L</span>
        </div>
        <div style="display:flex;gap:6px;margin-top:10px;flex-wrap:wrap">
          <button class="log-btn" style="flex:1;min-width:80px" onclick="Health.addWater(0.25)">+1 vaso<br><span style="font-size:10px;opacity:0.7">250ml</span></button>
          <button class="log-btn" style="flex:1;min-width:80px;background:var(--blue-dim);color:var(--blue);border-color:var(--blue)" onclick="Health.addWater(0.5)">+2 vasos<br><span style="font-size:10px;opacity:0.7">500ml</span></button>
          <button class="log-btn" style="flex:1;min-width:80px;background:var(--teal-dim);color:var(--teal);border-color:var(--teal)" onclick="Health.addWater(1)">+1 litro<br><span style="font-size:10px;opacity:0.7">1000ml</span></button>
          ${todayWater>0?`<button onclick="Health.resetWater()" style="padding:8px;border-radius:var(--r3);border:0.5px solid var(--border);background:transparent;color:var(--text3);font-size:11px;cursor:pointer">Reset</button>`:''}
        </div>
      </div>

      <!-- ÁNIMO -->
      <div style="grid-column:1/-1">
        <div style="font-size:12px;color:var(--text2);margin-bottom:8px;font-weight:500">😊 Ánimo de hoy</div>
        <div style="display:flex;align-items:center;gap:12px">
          <span style="font-size:20px" id="mood-emoji">😐</span>
          <input type="range" min="1" max="10" value="${(health.mood||[]).slice(-1)[0]?.score||5}" id="mood-slider"
            oninput="Health.updateMoodEmoji(this.value)"
            style="flex:1;accent-color:var(--accent);height:6px">
          <span style="font-size:14px;font-weight:600;color:var(--text);min-width:20px;text-align:right" id="mood-val">${(health.mood||[]).slice(-1)[0]?.score||5}</span>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--text3);margin-top:4px">
          <span>Muy mal</span><span>Regular</span><span>Excelente</span>
        </div>
        <button class="log-btn" style="margin-top:10px" onclick="Health.saveMood()">Guardar ánimo</button>
      </div>

      <!-- PESO (solo semanal) -->
      ${showWeight ? `
      <div style="grid-column:1/-1">
        <div style="font-size:12px;color:var(--text2);margin-bottom:8px;font-weight:500">⚖️ Peso semanal${daysSinceWeight===999?'' : ` — hace ${daysSinceWeight} días`}</div>
        <div style="display:flex;gap:8px">
          <input class="form-input" type="number" id="log-weight" step="0.1" placeholder="kg (opcional)">
          <button class="log-btn" style="white-space:nowrap" onclick="Health.saveWeight()">Guardar</button>
        </div>
      </div>` : `<div style="grid-column:1/-1;font-size:11px;color:var(--text3);text-align:center">⚖️ Próximo registro de peso en ${7-daysSinceWeight} día${7-daysSinceWeight!==1?'s':''}</div>`}
    `;

    // Init mood emoji
    const slider = document.getElementById('mood-slider');
    if (slider) updateMoodEmoji(slider.value);
  }

  function formatTime(ts) {
    if (!ts) return '—';
    const d = new Date(parseInt(ts));
    return d.toLocaleTimeString('es', {hour:'2-digit',minute:'2-digit'});
  }

  function startSleep() {
    localStorage.setItem('claudy_sleep_start', Date.now().toString());
    UI.snack('🌙 Buenas noches — sueño iniciado');
    render();
  }

  function stopSleep() {
    const start = localStorage.getItem('claudy_sleep_start');
    if (!start) return;
    const hours = (Date.now() - parseInt(start)) / 3600000;
    localStorage.removeItem('claudy_sleep_start');
    DB.update('health', h => {
      h.sleep = h.sleep||[];
      h.sleep.push({date:new Date().toISOString(), hours:parseFloat(hours.toFixed(2))});
      if (h.sleep.length>90) h.sleep=h.sleep.slice(-90);
      return h;
    });
    Engine.awardXP(5, 'Sueño registrado');
    UI.snack(`☀️ Dormiste ${hours.toFixed(1)}h — registrado`);
    render();
    Charts.renderHealthChart();
  }

  function addWater(liters) {
    DB.update('health', h => {
      h.water = h.water||[];
      h.water.push({date:new Date().toISOString(), liters});
      if (h.water.length>500) h.water=h.water.slice(-500);
      return h;
    });
    UI.snack(`💧 +${liters>=1?liters+'L':Math.round(liters*1000)+'ml'} de agua`);
    render();
  }

  function resetWater() {
    const today = new Date().toDateString();
    DB.update('health', h => {
      h.water = (h.water||[]).filter(w => new Date(w.date).toDateString() !== today);
      return h;
    });
    UI.snack('Agua del día reiniciada');
    render();
  }

  function updateMoodEmoji(val) {
    const emojis = {1:'😭',2:'😢',3:'😞',4:'😕',5:'😐',6:'🙂',7:'😊',8:'😄',9:'😁',10:'🤩'};
    const emojiEl = document.getElementById('mood-emoji');
    const valEl = document.getElementById('mood-val');
    if (emojiEl) emojiEl.textContent = emojis[val]||'😐';
    if (valEl) valEl.textContent = val;
  }

  function saveMood() {
    const val = parseInt(document.getElementById('mood-slider')?.value||5);
    DB.update('health', h => {
      h.mood = h.mood||[];
      h.mood.push({date:new Date().toISOString(), score:val});
      if (h.mood.length>90) h.mood=h.mood.slice(-90);
      return h;
    });
    Engine.awardXP(3, 'Ánimo registrado');
    UI.snack('😊 Ánimo guardado');
    render();
  }

  function saveWeight() {
    const w = parseFloat(document.getElementById('log-weight')?.value||0);
    if (!w||w<30||w>200) { UI.snack('Peso inválido'); return; }
    DB.update('health', h => {
      h.weight = w;
      h.weight_log = h.weight_log||[];
      h.weight_log.push({date:new Date().toISOString(), kg:w});
      return h;
    });
    UI.snack(`⚖️ Peso guardado: ${w}kg`);
    render();
  }

  function logGymSession() {
    DB.update('health', h=>{
      h.gym_sessions=h.gym_sessions||[];
      h.gym_sessions.push({date:new Date().toISOString()});
      if(h.gym_sessions.length>200) h.gym_sessions=h.gym_sessions.slice(-200);
      return h;
    });
    DB.update('stats',s=>{s.gymSessions=(s.gymSessions||0)+1;return s;});
    Engine.awardXP(15,'Sesión de gym 💪');
    UI.snack('💪 Sesión de gym registrada');
    render();
  }

  return { render, startSleep, stopSleep, addWater, resetWater, updateMoodEmoji, saveMood, saveWeight, logGymSession };
})();
