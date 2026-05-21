// ═══════════════════════════════════════════════════════
// CLAUDY — Data Layer
// ═══════════════════════════════════════════════════════

const DB = {
  VERSION: '1.0.0',

  defaults: {
    tasks: [
      {id:1,title:'Preparar material del colegio',cat:'colegio',time:'08:30',done:false,priority:true,note:'Revisar temas del día',subtasks:[],deadline:'',xp:10,postponed:false,created:Date.now()},
      {id:2,title:'Avanzar módulo del proyecto de software',cat:'proyecto',time:'22:30',done:false,priority:true,note:'Deep work 2-3h. Definir arquitectura base.',subtasks:[{t:'Definir estructura de carpetas',d:false},{t:'Primer endpoint REST',d:false},{t:'Configurar base de datos',d:false}],deadline:'',xp:25,postponed:false,created:Date.now()},
      {id:3,title:'Repasar apuntes de Derecho',cat:'clase',time:'16:30',done:false,priority:false,note:'',subtasks:[],deadline:'',xp:10,postponed:false,created:Date.now()},
      {id:4,title:'Gym 💪 — Pecho y hombros',cat:'gym',time:'14:30',done:false,priority:false,note:'3x10 press banca, 3x12 hombros, 3x15 tríceps',subtasks:[],deadline:'',xp:15,postponed:false,created:Date.now()},
      {id:5,title:'Análisis de mercado (trading)',cat:'trading',time:'08:00',done:false,priority:false,note:'Solo análisis, no operar. Journal.',subtasks:[],deadline:'',xp:10,postponed:false,created:Date.now()},
    ],
    habits: [
      {id:101,title:'Dormir antes de la 1am',emoji:'🌙',cat:'salud',done:false,streak:0,bestStreak:0,history:[],target:'daily'},
      {id:102,title:'Desayuno antes de las 7am',emoji:'🍳',cat:'salud',done:false,streak:2,bestStreak:5,history:[],target:'daily'},
      {id:103,title:'Gym (Lun/Mié/Vie)',emoji:'💪',cat:'salud',done:false,streak:1,bestStreak:8,history:[],target:'3x/week'},
      {id:104,title:'Repasar apuntes del día',emoji:'📖',cat:'estudio',done:false,streak:0,bestStreak:3,history:[],target:'daily'},
      {id:105,title:'Sin trading de madrugada',emoji:'🚫',cat:'salud',done:false,streak:3,bestStreak:7,history:[],target:'daily'},
      {id:106,title:'Journal personal (5 min)',emoji:'✍️',cat:'mental',done:false,streak:0,bestStreak:2,history:[],target:'daily'},
      {id:107,title:'Hidratación: 2L de agua',emoji:'💧',cat:'salud',done:false,streak:1,bestStreak:4,history:[],target:'daily'},
    ],
    goals: [
      {id:201,title:'Lanzar v1 del proyecto de software',emoji:'🚀',cat:'proyecto',progress:15,target:100,deadline:'2026-08-01',done:false,milestones:[{t:'Definir arquitectura',d:true},{t:'Primer prototipo',d:false},{t:'MVP funcional',d:false},{t:'Deploy a producción',d:false}],xp:200,created:Date.now()},
      {id:202,title:'Aprobar todas las materias del semestre',emoji:'🎓',cat:'estudio',progress:40,target:100,deadline:'2026-12-01',done:false,milestones:[{t:'Primer parcial >14',d:true},{t:'Segundo parcial >14',d:false},{t:'Examen final >14',d:false}],xp:300,created:Date.now()},
      {id:203,title:'Gym 3x/semana por 3 meses seguidos',emoji:'💪',cat:'salud',progress:20,target:100,deadline:'2026-08-15',done:false,milestones:[{t:'Mes 1 completado',d:false},{t:'Mes 2 completado',d:false},{t:'Mes 3 completado',d:false}],xp:150,created:Date.now()},
      {id:204,title:'Crear plan de trading documentado',emoji:'📊',cat:'trading',progress:5,target:100,deadline:'2026-06-30',done:false,milestones:[{t:'Definir estrategia',d:false},{t:'Backtest 30 días',d:false},{t:'Plan de gestión de riesgo',d:false}],xp:100,created:Date.now()},
      {id:205,title:'Dormir antes de la 1am por 30 días',emoji:'🌙',cat:'salud',progress:10,target:100,deadline:'2026-06-20',done:false,milestones:[{t:'1 semana',d:false},{t:'2 semanas',d:false},{t:'1 mes completo',d:false}],xp:80,created:Date.now()},
    ],
    health: {
      weight: 0,
      height: 0,
      sleep: [],
      water: [],
      mood: [],
      gym_sessions: [],
      trading_sessions: [],
    },
    stats: {
      xp: 0,
      level: 1,
      streak: 0,
      lastActive: null,
      tasksCompleted: 0,
      habitsCompleted: 0,
      gymSessions: 0,
      tradingDays: 0,
      studyHours: 0,
      history: {},
    },
    settings: {
      pin: '1234',
      name: 'Estudiante',
      notifications: true,
      darkMode: true,
      sleepGoal: 22,
      wakeGoal: 6,
      gymDays: [1,3,5],
    },
    notifications: [],
    records: {
      bestTaskDay: 0,
      bestGymWeek: 0,
      bestStreak: 0,
      bestSleepScore: 0,
    }
  },

  load(key) {
    try {
      const raw = localStorage.getItem('claudy_' + key);
      return raw ? JSON.parse(raw) : null;
    } catch(e) { return null; }
  },

  save(key, val) {
    try { localStorage.setItem('claudy_' + key, JSON.stringify(val)); return true; }
    catch(e) { return false; }
  },

  get(key) {
    return this.load(key) ?? JSON.parse(JSON.stringify(this.defaults[key] ?? null));
  },

  set(key, val) { return this.save(key, val); },

  update(key, fn) {
    const val = this.get(key);
    const updated = fn(val);
    this.set(key, updated ?? val);
    return updated ?? val;
  },

  clear() {
    ['tasks','habits','goals','health','stats','settings','notifications','records']
      .forEach(k => localStorage.removeItem('claudy_' + k));
  },

  export() {
    const data = {};
    ['tasks','habits','goals','health','stats','settings','notifications','records']
      .forEach(k => data[k] = this.get(k));
    return JSON.stringify(data, null, 2);
  },

  import(json) {
    try {
      const data = JSON.parse(json);
      Object.keys(data).forEach(k => this.set(k, data[k]));
      return true;
    } catch(e) { return false; }
  }
};

