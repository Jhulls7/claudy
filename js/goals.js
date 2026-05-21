// ═══════════════════════════════════════════════════════
// CLAUDY — Goals Module
// ═══════════════════════════════════════════════════════
const Goals = (() => {
  function render() {
    const goals = DB.get('goals');
    const active = goals.filter(g=>!g.done).length;
    const done = goals.filter(g=>g.done).length;
    const avgPct = goals.length ? Math.round(goals.reduce((a,g)=>a+(g.progress||0),0)/goals.length) : 0;

    document.getElementById('g-active').textContent = active;
    document.getElementById('g-done').textContent = done;
    document.getElementById('g-pct').textContent = avgPct+'%';

    const list = document.getElementById('goals-list');
    if (!list) return;
    if (!goals.length) { list.innerHTML=`<div class="empty-state"><i class="ti ti-target"></i><p>Agrega tu primera meta</p></div>`; return; }

    list.innerHTML = goals.map(g=>{
      const dl = g.deadline ? new Date(g.deadline) : null;
      const now = new Date();
      const daysLeft = dl ? Math.floor((dl-now)/86400000) : null;
      const dlClass = !dl?'':'daysLeft<=0?overdue':daysLeft<=7?'soon':'ok';
      return `<div class="goal-card ${g.done?'completed':''}">
        <div class="goal-header">
          <span class="goal-emoji">${g.emoji||'🎯'}</span>
          <div style="flex:1">
            <div class="goal-title">${g.title}</div>
            ${dl?`<div class="goal-deadline">${daysLeft<=0?'⚠️ Vencida':daysLeft===0?'Vence hoy':`${daysLeft} días restantes`}</div>`:''}
          </div>
          <span class="goal-pct">${g.progress||0}%</span>
        </div>
        <div class="goal-prog-track"><div class="goal-prog-fill" style="width:${g.progress||0}%"></div></div>
        ${g.milestones?.length?`<div style="margin-top:10px;display:flex;flex-direction:column;gap:4px">${g.milestones.map(m=>`
          <div style="display:flex;align-items:center;gap:8px;font-size:12px;color:var(--text2);cursor:pointer" onclick="Goals.toggleMilestone(${g.id},'${m.t}')">
            <div style="width:14px;height:14px;border-radius:3px;border:1.5px solid var(--border2);display:flex;align-items:center;justify-content:center;flex-shrink:0;${m.d?'background:var(--green);border-color:var(--green)':''}">
              ${m.d?'<i class="ti ti-check" style="font-size:10px;color:#fff"></i>':''}
            </div>
            <span style="${m.d?'text-decoration:line-through;color:var(--text3)':''}">${m.t}</span>
          </div>`).join('')}</div>`:''}
        <div class="goal-actions" style="margin-top:10px">
          <button class="goal-btn" onclick="Goals.updateProgress(${g.id})">+ Progreso</button>
          <button class="goal-btn" onclick="Goals.toggleDone(${g.id})">${g.done?'↩ Reabrir':'✅ Lograda'}</button>
          <button class="goal-btn" onclick="Goals.deleteGoal(${g.id})" style="color:var(--red)">🗑</button>
        </div>
      </div>`;
    }).join('');

    // Motivation
    const q = MOTIVATIONAL_QUOTES[Math.floor(new Date().getDate()%MOTIVATIONAL_QUOTES.length)];
    const mc = document.getElementById('motivation-card');
    if (mc) mc.innerHTML = `<div class="motivation-quote">"${q.q}"</div><div class="motivation-author">— ${q.a}</div>`;

    // Update rings
    Engine.drawRing('ring-goals', avgPct, '#EC4899');
    const el = document.getElementById('rpct-goals');
    if (el) el.textContent = avgPct+'%';
    document.getElementById('qs-goals').textContent = avgPct+'%';
  }

  function toggleMilestone(goalId, milestoneTitle) {
    DB.update('goals', goals=>{
      const g = goals.find(x=>x.id===goalId);
      if (!g) return goals;
      const m = g.milestones?.find(x=>x.t===milestoneTitle);
      if (m) { m.d=!m.d; if(m.d) Engine.awardXP(20,'Hito completado 🎯'); }
      const done = (g.milestones||[]).filter(m=>m.d).length;
      g.progress = g.milestones?.length ? Math.round(done/g.milestones.length*100) : g.progress;
      return goals;
    });
    render();
  }

  function updateProgress(id) {
    UI.openModal(`
      <div class="modal-handle"></div>
      <div class="modal-title">Actualizar progreso</div>
      <div class="form-field"><label>Progreso actual (%)</label>
        <div class="range-field">
          <input type="range" min="0" max="100" id="prog-range" oninput="document.getElementById('prog-val').textContent=this.value+'%'" value="${DB.get('goals').find(g=>g.id===id)?.progress||0}">
          <span class="range-val" id="prog-val">${DB.get('goals').find(g=>g.id===id)?.progress||0}%</span>
        </div>
      </div>
      <div class="modal-actions">
        <button class="btn-secondary" onclick="UI.closeModal()">Cancelar</button>
        <button class="btn-primary" onclick="Goals._saveProgress(${id},parseInt(document.getElementById('prog-range').value));UI.closeModal()">Guardar</button>
      </div>`);
  }

  function _saveProgress(id, pct) {
    DB.update('goals', goals=>{ const g=goals.find(x=>x.id===id); if(g){g.progress=pct;if(pct>=100)g.done=true;} return goals; });
    if (pct>=100) { Engine.awardXP(100,'Meta completada! 🎉'); Engine.spawnConfetti(); }
    else Engine.awardXP(5,'Progreso actualizado');
    render();
  }

  function toggleDone(id) {
    DB.update('goals', goals=>{ const g=goals.find(x=>x.id===id); if(g){g.done=!g.done;if(g.done){g.progress=100;Engine.awardXP(100,'Meta completada! 🎉');Engine.spawnConfetti();}} return goals; });
    render();
  }

  function deleteGoal(id) {
    if (!confirm('¿Eliminar esta meta?')) return;
    DB.update('goals', goals=>goals.filter(g=>g.id!==id));
    render();
    UI.snack('Meta eliminada');
  }

  function openAddGoal() {
    UI.openModal(`
      <div class="modal-handle"></div>
      <div class="modal-title">Nueva meta</div>
      <div class="form-field"><label>Título</label><input class="form-input" id="mg-title" placeholder="Ej: Lanzar mi proyecto"></div>
      <div class="form-row">
        <div class="form-field"><label>Emoji</label><input class="form-input" id="mg-emoji" placeholder="🎯" value="🎯" style="font-size:20px;text-align:center"></div>
        <div class="form-field"><label>Fecha límite</label><input class="form-input" type="date" id="mg-deadline"></div>
      </div>
      <div class="form-field"><label>Categoría</label>
        <select class="select-input" id="mg-cat">
          <option value="proyecto">Proyecto</option>
          <option value="estudio">Estudio</option>
          <option value="salud">Salud</option>
          <option value="trading">Trading</option>
          <option value="personal">Personal</option>
        </select>
      </div>
      <div class="form-field"><label>Hitos (separados por coma)</label>
        <input class="form-input" id="mg-milestones" placeholder="Ej: Fase 1, Fase 2, Lanzamiento"></div>
      <div class="modal-actions">
        <button class="btn-secondary" onclick="UI.closeModal()">Cancelar</button>
        <button class="btn-primary" onclick="Goals._saveNew()">Crear meta</button>
      </div>`);
  }

  function _saveNew() {
    const title = document.getElementById('mg-title')?.value.trim();
    if (!title) { UI.snack('Escribe un título'); return; }
    const raw = document.getElementById('mg-milestones')?.value||'';
    const milestones = raw.split(',').map(s=>s.trim()).filter(Boolean).map(t=>({t,d:false}));
    DB.update('goals', goals=>{
      goals.push({id:Date.now(),title,emoji:document.getElementById('mg-emoji')?.value||'🎯',cat:document.getElementById('mg-cat')?.value||'personal',progress:0,target:100,deadline:document.getElementById('mg-deadline')?.value||'',done:false,milestones,xp:100,created:Date.now()});
      return goals;
    });
    UI.closeModal();
    render();
    Engine.awardXP(10,'Meta creada 🎯');
    UI.snack('Meta creada');
  }

  return { render, toggleMilestone, updateProgress, _saveProgress, toggleDone, deleteGoal, openAddGoal, _saveNew };
})();

function openAddGoal() { Goals.openAddGoal(); }
