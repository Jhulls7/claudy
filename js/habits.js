// ═══════════════════════════════════════════════════════
// CLAUDY — Habits Module
// ═══════════════════════════════════════════════════════
const Habits = (() => {
  function render() {
    const habits = DB.get('habits');
    const done = habits.filter(h=>h.done).length;
    const maxStreak = habits.reduce((m,h)=>Math.max(m,h.bestStreak||0),0);

    const bigEl = document.getElementById('habit-streak-big');
    const rateEl = document.getElementById('habit-today-rate');
    if (bigEl) bigEl.textContent = maxStreak;
    if (rateEl) rateEl.textContent = `${done} de ${habits.length} hábitos hoy`;

    renderHeatmap();

    const list = document.getElementById('habit-list');
    if (!list) return;
    if (!habits.length) { list.innerHTML=`<div class="empty-state"><i class="ti ti-repeat"></i><p>Agrega tus hábitos diarios</p></div>`; return; }

    list.innerHTML = habits.map((h,i)=>`
      <div class="habit-card ${h.done?'done':''} stagger-${Math.min(i+1,5)}" id="hc-${h.id}">
        <div class="habit-info">
          <div class="habit-name">${h.emoji||'🔲'} ${h.title}</div>
          <div class="habit-streak-row">
            <span class="habit-streak-badge"><i class="ti ti-flame"></i> ${h.streak||0}d racha</span>
            <span style="font-size:11px;color:var(--text3)"> · Mejor: ${h.bestStreak||0}d</span>
          </div>
        </div>
        <div class="habit-check" onclick="Habits.toggle(${h.id})">
          <i class="ti ti-check"></i>
        </div>
      </div>`).join('');
  }

  function renderHeatmap() {
    const heatmap = document.getElementById('habit-heatmap');
    if (!heatmap) return;
    const habits = DB.get('habits');
    const cols = 18;
    let html = '';
    for (let c=0;c<cols;c++) {
      html += '<div class="heatmap-col">';
      for (let r=0;r<7;r++) {
        const rand = Math.random();
        const level = rand>0.8?'l4':rand>0.6?'l3':rand>0.4?'l2':rand>0.2?'l1':'';
        html += `<div class="heatmap-cell ${level}" title="Semana ${c+1}"></div>`;
      }
      html += '</div>';
    }
    heatmap.innerHTML = html;
  }

  function toggle(id) {
    DB.update('habits', habits=>{
      const h = habits.find(x=>x.id===id);
      if (!h) return habits;
      h.done = !h.done;
      if (h.done) {
        h.streak = (h.streak||0)+1;
        if (h.streak>(h.bestStreak||0)) h.bestStreak=h.streak;
        Engine.awardXP(8, `Hábito completado: ${h.title}`);
        DB.update('stats',s=>{ s.habitsCompleted=(s.habitsCompleted||0)+1; return s; });
      } else {
        h.streak = Math.max(0,(h.streak||1)-1);
      }
      return habits;
    });
    render();
    updateHomeStats();
  }

  function addHabit(title, emoji='🔲', cat='personal') {
    DB.update('habits', habits=>{
      habits.push({id:Date.now(),title,emoji,cat,done:false,streak:0,bestStreak:0,history:[],target:'daily'});
      return habits;
    });
    render();
    UI.snack('Hábito agregado');
  }

  function deleteHabit(id) {
    DB.update('habits', habits=>habits.filter(h=>h.id!==id));
    render();
    UI.snack('Hábito eliminado');
  }

  function openAddHabit() {
    const emojis=['🔲','💪','📖','💧','🌙','🧘','🏃','✍️','🥗','🚫','⏰','🎯'];
    UI.openModal(`
      <div class="modal-handle"></div>
      <div class="modal-title">Nuevo hábito</div>
      <div class="form-field"><label>Nombre</label><input class="form-input" id="mh-title" placeholder="Ej: Leer 20 minutos"></div>
      <div class="form-field"><label>Emoji</label>
        <div style="display:flex;gap:8px;flex-wrap:wrap;padding:4px 0">
          ${emojis.map(e=>`<button onclick="document.getElementById('mh-emoji').value='${e}';document.querySelectorAll('.em-btn').forEach(b=>b.style.opacity='0.4');this.style.opacity='1'" class="em-btn" style="font-size:24px;background:none;border:none;cursor:pointer;opacity:0.6;transition:opacity 0.15s">${e}</button>`).join('')}
        </div>
        <input type="hidden" id="mh-emoji" value="🔲">
      </div>
      <div class="form-field"><label>Categoría</label>
        <select class="select-input" id="mh-cat">
          <option value="salud">Salud</option>
          <option value="estudio">Estudio</option>
          <option value="mental">Mental</option>
          <option value="personal">Personal</option>
        </select>
      </div>
      <div class="modal-actions">
        <button class="btn-secondary" onclick="UI.closeModal()">Cancelar</button>
        <button class="btn-primary" onclick="Habits.addHabit(document.getElementById('mh-title').value,document.getElementById('mh-emoji').value,document.getElementById('mh-cat').value);UI.closeModal()">Guardar</button>
      </div>`);
  }

  function updateHomeStats() {
    const habits = DB.get('habits');
    const done = habits.filter(h=>h.done).length;
    const total = habits.length||1;
    const pct = Math.round(done/total*100);
    Engine.drawRing('ring-habits', pct, '#22C55E');
    const el = document.getElementById('rpct-habits');
    if (el) el.textContent = pct+'%';
  }

  return { render, toggle, addHabit, deleteHabit, openAddHabit, updateHomeStats };
})();

function openAddHabit() { Habits.openAddHabit(); }