// Fixed schedule blocks (always present, cannot be deleted)
const FIXED_SCHEDULE = {
  0: [ // Monday
    {time:'06:00',end:'06:30',label:'Despertar + desayuno',type:'personal'},
    {time:'08:30',end:'09:00',label:'Traslado al colegio',type:'travel'},
    {time:'09:00',end:'14:00',label:'Colegio — apoyo docente',type:'fixed'},
    {time:'14:00',end:'14:30',label:'Almuerzo',type:'personal'},
    {time:'14:30',end:'16:00',label:'Gym 💪 Pecho + hombros',type:'gym'},
    {time:'16:00',end:'16:30',label:'Ducha + recuperación',type:'personal'},
    {time:'18:00',end:'18:20',label:'Traslado a U',type:'travel'},
    {time:'18:30',end:'20:00',label:'Introducción al Derecho',type:'class'},
    {time:'20:00',end:'20:15',label:'Break',type:'free'},
    {time:'20:15',end:'21:45',label:'Historia del Derecho y D. Romano',type:'class'},
    {time:'21:45',end:'22:15',label:'Vuelta + cena',type:'travel'},
    {time:'22:30',end:'01:00',label:'Proyecto de software 💻',type:'project'},
    {time:'01:00',end:'06:00',label:'Sueño 😴',type:'sleep'},
  ],
  1: [ // Tuesday
    {time:'06:00',end:'06:30',label:'Despertar + desayuno',type:'personal'},
    {time:'06:30',end:'06:50',label:'Traslado a U',type:'travel'},
    {time:'07:00',end:'09:00',label:'Lab Sistemas Distribuidos',type:'class'},
    {time:'09:00',end:'09:20',label:'Traslado al colegio',type:'travel'},
    {time:'09:00',end:'14:00',label:'Colegio — apoyo docente',type:'fixed'},
    {time:'14:00',end:'14:30',label:'Almuerzo',type:'personal'},
    {time:'14:30',end:'17:30',label:'Proyecto de software 💻',type:'project'},
    {time:'17:30',end:'18:00',label:'Traslado a U',type:'travel'},
    {time:'18:00',end:'20:00',label:'Curso de Reingeniería',type:'class'},
    {time:'20:00',end:'21:00',label:'Vuelta + cena',type:'travel'},
    {time:'21:00',end:'01:00',label:'Proyecto de software 💻',type:'project'},
    {time:'01:00',end:'06:00',label:'Sueño 😴',type:'sleep'},
  ],
  2: [ // Wednesday
    {time:'06:00',end:'06:30',label:'Despertar + desayuno',type:'personal'},
    {time:'08:30',end:'09:00',label:'Traslado al colegio',type:'travel'},
    {time:'09:00',end:'14:00',label:'Colegio — apoyo docente',type:'fixed'},
    {time:'14:00',end:'14:30',label:'Almuerzo',type:'personal'},
    {time:'14:30',end:'16:00',label:'Gym 💪 Espalda + bíceps',type:'gym'},
    {time:'16:00',end:'16:30',label:'Ducha + recuperación',type:'personal'},
    {time:'18:30',end:'20:00',label:'Historia del Derecho y D. Romano',type:'class'},
    {time:'20:00',end:'20:15',label:'Break',type:'free'},
    {time:'20:15',end:'21:45',label:'Introducción al Derecho',type:'class'},
    {time:'21:45',end:'22:15',label:'Vuelta + cena',type:'travel'},
    {time:'22:30',end:'01:00',label:'Proyecto de software 💻',type:'project'},
    {time:'01:00',end:'06:00',label:'Sueño 😴',type:'sleep'},
  ],
  3: [ // Thursday
    {time:'06:00',end:'06:30',label:'Despertar + desayuno',type:'personal'},
    {time:'08:30',end:'09:00',label:'Traslado al colegio',type:'travel'},
    {time:'09:00',end:'14:00',label:'Colegio — apoyo docente',type:'fixed'},
    {time:'14:00',end:'14:30',label:'Almuerzo',type:'personal'},
    {time:'14:30',end:'18:00',label:'Proyecto de software 💻',type:'project'},
    {time:'18:00',end:'18:30',label:'Traslado a U',type:'travel'},
    {time:'18:30',end:'20:45',label:'Intro a la Vida Universitaria',type:'class'},
    {time:'20:45',end:'21:30',label:'Vuelta + cena',type:'travel'},
    {time:'21:30',end:'00:00',label:'Proyecto de software 💻',type:'project'},
    {time:'00:00',end:'06:00',label:'Sueño 😴',type:'sleep'},
  ],
  4: [ // Friday
    {time:'06:00',end:'06:30',label:'Despertar + desayuno',type:'personal'},
    {time:'08:30',end:'09:00',label:'Traslado al colegio',type:'travel'},
    {time:'09:00',end:'14:00',label:'Colegio — apoyo docente',type:'fixed'},
    {time:'14:00',end:'14:30',label:'Almuerzo',type:'personal'},
    {time:'14:30',end:'16:00',label:'Gym 💪 Piernas + core',type:'gym'},
    {time:'16:00',end:'16:30',label:'Ducha + recuperación',type:'personal'},
    {time:'17:40',end:'18:00',label:'Traslado a U',type:'travel'},
    {time:'18:00',end:'20:00',label:'Sistemas Distribuidos',type:'class'},
    {time:'20:00',end:'21:00',label:'Vuelta + cena',type:'travel'},
    {time:'21:00',end:'23:30',label:'Proyecto de software 💻',type:'project'},
    {time:'23:30',end:'06:00',label:'Sueño 😴',type:'sleep'},
  ],
  5: [ // Saturday
    {time:'06:00',end:'08:00',label:'Libre — sin alarma',type:'personal'},
    {time:'08:00',end:'10:00',label:'Trading: análisis y journal',type:'trading'},
    {time:'10:00',end:'13:00',label:'Proyecto de software 💻 (bloque largo)',type:'project'},
    {time:'13:00',end:'14:00',label:'Almuerzo',type:'personal'},
    {time:'14:00',end:'22:00',label:'Libre / familia / descanso',type:'free'},
    {time:'22:00',end:'06:00',label:'Sueño 😴',type:'sleep'},
  ],
  6: [ // Sunday
    {time:'06:00',end:'10:00',label:'Libre total — recarga',type:'personal'},
    {time:'10:00',end:'13:00',label:'Proyecto (opcional)',type:'project'},
    {time:'13:00',end:'15:00',label:'Almuerzo familiar',type:'personal'},
    {time:'15:00',end:'20:00',label:'Tiempo libre total',type:'free'},
    {time:'20:00',end:'22:00',label:'Prep semana siguiente',type:'personal'},
    {time:'22:00',end:'06:00',label:'Sueño 😴',type:'sleep'},
  ]
};

