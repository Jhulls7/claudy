// ═══════════════════════════════════════════════════════
// CLAUDY — Charts Module (Chart.js)
// ═══════════════════════════════════════════════════════
const Charts = (() => {
  const instances = {};

  const gridColor='rgba(255,255,255,0.05)';
  const textColor='#5A5A72';
  const baseOptions = {
    responsive:true, maintainAspectRatio:false,
    plugins:{legend:{display:false},tooltip:{backgroundColor:'#18181F',titleColor:'#EEEEF5',bodyColor:'#9898B0',borderColor:'rgba(255,255,255,0.1)',borderWidth:0.5,padding:10,cornerRadius:8}},
    scales:{x:{grid:{color:gridColor},ticks:{color:textColor,font:{size:10,family:'Inter'}}},y:{grid:{color:gridColor},ticks:{color:textColor,font:{size:10,family:'Inter'}}}}
  };

  function destroy(id) { if (instances[id]) { instances[id].destroy(); delete instances[id]; } }

  function renderWeeklyChart() {
    const canvas = document.getElementById('weekly-chart');
    if (!canvas) return;
    destroy('weekly');
    const days = ['L','M','X','J','V','S','D'];
    const data = [4,7,5,8,6,9,3].map(v=>v+Math.floor(Math.random()*3));
    instances['weekly'] = new Chart(canvas, {
      type:'bar',
      data:{ labels:days, datasets:[{data, backgroundColor:days.map((_,i)=>i===new Date().getDay()-1?'rgba(124,110,245,0.9)':'rgba(124,110,245,0.3)'), borderRadius:6, borderSkipped:false}]},
      options:{...baseOptions, plugins:{...baseOptions.plugins}, scales:{...baseOptions.scales,y:{...baseOptions.scales.y,beginAtZero:true,max:15}}}
    });
  }

  function renderHealthChart() {
    const canvas = document.getElementById('health-chart');
    if (!canvas) return;
    destroy('health');
    const health = DB.get('health');
    const days = ['L','M','X','J','V','S','D'];
    const sleepData = Array(7).fill(0).map((_,i)=>{
      const entry = (health.sleep||[]).slice(-7)[i];
      return entry?.hours||Math.random()*3+5;
    });
    const waterData = Array(7).fill(0).map((_,i)=>{
      const entry = (health.water||[]).slice(-7)[i];
      return entry?.liters||Math.random()*1+1;
    });
    instances['health'] = new Chart(canvas, {
      type:'line',
      data:{
        labels:days,
        datasets:[
          {label:'Sueño (h)',data:sleepData,borderColor:'#A99DF7',backgroundColor:'rgba(169,157,247,0.1)',tension:0.4,fill:true,pointBackgroundColor:'#A99DF7',pointRadius:4},
          {label:'Agua (L)',data:waterData,borderColor:'#3B82F6',backgroundColor:'rgba(59,130,246,0.1)',tension:0.4,fill:true,pointBackgroundColor:'#3B82F6',pointRadius:4}
        ]
      },
      options:{...baseOptions,plugins:{...baseOptions.plugins,legend:{display:true,labels:{color:'#9898B0',font:{size:11}}}}}
    });
  }

  function renderPieChart() {
    const canvas = document.getElementById('pie-chart');
    if (!canvas) return;
    destroy('pie');
    instances['pie'] = new Chart(canvas, {
      type:'doughnut',
      data:{
        labels:['Colegio','Clases U','Proyecto','Gym','Libre','Sueño'],
        datasets:[{data:[25,15,15,5,15,25],backgroundColor:['#22C55E','#7C6EF5','#EF4444','#F59E0B','#3B82F6','#EC4899'],borderWidth:0,hoverOffset:6}]
      },
      options:{responsive:true,maintainAspectRatio:false,cutout:'65%',plugins:{legend:{display:true,position:'bottom',labels:{color:'#9898B0',font:{size:10},padding:12,usePointStyle:true}}}}
    });
  }

  function renderMonthlyChart() {
    const canvas = document.getElementById('monthly-chart');
    if (!canvas) return;
    destroy('monthly');
    const labels = Array.from({length:30},(_,i)=>(i+1)%5===0?String(i+1):'');
    const taskData = Array.from({length:30},()=>Math.floor(Math.random()*8)+2);
    const habitData = Array.from({length:30},()=>Math.floor(Math.random()*6)+3);
    instances['monthly'] = new Chart(canvas, {
      type:'line',
      data:{
        labels,
        datasets:[
          {label:'Tareas',data:taskData,borderColor:'#7C6EF5',backgroundColor:'rgba(124,110,245,0.1)',tension:0.4,fill:true,pointRadius:0},
          {label:'Hábitos',data:habitData,borderColor:'#22C55E',backgroundColor:'rgba(34,197,94,0.1)',tension:0.4,fill:true,pointRadius:0}
        ]
      },
      options:{...baseOptions,plugins:{...baseOptions.plugins,legend:{display:true,labels:{color:'#9898B0',font:{size:11}}}}}
    });
  }

  function renderAllRings() {
    const tasks = DB.get('tasks');
    const habits = DB.get('habits');
    const goals = DB.get('goals');
    const healthScore = Engine.calculateHealthScore();
    const taskPct = tasks.length?Math.round(tasks.filter(t=>t.done).length/tasks.length*100):0;
    const habitPct = habits.length?Math.round(habits.filter(h=>h.done).length/habits.length*100):0;
    const goalPct = goals.length?Math.round(goals.reduce((a,g)=>a+(g.progress||0),0)/goals.length):0;

    Engine.drawRing('ring-health',healthScore,'#22C55E');
    Engine.drawRing('ring-tasks',taskPct,'#7C6EF5');
    Engine.drawRing('ring-habits',habitPct,'#F59E0B');
    Engine.drawRing('ring-goals',goalPct,'#EC4899');

    const set = (id,val)=>{ const el=document.getElementById(id); if(el) el.textContent=val; };
    set('rpct-health',healthScore+'%');
    set('rpct-tasks',taskPct+'%');
    set('rpct-habits',habitPct+'%');
    set('rpct-goals',goalPct+'%');
  }

  return { renderWeeklyChart, renderHealthChart, renderPieChart, renderMonthlyChart, renderAllRings };
})();
