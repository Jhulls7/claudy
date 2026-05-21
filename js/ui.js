// ═══════════════════════════════════════════════════════
// CLAUDY — UI Module (modals, sheets, snackbar, tabs)
// ═══════════════════════════════════════════════════════
const UI = (() => {
  let snackTimer=null, selectedCat='personal', editTaskId=null, timers={};

  function snack(msg) {
    const el=document.getElementById('snackbar');
    if (!el) return;
    clearTimeout(snackTimer);
    el.textContent=msg; el.classList.add('show');
    snackTimer=setTimeout(()=>el.classList.remove('show'),2500);
  }

  function openModal(html) {
    const overlay=document.getElementById('modal-overlay'), sheet=document.getElementById('modal-sheet');
    if (!overlay||!sheet) return;
    sheet.innerHTML=html; overlay.classList.remove('hidden');
    setTimeout(()=>sheet.querySelector('input')?.focus(),200);
  }

  function closeModal() {
    document.getElementById('modal-overlay')?.classList.add('hidden');
    editTaskId=null;
  }

  function openSheet(html) {
    const overlay=document.getElementById('sheet-overlay'), wrap=document.getElementById('action-sheet-wrap');
    if (!overlay||!wrap) return;
    wrap.innerHTML=html; overlay.classList.remove('hidden');
  }

  function closeSheet() {
    document.getElementById('sheet-overlay')?.classList.add('hidden');
  }

  function showTab(tab) {
    document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n=>{
      n.classList.toggle('active', n.dataset.tab===tab);
    });
    const view=document.getElementById('view-'+tab);
    if (view) view.classList.add('active');

    // Render on tab switch
    const renders={
      home:()=>{ Stats.updateHomeStats(); Charts.renderWeeklyChart(); Charts.renderAllRings(); Schedule.renderHomeSchedule(); },
      tareas:()=>Tasks.render(),
      horario:()=>Schedule.render(),
      salud:()=>{ Health.render(); Charts.renderHealthChart(); },
      habitos:()=>Habits.render(),
      metas:()=>Goals.render(),
      stats:()=>Stats.render(),
    };
    renders[tab]?.();
  }

  function openQuickAdd() { Tasks.openAddModal(); }

  function toggleNotifs() {
    const p=document.getElementById('notif-panel');
    if (!p) return;
    p.classList.toggle('hidden');
    if (!p.classList.contains('hidden')) renderNotifs();
  }

  function renderNotifs() {
    const list=document.getElementById('notif-list');
    if (!list) return;
    const notifs=generateSmartNotifs();
    list.innerHTML = notifs.length ? notifs.map(n=>`
      <div class="notif-item">
        <div class="notif-title">${n.title}</div>
        <div class="notif-body">${n.body}</div>
        <div class="notif-time">${n.time}</div>
      </div>`).join('') : `<div style="text-align:center;padding:40px;color:var(--text3)">Sin notificaciones</div>`;
    const badge=document.getElementById('notif-badge');
    if (badge) { badge.textContent=notifs.length; badge.classList.toggle('hidden',notifs.length===0); }
  }

  function generateSmartNotifs() {
    const notifs=[], now=new Date(), h=now.getHours();
    const tasks=DB.get('tasks'), habits=DB.get('habits'), goals=DB.get('goals');
    const pending=tasks.filter(t=>!t.done&&t.priority);
    if (pending.length) notifs.push({title:'⚡ Tareas prioritarias',body:`${pending.length} tarea${pending.length>1?'s':''} importante${pending.length>1?'s':''} sin completar`,time:'Ahora'});
    const habitsDone=habits.filter(h=>h.done).length;
    if (habitsDone<habits.length&&h>=20) notifs.push({title:'🔲 Hábitos del día',body:`${habits.length-habitsDone} hábito${habits.length-habitsDone>1?'s':''} sin completar hoy`,time:'Esta noche'});
    if (h>=22&&h<24) notifs.push({title:'🌙 Recuerda dormir',body:'Meta: dormir antes de la 1am. Cierra el proyecto.',time:'Ahora'});
    goals.filter(g=>!g.done&&g.deadline).forEach(g=>{
      const days=Math.floor((new Date(g.deadline)-now)/86400000);
      if (days<=3&&days>=0) notifs.push({title:`⏰ Meta próxima a vencer`,body:`"${g.title}" vence en ${days} días`,time:`${days===0?'Hoy':`${days}d`}`});
    });
    // Claude timers
    const timers=DB.get('claude_timers')||[];
    timers.forEach(t=>{
      if (!t.active) return;
      const rem=t.endsAt-Date.now();
      if (rem>0) notifs.push({title:`⏱ Claude: ${t.name}`,body:`Disponible en ${Math.ceil(rem/60000)} min`,time:'Temporizador activo'});
      else notifs.push({title:`✅ Claude: ${t.name}`,body:'¡Ya puedes usar esta cuenta!',time:'Disponible ahora'});
    });
    return notifs;
  }

  function openSettings() {
    const p=document.getElementById('settings-panel');
    if (!p) return;
    p.classList.remove('hidden');
    renderSettings();
  }

  function closeSettings() { document.getElementById('settings-panel')?.classList.add('hidden'); }

  function renderSettings() {
    const sb=document.getElementById('settings-body');
    if (!sb) return;
    const s=DB.get('settings');
    sb.innerHTML=`
      <div class="setting-section">
        <h4>Cuenta</h4>
        <div class="setting-row" onclick="UI.changeName()">
          <span class="setting-label">Nombre</span>
          <span class="setting-value">${s.name||'Usuario'} <i class="ti ti-chevron-right"></i></span>
        </div>
        <div class="setting-row" onclick="UI.changePIN()">
          <span class="setting-label">Cambiar PIN</span>
          <span class="setting-value"><i class="ti ti-chevron-right"></i></span>
        </div>
      </div>
      <div class="setting-section">
        <h4>Datos</h4>
        <div class="setting-row" onclick="UI.exportData()">
          <span class="setting-label">Exportar mis datos</span>
          <span class="setting-value"><i class="ti ti-download"></i></span>
        </div>
        <div class="setting-row" onclick="UI.importData()">
          <span class="setting-label">Importar datos</span>
          <span class="setting-value"><i class="ti ti-upload"></i></span>
        </div>
        <div class="setting-row" onclick="UI.resetData()" style="color:var(--red)">
          <span class="setting-label" style="color:var(--red)">Restablecer todo</span>
          <span class="setting-value"><i class="ti ti-trash"></i></span>
        </div>
      </div>
      <div class="setting-section">
        <h4>App</h4>
        <div class="setting-row">
          <span class="setting-label">Versión</span>
          <span class="setting-value">Claudy v1.0.0</span>
        </div>
      </div>`;
  }

  function changeName() {
    const name=prompt('Tu nombre:',DB.get('settings')?.name||'');
    if (name?.trim()) { DB.update('settings',s=>{s.name=name.trim();return s;}); renderSettings(); snack('Nombre actualizado'); }
  }

  function changePIN() {
    const old=prompt('PIN actual:');
    if (!old) return;
    const newPin=prompt('Nuevo PIN (4 dígitos):');
    if (!newPin||newPin.length!==4||!/^\d{4}$/.test(newPin)) { snack('PIN inválido — debe ser 4 dígitos'); return; }
    if (Security.changePin(old,newPin)) snack('PIN actualizado ✅');
    else snack('PIN actual incorrecto');
  }

  function exportData() {
    const data=DB.export();
    const blob=new Blob([data],{type:'application/json'});
    const a=document.createElement('a');
    a.href=URL.createObjectURL(blob); a.download='claudy-backup.json'; a.click();
    snack('Datos exportados ✅');
  }

  function importData() {
    const input=document.createElement('input');
    input.type='file'; input.accept='.json';
    input.onchange=e=>{
      const file=e.target.files[0];
      if (!file) return;
      const reader=new FileReader();
      reader.onload=ev=>{ if(DB.import(ev.target.result)){snack('Datos importados ✅');location.reload();}else snack('Archivo inválido'); };
      reader.readAsText(file);
    };
    input.click();
  }

  function resetData() {
    if (!confirm('¿Restablecer todos los datos? Esta acción no se puede deshacer.')) return;
    DB.clear(); location.reload();
  }

  function updateNotifBadge() {
    const notifs=generateSmartNotifs();
    const badge=document.getElementById('notif-badge');
    if (badge) { badge.textContent=notifs.length; badge.classList.toggle('hidden',notifs.length===0); }
  }

  return { snack, openModal, closeModal, openSheet, closeSheet, showTab, openQuickAdd, toggleNotifs, openSettings, closeSettings, renderSettings, changeName, changePIN, exportData, importData, resetData, updateNotifBadge };
})();

// Global exposure
function showTab(t){UI.showTab(t);}
function openQuickAdd(){UI.openQuickAdd();}
function openSettings(){UI.openSettings();}
function closeSettings(){UI.closeSettings();}
function closeModal(){UI.closeModal();}
function closeSheet(){UI.closeSheet();}
function toggleNotifs(){UI.toggleNotifs();}
