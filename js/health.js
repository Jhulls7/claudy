// ═══════════════════════════════════════════════════════
// CLAUDY — Health Module
// ═══════════════════════════════════════════════════════
const Health = (() => {
  function render() {
    const health = DB.get('health');
    const score = Engine.calculateHealthScore();
    const deficits = Engine.getDeficits();

    // Main ring
    Engine.drawRing('health-main-ring', score,
      score>=75?'#22C55E':score>=50?'#F59E0B':'#EF4444', '#1F1F28');
    const sv = document.getElementById('health-score-val');
    if (sv) sv.textContent = score;

    // Metrics grid
    const recentSleep = (health.sleep||[]).slice(-1)[0];
    const recentWater = (health.water||[]).slice(-1)[0];
    const gymThisWeek = (health.gym_sessions||[]).filter(s=>(new Date()-new Date(s.date))<7*86400000).length;
    const recentMood = (health.mood||[]).slice(-1)[0];

    const metrics = [
      { icon:'😴', label:'Sueño anoche', val: recentSleep?`${recentSleep.hours}h`:'—', max:8, cur:recentSleep?.hours||0, color:'#A99DF7', status: !recentSleep?'warn':(recentSleep.hours>=6.5?'good':'bad') },
      { icon:'💧', label:'Agua hoy', val: recentWater?`${recentWater.liters}L`:'—', max:2, cur:recentWater?.liters||0, color:'#3B82F6', status: !recentWater?'warn':(recentWater.liters>=2?'good':(recentWater.liters>=1?'warn':'bad')) },
      { icon:'💪', label:'Gym esta semana', val:`${gymThisWeek}/3`, max:3, cur:gymThisWeek, color:'#F59E0B', status:gymThisWeek>=3?'good':gymThisWeek>=2?'warn':'bad' },
      { icon:'😊', label:'Estado de ánimo', val:recentMood?`${recentMood.score}/10`:'—', max:10, cur:recentMood?.score||0, color:'#22C55E', status:!recentMood?'warn':(recentMood.score>=7?'good':recentMood.score>=5?'warn':'bad') },
    ];

    const grid = document.getElementById('health-metrics-grid');
    if (grid) grid.innerHTML = metrics.map(m=>`
      <div class="metric-card">
        <div class="metric-header">
          <span class="metric-icon">${m.icon}</span>
          <span class="metric-status ${m.status}"></span>
        </div>
        <div class="metric-val">${m.val}</div>
        <div class="metric-lbl">${m.label}</div>
        <div class="metric-bar"><div class="metric-bar-fill" style="width:${Math.min(100,m.cur/m.max*100)}%;background:${m.color}"></div></div>
      </div>`).join('');

    // Log form
    const logForm = document.getElementById('health-log-form');
    if (logForm) logForm.innerHTML = `
      <div class="log-field"><label>Horas de sueño</label><input type="number" id="log-sleep" min="0" max="12" step="0.5" placeholder="7.5"></div>
      <div class="log-field"><label>Agua (litros)</label><input type="number" id="log-water" min="0" max="5" step="0.25" placeholder="2.0"></div>
      <div class="log-field"><label>Ánimo (1-10)</label><input type="number" id="log-mood" min="1" max="10" placeholder="7"></div>
      <div class="log-field"><label>Peso (kg)</label><input type="number" id="log-weight" step="0.1" placeholder="${health.weight||'70'}"></div>
      <button class="log-btn" onclick="Health.saveLog()">💾 Guardar registro</button>`;

    // Deficits
    const dl = document.getElementById('deficit-list');
    if (dl) dl.innerHTML = deficits.length ? deficits.map(d=>`
      <div class="deficit-card">
        <span class="deficit-icon">${d.icon}</span>
        <span class="deficit-text">${d.text}</span>
        <button class="deficit-action">${d.action} →</button>
      </div>`).join('') : `<div style="text-align:center;padding:20px;color:var(--text3);font-size:13px">✅ Sin déficits detectados hoy</div>`;
  }

  function saveLog() {
    const sleep = parseFloat(document.getElementById('log-sleep')?.value||0);
    const water = parseFloat(document.getElementById('log-water')?.value||0);
    const mood = parseInt(document.getElementById('log-mood')?.value||0);
    const weight = parseFloat(document.getElementById('log-weight')?.value||0);
    const now = new Date().toISOString();

    DB.update('health', h=>{
      if (sleep>0) { h.sleep = h.sleep||[]; h.sleep.push({date:now,hours:sleep}); if(h.sleep.length>90) h.sleep=h.sleep.slice(-90); }
      if (water>0) { h.water = h.water||[]; h.water.push({date:now,liters:water}); if(h.water.length>90) h.water=h.water.slice(-90); }
      if (mood>0) { h.mood = h.mood||[]; h.mood.push({date:now,score:mood}); if(h.mood.length>90) h.mood=h.mood.slice(-90); }
      if (weight>0) h.weight = weight;
      return h;
    });

    Engine.awardXP(5, 'Registro de salud');
    UI.snack('✅ Registro guardado');
    render();
    Charts.renderHealthChart();
  }

  function logGymSession() {
    DB.update('health', h=>{
      h.gym_sessions = h.gym_sessions||[];
      h.gym_sessions.push({date:new Date().toISOString()});
      if(h.gym_sessions.length>200) h.gym_sessions=h.gym_sessions.slice(-200);
      return h;
    });
    DB.update('stats', s=>{ s.gymSessions=(s.gymSessions||0)+1; return s; });
    Engine.awardXP(15, 'Sesión de gym 💪');
    UI.snack('💪 Sesión de gym registrada');
    render();
  }

  return { render, saveLog, logGymSession };
})();
