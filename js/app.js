// ═══════════════════════════════════════════════════════
// CLAUDY — Tasks + Claude Timers + App Init
// ═══════════════════════════════════════════════════════

// ─── TASKS ───────────────────────────────────────────
const Tasks = (() => {
  let filterCat=null, searchQ='', taskTimers={};

  const CAT_LABELS={clase:'Clase U',colegio:'Colegio',gym:'Gym',proyecto:'Proyecto',personal:'Personal',salud:'Salud',trading:'Trading'};
  const CAT_COLORS={clase:'accent',colegio:'green',gym:'amber',proyecto:'red',personal:'text2',salud:'pink',trading:'teal'};

  function render() {
    const tasks=DB.get('tasks');
    renderFilterChips();
    let filtered=tasks.filter(t=>{
      const catOk=!filterCat||t.cat===filterCat;
      const searchOk=!searchQ||t.title.toLowerCase().includes(searchQ.toLowerCase());
      return catOk&&searchOk;
    });
    filtered.sort((a,b)=>{
      if(a.priority&&!b.priority)return -1;
      if(!a.priority&&b.priority)return 1;
      if(a.done&&!b.done)return 1;
      if(!a.done&&b.done)return -1;
      if(a.time&&b.time)return a.time.localeCompare(b.time);
      return 0;
    });
    const list=document.getElementById('task-list-full');
    if (!list) return;
    if (!filtered.length) { list.innerHTML=`<div class="empty-state"><i class="ti ti-checkbox"></i><p>Sin tareas${filterCat?' en esta categoría':''}</p></div>`; return; }
    list.innerHTML=filtered.map(t=>taskCardHtml(t)).join('');
    renderHomeTasks();
  }

  function renderFilterChips() {
    const el=document.getElementById('filter-chips');
    if (!el) return;
    const cats=['clase','colegio','gym','proyecto','trading','personal','salud'];
    el.innerHTML=`<div class="chip ${!filterCat?'active':''}" onclick="Tasks.setFilter(null)">Todas</div>`+
      cats.map(c=>`<div class="chip ${filterCat===c?'active':''}" onclick="Tasks.setFilter('${c}')">${CAT_LABELS[c]}</div>`).join('');
  }

  function renderHomeTasks() {
    const el=document.getElementById('home-tasks');
    if (!el) return;
    const tasks=DB.get('tasks').filter(t=>t.priority&&!t.done).slice(0,3);
    if (!tasks.length) { el.innerHTML=`<div style="text-align:center;padding:16px;font-size:13px;color:var(--text3)">✅ Sin tareas prioritarias pendientes</div>`; return; }
    el.innerHTML=tasks.map(t=>`
      <div class="home-sched-item" onclick="UI.showTab('tareas')">
        <div class="home-sched-dot" style="background:var(--amber)"></div>
        <span class="home-sched-label">${t.title}</span>
        <span class="home-sched-tag tag tag-${t.cat}">${CAT_LABELS[t.cat]||t.cat}</span>
      </div>`).join('');
  }

  function taskCardHtml(t) {
    const isRunning=!!taskTimers[t.id];
    const subDone=(t.subtasks||[]).filter(s=>s.d).length;
    const subTotal=(t.subtasks||[]).length;
    return `<div class="task-card ${t.priority?'priority-card':''} ${t.done?'done-card':''}" id="tc-${t.id}">
      <div class="task-top">
        <div class="check-circle ${t.done?'checked':''}" onclick="Tasks.toggleDone(${t.id})">
          <i class="ti ti-check"></i>
        </div>
        <div class="task-body">
          <div class="task-title">${t.title}</div>
          <div class="task-meta">
            <span class="tag tag-${t.cat}">${CAT_LABELS[t.cat]||t.cat}</span>
            ${t.time?`<span class="task-time-badge"><i class="ti ti-clock"></i>${t.time}</span>`:''}
            ${t.priority?`<span class="priority-badge"><i class="ti ti-star"></i>Top</span>`:''}
            ${t.postponed?`<span style="font-size:11px;color:var(--text3)">Postergada</span>`:''}
            ${subTotal?`<span class="task-time-badge">${subDone}/${subTotal}</span>`:''}
          </div>
          ${t.note?`<div style="font-size:12px;color:var(--text3);margin-top:4px;line-height:1.5">${t.note}</div>`:''}
          ${subTotal?`<div class="progress-mini"><div class="progress-mini-fill" style="width:${Math.round(subDone/subTotal*100)}%"></div></div>`:''}
        </div>
        <div style="display:flex;align-items:center;gap:4px">
          <button class="timer-btn ${isRunning?'running':''}" id="tbtn-${t.id}" onclick="Tasks.toggleTimer(${t.id})">
            ${isRunning?`<i class="ti ti-player-stop"></i><span id="ttime-${t.id}">00:00</span>`:`<i class="ti ti-player-play"></i>`}
          </button>
          <button class="task-more-btn" onclick="Tasks.openSheet(${t.id})"><i class="ti ti-dots-vertical"></i></button>
        </div>
      </div>
      ${subTotal?`<div class="subtasks-wrap">${(t.subtasks||[]).map((s,i)=>`
        <div class="subtask-row ${s.d?'done':''}" onclick="Tasks.toggleSubtask(${t.id},${i})">
          <div class="sub-check ${s.d?'done':''}"><i class="ti ti-check"></i></div>
          <span>${s.t}</span>
        </div>`).join('')}</div>`:''}
    </div>`;
  }

  function toggleDone(id) {
    DB.update('tasks',tasks=>{
      const t=tasks.find(x=>x.id===id);
      if (!t) return tasks;
      t.done=!t.done;
      if (t.done) {
        Engine.awardXP(t.xp||10,`Tarea completada`);
        DB.update('stats',s=>{s.tasksCompleted=(s.tasksCompleted||0)+1;return s;});
        if(taskTimers[id]){clearInterval(taskTimers[id].iv);delete taskTimers[id];}
      }
      return tasks;
    });
    render();
    Stats.updateHomeStats();
    Charts.renderAllRings();
  }

  function toggleSubtask(taskId,idx) {
    DB.update('tasks',tasks=>{
      const t=tasks.find(x=>x.id===taskId);
      if (t&&t.subtasks[idx]) { t.subtasks[idx].d=!t.subtasks[idx].d; if(t.subtasks[idx].d) Engine.awardXP(3,'Subtarea completada'); }
      return tasks;
    });
    render();
  }

  function toggleTimer(id) {
    if (taskTimers[id]) { clearInterval(taskTimers[id].iv); delete taskTimers[id]; render(); return; }
    taskTimers[id]={start:Date.now(),iv:setInterval(()=>{
      const el=document.getElementById('ttime-'+id);
      if (!el){clearInterval(taskTimers[id]?.iv);delete taskTimers[id];return;}
      const s=Math.floor((Date.now()-taskTimers[id].start)/1000);
      el.textContent=`${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;
    },1000)};
    render();
  }

  function openSheet(id) {
    const t=DB.get('tasks').find(x=>x.id===id);
    if (!t) return;
    UI.openSheet(`
      <div class="sheet-handle"></div>
      <div class="sheet-item" onclick="Tasks.togglePriority(${id});closeSheet()"><i class="ti ti-star"></i>${t.priority?'Quitar prioridad':'Marcar como prioritaria'}</div>
      <div class="sheet-item" onclick="Tasks.postpone(${id});closeSheet()"><i class="ti ti-clock-pause"></i>Postergar al mañana</div>
      <div class="sheet-item" onclick="Tasks.openEditModal(${id});closeSheet()"><i class="ti ti-edit"></i>Editar tarea</div>
      <div class="sheet-item" onclick="Tasks.duplicate(${id});closeSheet()"><i class="ti ti-copy"></i>Duplicar</div>
      <div class="sheet-item" onclick="Tasks.addSubtaskPrompt(${id});closeSheet()"><i class="ti ti-subtask"></i>Agregar subtarea</div>
      <div class="sheet-item danger" onclick="Tasks.deleteTask(${id});closeSheet()"><i class="ti ti-trash"></i>Eliminar</div>`);
  }

  function togglePriority(id) { DB.update('tasks',t=>{const x=t.find(x=>x.id===id);if(x)x.priority=!x.priority;return t;}); render(); UI.snack('Prioridad actualizada'); }
  function postpone(id) { DB.update('tasks',t=>{const x=t.find(x=>x.id===id);if(x)x.postponed=true;return t;}); render(); UI.snack('Postergada'); }
  function duplicate(id) { DB.update('tasks',t=>{const x=t.find(x=>x.id===id);if(x)t.push({...JSON.parse(JSON.stringify(x)),id:Date.now(),done:false,title:x.title+' (copia)'});return t;}); render(); UI.snack('Duplicada'); }
  function deleteTask(id) { DB.update('tasks',t=>t.filter(x=>x.id!==id)); render(); UI.snack('Eliminada'); }
  function addSubtaskPrompt(id) { const name=prompt('Nombre de la subtarea:'); if(name?.trim()){DB.update('tasks',t=>{const x=t.find(x=>x.id===id);if(x){x.subtasks=x.subtasks||[];x.subtasks.push({t:name.trim(),d:false});}return t;});render();} }
  function setFilter(cat) { filterCat=cat; render(); }

  function openAddModal(editId=null) {
    const t=editId?DB.get('tasks').find(x=>x.id===editId):null;
    const cats=Object.keys(CAT_LABELS);
    let selCat=t?.cat||'personal';
    UI.openModal(`
      <div class="modal-handle"></div>
      <div class="modal-title">${t?'Editar tarea':'Nueva tarea'}</div>
      <div class="form-field"><label>Tarea</label><input class="form-input" id="mt-title" placeholder="¿Qué necesitas hacer?" value="${t?.title||''}"></div>
      <div class="form-field"><label>Categoría</label>
        <div class="cat-grid" id="mt-cat-grid">
          ${cats.map(c=>`<div class="cat-opt ${(t?.cat||'personal')===c?'active':''}" data-cat="${c}" onclick="document.querySelectorAll('#mt-cat-grid .cat-opt').forEach(x=>x.classList.remove('active'));this.classList.add('active');document.getElementById('mt-cat-val').value='${c}'">${CAT_LABELS[c]}</div>`).join('')}
        </div>
        <input type="hidden" id="mt-cat-val" value="${t?.cat||'personal'}">
      </div>
      <div class="form-row">
        <div class="form-field"><label>Hora</label><input class="form-input" type="time" id="mt-time" value="${t?.time||''}"></div>
        <div class="form-field"><label>Fecha límite</label><input class="form-input" type="date" id="mt-deadline" value="${t?.deadline||''}"></div>
      </div>
      <div class="form-field"><label>Notas</label><input class="form-input" id="mt-note" placeholder="Detalles opcionales..." value="${t?.note||''}"></div>
      <div class="checkbox-row"><input type="checkbox" id="mt-priority" ${t?.priority?'checked':''}><label for="mt-priority">Marcar como prioritaria ⭐</label></div>
      <div class="modal-actions">
        <button class="btn-secondary" onclick="closeModal()">Cancelar</button>
        <button class="btn-primary" onclick="Tasks._saveTask(${editId||'null'})">${t?'Guardar cambios':'Crear tarea'}</button>
      </div>`);
  }

  function openEditModal(id) { openAddModal(id); }

  function _saveTask(editId) {
    const title=document.getElementById('mt-title')?.value.trim();
    if (!title) { UI.snack('Escribe el nombre de la tarea'); return; }
    const cat=document.getElementById('mt-cat-val')?.value||'personal';
    const time=document.getElementById('mt-time')?.value||'';
    const deadline=document.getElementById('mt-deadline')?.value||'';
    const note=document.getElementById('mt-note')?.value||'';
    const priority=document.getElementById('mt-priority')?.checked||false;
    DB.update('tasks',tasks=>{
      if (editId) { const t=tasks.find(x=>x.id===editId); if(t){t.title=title;t.cat=cat;t.time=time;t.deadline=deadline;t.note=note;t.priority=priority;} }
      else tasks.push({id:Date.now(),title,cat,time,deadline,note,priority,done:false,subtasks:[],xp:priority?15:10,postponed:false,created:Date.now()});
      return tasks;
    });
    UI.closeModal(); render(); Stats.updateHomeStats(); Charts.renderAllRings();
    UI.snack(editId?'Tarea actualizada':'Tarea creada ✅');
    if (!editId) Engine.awardXP(5,'Tarea creada');
  }

  return { render, toggleDone, toggleSubtask, toggleTimer, openSheet, togglePriority, postpone, duplicate, deleteTask, addSubtaskPrompt, setFilter, openAddModal, openEditModal, _saveTask, renderHomeTasks };
})();

// ─── CLAUDE TIMERS ────────────────────────────────────
const ClaudeTimers = (() => {
  let intervals={};

  const ACCOUNTS=[
    {id:'acc1',name:'Cuenta Principal',desc:'Uso general / código',icon:'🤖',color:'#7C6EF5'},
    {id:'acc2',name:'Cuenta Académica',desc:'Tareas universitarias',icon:'🎓',color:'#3B82F6'},
    {id:'acc3',name:'Cuenta Proyectos',desc:'Proyecto de software',icon:'🚀',color:'#22C55E'},
  ];

  const WAIT_PRESETS=[
    {label:'5 horas',ms:5*3600000},
    {label:'8 horas',ms:8*3600000},
    {label:'12 horas',ms:12*3600000},
    {label:'24 horas',ms:24*3600000},
  ];

  function getTimers() { return DB.get('claude_timers')||[]; }
  function saveTimers(t) { DB.set('claude_timers',t); }

  function startTimer(accountId, waitMs) {
    const timers=getTimers();
    const existing=timers.findIndex(t=>t.accountId===accountId);
    const entry={id:Date.now(),accountId,name:ACCOUNTS.find(a=>a.id===accountId)?.name||accountId,startedAt:Date.now(),endsAt:Date.now()+waitMs,waitMs,active:true};
    if (existing>=0) timers[existing]=entry;
    else timers.push(entry);
    saveTimers(timers);
    startCountdown(entry.id);
    UI.snack(`⏱ Temporizador iniciado`);
  }

  function stopTimer(id) {
    DB.update('claude_timers',t=>{const x=t.find(x=>x.id===id);if(x)x.active=false;return t;});
    if (intervals[id]) { clearInterval(intervals[id]); delete intervals[id]; }
    render();
    UI.snack('Temporizador detenido');
  }

  function resetTimer(accountId) {
    DB.update('claude_timers',t=>t.filter(x=>x.accountId!==accountId));
    render();
    UI.snack('Reiniciado ✅');
  }

  function startCountdown(id) {
    if (intervals[id]) clearInterval(intervals[id]);
    intervals[id]=setInterval(()=>{
      const t=getTimers().find(x=>x.id===id);
      if (!t||!t.active) { clearInterval(intervals[id]); delete intervals[id]; return; }
      if (Date.now()>=t.endsAt) {
        clearInterval(intervals[id]); delete intervals[id];
        UI.snack(`✅ ${t.name} ya está disponible`);
        UI.updateNotifBadge();
      }
      renderTimerCard(t);
    },1000);
  }

  function formatRemaining(ms) {
    if (ms<=0) return '¡Disponible!';
    const h=Math.floor(ms/3600000), m=Math.floor((ms%3600000)/60000), s=Math.floor((ms%60000)/1000);
    if (h>0) return `${h}h ${String(m).padStart(2,'0')}m ${String(s).padStart(2,'0')}s`;
    if (m>0) return `${m}m ${String(s).padStart(2,'0')}s`;
    return `${s}s`;
  }

  function renderTimerCard(timer) {
    const el=document.getElementById(`ct-remaining-${timer.id}`);
    if (!el) return;
    const rem=timer.endsAt-Date.now();
    el.textContent=formatRemaining(rem);
    const prog=document.getElementById(`ct-prog-${timer.id}`);
    if (prog) { const pct=Math.max(0,Math.min(100,(1-(rem/timer.waitMs))*100)); prog.style.width=pct+'%'; prog.style.background=rem<=0?'var(--green)':rem<1800000?'var(--amber)':'var(--accent)'; }
  }

  function render() {
    const timers=getTimers();
    // Render in home view as a card
    let el=document.getElementById('claude-timers-section');
    if (!el) return;

    // Resume countdowns
    timers.filter(t=>t.active&&t.endsAt>Date.now()).forEach(t=>startCountdown(t.id));

    el.innerHTML=`
      <div class="section-hdr"><span>Temporizadores Claude</span><button class="see-all" onclick="ClaudeTimers.openManage()">Gestionar</button></div>
      ${ACCOUNTS.map(acc=>{
        const timer=timers.find(t=>t.accountId===acc.id&&t.active);
        const rem=timer?timer.endsAt-Date.now():0;
        const available=!timer||rem<=0;
        return `<div style="background:var(--bg3);border:0.5px solid ${available?'rgba(34,197,94,0.3)':'var(--border)'};border-radius:var(--r2);padding:12px 14px;margin-bottom:6px">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:${timer?'10px':'0'}">
            <span style="font-size:22px">${acc.icon}</span>
            <div style="flex:1">
              <div style="font-size:13px;font-weight:500;color:var(--text)">${acc.name}</div>
              <div style="font-size:11px;color:var(--text3)">${acc.desc}</div>
            </div>
            <div style="text-align:right">
              <div style="font-size:11px;font-weight:600;color:${available?'var(--green)':'var(--amber)'}">${available?'✅ Libre':'⏳ Espera'}</div>
              ${timer&&!available?`<div style="font-size:10px;color:var(--text3)" id="ct-remaining-${timer.id}">${formatRemaining(rem)}</div>`:''}
            </div>
          </div>
          ${timer&&!available?`<div style="height:3px;background:var(--bg4);border-radius:2px;overflow:hidden"><div id="ct-prog-${timer.id}" style="height:100%;width:0%;border-radius:2px;transition:width 1s;background:var(--accent)"></div></div>`:''}
          ${available?`<button onclick="ClaudeTimers.openStart('${acc.id}')" style="width:100%;margin-top:8px;padding:7px;border-radius:var(--r3);border:0.5px solid var(--border);background:transparent;color:var(--text2);font-size:12px;cursor:pointer">⏱ Iniciar tiempo de espera</button>`:`<button onclick="ClaudeTimers.resetTimer('${acc.id}')" style="width:100%;margin-top:8px;padding:7px;border-radius:var(--r3);border:0.5px solid rgba(34,197,94,0.3);background:transparent;color:var(--green);font-size:12px;cursor:pointer">✅ Marcar como disponible</button>`}
        </div>`;
      }).join('')}`;
  }

  function openStart(accountId) {
    const acc=ACCOUNTS.find(a=>a.id===accountId);
    UI.openModal(`
      <div class="modal-handle"></div>
      <div class="modal-title">⏱ ${acc?.name}</div>
      <p style="font-size:13px;color:var(--text2);margin-bottom:16px">¿Cuánto tiempo necesitas esperar para volver a usar esta cuenta?</p>
      <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:16px">
        ${WAIT_PRESETS.map(p=>`<button onclick="ClaudeTimers.startTimer('${accountId}',${p.ms});closeModal()" style="padding:12px;border-radius:var(--r2);border:0.5px solid var(--border);background:var(--bg3);color:var(--text);font-size:14px;cursor:pointer;text-align:left">${p.label}</button>`).join('')}
      </div>
      <div class="form-field"><label>O define el tiempo exacto</label>
        <div style="display:flex;gap:8px">
          <input class="form-input" type="number" id="ct-custom-h" placeholder="Horas" min="0" max="24" style="flex:1">
          <input class="form-input" type="number" id="ct-custom-m" placeholder="Min" min="0" max="59" style="flex:1">
        </div>
      </div>
      <div class="modal-actions">
        <button class="btn-secondary" onclick="closeModal()">Cancelar</button>
        <button class="btn-primary" onclick="ClaudeTimers._startCustom('${accountId}')">Iniciar</button>
      </div>`);
  }

  function _startCustom(accountId) {
    const h=parseInt(document.getElementById('ct-custom-h')?.value||0);
    const m=parseInt(document.getElementById('ct-custom-m')?.value||0);
    const ms=(h*3600+m*60)*1000;
    if (ms<=0) { UI.snack('Define un tiempo válido'); return; }
    startTimer(accountId,ms);
    closeModal();
    render();
  }

  function openManage() {
    const timers=getTimers();
    UI.openModal(`
      <div class="modal-handle"></div>
      <div class="modal-title">🤖 Mis cuentas Claude</div>
      <p style="font-size:13px;color:var(--text2);margin-bottom:16px">Administra cuándo está disponible cada cuenta.</p>
      ${ACCOUNTS.map(acc=>{
        const timer=timers.find(t=>t.accountId===acc.id&&t.active);
        const rem=timer?Math.max(0,timer.endsAt-Date.now()):0;
        return `<div style="background:var(--bg3);border:0.5px solid var(--border);border-radius:var(--r2);padding:12px 14px;margin-bottom:8px;display:flex;align-items:center;gap:10px">
          <span style="font-size:24px">${acc.icon}</span>
          <div style="flex:1">
            <div style="font-size:13px;font-weight:500">${acc.name}</div>
            <div style="font-size:11px;color:${rem>0?'var(--amber)':'var(--green)'}">${rem>0?`Espera: ${formatRemaining(rem)}`:'✅ Disponible'}</div>
          </div>
          <button onclick="ClaudeTimers.openStart('${acc.id}');closeModal()" style="padding:6px 12px;border-radius:var(--r3);border:0.5px solid var(--border);background:transparent;color:var(--text2);font-size:12px;cursor:pointer">⏱</button>
          ${timer?`<button onclick="ClaudeTimers.resetTimer('${acc.id}');closeModal()" style="padding:6px 12px;border-radius:var(--r3);border:0.5px solid rgba(34,197,94,0.3);background:transparent;color:var(--green);font-size:12px;cursor:pointer">✅</button>`:''}
        </div>`;
      }).join('')}
      <div class="modal-actions"><button class="btn-primary" onclick="closeModal()">Cerrar</button></div>`);
  }

  return { render, startTimer, stopTimer, resetTimer, openStart, openManage, _startCustom };
})();

// ─── APP INIT ─────────────────────────────────────────
const App = {
  init() {
    // Date and greeting
    const now=new Date();
    const h=now.getHours();
    const greeting=h<12?'Buenos días ☀️':h<19?'Buenas tardes 🌤':h<22?'Buenas noches 🌙':'Buenas noches 🌙';
    const s=DB.get('settings');
    const el=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=v;};
    el('greeting',`${greeting}, ${s?.name||'Estudiante'}`);
    el('topbar-date',now.toLocaleDateString('es-PE',{weekday:'long',day:'numeric',month:'long'}));

    // Inject Claude Timers section in home view
    const homeView=document.getElementById('view-home');
    if (homeView) {
      const section=document.createElement('div');
      section.id='claude-timers-section';
      homeView.appendChild(section);
    }

    // Update streak
    Engine.updateStreak();
    Engine.updateXPBar();

    // Render home
    UI.showTab('home');

    // Urgent items after small delay
    setTimeout(()=>Engine.showUrgentIfNeeded(),800);

    // Notif badge
    setTimeout(()=>UI.updateNotifBadge(),1000);

    // Claude timers render
    setTimeout(()=>ClaudeTimers.render(),500);

    // Refresh timers every second
    setInterval(()=>{
      const timers=DB.get('claude_timers')||[];
      timers.filter(t=>t.active).forEach(t=>ClaudeTimers.renderTimerCard?.(t));
    },1000);
  }
};

// Global search
function filterTasks() {
  const q=document.getElementById('task-search')?.value||'';
  Tasks.setFilter(null);
  DB.get('tasks'); // reload
  Tasks.render();
}