const MOTIVATIONAL_QUOTES = [
  {q:"El éxito no es el resultado de la combustión espontánea. Tienes que prenderte fuego tú mismo.", a:"Arnold H. Glasow"},
  {q:"No cuentes los días. Haz que los días cuenten.", a:"Muhammad Ali"},
  {q:"El único modo de hacer un gran trabajo es amar lo que haces.", a:"Steve Jobs"},
  {q:"Disciplina es elegir entre lo que quieres ahora y lo que quieres más.", a:"Abraham Lincoln"},
  {q:"No te compares con otros. Compárate con quien eras ayer.", a:"Jordan B. Peterson"},
  {q:"La diferencia entre ordinario y extraordinario es ese pequeño extra.", a:"Jimmy Johnson"},
  {q:"Un hombre que domina su tiempo domina su vida.", a:"Anónimo"},
  {q:"Las personas fuertes no se rinden cuando están cansadas. Se rinden cuando terminan.", a:"Anónimo"},
  {q:"El conocimiento sin acción es vanidad. La acción sin conocimiento es locura.", a:"Al-Ghazali"},
  {q:"Trabaja en silencio, deja que tu éxito haga el ruido.", a:"Anónimo"},
  {q:"Cada experto fue alguna vez un principiante.", a:"Helen Hayes"},
  {q:"El dolor que sientes hoy será la fuerza que sentirás mañana.", a:"Anónimo"},
];

