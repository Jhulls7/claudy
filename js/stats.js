// ═══════════════════════════════════════════════════════
// CLAUDY — Stats Module
// ═══════════════════════════════════════════════════════
const Stats = (() => {
  function render() {
    const stats = DB.get('stats');
    const tasks = DB.get('tasks');
    const habits = DB.get('habits');
    const health = DB.get('health');
    const records = DB.get('records')||{};

    const blocks = [
      {label:'Tareas completadas',val:stats.tasksCompleted||0,delta:'+3 esta semana',up:true},
      {label:'Hábitos completados',val:stats.habitsCompleted||0,delta:'+12 esta semana',up:true},
      {label:'Sesiones de gym',val:stats.gymSessions||0,delta:'meta: 3/sem',up:true},
      {label:'XP total',val:stats.xp||0,delta:`Nivel ${Engine.getLevelFromXP(stats.xp||0)}`,up:true},
      {label:'Racha actual',val:(stats.streak||0)+'d',delta:`Mejor: ${stats.bestStreak||0}d`,up:(stats.streak||0)>0},
      {label:'Score de salud',val:Engine.calculateHealthScore()+'%',delta:'Prom. semanal',up:Engine.calculateHealthScore()>60},
    ];

    const sb = document.getElementById('stat-blocks');
    if (sb) sb.innerHTML = blocks.map(b=>`
      <div class="stat-block">
        <div class="stat-block-val">${b.val}</div>
        <div class="stat-block-lbl">${b.label}</div>
        <div class="stat-block-delta ${b.up?'delta-up':'delta-down'}">
          <i class="ti ti-trending-${b.up?'up':'down'}"></i> ${b.delta}
        </div>
      </div>`).join('');

    // Records
    const recordsEl = document.getElementById('records-row');
    if (recordsEl) recordsEl.innerHTML = [
      {icon:'🔥',val:(stats.bestStreak||0)+'d',lbl:'Mejor racha',best:'Récord personal'},
      {icon:'✅',val:stats.tasksCompleted||0,lbl:'Tareas totales',best:'Sigue sumando'},
      {icon:'💪',val:stats.gymSessions||0,lbl:'Sesiones gym',best:'Meta: 3/semana'},
      {icon:'⭐',val:stats.xp||0,lbl:'XP acumulado',best:`Nivel ${Engine.getLevelFromXP(stats.xp||0)}`},
    ].map(r=>`<div class="record-card">
      <div class="record-icon">${r.icon}</div>
      <div class="record-val">${r.val}</div>
      <div class="record-lbl">${r.lbl}</div>
      <div class="record-best">${r.best}</div>
    </div>`).join('');

    // Achievements
    const unlocked = getUnlockedAchievements(stats,tasks,habits);
    const ag = document.getElementById('achievements-grid');
    if (ag) ag.innerHTML = ACHIEVEMENTS.map(a=>`
      <div class="achievement ${unlocked.includes(a.id)?'unlocked':'locked'}" title="${a.desc}">
        <div class="achievement-icon">${a.icon}</div>
        <div class="achievement-name">${a.name}</div>
      </div>`).join('');

    Charts.renderPieChart();
    Charts.renderMonthlyChart();
  }

  function getUnlockedAchievements(stats,tasks,habits) {
    const unlocked=[];
    if ((stats.tasksCompleted||0)>0) unlocked.push('first_task');
    if ((stats.streak||0)>=3) unlocked.push('streak_3');
    if ((stats.streak||0)>=7) unlocked.push('streak_7');
    if ((stats.streak||0)>=30) unlocked.push('streak_30');
    if ((stats.gymSessions||0)>=10) unlocked.push('gym_10');
    if ((stats.gymSessions||0)>=30) unlocked.push('gym_30');
    if ((stats.tasksCompleted||0)>=50) unlocked.push('tasks_50');
    if ((stats.tasksCompleted||0)>=100) unlocked.push('tasks_100');
    if (DB.get('goals').some(g=>g.done)) unlocked.push('goal_first');
    if (tasks.length>0) unlocked.push('project_start');
    return unlocked;
  }

  function updateHomeStats() {
    const tasks=DB.get('tasks'),habits=DB.get('habits'),stats=DB.get('stats');
    const done=tasks.filter(t=>t.done).length, total=tasks.length;
    const el=(id,v)=>{ const e=document.getElementById(id); if(e)e.textContent=v; };
    el('qs-done',done);
    el('qs-pending',total-done);
    el('qs-streak',stats.streak||0);
    el('claudy-msg',Engine.getClaudyMessage());
  }

  return { render, updateHomeStats, getUnlockedAchievements };
})();
