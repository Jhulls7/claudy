// ═══════════════════════════════════════════════════════
// CLAUDY — Engine (XP, Levels, Streaks, Intelligence)
// ═══════════════════════════════════════════════════════
const Engine = (() => {
  const XP_PER_LEVEL = [0,100,250,500,900,1500,2500,4000,6000,9000,13000];

  function getLevelFromXP(xp) {
    for (let i = XP_PER_LEVEL.length-1; i>=0; i--) if (xp >= XP_PER_LEVEL[i]) return i+1;
    return 1;
  }

  function getXPProgress(xp) {
    const level = getLevelFromXP(xp);
    const current = XP_PER_LEVEL[level-1]||0;
    const next = XP_PER_LEVEL[level]||XP_PER_LEVEL[XP_PER_LEVEL.length-1];
    return { level, pct: Math.round((xp-current)/(next-current)*100) };
  }

  function awardXP(amount, reason) {
    const stats = DB.get('stats');
    const oldLevel = getLevelFromXP(stats.xp||0);
    stats.xp = (stats.xp||0) + amount;
    const newLevel = getLevelFromXP(stats.xp);
    DB.set('stats', stats);
    if (newLevel > oldLevel) { UI.snack(`🎉 ¡Subiste al nivel ${newLevel}!`); spawnConfetti(); }
    else UI.snack(`+${amount} XP — ${reason}`);
    updateXPBar();
  }

  function updateXPBar() {
    const stats = DB.get('stats');
    const { level, pct } = getXPProgress(stats.xp||0);
    const lvlEl = document.getElementById('xp-level');
    const ptsEl = document.getElementById('xp-pts');
    const fillEl = document.getElementById('xp-fill');
    if (lvlEl) lvlEl.textContent = `Nv. ${level}`;
    if (ptsEl) ptsEl.textContent = `${stats.xp||0} XP`;
    if (fillEl) fillEl.style.width = pct+'%';
  }

  function updateStreak() {
    const stats = DB.get('stats');
    const today = new Date().toDateString();
    if (!stats.lastActive) stats.streak = 1;
    else if (stats.lastActive !== today) {
      const diff = Math.floor((new Date()-new Date(stats.lastActive))/86400000);
      stats.streak = diff===1 ? (stats.streak||0)+1 : 1;
    }
    stats.lastActive = today;
    if ((stats.streak||0) > (stats.bestStreak||0)) stats.bestStreak = stats.streak;
    DB.set('stats', stats);
    return stats.streak||0;
  }

  function getUrgentItems() {
    const tasks = DB.get('tasks'), goals = DB.get('goals'), health = DB.get('health');
    const urgent = [], now = new Date();
    tasks.filter(t=>!t.done&&t.deadline).forEach(t=>{
      const dl=new Date(t.deadline);
      if (dl<now) urgent.push({type:'overdue',text:`"${t.title}" venció el ${dl.toLocaleDateString('es')}`,color:'red',id:t.id,kind:'task'});
    });
    tasks.filter(t=>t.priority&&!t.done&&!t.postponed).forEach(t=>{
      urgent.push({type:'priority',text:`Prioritaria pendiente: "${t.title}"`,color:'amber',id:t.id,kind:'task'});
    });
    goals.filter(g=>!g.done&&g.deadline).forEach(g=>{
      const dl=new Date(g.deadline), daysLeft=Math.floor((dl-now)/86400000);
      if (daysLeft<=7&&daysLeft>=0) urgent.push({type:'deadline',text:`Meta "${g.title}" vence en ${daysLeft} días`,color:'amber',id:g.id,kind:'goal'});
    });
    const recentSleep=(health.sleep||[]).slice(-3);
    if (recentSleep.length>=2) {
      const avg=recentSleep.reduce((a,b)=>a+b.hours,0)/recentSleep.length;
      if (avg<5.5) urgent.push({type:'health',text:`Dormiste ${avg.toFixed(1)}h prom. Tu rendimiento está en riesgo.`,color:'red',kind:'health'});
    }
    // Claude timers expiring soon
    const timers = DB.get('claude_timers')||[];
    timers.forEach(t=>{
      if (!t.active) return;
      const remaining = t.endsAt - Date.now();
      if (remaining>0 && remaining<300000) urgent.push({type:'claude',text:`Claude "${t.name}" disponible en ${Math.ceil(remaining/60000)} min`,color:'amber',kind:'claude'});
      if (remaining<=0) urgent.push({type:'claude',text:`✅ Claude "${t.name}" ya está disponible`,color:'green',kind:'claude'});
    });
    return urgent.slice(0,6);
  }

  function showUrgentIfNeeded() {
    const items = getUrgentItems();
    if (!items.length) return;
    const lastShown = localStorage.getItem('claudy_urgent_shown');
    const today = new Date().toDateString();
    if (lastShown===today) return;
    localStorage.setItem('claudy_urgent_shown', today);
    const overlay=document.getElementById('urgent-overlay'), list=document.getElementById('urgent-list'), sub=document.getElementById('urgent-subtitle');
    if (!overlay||!list) return;
    sub.textContent = `${items.length} cosa${items.length>1?'s':''} requiere${items.length>1?'n':''} tu atención`;
    list.innerHTML = items.map(item=>`
      <div class="urgent-item">
        <div class="urgent-dot ${item.color}"></div>
        <span class="urgent-text">${item.text}</span>
        ${item.kind==='task'?`<button class="urgent-postpone" onclick="Engine.postponeFromUrgent(${item.id})">Postergar</button>`:''}
      </div>`).join('');
    overlay.classList.remove('hidden');
  }

  function postponeFromUrgent(taskId) {
    DB.update('tasks', tasks=>{ const t=tasks.find(x=>x.id===taskId); if(t) t.postponed=true; return tasks; });
    UI.snack('Tarea postergada');
  }

  function getClaudyMessage() {
    const h=new Date().getHours(), stats=DB.get('stats'), tasks=DB.get('tasks'), habits=DB.get('habits'), health=DB.get('health');
    const done=tasks.filter(t=>t.done).length, total=tasks.length, habitsDone=habits.filter(h=>h.done).length;
    const sleepHours=(health.sleep||[]).slice(-1)[0]?.hours||0, streak=stats.streak||0;
    const msgs=[];
    if (h<7) msgs.push(`Es temprano 🌅 — mente fresca para arrancar. Tienes ${total-done} tarea${total-done!==1?'s':''} hoy.`);
    else if (h<12) msgs.push(`Buenos días 👋 — ${total-done} tarea${total-done!==1?'s':''} pendiente${total-done!==1?'s':''}. El colegio empieza a las 9am.`);
    else if (h<15) msgs.push(`Tarde productiva ☀️ — aprovecha antes de las clases para el proyecto.`);
    else if (h<19) msgs.push(`Prepárate para las clases nocturnas 📚 — repasa antes de entrar.`);
    else if (h<22) msgs.push(`Bloque de clases activo 🎓 — cuando termines, el proyecto te espera.`);
    else msgs.push(`Bloque nocturno 💻 — ideal para el proyecto. Recuerda dormir antes de la 1am.`);
    if (done===total&&total>0) msgs.push(`🎉 ¡Completaste todo hoy! Eso es disciplina real.`);
    if (streak>=7) msgs.push(`🔥 ${streak} días de racha. Estás construyendo algo poderoso.`);
    if (sleepHours>0&&sleepHours<5) msgs.push(`⚠️ Solo dormiste ${sleepHours}h. Ajusta tu rutina nocturna.`);
    if (habitsDone===habits.length&&habits.length>0) msgs.push(`✅ Todos los hábitos del día cumplidos. Así se hace.`);
    return msgs[Math.floor(Math.random()*msgs.length)]||`Bienvenido de vuelta 👋 — ${total-done} tareas pendientes.`;
  }

  function calculateHealthScore() {
    const health=DB.get('health'), habits=DB.get('habits');
    let score=0;
    const recentSleep=(health.sleep||[]).slice(-7);
    if (recentSleep.length) { const avg=recentSleep.reduce((a,b)=>a+b.hours,0)/recentSleep.length; score+=Math.min(30,Math.round(avg/8*30)); }
    else score+=20;
    const recentWater=(health.water||[]).slice(-7);
    if (recentWater.length) { const avg=recentWater.reduce((a,b)=>a+b.liters,0)/recentWater.length; score+=Math.min(20,Math.round(avg/2*20)); }
    else score+=10;
    const gymSessions=(health.gym_sessions||[]).filter(s=>(new Date()-new Date(s.date))<7*86400000).length;
    score+=Math.min(25,gymSessions*8);
    const habitsDone=habits.filter(h=>h.done).length, habitsTotal=habits.length||1;
    score+=Math.round(habitsDone/habitsTotal*25);
    return Math.min(100,score);
  }

  function getDeficits() {
    const health=DB.get('health'), habits=DB.get('habits');
    const deficits=[];
    const recentSleep=(health.sleep||[]).slice(-3);
    const avgSleep=recentSleep.length?recentSleep.reduce((a,b)=>a+b.hours,0)/recentSleep.length:7;
    if (avgSleep<6) deficits.push({icon:'😴',text:`Sueño insuficiente: ${avgSleep.toFixed(1)}h promedio. Meta: 6.5h`,action:'Registrar sueño'});
    const recentWater=(health.water||[]).slice(-3);
    const avgWater=recentWater.length?recentWater.reduce((a,b)=>a+b.liters,0)/recentWater.length:2;
    if (avgWater<1.5) deficits.push({icon:'💧',text:`Hidratación baja: ${avgWater.toFixed(1)}L promedio. Meta: 2L`,action:'Registrar agua'});
    const gymSessions=(health.gym_sessions||[]).filter(s=>(new Date()-new Date(s.date))<7*86400000).length;
    if (gymSessions<2) deficits.push({icon:'💪',text:`Solo ${gymSessions} sesión/es de gym esta semana. Meta: 3`,action:'Ver horario'});
    const unhealthy=habits.filter(h=>!h.done&&h.cat==='salud');
    if (unhealthy.length>2) deficits.push({icon:'⚡',text:`${unhealthy.length} hábitos de salud sin completar hoy`,action:'Ver hábitos'});
    return deficits;
  }

  function spawnConfetti() {
    const colors=['#7C6EF5','#22C55E','#F59E0B','#EC4899','#3B82F6'];
    for (let i=0;i<30;i++) {
      setTimeout(()=>{
        const el=document.createElement('div');
        el.className='confetti-piece';
        el.style.cssText=`left:${Math.random()*100}vw;background:${colors[Math.floor(Math.random()*colors.length)]};animation-duration:${2+Math.random()*2}s;animation-delay:${Math.random()*0.5}s;transform:rotate(${Math.random()*360}deg)`;
        document.body.appendChild(el);
        setTimeout(()=>el.remove(),4000);
      },i*50);
    }
  }

  function drawRing(canvasId, pct, color='#7C6EF5', bg='#1F1F28') {
    const canvas=document.getElementById(canvasId);
    if (!canvas) return;
    const ctx=canvas.getContext('2d'), w=canvas.width, h=canvas.height, cx=w/2, cy=h/2, r=cx-8;
    ctx.clearRect(0,0,w,h);
    ctx.beginPath(); ctx.arc(cx,cy,r,0,2*Math.PI); ctx.strokeStyle=bg; ctx.lineWidth=6; ctx.stroke();
    if (pct>0) {
      ctx.beginPath(); ctx.arc(cx,cy,r,-Math.PI/2,(-Math.PI/2)+(2*Math.PI*pct/100));
      ctx.strokeStyle=color; ctx.lineWidth=6; ctx.lineCap='round'; ctx.stroke();
    }
  }

  return { awardXP, updateXPBar, updateStreak, getUrgentItems, showUrgentIfNeeded, postponeFromUrgent, getClaudyMessage, calculateHealthScore, getDeficits, drawRing, spawnConfetti, getLevelFromXP };
})();

function dismissUrgent() {
  document.getElementById('urgent-overlay').classList.add('hidden');
}