const ACHIEVEMENTS = [
  {id:'first_task',name:'Primera tarea',icon:'✅',desc:'Completa tu primera tarea',xp:10},
  {id:'streak_3',name:'3 días seguidos',icon:'🔥',desc:'Mantén racha de 3 días',xp:30},
  {id:'streak_7',name:'Semana perfecta',icon:'⭐',desc:'7 días de racha',xp:75},
  {id:'streak_30',name:'Mes invencible',icon:'👑',desc:'30 días de racha',xp:300},
  {id:'gym_10',name:'Atleta en progreso',icon:'💪',desc:'10 sesiones de gym',xp:50},
  {id:'gym_30',name:'Cuerpo forjado',icon:'🏋️',desc:'30 sesiones de gym',xp:150},
  {id:'tasks_50',name:'Ejecutor',icon:'⚡',desc:'50 tareas completadas',xp:100},
  {id:'tasks_100',name:'Máquina',icon:'🤖',desc:'100 tareas completadas',xp:250},
  {id:'goal_first',name:'Primer logro',icon:'🎯',desc:'Completa tu primera meta',xp:80},
  {id:'sleep_week',name:'Buen descanso',icon:'🌙',desc:'Duerme a tiempo 7 días',xp:60},
  {id:'project_start',name:'Builder',icon:'🚀',desc:'Inicia tu proyecto',xp:40},
  {id:'no_procrastinate',name:'Anti-procrastinador',icon:'⏰',desc:'Completa todo en el día',xp:50},
];
