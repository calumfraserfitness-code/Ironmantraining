'use strict';

// ============================================================
// ATHLETE PROFILE
// ============================================================
const ATHLETE = {
  name:      'Calum Fraser',
  dob:       new Date('2003-01-01'),
  height:    183,
  weight:    78,
  vo2max:    43,
  rhr:       48,
  maxHR:     185,
  raceDate:  new Date('2026-10-25'),
  planStart: new Date('2026-03-16'),
  hrZones: {
    z1: { name:'Recovery',   min:93,  max:111, color:'#4CAF50' },
    z2: { name:'Aerobic',    min:111, max:130, color:'#2196F3' },
    z3: { name:'Tempo',      min:130, max:148, color:'#FF9800' },
    z4: { name:'Threshold',  min:148, max:167, color:'#F44336' },
    z5: { name:'VO2 Max',    min:167, max:185, color:'#9C27B0' },
  },
};

// ============================================================
// RACES — A-races and tune-up events
// ============================================================
const RACES = [
  {
    id: 'athlone10',
    name: 'Athlone 10 Mile',
    date: new Date('2026-05-16'),
    dist: '10 miles \u2014 16.1 km',
    icon: '\ud83c\udfc3',
    color: '#FF9800',
    type: 'run',
    note: 'Tune-up race \u2014 target sub-1:20. Taper starts Week 8.',
  },
  {
    id: 'connacht_half',
    name: 'Connacht Half Marathon',
    date: new Date('2026-04-19'),
    dist: 'Half Marathon \u2014 21.1 km',
    icon: '\ud83c\udfc3',
    color: '#9C27B0',
    type: 'run',
    note: 'Week 5 A-Race. This IS your long run that week. Taper starts Week 4 Sunday.',
  },
  {
    id: 'ironman',
    name: 'IRONMAN 70.3 Costa Navarino',
    date: new Date('2026-10-25'),
    dist: '1.9km swim \u2022 90km bike \u2022 21.1km run',
    icon: '\ud83c\udfc5',
    color: '#F44336',
    type: 'triathlon',
    note: 'A-Race. Everything builds to this.',
  },
];

// ============================================================
// HELPERS
// ============================================================
function addDays(date, n) { const d = new Date(date); d.setDate(d.getDate()+n); return d; }
function getDaysToRace() {
  const now  = new Date(); now.setHours(0,0,0,0);
  const race = new Date(ATHLETE.raceDate); race.setHours(0,0,0,0);
  return Math.max(0, Math.round((race-now)/86400000));
}
function formatShortDate(d) {
  return d.toLocaleDateString('en-GB', { day:'numeric', month:'short' });
}
function workoutIcon(type) {
  const m = { gym:'fa-dumbbell', run:'fa-person-running', swim:'fa-person-swimming',
               bike:'fa-bicycle', brick:'fa-bolt', rest:'fa-moon' };
  return m[type] || 'fa-circle';
}
function workoutIconClass(type) {
  const m = { gym:'icon-gym', run:'icon-run', swim:'icon-swim',
               bike:'icon-bike', brick:'icon-brick', rest:'icon-rest' };
  return m[type] || '';
}

// ============================================================
// NUTRITION & HYDRATION
// ============================================================
const CARBS_BY_TYPE = { rest:350, single:450, double:525, brick:625 };

function getWorkoutDayType(workouts) {
  const types  = workouts.map(function(w){ return w.type; });
  const discs  = workouts.map(function(w){ return w.discipline || w.type; });
  // Split days: gym type but run/swim discipline = two sessions in the day
  const isSplitDay = types.includes('gym') && (discs.includes('run') || discs.includes('swim'));
  if (isSplitDay)                                                   return { id:'double', name:'Split Day',   calories:3000 };
  if (types.filter(function(t){ return t!=='rest'; }).length >= 2) return { id:'double', name:'Double Day',  calories:3000 };
  if (types.includes('run') || types.includes('swim') || types.includes('bike')) return { id:'single', name:'Single Day', calories:2800 };
  if (types.includes('gym'))                                        return { id:'single', name:'Gym Day',     calories:2800 };
  return { id:'rest', name:'Rest Day', calories:2400 };
}

function calcNutrition(dayType) {
  const protein = 250;
  const carbs   = CARBS_BY_TYPE[dayType.id] || 450;
  const fatKcal = dayType.calories - protein*4 - carbs*4;
  const fat     = Math.max(25, Math.round(fatKcal/9));
  const kcal    = protein*4 + carbs*4 + fat*9;
  return {
    kcal,
    protein: { g:protein, kcal:protein*4 },
    carbs:   { g:carbs,   kcal:carbs*4   },
    fat:     { g:fat,     kcal:fat*9     },
  };
}

function calcHydration(dayType) {
  const base   = 3.0;
  const extra  = dayType.id === 'double' ? 1.0 : dayType.id === 'single' ? 0.5 : 0;
  const total  = Math.round((base + extra)*10)/10;
  const sodiumMg = dayType.id === 'double' ? 1500 : dayType.id === 'single' ? 1200 : 800;
  const saltG    = Math.round(sodiumMg/368*10)/10;
  return { total, sodiumMg, saltG };
}


// ============================================================
// GET DAY WORKOUT — returns workout object for any week/day
// Mon=0 Upper A (gym)
// Tue=1 Lower A + Run
// Wed=2 Shoulders/Arms + Swim + Spin
// Thu=3 Upper B lighter [+Sauna wk22+]
// Fri=4 Lower B + Swim
// Sat=5 Spin
// Sun=6 Long Run
// ============================================================
function getDayWorkout(weekNum, dayIdx, phase, phaseWeek) {
  const hasWetsuit  = weekNum >= 9;
  const saunaWeek   = weekNum >= 22;
  const isBase      = phase === 'Base';
  const isBuild     = phase === 'Build';
  const isPeak      = phase === 'Peak';
  const isTaper     = phase === 'Taper' || phase === 'Race Prep';

  // ── ATHLONE 10 MILE SPECIAL CASES ──────────────────────────────────────
  // Week 8: Taper — shorten Sunday long run to protect legs before race
  if (weekNum === 8 && dayIdx === 6) {
    return {
      name: 'Pre-Race Taper Run \u2014 8 km easy',
      type: 'run', discipline: 'run',
      sessions: [{ key:'run', label:'Run', icon:'fa-person-running', hasDistance:true }],
      zone: 2, duration: 50, distance: 8,
      intensity: 'Easy \u2014 Zone 2 only',
      desc: '\ud83c\udfc3 <strong>Taper run 8 km</strong> \u2014 Zone 2 ONLY (' + Object.values(ATHLETE.hrZones)[1].min + '\u2013' + Object.values(ATHLETE.hrZones)[1].max + ' bpm). Legs are fresh for Athlone 10 Mile next week. Do NOT push. No trail, no hills. Keep it flat and comfortable.\n\n\u26a0\ufe0f <strong>Athlone 10 Mile is in 7 days.</strong> Rest is training right now.',
    };
  }
  // Week 9: Race Day Saturday = Athlone 10 Mile
  if (weekNum === 9 && dayIdx === 5) {
    return {
      name: '\ud83c\udfc5 RACE DAY \u2014 Athlone 10 Mile',
      type: 'run', discipline: 'run',
      sessions: [{ key:'run', label:'Race Run', icon:'fa-person-running', hasDistance:true }],
      zone: 4, duration: 80, distance: 16.1,
      intensity: 'Race Effort',
      desc: '\ud83c\udfc5 <strong>RACE DAY \u2014 Athlone 10 Mile (16.1 km)</strong>\n\n\u2022 Warm up: 10\u201315 min easy jog + strides\n\u2022 Target pace: ~4:50\u20135:00/km for sub-80 min\n\u2022 First 2km: conservative \u2014 do NOT go out too fast\n\u2022 Build from km 4 onward\n\u2022 Final 2km: empty the tank\n\u2022 Post-race: stretch, protein meal, ice any soreness\n\nLog your finish time below. This is great data for IRONMAN pacing.',
    };
  }
  // Week 9: Sunday = Active recovery after Athlone race
  if (weekNum === 9 && dayIdx === 6) {
    return {
      name: 'Post-Race Recovery Run \u2014 5 km easy',
      type: 'run', discipline: 'run',
      sessions: [{ key:'run', label:'Run', icon:'fa-person-running', hasDistance:true }],
      zone: 1, duration: 35, distance: 5,
      intensity: 'Very Easy \u2014 Zone 1',
      desc: '\ud83d\udc9a <strong>Active recovery after Athlone 10 Mile.</strong> 5 km very easy \u2014 just flush the legs. Zone 1 only (' + Object.values(ATHLETE.hrZones)[0].min + '\u2013' + Object.values(ATHLETE.hrZones)[0].max + ' bpm). Walk sections if needed. The goal is movement, not fitness.',
    };
  }

  // ── CONNACHT HALF MARATHON SPECIAL CASES ───────────────────────────────
  // Week 4 Sunday (April 12): Pre-race taper — shorter, easy long run
  if (weekNum === 4 && dayIdx === 6) {
    return {
      name: 'Pre-Race Taper Run \u2014 10 km easy',
      type: 'run', discipline: 'run',
      sessions: [{ key:'run', label:'Run', icon:'fa-person-running', hasDistance:true }],
      zone: 2, duration: 60, distance: 10,
      intensity: 'Easy \u2014 Zone 2 only',
      desc: '\ud83c\udfc3 <strong>Taper run 10 km</strong> \u2014 Zone 2 ONLY (' + Object.values(ATHLETE.hrZones)[1].min + '\u2013' + Object.values(ATHLETE.hrZones)[1].max + ' bpm). Connacht Half Marathon is in 7 days. Do NOT push. Flat route, comfortable pace. The fitness is already there \u2014 today is about staying sharp, not adding fatigue.\n\n\u26a0\ufe0f <strong>Connacht Half Marathon is Sunday April 19 \u2014 7 days away.</strong>',
    };
  }
  // Week 5 Sunday (April 19): RACE DAY — Connacht Half Marathon
  if (weekNum === 5 && dayIdx === 6) {
    return {
      name: '\ud83c\udfc5 RACE DAY \u2014 Connacht Half Marathon',
      type: 'run', discipline: 'run',
      sessions: [{ key:'run', label:'Race Run', icon:'fa-person-running', hasDistance:true }],
      zone: 4, duration: 110, distance: 21.1,
      intensity: 'Race Effort',
      desc: '\ud83c\udfc5 <strong>RACE DAY \u2014 Connacht Half Marathon (21.1 km)</strong>\n\n\u2022 Warm up: 15 min easy jog + 4\u20136 strides\n\u2022 Start conservative \u2014 first 5km should feel almost too easy\n\u2022 Target pace: ~5:00\u20135:10/km for sub-1:50, or just race by feel\n\u2022 This is excellent IRONMAN run prep \u2014 treat it as a long tempo effort, not an all-out race\n\u2022 Km 15\u201319: start pushing if you have the legs\n\u2022 Final 2km: finish strong\n\u2022 Post-race: protein + carbs within 30 min, ice any soreness\n\nLog your finish time below \u2014 this will calibrate your run pacing for October.',
    };
  }
  // Week 6 Sunday (April 26): Recovery run after half marathon
  if (weekNum === 6 && dayIdx === 6) {
    return {
      name: 'Post-Race Recovery Run \u2014 6 km easy',
      type: 'run', discipline: 'run',
      sessions: [{ key:'run', label:'Run', icon:'fa-person-running', hasDistance:true }],
      zone: 1, duration: 40, distance: 6,
      intensity: 'Very Easy \u2014 Zone 1',
      desc: '\ud83d\udc9a <strong>Active recovery after Connacht Half.</strong> 6 km very easy \u2014 Zone 1 only (' + Object.values(ATHLETE.hrZones)[0].min + '\u2013' + Object.values(ATHLETE.hrZones)[0].max + ' bpm). Legs will be tired. Walk any hills. Focus is blood flow and recovery, not fitness. Full training resumes next week.',
    };
  }

  // Run distance progression
  const runKm = isBase  ? Math.min(8 + phaseWeek*1.5, 14)
              : isBuild ? Math.min(14 + phaseWeek*1.5, 22)
              : isPeak  ? Math.min(20 + phaseWeek*0.5, 23)
              : 15;

  // Swim distance progression
  const swimKm = isBase  ? Math.min(1.0 + phaseWeek*0.1, 1.6)
               : isBuild ? Math.min(1.6 + phaseWeek*0.15, 2.2)
               : isPeak  ? Math.min(2.0 + phaseWeek*0.1, 2.5)
               : 1.5;

  const zone = isBase ? 2 : isBuild ? 3 : isPeak ? 4 : 2;

  const zoneInfo = Object.values(ATHLETE.hrZones)[zone-1];
  const bpmStr = zoneInfo.min + '\u2013' + zoneInfo.max + ' bpm';

  const longRunKm = Math.round(runKm * 1.3 * 10) / 10;
  const pctRun  = Math.round(longRunKm / 21.1 * 100);
  const pctSwim = Math.round(swimKm    / 1.9  * 100);

  switch (dayIdx) {
    // MONDAY: Upper Body A
    case 0: return {
      name: 'Upper Body A \u2014 Strength',
      type: 'gym', discipline: 'gym',
      sessions: [{ key:'gym', label:'Gym', icon:'fa-dumbbell', hasDistance:false }],
      zone: null, duration: isBase ? 65 : 70, distance: null,
      intensity: 'Moderate\u2013Heavy',
      desc: '\u23f1 ' + (isBase?65:70) + ' min \u00b7 Push/pull upper body strength session. '
        + 'Focus for today: <strong>chest pressing, rowing movements, overhead press, pull-ups/lat work</strong>. '
        + 'Choose your own exercises and weights \u2014 what matters is hitting the movement patterns and adding load week on week. '
        + 'Log what you did in Notes so you can beat it next week.',
    };

    // TUESDAY: Lower Body A + Run (split — not back to back)
    case 1: return {
      name: 'Legs + Run \u2014 ' + runKm.toFixed(1) + ' km',
      type: 'gym', discipline: 'run',
      sessions: [
        { key:'gym', label:'Gym', icon:'fa-dumbbell', hasDistance:false },
        { key:'run', label:'Run', icon:'fa-person-running', hasDistance:true },
      ],
      zone: zone, duration: (isBase?65:70) + Math.round(runKm*6), distance: runKm,
      intensity: isBase ? 'Moderate' : 'Moderate\u2013Hard',
      desc: '\ud83c\udfcb <strong>Session 1 \u2014 Gym (' + (isBase?65:70) + ' min)</strong>: Lower body strength \u2014 squats, Romanian deadlifts, leg press, calf raises. Your exercises, your weights. Do this when it suits you \u2014 morning, lunch, whenever. '
        + 'Then later in the day when recovered: \ud83c\udfc3 <strong>Session 2 \u2014 Run ' + runKm.toFixed(1) + ' km</strong> at Zone ' + zone + ' (' + bpmStr + '). Give yourself at least 3\u20134 hours between gym and run. '
        + 'Building toward your <strong>21.1 km race run</strong> \u2014 this run is ' + Math.round(runKm/21.1*100) + '% of race distance. '
        + (isBase ? 'Road or trail, keep it conversational \u2014 no hero miles here.' : 'Push the pace on the second half if feeling good.'),
    };

    // WEDNESDAY: Shoulders/Arms + Swim + Spin (split — not back to back)
    case 2: return {
      name: 'Shoulders + Swim ' + swimKm.toFixed(2) + ' km + Spin',
      type: 'gym', discipline: 'swim', hasSpin: true,
      sessions: [
        { key:'gym',  label:'Gym', icon:'fa-dumbbell', hasDistance:false },
        { key:'swim', label:'Swim', icon:'fa-person-swimming', hasDistance:true },
        { key:'bike', label:'Spin', icon:'fa-bicycle', hasDistance:false },
      ],
      zone: zone, duration: 55 + Math.round(swimKm*30) + 45, distance: swimKm,
      intensity: isBase ? 'Easy\u2013Moderate' : 'Moderate',
      desc: '\ud83c\udfcb <strong>Session 1 \u2014 Gym (55 min)</strong>: Shoulders & arms \u2014 lateral raises, face pulls, curls, triceps. Do this separately \u2014 gym first, recover, then pool later. '
        + '\ud83c\udfca <strong>Session 2 \u2014 Swim ' + swimKm.toFixed(2) + ' km</strong> '
        + (hasWetsuit ? '(open water \u2014 practise sighting and wetsuit entry/exit)' : '(pool)') + '. '
        + 'Building toward <strong>1.9 km race swim</strong> \u2014 at ' + pctSwim + '% of race distance. '
        + '\ud83d\udeb4 <strong>Session 3 \u2014 Spin 45 min</strong> Zone ' + zone + ' (' + bpmStr + ').\n\n'
        + '<strong>\ud83c\udfca Sample Swim Sets for ' + swimKm.toFixed(2) + ' km:</strong>\n'
        + '<em>Option A \u2014 Endurance/Technique:</em> 200m easy warm-up \u2192 4\u00d750m catch-up drill (hands touch before next stroke, 15s rest) \u2192 4\u00d750m bilateral breathing (every 3 strokes, 15s rest) \u2192 ' + Math.max(2, Math.round(swimKm*4-4)) + '\u00d7100m steady (20s rest) \u2192 100m easy cool-down.\n'
        + '<em>Option B \u2014 Tempo:</em> 200m easy \u2192 3\u00d7' + Math.round(swimKm*400/3/100)*100 + 'm at race pace (45s rest) \u2192 4\u00d750m sprint (30s rest) \u2192 100m easy. Race pace = Zone 3\u20134, breathing controlled.',
    };

    // THURSDAY: Upper Body B + optional Sauna
    case 3: return {
      name: 'Upper Body B' + (saunaWeek ? ' + Sauna' : ''),
      type: 'gym', discipline: 'gym',
      sessions: [{ key:'gym', label:'Gym', icon:'fa-dumbbell', hasDistance:false }],
      zone: null, duration: saunaWeek ? 90 : 65, distance: null,
      intensity: 'Light\u2013Moderate',
      desc: '\u23f1 ' + (saunaWeek?90:65) + ' min \u00b7 <strong>Upper body volume \u2014 lighter than Monday</strong>. '
        + 'Focus: shoulders, arms, upper back supporting muscles. Avoid repeating Monday\u2019s heavy movements. '
        + 'Shorter rest periods, slightly higher reps. Log what you do. '
        + (saunaWeek
          ? 'After gym: \ud83e\uddd6 <strong>2 \u00d7 10 min sauna</strong> \u2014 heat acclimatisation for Costa Navarino October race conditions. Drink an extra 500ml water.'
          : ''),
    };

    // FRIDAY: Lower Body B + Swim (split — not back to back)
    case 4: return {
      name: 'Legs + Swim \u2014 ' + swimKm.toFixed(2) + ' km',
      type: 'gym', discipline: 'swim',
      sessions: [
        { key:'gym',  label:'Gym', icon:'fa-dumbbell', hasDistance:false },
        { key:'swim', label:'Swim', icon:'fa-person-swimming', hasDistance:true },
      ],
      zone: zone, duration: 65 + Math.round(swimKm*30), distance: swimKm,
      intensity: 'Moderate',
      desc: '\ud83c\udfcb <strong>Session 1 \u2014 Gym (65 min)</strong>: Lower body \u2014 deadlifts, Bulgarian split squats, leg curl, hip thrust. Do gym first, then pool later in the day. '
        + '\ud83c\udfca <strong>Session 2 \u2014 Swim ' + swimKm.toFixed(2) + ' km</strong>. '
        + 'Building toward <strong>1.9 km race swim</strong> \u2014 at ' + pctSwim + '% of race distance.\n\n'
        + '<strong>\ud83c\udfca Sample Swim Sets for ' + swimKm.toFixed(2) + ' km:</strong>\n'
        + '<em>Option A \u2014 Technique focus:</em> 200m easy \u2192 6\u00d750m fingertip drag drill (high elbow recovery, 15s rest) \u2192 4\u00d750m fist drill (closed fist, feel the water pressure, 15s rest) \u2192 ' + Math.max(2, Math.round(swimKm*4-4)) + '\u00d7100m building pace (20s rest) \u2192 100m cool-down.\n'
        + '<em>Option B \u2014 Pyramid:</em> 100m \u2192 200m \u2192 300m \u2192 200m \u2192 100m (30s rest between each). Each rep slightly faster than the last. Log total time.',
    };

    // SATURDAY: Spin Class
    case 5: return {
      name: 'Spin Class \u2014 45 min',
      type: 'bike', discipline: 'bike',
      sessions: [{ key:'bike', label:'Spin', icon:'fa-bicycle', hasDistance:false }],
      zone: zone, duration: 45, distance: null,
      intensity: isBase ? 'Easy\u2013Moderate' : 'Moderate\u2013Hard',
      desc: '\ud83d\udeb4 <strong>45 min spin class</strong> at Zone ' + zone + ' (' + bpmStr + '). Cadence 85\u201395 rpm. '
        + 'Building your bike engine for the <strong>90 km race bike leg</strong> in Costa Navarino. '
        + (isBase ? 'Focus on smooth, consistent power. Avoid going into Zone 4 today.' : 'Include 3 \u00d7 3 min Zone 4 efforts (' + ATHLETE.hrZones.z4.min + '\u2013' + ATHLETE.hrZones.z4.max + ' bpm) to build race pace threshold.'),
    };

    // SUNDAY: Long Run
    case 6: return {
      name: 'Long Run \u2014 ' + longRunKm.toFixed(1) + ' km',
      type: 'run', discipline: 'run',
      sessions: [{ key:'run', label:'Run', icon:'fa-person-running', hasDistance:true }],
      zone: 2, duration: Math.round(longRunKm * 6.5), distance: longRunKm,
      intensity: 'Easy\u2013Moderate',
      desc: '\ud83c\udfc3 <strong>' + longRunKm.toFixed(1) + ' km at Zone 2</strong> (' + ATHLETE.hrZones.z2.min + '\u2013' + ATHLETE.hrZones.z2.max + ' bpm). '
        + 'Your most important session of the week. Building toward the <strong>21.1 km race run</strong> \u2014 you\u2019re at ' + Math.round(longRunKm/21.1*100) + '% of race distance. '
        + 'Do NOT go above Zone 2. If HR goes above ' + ATHLETE.hrZones.z2.max + ' slow down or walk \u2014 this is non-negotiable. '
        + (longRunKm > 14 ? 'Take a gel every 45 min. ' : '') + 'Flat or gentle terrain. This is where your race is won.',
    };

    default: return {
      name: 'Rest Day',
      type: 'rest', discipline: 'rest',
      sessions: [],
      zone: null, duration: null, distance: null, intensity: null,
      desc: 'Full rest and recovery. Walk, foam roll, stretch lightly. Sleep 8\u20139 hrs. Your body adapts during rest \u2014 this session is doing more work than you think.',
    };
  }
}

// ============================================================
// BUILD PLAN — 32 weeks
// ============================================================
const PHASES = [
  { name:'Base',     start:1,  end:8  },
  { name:'Build',    start:9,  end:16 },
  { name:'Peak',     start:17, end:24 },
  { name:'Taper',    start:25, end:28 },
  { name:'Race Prep',start:29, end:32 },
];
const DAY_NAMES = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];

function buildPlan() {
  const plan = [];
  for (let wn = 1; wn <= 32; wn++) {
    const ph      = PHASES.find(function(p){ return wn >= p.start && wn <= p.end; });
    const phase   = ph ? ph.name : 'Race Prep';
    const phWeek  = wn - (ph ? ph.start : 29) + 1;
    const wStart  = addDays(ATHLETE.planStart, (wn-1)*7);
    const wEnd    = addDays(wStart, 6);
    const days    = DAY_NAMES.map(function(dn, di) {
      return { dayName: dn, workout: getDayWorkout(wn, di, phase, phWeek) };
    });
    plan.push({ weekNum:wn, phase, phaseWeek:phWeek, startDate:wStart, endDate:wEnd, days });
  }
  return plan;
}

const PLAN = buildPlan();

function getCurrentWeekAndDay() {
  const now = new Date(); now.setHours(0,0,0,0);
  for (let i = 0; i < PLAN.length; i++) {
    const w = PLAN[i];
    if (now >= w.startDate && now <= w.endDate) {
      const d = Math.floor((now - w.startDate)/86400000);
      return { week: w, dayIdx: Math.min(d, 6) };
    }
  }
  if (now < PLAN[0].startDate) return { week: PLAN[0], dayIdx: 0 };
  return { week: PLAN[PLAN.length-1], dayIdx: 6 };
}


// ============================================================
// NAVIGATION
// ============================================================
const PAGE_TITLES = {
  dashboard: 'Dashboard',
  training:  'Training Plan',
  today:     "Today's Session",
  nutrition: 'Nutrition',
  hydration: 'Hydration',
  performance:'Performance',
  raceintel: 'Race Intelligence',
  mylog:     'My Training Log',
};

function navigateTo(pageId) {
  document.querySelectorAll('.page').forEach(function(p){ p.classList.remove('active'); });
  document.querySelectorAll('.nav-link').forEach(function(l){ l.classList.remove('active'); });
  const page = document.getElementById('page-' + pageId);
  if (page) page.classList.add('active');
  const link = document.querySelector('.nav-link[data-page="' + pageId + '"]');
  if (link) link.classList.add('active');
  document.getElementById('topbarTitle').textContent = PAGE_TITLES[pageId] || pageId;
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarOverlay').classList.remove('visible');
  if (pageId === 'today')       renderToday();
  if (pageId === 'training')    renderTrainingPlan();
  if (pageId === 'nutrition')   renderNutrition();
  if (pageId === 'hydration')   renderHydration();
  if (pageId === 'performance') renderPerformance();
  if (pageId === 'raceintel')   renderRaceIntel();
  if (pageId === 'mylog')       renderMyLog();
}

// ============================================================
// WORKOUT TRACKER — localStorage
// ============================================================
const TRACKER_KEY  = 'im703_workout_log_v2';
const OVERRIDE_KEY = 'im703_overrides_v1';

function getLog()    { try { return JSON.parse(localStorage.getItem(TRACKER_KEY)  || '{}'); } catch { return {}; } }
function saveLog(l)  { localStorage.setItem(TRACKER_KEY, JSON.stringify(l)); }
function getOverrides() { try { return JSON.parse(localStorage.getItem(OVERRIDE_KEY) || '{}'); } catch { return {}; } }

function logKey(wn, di) { return 'w' + wn + '_d' + di; } // legacy key — kept for override store

// A day is DONE when every session in its sessions[] is logged done
function isDone(wn, di) {
  var wo = getPlanWorkout(wn, di);
  if (!wo || !wo.sessions || wo.sessions.length === 0) return false;
  return wo.sessions.every(function(s) {
    var e = getSubEntry(wn, di, s.key);
    return e && e.done && !e.missed;
  });
}
// A day is MISSED if any session is explicitly missed
function isMissed(wn, di) {
  var wo = getPlanWorkout(wn, di);
  if (!wo || !wo.sessions) return false;
  return wo.sessions.some(function(s) {
    var e = getSubEntry(wn, di, s.key);
    return e && e.missed;
  });
}
// A day has any entry at all
function isLogged(wn, di) {
  var wo = getPlanWorkout(wn, di);
  if (!wo || !wo.sessions) return false;
  return wo.sessions.some(function(s) { return !!getSubEntry(wn, di, s.key); });
}
// Returns the primary/first sub-entry (for backward-compat display in hero etc.)
function getEntry(wn, di) {
  var wo = getPlanWorkout(wn, di);
  if (!wo || !wo.sessions || wo.sessions.length === 0) return null;
  // return first logged sub-entry
  for (var i = 0; i < wo.sessions.length; i++) {
    var e = getSubEntry(wn, di, wo.sessions[i].key);
    if (e) return e;
  }
  return null;
}
function getOverride(wn, di) { return getOverrides()[logKey(wn,di)] || null; }

function saveEntry(wn, di, fields) {
  const log = getLog();
  log[logKey(wn,di)] = Object.assign({ done:true, savedAt: new Date().toISOString() }, fields);
  saveLog(log);
}
function deleteEntry(wn, di) {
  const log = getLog();
  delete log[logKey(wn,di)];
  saveLog(log);
}
function saveOverride(wn, di, name, type) {
  const ov  = getOverrides();
  const k   = logKey(wn, di);
  if (name || type) { ov[k] = { name: name||null, type: type||null }; }
  else { delete ov[k]; }
  localStorage.setItem(OVERRIDE_KEY, JSON.stringify(ov));
}
function clearOverride(wn, di) { saveOverride(wn, di, null, null); }

// ── SUB-SESSION LOGGING (one entry per session component per day) ─────────
// Key format: w1_d1_run, w1_d2_swim, w1_d2_gym etc.
function logSubKey(wn, di, skey) { return 'w' + wn + '_d' + di + '_' + skey; }

function getPlanWorkout(wn, di) {
  var week = PLAN.find(function(w){ return w.weekNum === wn; });
  return week ? week.days[di].workout : null;
}

function getSubEntry(wn, di, skey) {
  return getLog()[logSubKey(wn, di, skey)] || null;
}

function saveSubEntry(wn, di, skey, fields) {
  var log = getLog();
  log[logSubKey(wn, di, skey)] = Object.assign({ done:true, savedAt: new Date().toISOString() }, fields);
  saveLog(log);
}

function deleteSubEntry(wn, di, skey) {
  var log = getLog();
  delete log[logSubKey(wn, di, skey)];
  saveLog(log);
}

// Migrate old single-entry logs (w1_d0) to new sub-entry format (w1_d0_gym)
function migrateOldLog() {
  var log = getLog();
  var changed = false;
  Object.keys(log).forEach(function(k) {
    // Old keys look like w1_d0, new keys like w1_d0_gym
    if (/^w\d+_d\d+$/.test(k)) {
      var entry = log[k];
      var parts = k.match(/^w(\d+)_d(\d+)$/);
      if (!parts) return;
      var wn = parseInt(parts[1]);
      var di = parseInt(parts[2]);
      var wo = getPlanWorkout(wn, di);
      if (!wo || !wo.sessions || wo.sessions.length === 0) return;
      // Pick the primary session key based on discipline
      var primaryKey = wo.sessions[0].key;
      var newKey = logSubKey(wn, di, primaryKey);
      if (!log[newKey]) {
        log[newKey] = entry;
        delete log[k];
        changed = true;
      }
    }
  });
  if (changed) saveLog(log);
}

// ── EXTRA SESSION SUPPORT ──────────────────────────────────────────────────
// Extras are stored as w{n}_d{di}_xrun, w{n}_d{di}_xswim etc.
// Any key with 'x' prefix = unplanned / bonus session

var EXTRA_TYPES = [
  { key:'xrun',  label:'Run',      icon:'fa-person-running',  hasDistance:true,  color:'var(--green)' },
  { key:'xswim', label:'Swim',     icon:'fa-person-swimming', hasDistance:true,  color:'var(--blue)'  },
  { key:'xbike', label:'Spin/Bike',icon:'fa-bicycle',         hasDistance:false, color:'var(--orange)'},
  { key:'xgym',  label:'Gym',      icon:'fa-dumbbell',        hasDistance:false, color:'var(--text-2)'},
];

function getExtraTypeInfo(xkey) {
  return EXTRA_TYPES.find(function(t){ return t.key === xkey; }) || null;
}

function getExtrasForDay(wn, di) {
  var log  = getLog();
  var prefix = 'w' + wn + '_d' + di + '_x';
  var extras = [];
  Object.keys(log).forEach(function(k) {
    if (k.indexOf(prefix) === 0) {
      var xkey = k.replace('w' + wn + '_d' + di + '_', '');
      extras.push({ key: xkey, entry: log[k] });
    }
  });
  return extras;
}

// Opens the log modal pre-loaded for an extra session type
function openExtraModal(weekNum, dayIdx, xkey) {
  var info = getExtraTypeInfo(xkey);
  // Temporarily inject this as a virtual session so openLogModal can handle it
  var wo = getPlanWorkout(weekNum, dayIdx);
  if (wo) {
    // temporarily store extra session type so modal can reference it
    openLogModal(weekNum, dayIdx, xkey);
  }
}

// Show/hide the extra add picker panel for a day card
function toggleAddExtra(wn, di) {
  var pid = 'addExtraPicker_' + wn + '_' + di;
  var el  = document.getElementById(pid);
  if (!el) return;
  el.style.display = el.style.display === 'none' ? 'flex' : 'none';
}

// ============================================================
// ADHERENCE STATS
// ============================================================
function getAdherenceStats() {
  const { week, dayIdx } = getCurrentWeekAndDay();
  const log = getLog();

  // This week
  let weekDone = 0, weekTotal = 0;
  week.days.forEach(function(d, i) {
    if (d.workout.type !== 'rest') {
      weekTotal++;
      if (isDone(week.weekNum, i)) weekDone++;
    }
  });

  // All time (weeks up to current)
  let allDone = 0, allTotal = 0;
  for (let wn = 1; wn <= week.weekNum; wn++) {
    const w = PLAN[wn-1];
    const maxDay = (wn < week.weekNum) ? 7 : dayIdx + 1;
    for (let di = 0; di < maxDay; di++) {
      if (w.days[di].workout.type !== 'rest') {
        allTotal++;
        if (isDone(wn, di)) allDone++;
      }
    }
  }

  // Streak (consecutive days with a session logged)
  let streak = 0;
  const today = new Date(); today.setHours(0,0,0,0);
  for (let i = 0; i < 60; i++) {
    const d  = new Date(today); d.setDate(d.getDate()-i);
    d.setHours(0,0,0,0);
    const start = new Date(ATHLETE.planStart); start.setHours(0,0,0,0);
    const daysSince = Math.round((d - start)/86400000);
    if (daysSince < 0) break;
    const wn  = Math.floor(daysSince/7)+1;
    const di  = daysSince%7;
    if (wn > 32) continue;
    const w  = PLAN[wn-1];
    if (w.days[di].workout.type === 'rest') continue; // skip rest days for streak
    if (isDone(wn, di)) { streak++; }
    else { break; }
  }

  return {
    weekDone, weekTotal,
    weekPct: weekTotal ? Math.round(weekDone/weekTotal*100) : 0,
    allDone, allTotal,
    allPct: allTotal ? Math.round(allDone/allTotal*100) : 0,
    streak,
  };
}

// ============================================================
// LOG MODAL — now session-aware (weekNum, dayIdx, sessionKey)
// ============================================================
function openLogModal(weekNum, dayIdx, sessionKey) {
  var modal   = document.getElementById('logModal');
  var week    = PLAN.find(function(w){ return w.weekNum === weekNum; });
  var workout = week ? week.days[dayIdx].workout : null;

  // Find the sub-session definition — check planned sessions first, then extras
  var session  = null;
  var isExtra  = sessionKey && sessionKey.charAt(0) === 'x';
  var extraInfo = isExtra ? getExtraTypeInfo(sessionKey) : null;

  if (!isExtra && workout && workout.sessions && sessionKey) {
    session = workout.sessions.find(function(s){ return s.key === sessionKey; }) || null;
  }
  // Fall back: if no sessionKey given, use primary planned session
  if (!sessionKey && workout && workout.sessions && workout.sessions.length > 0) {
    sessionKey = workout.sessions[0].key;
    session    = workout.sessions[0];
    isExtra    = false;
  }

  var entry = getSubEntry(weekNum, dayIdx, sessionKey);

  // Title: session label + day name
  var dayName  = week ? week.days[dayIdx].dayName : '';
  var sesLabel = isExtra && extraInfo ? 'Extra ' + extraInfo.label
               : session ? session.label
               : (workout ? workout.name : 'Log Session');
  document.getElementById('logModalTitle').textContent = dayName + ' \u2014 ' + sesLabel;

  // Show/hide distance field — extras with distance, or planned session with distance
  var distRow = document.getElementById('logDistRow');
  var hasDist = isExtra ? (extraInfo && extraInfo.hasDistance)
                        : (session && session.hasDistance);
  if (distRow) distRow.style.display = hasDist ? 'flex' : 'none';

  // Show extra type badge if applicable
  var typeBadgeEl = document.getElementById('logExtraTypeBadge');
  if (typeBadgeEl) {
    if (isExtra && extraInfo) {
      typeBadgeEl.innerHTML = '<i class="fa-solid ' + extraInfo.icon + '" style="color:' + extraInfo.color + '"></i> <strong>' + extraInfo.label + '</strong> — unplanned extra session';
      typeBadgeEl.style.display = 'flex';
    } else {
      typeBadgeEl.style.display = 'none';
    }
  }

  // Workout brief — show full day description
  var briefEl = document.getElementById('logWorkoutBrief');
  if (briefEl && workout) {
    var zoneObj = workout.zone ? Object.values(ATHLETE.hrZones)[workout.zone-1] : null;
    var bpmStr  = zoneObj ? zoneObj.min + '\u2013' + zoneObj.max + ' bpm (Zone ' + workout.zone + ' \u2014 ' + zoneObj.name + ')' : '';
    briefEl.innerHTML =
      '<div class="modal-brief">' +
        (workout.type !== 'rest'
          ? '<div class="modal-brief-stats">' +
              (workout.duration ? '<span><i class="fa-solid fa-clock"></i> ' + workout.duration + ' min est.</span>' : '') +
              (workout.distance && session && session.hasDistance ? '<span><i class="fa-solid fa-route"></i> ' + workout.distance + ' km target</span>' : '') +
              (bpmStr           ? '<span><i class="fa-solid fa-heart-pulse"></i> ' + bpmStr + '</span>' : '') +
            '</div>' : '') +
        '<div class="modal-brief-desc">' + workout.desc.substring(0,220) + (workout.desc.length>220?'\u2026':'') + '</div>' +
      '</div>';
    briefEl.style.display = 'block';
  } else if (briefEl) {
    briefEl.style.display = 'none';
  }

  // Fill fields from existing sub-entry
  document.getElementById('logDist').value  = entry && entry.dist  ? entry.dist  : '';
  document.getElementById('logDur').value   = entry && entry.dur   ? entry.dur   : '';
  document.getElementById('logHR').value    = entry && entry.hr    ? entry.hr    : '';
  document.getElementById('logNotes').value = entry && entry.notes ? entry.notes : '';

  modal.dataset.weekNum    = weekNum;
  modal.dataset.dayIdx     = dayIdx;
  modal.dataset.sessionKey = sessionKey || '';

  document.getElementById('logDeleteBtn').style.display = entry ? 'inline-flex' : 'none';

  var missedBanner = document.getElementById('logMissedBanner');
  var missedState  = entry && entry.missed;
  if (missedBanner) {
    missedBanner.style.display = missedState ? 'block' : 'none';
    if (missedState) missedBanner.innerHTML = '<i class="fa-solid fa-circle-xmark" style="color:var(--orange)"></i> Marked as <strong>missed</strong>. Log below to override.';
  }
  var formBody = document.getElementById('logFormBody');
  if (formBody) formBody.style.opacity = missedState ? '0.5' : '1';
  modal.classList.add('open');
}

function closeLogModal() { document.getElementById('logModal').classList.remove('open'); }

function submitLogModal() {
  var modal      = document.getElementById('logModal');
  var weekNum    = parseInt(modal.dataset.weekNum);
  var dayIdx     = parseInt(modal.dataset.dayIdx);
  var sessionKey = modal.dataset.sessionKey;
  var dist       = document.getElementById('logDist').value;
  var dur        = document.getElementById('logDur').value;
  var hr         = document.getElementById('logHR').value;
  var notes      = document.getElementById('logNotes').value.trim();
  var overName   = document.getElementById('logOverrideName').value.trim();
  var overType   = document.getElementById('logOverrideType').value;
  saveSubEntry(weekNum, dayIdx, sessionKey, {
    missed: false,
    dist:   dist     ? parseFloat(dist)  : null,
    dur:    dur      ? parseInt(dur)     : null,
    hr:     hr       ? parseInt(hr)      : null,
    notes:  notes    || null,
    overrideName: overName || null,
    overrideType: overType || null,
  });
  closeLogModal();
  refreshAfterLog();
}

function deleteLogModal() {
  var modal      = document.getElementById('logModal');
  var weekNum    = parseInt(modal.dataset.weekNum);
  var dayIdx     = parseInt(modal.dataset.dayIdx);
  var sessionKey = modal.dataset.sessionKey;
  deleteSubEntry(weekNum, dayIdx, sessionKey);
  closeLogModal();
  refreshAfterLog();
}

function markMissedModal() {
  var modal      = document.getElementById('logModal');
  var weekNum    = parseInt(modal.dataset.weekNum);
  var dayIdx     = parseInt(modal.dataset.dayIdx);
  var sessionKey = modal.dataset.sessionKey;
  saveSubEntry(weekNum, dayIdx, sessionKey, { missed:true, dist:null, dur:null, hr:null, notes:null });
  closeLogModal();
  refreshAfterLog();
}

function refreshAfterLog() {
  const activePage = (document.querySelector('.page.active') || {}).id;
  const pg = activePage ? activePage.replace('page-','') : '';
  if (pg === 'today')    renderToday();
  if (pg === 'training') renderTrainingPlan();
  if (pg === 'mylog')    renderMyLog();
  renderDashboard();
}


// ============================================================
// WEEKLY STATS
// ============================================================
function getWeeklyStats() {
  var week = getCurrentWeekAndDay().week;
  var runKm=0, swimKm=0, bikeKm=0, gymCount=0, totalMin=0, doneCount=0, missedCount=0;

  function tally(skey, e) {
    if (!e) return;
    if (e.missed) { missedCount++; return; }
    doneCount++;
    var dist = e.dist || 0;
    var dur  = e.dur  || 0;
    totalMin += dur;
    // Map key to discipline (planned keys: run/swim/bike/gym; extra keys: xrun/xswim/xbike/xgym)
    var type = skey.replace(/^x/, '');
    if (type === 'run')  runKm  += dist;
    if (type === 'swim') swimKm += dist;
    if (type === 'bike') bikeKm += dist;
    if (type === 'gym')  gymCount++;
  }

  week.days.forEach(function(day, i) {
    var w = day.workout;
    if (w.type === 'rest') return;
    // Planned sessions
    if (w.sessions) {
      w.sessions.forEach(function(s) {
        tally(s.key, getSubEntry(week.weekNum, i, s.key));
      });
    }
    // Extra sessions
    getExtrasForDay(week.weekNum, i).forEach(function(x) {
      tally(x.key, x.entry);
    });
  });

  return { runKm, swimKm, bikeKm, gymCount, totalMin, doneCount, missedCount };
}

// ============================================================
// WEEKLY DISTANCE TARGETS
// ============================================================
function getWeekDistanceTargets() {
  var week = getCurrentWeekAndDay().week;
  var runTarget=0, swimTarget=0, gymCount=0, spinCount=0;
  var runLogged=0, swimLogged=0, gymDone=0, spinDone=0;
  var runDays=[], swimDays=[];

  week.days.forEach(function(day, i) {
    var w = day.workout;
    if (!w.sessions || w.sessions.length === 0) return;

    // Planned sessions
    w.sessions.forEach(function(s) {
      var e     = getSubEntry(week.weekNum, i, s.key);
      var sDone = e && e.done && !e.missed;

      if (s.key === 'run' && w.distance) {
        if (!runDays.find(function(r){ return r.dayIdx === i; })) {
          runTarget += w.distance;
          runDays.push({ name: day.dayName.slice(0,3), km: w.distance, done: sDone, entry: e, dayIdx: i, skey:'run' });
        }
        if (sDone && e && e.dist) runLogged += e.dist;
      }
      if (s.key === 'swim' && w.distance) {
        if (!swimDays.find(function(r){ return r.dayIdx === i; })) {
          swimTarget += w.distance;
          swimDays.push({ name: day.dayName.slice(0,3), km: w.distance, done: sDone, entry: e, dayIdx: i, skey:'swim' });
        }
        if (sDone && e && e.dist) swimLogged += e.dist;
      }
      if (s.key === 'gym')  { gymCount++;  if (sDone) gymDone++; }
      if (s.key === 'bike') { spinCount++; if (sDone) spinDone++; }
    });

    // Extra sessions — count towards logged totals
    getExtrasForDay(week.weekNum, i).forEach(function(x) {
      var e     = x.entry;
      var sDone = e && e.done && !e.missed;
      if (!sDone || !e || !e.dist) return;
      var type  = x.key.replace(/^x/, '');
      if (type === 'run')  runLogged  += e.dist;
      if (type === 'swim') swimLogged += e.dist;
    });
  });

  return { runTarget, swimTarget, gymCount, spinCount, runLogged, swimLogged, gymDone, spinDone, runDays, swimDays };
}

function renderDistanceTargets() {
  var el = document.getElementById('distanceTargetsCard');
  if (!el) return;
  var s = getWeekDistanceTargets();
  var { week } = getCurrentWeekAndDay();

  function pBar(logged, target, col) {
    if (!target) return '';
    var pct = Math.min(100, Math.round(logged/target*100));
    var barCol = pct>=100 ? 'var(--green)' : col;
    return '<div class="dtarget-bar-wrap">' +
      '<div class="dtarget-bar-fill" style="width:' + pct + '%;background:' + barCol + '"></div>' +
    '</div>';
  }

  function dayPills(days) {
    return days.map(function(d) {
      var col = d.done ? 'var(--green)' : 'var(--border)';
      var tick = d.done ? '\u2713 ' : '';
      var logged = d.done && d.entry && d.entry.dist ? ' (' + d.entry.dist + ' km)' : '';
      return '<span class="dtarget-pill" style="border-color:' + col + ';color:' + (d.done?'var(--green)':'var(--text-3)') + '">' +
        tick + d.name + ' ' + d.km.toFixed(1) + ' km' + logged + '</span>';
    }).join('');
  }

  var runRemain  = Math.max(0, s.runTarget  - s.runLogged);
  var swimRemain = Math.max(0, s.swimTarget - s.swimLogged);

  el.innerHTML =
    '<div class="card-title" style="margin-bottom:16px"><i class="fa-solid fa-bullseye" style="color:var(--red)"></i> Week ' + week.weekNum + ' Endurance Targets <span style="font-size:11px;font-weight:400;color:var(--text-3)">Building to race distances: 21.1 km run \u00b7 1.9 km swim \u00b7 90 km bike</span></div>' +

    // RUN
    '<div class="dtarget-row">' +
      '<div class="dtarget-icon icon-run"><i class="fa-solid fa-person-running"></i></div>' +
      '<div class="dtarget-body">' +
        '<div class="dtarget-header">' +
          '<span class="dtarget-label">Running</span>' +
          '<span class="dtarget-nums">' + s.runLogged.toFixed(1) + ' / <strong>' + s.runTarget.toFixed(1) + ' km</strong>' +
            (runRemain > 0 ? ' <span class="dtarget-remain">' + runRemain.toFixed(1) + ' km to go</span>' : ' <span class="dtarget-complete">\u2713 Target hit!</span>') +
          '</span>' +
        '</div>' +
        pBar(s.runLogged, s.runTarget, 'var(--red)') +
        '<div class="dtarget-pills">' + dayPills(s.runDays) + '</div>' +
        '<div class="dtarget-race-context">Race target: 21.1 km \u2022 ' + Math.round(s.runTarget/21.1*100) + '% of race distance this week</div>' +
      '</div>' +
    '</div>' +

    // SWIM
    '<div class="dtarget-row">' +
      '<div class="dtarget-icon icon-swim"><i class="fa-solid fa-person-swimming"></i></div>' +
      '<div class="dtarget-body">' +
        '<div class="dtarget-header">' +
          '<span class="dtarget-label">Swimming</span>' +
          '<span class="dtarget-nums">' + s.swimLogged.toFixed(2) + ' / <strong>' + s.swimTarget.toFixed(2) + ' km</strong>' +
            (swimRemain > 0 ? ' <span class="dtarget-remain">' + swimRemain.toFixed(2) + ' km to go</span>' : ' <span class="dtarget-complete">\u2713 Target hit!</span>') +
          '</span>' +
        '</div>' +
        pBar(s.swimLogged, s.swimTarget, 'var(--blue)') +
        '<div class="dtarget-pills">' + dayPills(s.swimDays) + '</div>' +
        '<div class="dtarget-race-context">Race target: 1.9 km \u2022 ' + Math.round(s.swimTarget/1.9*100) + '% of race distance this week</div>' +
      '</div>' +
    '</div>' +

    // GYM + SPIN
    '<div class="dtarget-counts">' +
      '<div class="dtarget-count-item">' +
        '<i class="fa-solid fa-dumbbell"></i>' +
        '<div>' +
          '<div class="dtarget-count-val">' + s.gymDone + '/' + s.gymCount + '</div>' +
          '<div class="dtarget-count-label">Gym sessions</div>' +
        '</div>' +
      '</div>' +
      '<div class="dtarget-count-item">' +
        '<i class="fa-solid fa-bicycle"></i>' +
        '<div>' +
          '<div class="dtarget-count-val">' + s.spinDone + '/' + s.spinCount + '</div>' +
          '<div class="dtarget-count-label">Spin sessions <span style="font-size:10px;color:var(--text-3)">(building to 90 km bike)</span></div>' +
        '</div>' +
      '</div>' +
    '</div>';
}

// ============================================================
// RENDER — DASHBOARD
// ============================================================
function renderDashboard() {
  const days        = getDaysToRace();
  const { week, dayIdx } = getCurrentWeekAndDay();
  const weekPct     = Math.round((week.weekNum/32)*100);
  const todayDay    = week.days[dayIdx];
  const w           = todayDay.workout;
  const dayType     = getWorkoutDayType([w]);
  const nutr        = calcNutrition(dayType);
  const hydra       = calcHydration(dayType);
  const done        = isDone(week.weekNum, dayIdx);
  const entry       = getEntry(week.weekNum, dayIdx);
  const adh         = getAdherenceStats();

  document.getElementById('countdownNum').textContent   = days;
  document.getElementById('countdownBadge').textContent = days + ' days to race';

  // ── TODAY HERO ─────────────────────────────────────────────────────────
  const dateStr = new Date().toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long'});
  const isRest  = w.type === 'rest';
  const safeName = w.name.replace(/ \u{1F512}| \u{1F30A}| \u{1F6B4}| \u{2708}\u{FE0F}/gu,'');

  const heroBody = isRest
    ? '<div class="hero-rest">' +
        '<i class="fa-solid fa-moon" style="font-size:28px;color:var(--text-3)"></i>' +
        '<div><div style="font-size:18px;font-weight:700">Rest & Recovery Day</div>' +
        '<div style="font-size:13px;color:var(--text-2);margin-top:4px">Sleep 8\u20139 hrs \u00b7 Foam roll \u00b7 ' + nutr.kcal.toLocaleString() + ' kcal \u00b7 ' + hydra.total + 'L water</div></div>' +
        '<div style="margin-left:auto">' +
          '<button class="hero-done-btn' + (done?' hero-done-btn--done':'') + '" onclick="openLogModal(' + week.weekNum + ',' + dayIdx + ')">' +
            '<i class="fa-solid ' + (done?'fa-circle-check':'fa-check') + '"></i> ' + (done?'Logged \u2713':'Mark Done') +
          '</button>' +
        '</div>' +
      '</div>'
    : '<div class="hero-session-row">' +
        '<div class="hero-session-icon ' + workoutIconClass(w.type) + '">' +
          '<i class="fa-solid ' + workoutIcon(w.type) + '"></i>' +
        '</div>' +
        '<div class="hero-session-info">' +
          '<div class="hero-session-name">' + safeName + '</div>' +
          '<div class="hero-session-meta">' +
            (w.duration ? '<span>' + w.duration + ' min</span>' : '') +
            (w.distance ? '<span>' + w.distance + ' km</span>' : '') +
            (w.zone     ? '<span class="hero-zone z' + w.zone + '">Zone ' + w.zone + '</span>' : '') +
            (w.intensity? '<span>' + w.intensity + '</span>' : '') +
          '</div>' +
          (done && entry
            ? '<div class="hero-logged">' +
                (entry.overrideName ? entry.overrideName + ' \u2022 ' : '') +
                (entry.dist ? entry.dist + ' km' : '') +
                (entry.dur  ? ' \u00b7 ' + entry.dur + ' min' : '') +
                (entry.hr   ? ' \u00b7 HR ' + entry.hr : '') +
              '</div>'
            : '') +
        '</div>' +
        '<button class="hero-done-btn' + (done?' hero-done-btn--done':'') + '" onclick="openLogModal(' + week.weekNum + ',' + dayIdx + ')">' +
          '<i class="fa-solid ' + (done?'fa-circle-check':'fa-check') + '"></i> ' + (done?'Logged \u2713':'Mark Done') +
        '</button>' +
      '</div>';

  document.getElementById('dashTodayHero').innerHTML =
    '<div class="dash-hero-card' + (done?' hero-done':'') + '">' +
      '<div class="dash-hero-top">' +
        '<div>' +
          '<div class="dash-hero-date">' + dateStr + '</div>' +
          '<div class="dash-hero-title">Today&#39;s Training</div>' +
        '</div>' +
        '<div class="dash-hero-badges">' +
          '<span class="phase-pill">' + week.phase.toUpperCase() + ' PHASE</span>' +
          '<span class="week-badge-sm">Week ' + week.weekNum + '</span>' +
        '</div>' +
      '</div>' +
      '<div class="dash-hero-body">' + heroBody + '</div>' +
      '<div class="dash-hero-desc">' + w.desc.substring(0,130).replace(/<[^>]+>/g,'') + '\u2026</div>' +
    '</div>';

  // ── PLAN PROGRESS ──────────────────────────────────────────────────────
  document.getElementById('weekNum').textContent = week.weekNum;
  document.getElementById('planProgress').style.width = weekPct + '%';
  document.getElementById('planProgressLabel').textContent = weekPct + '% complete \u00b7 ' + week.phase + ' Phase';
  document.getElementById('dashWeekRange').textContent = formatShortDate(week.startDate) + ' \u2013 ' + formatShortDate(week.endDate);

  // Week dots
  document.getElementById('weekDotRow').innerHTML = week.days.map(function(day,i) {
    const d      = isDone(week.weekNum, i);
    const isToday = i === dayIdx;
    const dotCol  = d ? 'var(--green)' : isToday ? 'var(--red)' : day.workout.type==='rest' ? 'var(--border)' : 'var(--surface-3)';
    const border  = isToday ? '2px solid var(--red)' : '2px solid transparent';
    return '<div class="week-dot" onclick="openLogModal(' + week.weekNum + ',' + i + ')" style="background:' + dotCol + ';border:' + border + ';cursor:pointer" title="' + day.dayName + '">' +
      '<span class="week-dot-label">' + day.dayName.slice(0,1) + '</span>' +
      (d ? '<i class="fa-solid fa-check week-dot-check"></i>' : '') +
    '</div>';
  }).join('');

  // ── ADHERENCE STRIP ────────────────────────────────────────────────────
  const adhEl = document.getElementById('adherenceStrip');
  if (adhEl) {
    adhEl.innerHTML =
      '<div class="adh-item"><i class="fa-solid fa-calendar-check" style="color:var(--green)"></i>' +
        '<div><div class="adh-val">' + adh.weekDone + '/' + adh.weekTotal + '</div>' +
        '<div class="adh-label">This Week</div></div>' +
      '</div>' +
      '<div class="adh-item"><i class="fa-solid fa-chart-pie" style="color:var(--blue)"></i>' +
        '<div><div class="adh-val">' + adh.allPct + '%</div>' +
        '<div class="adh-label">Overall Adherence</div></div>' +
      '</div>' +
      '<div class="adh-item"><i class="fa-solid fa-fire" style="color:var(--orange)"></i>' +
        '<div><div class="adh-val">' + adh.streak + ' day' + (adh.streak!==1?'s':'') + '</div>' +
        '<div class="adh-label">Current Streak</div></div>' +
      '</div>' +
      '<div class="adh-item"><i class="fa-solid fa-clipboard-check" style="color:var(--text-2)"></i>' +
        '<div><div class="adh-val">' + adh.allDone + '</div>' +
        '<div class="adh-label">Sessions Logged</div></div>' +
      '</div>';
  }

  // ── NUTRITION STRIP ────────────────────────────────────────────────────
  document.getElementById('nutritionStrip').innerHTML =
    '<div class="nutr-strip-item"><div class="nutr-strip-unit">KCAL</div><div class="nutr-strip-val">' + nutr.kcal.toLocaleString() + '</div><div class="nutr-strip-label">Calories Today</div></div>' +
    '<div class="nutr-strip-item"><div class="nutr-strip-unit">G</div><div class="nutr-strip-val">' + nutr.protein.g + '</div><div class="nutr-strip-label">Protein</div></div>' +
    '<div class="nutr-strip-item"><div class="nutr-strip-unit">G</div><div class="nutr-strip-val">' + nutr.carbs.g + '</div><div class="nutr-strip-label">Carbs</div></div>' +
    '<div class="nutr-strip-item"><div class="nutr-strip-unit">G</div><div class="nutr-strip-val">' + nutr.fat.g + '</div><div class="nutr-strip-label">Fat</div></div>' +
    '<div class="nutr-strip-item"><div class="nutr-strip-unit" style="color:var(--blue)">L</div><div class="nutr-strip-val" style="color:var(--blue)">' + hydra.total + '</div><div class="nutr-strip-label">Hydration</div></div>' +
    '<div class="nutr-strip-item"><div class="nutr-strip-unit" style="color:var(--orange)">G SALT</div><div class="nutr-strip-val" style="color:var(--orange)">' + hydra.saltG + '</div><div class="nutr-strip-label">Himalayan Salt</div></div>';

  // ── ZONES ──────────────────────────────────────────────────────────────
  const zonesEl = document.getElementById('zonesGrid');
  if (zonesEl) {
    zonesEl.innerHTML = Object.entries(ATHLETE.hrZones).map(function(kv,i) {
      const z = kv[1];
      return '<div class="zone-card" style="background:' + z.color + '18;border-color:' + z.color + '44">' +
        '<div class="zone-card-num" style="color:' + z.color + '">Z' + (i+1) + '</div>' +
        '<div class="zone-card-name" style="color:' + z.color + '">' + z.name + '</div>' +
        '<div class="zone-card-range">' + z.min + '\u2013' + z.max + ' bpm</div>' +
      '</div>';
    }).join('');
  }

  const rdEl = document.getElementById('raceDistances');
  if (rdEl) {
    rdEl.innerHTML =
      '<div class="race-dist-card"><span class="race-dist-icon">\ud83c\udfca</span><div class="race-dist-val">1.9</div><div class="race-dist-unit">KM</div><div class="race-dist-name">Ionian Sea Swim</div></div>' +
      '<div class="race-dist-card"><span class="race-dist-icon">\ud83d\udeb4</span><div class="race-dist-val">90</div><div class="race-dist-unit">KM</div><div class="race-dist-name">Bike \u00b7 Peloponnese Hills</div></div>' +
      '<div class="race-dist-card"><span class="race-dist-icon">\ud83c\udfc3</span><div class="race-dist-val">21.1</div><div class="race-dist-unit">KM</div><div class="race-dist-name">Run \u00b7 Costa Navarino</div></div>';
  }

  const vfEl = document.getElementById('venueFacts');
  if (vfEl) {
    vfEl.innerHTML = [
      {icon:'\ud83c\uddec\ud83c\uddf7', val:'Costa Navarino', label:'Race Venue'},
      {icon:'\ud83d\udccd',             val:'Messinia',       label:'Peloponnese, Greece'},
      {icon:'\ud83c\udf21\ufe0f',       val:'22\u201325\u00b0C', label:'Oct Race Day Temp'},
      {icon:'\ud83c\udfca',             val:'20\u201322\u00b0C', label:'Sea Water Temp'},
      {icon:'\ud83d\udeb4',             val:'Rolling Hills',  label:'90 km Bike Course'},
      {icon:'\ud83c\udfc3',             val:'Coastal Flat',   label:'21.1 km Run Course'},
      {icon:'\u23f1\ufe0f',             val:'~5:30',          label:'Target Finish Time'},
      {icon:'\ud83c\udfc5',             val:'25 Oct 2026',    label:'Race Day'},
    ].map(function(f){
      return '<div class="venue-fact"><span class="venue-fact-icon">' + f.icon + '</span><div class="venue-fact-val">' + f.val + '</div><div class="venue-fact-label">' + f.label + '</div></div>';
    }).join('');
  }

  document.getElementById('todayDate').textContent =
    new Date().toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short'});

  renderDashWeek();
  renderWeeklyStats();
  renderDistanceTargets();
  renderRaceCountdowns();
  renderStravaStatus();
}

// ── RACE COUNTDOWNS ───────────────────────────────────────────────────────
function renderRaceCountdowns() {
  var el = document.getElementById('raceCountdownsCard');
  if (!el) return;
  var today = new Date(); today.setHours(0,0,0,0);

  el.innerHTML = RACES.map(function(r) {
    if (r.pending || !r.date) {
      return '<div class="rc-item rc-pending">' +
        '<span class="rc-icon">' + r.icon + '</span>' +
        '<div class="rc-body">' +
          '<div class="rc-name">' + r.name + '</div>' +
          '<div class="rc-dist">' + r.dist + '</div>' +
          '<div class="rc-note">' + r.note + '</div>' +
        '</div>' +
        '<div class="rc-days" style="color:var(--text-3)">TBD</div>' +
      '</div>';
    }
    var raceD = new Date(r.date); raceD.setHours(0,0,0,0);
    var diff  = Math.round((raceD - today) / 86400000);
    var past  = diff < 0;
    var daysLabel = past ? 'done' : diff === 0 ? 'TODAY' : diff + (diff===1?' day':' days');
    var dateStr = r.date.toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' });
    return '<div class="rc-item' + (past?' rc-past':'') + '" style="border-left:3px solid ' + r.color + '">' +
      '<span class="rc-icon">' + r.icon + '</span>' +
      '<div class="rc-body">' +
        '<div class="rc-name">' + r.name + '</div>' +
        '<div class="rc-dist">' + r.dist + ' \u00b7 ' + dateStr + '</div>' +
        '<div class="rc-note">' + r.note + '</div>' +
      '</div>' +
      '<div class="rc-days" style="color:' + (past?'var(--text-3)':r.color) + '">' +
        '<div class="rc-days-num">' + (past ? '\u2713' : daysLabel) + '</div>' +
        '<div class="rc-days-label">' + (past ? 'completed' : 'to go') + '</div>' +
      '</div>' +
    '</div>';
  }).join('');
}

// ── QUICK-DONE (mark session done without opening full modal) ─────────────
function quickDone(weekNum, dayIdx, sessionKey) {
  var existing = getSubEntry(weekNum, dayIdx, sessionKey);
  if (existing && existing.done && !existing.missed) {
    // Already done — open modal to edit details instead
    openLogModal(weekNum, dayIdx, sessionKey);
    return;
  }
  saveSubEntry(weekNum, dayIdx, sessionKey, {
    missed: false, dist: null, dur: null, hr: null, notes: null,
  });
  refreshAfterLog();
}

// ── THIS WEEK GRID ─────────────────────────────────────────────────────────
function renderDashWeek() {
  var ref = getCurrentWeekAndDay(); var week = ref.week; var dayIdx = ref.dayIdx;
  var el = document.getElementById('dashWeekPlan');
  if (!el) return;

  el.innerHTML = week.days.map(function(day, i) {
    var done    = isDone(week.weekNum, i);
    var missed  = isMissed(week.weekNum, i);
    var isToday = i === dayIdx;
    var w       = day.workout;
    var isRest  = w.type === 'rest';

    // ── DAY LABEL ──────────────────────────────────────────────────────────
    var dayLabel = day.dayName.slice(0,3).toUpperCase();
    if (isToday) dayLabel += ' <span class="dw-today-pill">TODAY</span>';

    // ── STATUS BADGE ───────────────────────────────────────────────────────
    var statusBadge = done
      ? '<span class="dw-badge dw-badge-done"><i class="fa-solid fa-circle-check"></i> Done</span>'
      : missed
        ? '<span class="dw-badge dw-badge-missed"><i class="fa-solid fa-circle-xmark"></i> Missed</span>'
        : '';

    // ── REST DAY ───────────────────────────────────────────────────────────
    if (isRest) {
      return '<div class="dw-card' + (isToday ? ' dw-today' : '') + '">' +
        '<div class="dw-top-row"><span class="dw-day">' + dayLabel + '</span></div>' +
        '<div class="dw-rest-line"><i class="fa-solid fa-moon"></i> Rest</div>' +
      '</div>';
    }

    // ── SESSION ROWS ───────────────────────────────────────────────────────
    var sessionRows = '';
    if (w.sessions && w.sessions.length > 0) {
      sessionRows = w.sessions.map(function(s) {
        var e       = getSubEntry(week.weekNum, i, s.key);
        var sDone   = e && e.done && !e.missed;
        var sMissed = e && e.missed;
        var isSwim  = s.key === 'swim';

        // Target distance for this session
        var target = s.hasDistance ? w.distance : null;
        var logged = (s.hasDistance && e && e.dist) ? parseFloat(e.dist) : null;

        // Right-side content
        var rightHtml;
        if (sDone) {
          if (logged !== null) {
            var fmt = isSwim ? logged.toFixed(2) : logged.toFixed(1);
            var indicator = '';
            if (target) {
              var diff = logged - target;
              if (diff > 0.09)       indicator = '<span class="dw-sl-over">\u25b2' + (isSwim ? diff.toFixed(2) : diff.toFixed(1)) + '</span>';
              else if (diff < -0.09) indicator = '<span class="dw-sl-under">\u25bc' + Math.abs(isSwim ? diff.toFixed(2) : diff.toFixed(1)) + '</span>';
            }
            rightHtml = '<span class="dw-sl-logged">' + fmt + ' km</span>' + indicator;
          } else if (e && e.dur) {
            rightHtml = '<span class="dw-sl-logged">' + e.dur + ' min</span>';
          } else {
            rightHtml = '<span class="dw-sl-check">\u2713</span>';
          }
        } else if (sMissed) {
          rightHtml = '<span class="dw-sl-missed-x">\u2717</span>';
        } else {
          rightHtml = '<button class="dw-quick-done" onclick="event.stopPropagation();quickDone(' + week.weekNum + ',' + i + ',\'' + s.key + '\')" title="Mark done">\u2713</button>';
        }

        var iconCls = { gym:'icon-gym', run:'icon-run', swim:'icon-swim', bike:'icon-bike' }[s.key] || '';
        var rowCls  = 'dw-sl-row' + (sDone ? ' dw-sl-done' : sMissed ? ' dw-sl-missed' : '');

        return '<div class="' + rowCls + '" onclick="event.stopPropagation();openLogModal(' + week.weekNum + ',' + i + ',\'' + s.key + '\')">' +
          '<div class="dw-sl-left">' +
            '<span class="dw-sl-icon ' + iconCls + '"><i class="fa-solid ' + s.icon + '"></i></span>' +
            '<div class="dw-sl-info">' +
              '<span class="dw-sl-label">' + s.label + '</span>' +
              (target ? '<span class="dw-sl-target">Target: ' + (isSwim ? target.toFixed(2) : target.toFixed(1)) + ' km</span>' : '') +
            '</div>' +
          '</div>' +
          '<div class="dw-sl-right">' + rightHtml + '</div>' +
        '</div>';
      }).join('');
    }

    // ── EXTRA SESSIONS ─────────────────────────────────────────────────────
    var extras = getExtrasForDay(week.weekNum, i);
    var extrasHtml = '';
    if (extras.length > 0) {
      extrasHtml = '<div class="dw-extras-sep"></div>' +
        extras.map(function(x) {
          var info    = getExtraTypeInfo(x.key);
          var e       = x.entry;
          var eDone   = e && e.done && !e.missed;
          var eMissed = e && e.missed;
          var logged  = (info && info.hasDistance && e && e.dist) ? parseFloat(e.dist) : null;
          var label   = (e && e.overrideName) ? e.overrideName : (info ? info.label : x.key.replace(/^x/, ''));
          var iconMap = { xgym:'icon-gym', xrun:'icon-run', xswim:'icon-swim', xbike:'icon-bike' };
          var iconCls = iconMap[x.key] || '';

          var rightHtml;
          if (eDone) {
            rightHtml = logged !== null
              ? '<span class="dw-sl-logged">' + logged.toFixed(logged < 2 ? 2 : 1) + ' km</span>'
              : (e && e.dur ? '<span class="dw-sl-logged">' + e.dur + ' min</span>' : '<span class="dw-sl-check">\u2713</span>');
          } else if (eMissed) {
            rightHtml = '<span class="dw-sl-missed-x">\u2717</span>';
          } else {
            rightHtml = '';
          }

          return '<div class="dw-sl-row dw-sl-extra' + (eDone ? ' dw-sl-done' : '') + '" onclick="event.stopPropagation();openLogModal(' + week.weekNum + ',' + i + ',\'' + x.key + '\')">' +
            '<div class="dw-sl-left">' +
              '<span class="dw-sl-icon ' + iconCls + '"><i class="fa-solid ' + (info ? info.icon : 'fa-plus') + '"></i></span>' +
              '<div class="dw-sl-info">' +
                '<span class="dw-sl-label">' + label + '</span>' +
                '<span class="dw-sl-extra-tag">+extra</span>' +
              '</div>' +
            '</div>' +
            '<div class="dw-sl-right">' +
              rightHtml +
              '<button class="dw-delete-extra" onclick="event.stopPropagation();deleteSubEntry(' + week.weekNum + ',' + i + ',\'' + x.key + '\');refreshAfterLog()" title="Remove">\u00d7</button>' +
            '</div>' +
          '</div>';
        }).join('');
    }

    // ── ADD EXTRA PICKER ───────────────────────────────────────────────────
    var pickerId = 'addExtraPicker_' + week.weekNum + '_' + i;
    var addHtml = '<div class="dw-add-row">' +
      '<button class="dw-add-btn" onclick="event.stopPropagation();toggleAddExtra(' + week.weekNum + ',' + i + ')">+ Add</button>' +
      '<div id="' + pickerId + '" class="dw-extra-picker" style="display:none">' +
        EXTRA_TYPES.map(function(t) {
          return '<button class="dw-pick-type" onclick="event.stopPropagation();toggleAddExtra(' + week.weekNum + ',' + i + ');openLogModal(' + week.weekNum + ',' + i + ',\'' + t.key + '\')" style="color:' + t.color + ';border-color:' + t.color + '">' +
            '<i class="fa-solid ' + t.icon + '"></i><span>' + t.label + '</span>' +
          '</button>';
        }).join('') +
      '</div>' +
    '</div>';

    return '<div class="dw-card' + (isToday ? ' dw-today' : '') + (done ? ' dw-done' : '') + (missed ? ' dw-missed' : '') + '">' +
      '<div class="dw-top-row"><span class="dw-day">' + dayLabel + '</span>' + statusBadge + '</div>' +
      '<div class="dw-sessions-list">' + sessionRows + extrasHtml + '</div>' +
      addHtml +
    '</div>';
  }).join('');
}

// ── NEXT WEEK PREVIEW ─────────────────────────────────────────────────────
function renderNextWeek() {
  const { week } = getCurrentWeekAndDay();
  const nextWk = PLAN.find(function(w){ return w.weekNum === week.weekNum + 1; });
  const el = document.getElementById('nextWeekPlan');
  if (!el || !nextWk) return;
  el.innerHTML = nextWk.days.map(function(day, i) {
    const w = day.workout;
    const safeName = w.name.replace(/ \u{1F512}| \u{1F30A}| \u{1F6B4}| \u{2708}\u{FE0F}|\u{1F3C1}/gu,'');
    return '<div class="dw-card dw-next" onclick="openLogModal(' + nextWk.weekNum + ',' + i + ')">' +
      '<div class="dw-day">' + day.dayName.slice(0,3).toUpperCase() + '</div>' +
      '<div class="dw-icon ' + workoutIconClass(w.type) + '">' +
        '<i class="fa-solid ' + workoutIcon(w.type) + '"></i>' +
      '</div>' +
      '<div class="dw-name">' + safeName + '</div>' +
      (w.duration ? '<div class="dw-meta">' + w.duration + ' min' + (w.distance ? ' \u00b7 ' + w.distance + ' km' : '') + '</div>' : '') +
    '</div>';
  }).join('');

  const nwTitle = document.getElementById('nextWeekTitle');
  if (nwTitle) nwTitle.textContent = 'Next Week \u2014 Week ' + nextWk.weekNum + ' (' + formatShortDate(nextWk.startDate) + ' \u2013 ' + formatShortDate(nextWk.endDate) + ')';
}


// ── WEEKLY STATS STRIP ────────────────────────────────────────────────────
function renderWeeklyStats() {
  const el = document.getElementById('weeklyStatsStrip');
  if (!el) return;
  const s = getWeeklyStats();
  const { week } = getCurrentWeekAndDay();
  // Count scheduled sessions this week
  const scheduled = week.days.filter(function(d){ return d.workout.type!=='rest'; }).length;
  const remaining = scheduled - s.doneCount - s.missedCount;
  const h = Math.floor(s.totalMin/60);
  const m = s.totalMin % 60;
  const timeStr = h>0 ? h+'h '+(m>0?m+'m':'') : (m>0 ? m+'m' : '--');

  el.innerHTML =
    '<div class="wstat-item">' +
      '<i class="fa-solid fa-person-running" style="color:var(--red)"></i>' +
      '<div><div class="wstat-val">' + (s.runKm>0?s.runKm.toFixed(1)+' km':'--') + '</div><div class="wstat-label">Running</div></div>' +
    '</div>' +
    '<div class="wstat-item">' +
      '<i class="fa-solid fa-person-swimming" style="color:var(--blue)"></i>' +
      '<div><div class="wstat-val">' + (s.swimKm>0?s.swimKm.toFixed(2)+' km':'--') + '</div><div class="wstat-label">Swimming</div></div>' +
    '</div>' +
    '<div class="wstat-item">' +
      '<i class="fa-solid fa-bicycle" style="color:var(--orange)"></i>' +
      '<div><div class="wstat-val">' + (s.bikeKm>0?s.bikeKm.toFixed(1)+' km':s.gymCount===0&&s.doneCount>0?'done':'--') + '</div><div class="wstat-label">Cycling</div></div>' +
    '</div>' +
    '<div class="wstat-item">' +
      '<i class="fa-solid fa-dumbbell" style="color:var(--text-2)"></i>' +
      '<div><div class="wstat-val">' + s.gymCount + '</div><div class="wstat-label">Gym sessions</div></div>' +
    '</div>' +
    '<div class="wstat-item">' +
      '<i class="fa-solid fa-clock" style="color:var(--green)"></i>' +
      '<div><div class="wstat-val">' + timeStr + '</div><div class="wstat-label">Time trained</div></div>' +
    '</div>' +
    '<div class="wstat-divider"></div>' +
    '<div class="wstat-item">' +
      '<i class="fa-solid fa-circle-check" style="color:var(--green)"></i>' +
      '<div><div class="wstat-val" style="color:var(--green)">' + s.doneCount + '</div><div class="wstat-label">Done</div></div>' +
    '</div>' +
    (s.missedCount>0
      ? '<div class="wstat-item">' +
          '<i class="fa-solid fa-circle-xmark" style="color:var(--orange)"></i>' +
          '<div><div class="wstat-val" style="color:var(--orange)">' + s.missedCount + '</div><div class="wstat-label">Missed</div></div>' +
        '</div>'
      : '') +
    (remaining>0
      ? '<div class="wstat-item">' +
          '<i class="fa-solid fa-circle-half-stroke" style="color:var(--text-3)"></i>' +
          '<div><div class="wstat-val" style="color:var(--text-3)">' + remaining + '</div><div class="wstat-label">Remaining</div></div>' +
        '</div>'
      : '');
}

// ============================================================
// RENDER — TRAINING PLAN PAGE
// ============================================================
function renderTrainingPlan() {
  const { week: curWeek, dayIdx: curDayIdx } = getCurrentWeekAndDay();
  const container = document.getElementById('trainingPlanWeeks');
  if (!container) return;

  container.innerHTML = PLAN.map(function(week) {
    const isCurrentWeek = week.weekNum === curWeek.weekNum;
    const weekDone = week.days.filter(function(_,i){ return isDone(week.weekNum,i); }).length;
    const nonRestDays = week.days.filter(function(d){ return d.workout.type !== 'rest'; }).length;

    return '<div class="week-section' + (isCurrentWeek?' current-week':'') + '" id="week-' + week.weekNum + '">' +
      '<div class="week-header">' +
        '<div class="week-header-left">' +
          '<div class="week-num-badge">' + week.phase.toUpperCase().slice(0,1) + week.weekNum + '</div>' +
          '<div>' +
            '<div class="week-title">Week ' + week.weekNum + (isCurrentWeek?' \u25cf CURRENT':'') + '</div>' +
            '<div class="week-dates">' + formatShortDate(week.startDate) + ' \u2013 ' + formatShortDate(week.endDate) + ' \u00b7 ' + week.phase + ' Phase</div>' +
          '</div>' +
        '</div>' +
        '<div class="week-adherence-badge' + (weekDone === nonRestDays && nonRestDays > 0 ? ' perfect' : '') + '">' +
          weekDone + '/' + nonRestDays + ' done' +
        '</div>' +
      '</div>' +
      '<div class="week-days-grid">' +
        week.days.map(function(day, i) {
          const done    = isDone(week.weekNum, i);
          const isToday = isCurrentWeek && i === curDayIdx;
          const entry   = getEntry(week.weekNum, i);
          const w       = day.workout;
          const safeName = w.name.replace(/ \u{1F512}| \u{1F30A}| \u{1F6B4}| \u{2708}\u{FE0F}|\u{1F3C1}/gu,'');
          const displayName = (entry && entry.overrideName) ? entry.overrideName : safeName;

          const missed2 = isMissed(week.weekNum, i);
          const etype2  = (entry && entry.overrideType) ? entry.overrideType : w.type;
          return '<div class="day-card' + (isToday?' today-day':'') + (done?' day-done':'') + (missed2?' day-missed':'') + '" onclick="openLogModal(' + week.weekNum + ',' + i + ')">' +
            '<div class="day-card-top">' +
              '<div class="day-name-label">' + day.dayName.slice(0,3) + '</div>' +
              (done ? '<i class="fa-solid fa-circle-check done-tick"></i>' : '') +
              (missed2 ? '<i class="fa-solid fa-circle-xmark" style="color:var(--orange);font-size:14px"></i>' : '') +
            '</div>' +
            '<div class="session-type-icon ' + workoutIconClass(etype2) + '">' +
              '<i class="fa-solid ' + workoutIcon(etype2) + '"></i>' +
            '</div>' +
            '<div class="day-card-name">' + displayName + '</div>' +
            (w.duration ? '<div class="day-card-meta">' + w.duration + ' min' + (w.distance ? ' \u00b7 ' + w.distance + ' km' : '') + '</div>' : '') +
            (done && entry && entry.dist ? '<div class="actual-lbl">' + entry.dist + ' km actual</div>' : '') +
            (missed2 ? '<div class="actual-lbl" style="color:var(--orange)">\u2718 missed</div>' : '') +
            (isToday ? '<div class="today-marker">TODAY</div>' : '') +
          '</div>';
        }).join('') +
      '</div>' +
    '</div>';
  }).join('');

  // Scroll to current week
  if (isCurrentWeek) {
    setTimeout(function(){
      const el = document.getElementById('week-' + curWeek.weekNum);
      if (el) el.scrollIntoView({ behavior:'smooth', block:'start' });
    }, 100);
  }
}

// ============================================================
// RENDER — TODAY'S SESSION
// ============================================================
function renderToday() {
  const { week, dayIdx } = getCurrentWeekAndDay();
  const day     = week.days[dayIdx];
  const w       = day.workout;
  const dayType = getWorkoutDayType([w]);
  const nutr    = calcNutrition(dayType);
  const hydra   = calcHydration(dayType);
  const done    = isDone(week.weekNum, dayIdx);
  const entry   = getEntry(week.weekNum, dayIdx);
  const zoneObj = w.zone ? Object.values(ATHLETE.hrZones)[w.zone-1] : null;
  const bpmStr  = zoneObj ? zoneObj.min + '\u2013' + zoneObj.max + ' bpm' : '';
  const safeName = w.name.replace(/ \u{1F512}| \u{1F30A}| \u{1F6B4}| \u{2708}\u{FE0F}|\u{1F3C1}/gu,'');

  const el = document.getElementById('todayContent');
  if (!el) return;

  el.innerHTML =
    // MARK DONE BAR
    '<div class="mark-done-bar' + (done?' done':'') + '">' +
      '<div class="mark-done-bar-info">' +
        (done
          ? '<i class="fa-solid fa-circle-check" style="color:var(--green)"></i> Session logged!' +
            (entry && entry.overrideName ? ' <span style="color:var(--orange)">' + entry.overrideName + '</span>' : '') +
            (entry && entry.dist ? ' \u00b7 ' + entry.dist + ' km' : '') +
            (entry && entry.dur  ? ' \u00b7 ' + entry.dur + ' min' : '') +
            (entry && entry.hr   ? ' \u00b7 HR ' + entry.hr : '')
          : 'Complete this session and log it below') +
      '</div>' +
      '<div style="display:flex;gap:8px">' +
        (done ? '<button class="btn-outline-sm" onclick="openLogModal(' + week.weekNum + ',' + dayIdx + ')"><i class="fa-solid fa-pen"></i> Edit</button>' : '') +
        '<button class="btn-done' + (done?' btn-done--done':'') + '" onclick="openLogModal(' + week.weekNum + ',' + dayIdx + ')">' +
          '<i class="fa-solid ' + (done?'fa-circle-check':'fa-check') + '"></i> ' + (done?'Logged':' Mark Done') +
        '</button>' +
      '</div>' +
    '</div>' +

    // SESSION HEADER
    '<div class="card mb-16">' +
      '<div style="display:flex;align-items:center;gap:16px;margin-bottom:16px">' +
        '<div class="session-type-icon ' + workoutIconClass(w.type) + '" style="width:52px;height:52px;font-size:20px">' +
          '<i class="fa-solid ' + workoutIcon(w.type) + '"></i>' +
        '</div>' +
        '<div>' +
          '<div style="font-family:Bebas Neue,sans-serif;font-size:24px;letter-spacing:1px">' + safeName + '</div>' +
          '<div style="font-size:12px;color:var(--text-3)">' + day.dayName + ' \u00b7 Week ' + week.weekNum + ' \u00b7 ' + week.phase + ' Phase</div>' +
        '</div>' +
      '</div>' +
      '<div class="session-stats-row">' +
        (w.duration ? '<div class="session-stat"><i class="fa-solid fa-clock"></i><span>' + w.duration + ' min</span></div>' : '') +
        (w.distance ? '<div class="session-stat"><i class="fa-solid fa-route"></i><span>' + w.distance + ' km target</span></div>' : '') +
        (bpmStr     ? '<div class="session-stat"><i class="fa-solid fa-heart-pulse" style="color:var(--red)"></i><span>' + bpmStr + '</span></div>' : '') +
        (w.intensity? '<div class="session-stat"><i class="fa-solid fa-gauge-high"></i><span>' + w.intensity + '</span></div>' : '') +
      '</div>' +
    '</div>' +

    // DESCRIPTION
    '<div class="card mb-16">' +
      '<div class="card-title">Session Breakdown</div>' +
      '<div style="font-size:14px;line-height:1.7;color:var(--text-2)">' + w.desc + '</div>' +
    '</div>' +

    // NUTRITION
    '<div class="card mb-16">' +
      '<div class="card-title">Fuel For Today \u2014 ' + dayType.name + '</div>' +
      '<div class="nutr-grid-today">' +
        '<div class="nutr-col"><div class="nutr-lbl">Calories</div><div class="nutr-big">' + nutr.kcal.toLocaleString() + '</div><div class="nutr-sub">kcal</div></div>' +
        '<div class="nutr-col"><div class="nutr-lbl">Protein</div><div class="nutr-big" style="color:var(--red)">' + nutr.protein.g + '</div><div class="nutr-sub">g</div></div>' +
        '<div class="nutr-col"><div class="nutr-lbl">Carbs</div><div class="nutr-big" style="color:var(--orange)">' + nutr.carbs.g + '</div><div class="nutr-sub">g</div></div>' +
        '<div class="nutr-col"><div class="nutr-lbl">Fat</div><div class="nutr-big" style="color:var(--blue)">' + nutr.fat.g + '</div><div class="nutr-sub">g</div></div>' +
        '<div class="nutr-col"><div class="nutr-lbl">Water</div><div class="nutr-big" style="color:var(--blue)">' + hydra.total + '</div><div class="nutr-sub">L</div></div>' +
        '<div class="nutr-col"><div class="nutr-lbl">Salt</div><div class="nutr-big" style="color:var(--orange)">' + hydra.saltG + '</div><div class="nutr-sub">g Himalayan</div></div>' +
      '</div>' +
    '</div>';
}

// ============================================================
// RENDER — NUTRITION PAGE
// ============================================================
function renderNutrition() {
  const { week, dayIdx } = getCurrentWeekAndDay();
  const w       = week.days[dayIdx].workout;
  const dayType = getWorkoutDayType([w]);
  const nutr    = calcNutrition(dayType);
  const hydra   = calcHydration(dayType);
  const el = document.getElementById('nutritionContent');
  if (!el) return;

  const mealPlans = [
    { meal:'Pre-Workout (1h before)', foods:'Oats 80g + banana + honey \u00b7 or bagel + peanut butter', carbs:60, protein:10 },
    { meal:'During Workout (60+ min)', foods:'1 gel per 45 min \u00b7 500ml electrolyte drink \u00b7 0.5g salt per hour', carbs:30, protein:0 },
    { meal:'Post-Workout (30 min)', foods:'Protein shake 40g \u00b7 white rice 100g \u00b7 banana', carbs:50, protein:40 },
    { meal:'Breakfast', foods:'4 eggs + 2 whites \u00b7 2 slices sourdough \u00b7 avocado \u00b7 Greek yoghurt 200g', carbs:60, protein:50 },
    { meal:'Lunch', foods:'Chicken/salmon 200g \u00b7 rice 150g \u00b7 veg \u00b7 olive oil', carbs:80, protein:50 },
    { meal:'Dinner', foods:'Steak/salmon 200g \u00b7 sweet potato 150g \u00b7 greens \u00b7 olive oil', carbs:80, protein:50 },
    { meal:'Snacks', foods:'Cottage cheese 200g \u00b7 almonds 30g \u00b7 apple', carbs:30, protein:30 },
  ];

  el.innerHTML =
    '<div class="card mb-24">' +
      '<div class="card-title">Daily Targets \u2014 ' + dayType.name + '</div>' +
      '<div class="nutr-macro-row">' +
        '<div class="nutr-macro-item"><div class="nutr-macro-val">' + nutr.kcal.toLocaleString() + '</div><div class="nutr-macro-label">kcal</div></div>' +
        '<div class="nutr-macro-item" style="color:var(--red)"><div class="nutr-macro-val">' + nutr.protein.g + 'g</div><div class="nutr-macro-label">Protein</div></div>' +
        '<div class="nutr-macro-item" style="color:var(--orange)"><div class="nutr-macro-val">' + nutr.carbs.g + 'g</div><div class="nutr-macro-label">Carbs</div></div>' +
        '<div class="nutr-macro-item" style="color:var(--blue)"><div class="nutr-macro-val">' + nutr.fat.g + 'g</div><div class="nutr-macro-label">Fat</div></div>' +
      '</div>' +
      '<div style="font-size:12px;color:var(--text-3);margin-top:8px">Protein is fixed at 250g regardless of day type. Carbs cycle up on hard training days.</div>' +
    '</div>' +
    '<div class="card mb-24">' +
      '<div class="card-title">Meal Timing</div>' +
      mealPlans.map(function(m){
        return '<div class="meal-row">' +
          '<div class="meal-name">' + m.meal + '</div>' +
          '<div class="meal-foods">' + m.foods + '</div>' +
          '<div class="meal-macros">' + (m.protein>0?m.protein+'g P':'') + (m.carbs>0?' \u00b7 '+m.carbs+'g C':'') + '</div>' +
        '</div>';
      }).join('') +
    '</div>' +
    '<div class="card">' +
      '<div class="card-title">Hydration \u2014 ' + hydra.total + 'L Today</div>' +
      '<div style="font-size:14px;line-height:1.8;color:var(--text-2)">' +
        'Total: <strong>' + hydra.total + 'L</strong> \u00b7 Sodium: <strong>' + hydra.sodiumMg + 'mg (' + hydra.saltG + 'g Himalayan salt)</strong><br>' +
        '500ml water on waking \u00b7 500ml pre-workout \u00b7 500\u2013750ml per hour of training \u00b7 500ml post-workout<br>' +
        'Urine colour check: pale straw = well hydrated. If dark: add 500ml immediately.' +
      '</div>' +
    '</div>';
}

// ============================================================
// RENDER — HYDRATION PAGE
// ============================================================
function renderHydration() {
  const { week, dayIdx } = getCurrentWeekAndDay();
  const w       = week.days[dayIdx].workout;
  const dayType = getWorkoutDayType([w]);
  const hydra   = calcHydration(dayType);
  const el = document.getElementById('hydrationContent');
  if (!el) return;

  const protocols = [
    { label:'Morning (on waking)', amount:'500ml', note:'Before coffee. Room temp.' },
    { label:'Pre-Training (1h before)', amount:'500ml', note:'+0.5g Himalayan salt' },
    { label:'During Training', amount:'500\u2013750ml/hr', note:'+0.5g salt per 500ml on long sessions' },
    { label:'Post-Training', amount:'500\u2013750ml', note:'Within 30 min. Electrolytes.' },
    { label:'With Meals', amount:'250\u2013500ml', note:'3 meals = 750ml\u20131.5L' },
    { label:'Evening', amount:'250\u2013500ml', note:'Stop 1 hour before bed' },
  ];

  el.innerHTML =
    '<div class="grid grid-3 mb-24">' +
      '<div class="card card-red"><div class="card-label">DAILY TARGET</div><div class="countdown-num" style="font-size:48px">' + hydra.total + '</div><div class="countdown-unit">LITRES</div></div>' +
      '<div class="card"><div class="card-label">HIMALAYAN SALT</div><div class="countdown-num" style="font-size:40px">' + hydra.saltG + '</div><div class="countdown-unit">GRAMS</div><div style="font-size:11px;color:var(--text-3);margin-top:4px">' + hydra.sodiumMg + 'mg sodium</div></div>' +
      '<div class="card"><div class="card-label">1g SALT GIVES</div><div class="countdown-num" style="font-size:40px">368</div><div class="countdown-unit">MG SODIUM</div></div>' +
    '</div>' +
    '<div class="card mb-24"><div class="card-title">Hydration Protocol</div>' +
      protocols.map(function(p){
        return '<div class="meal-row">' +
          '<div class="meal-name">' + p.label + '</div>' +
          '<div class="meal-foods">' + p.note + '</div>' +
          '<div style="font-weight:700;font-size:14px;color:var(--blue)">' + p.amount + '</div>' +
        '</div>';
      }).join('') +
    '</div>' +
    '<div class="card"><div class="card-title">Salt Reference</div>' +
      '<div style="font-size:14px;line-height:2;color:var(--text-2)">' +
        '1/4 tsp Himalayan salt = ~1.5g = ~550mg Na<br>' +
        '1/2 tsp = ~3g = ~1,100mg Na<br>' +
        '1 tsp = ~6g = ~2,200mg Na<br>' +
        'Target: <strong style="color:var(--orange)">' + hydra.saltG + 'g Himalayan salt per day</strong> (' + hydra.sodiumMg + 'mg Na)' +
      '</div>' +
    '</div>';
}


// ============================================================
// RENDER — PERFORMANCE PAGE (charts)
// ============================================================
function renderPerformance() {
  // Only init charts once or if destroyed
  const tlCtx = document.getElementById('trainingLoadChart');
  const hrCtx = document.getElementById('hrZonesChart');
  if (!tlCtx || !hrCtx) return;

  if (!window._chartsInited) {
    window._chartsInited = true;
    new Chart(tlCtx.getContext('2d'), {
      type: 'bar',
      data: {
        labels: ['Wk1','Wk2','Wk3','Wk4','Wk5','Wk6','Wk7','Wk8'],
        datasets: [{
          label: 'Training Load (min)',
          data: [280,320,360,300,380,420,450,380],
          backgroundColor: 'rgba(232,17,45,0.7)',
          borderRadius: 4,
        }]
      },
      options: { responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}},
        scales:{ x:{ticks:{color:'#aaa'},grid:{color:'#333'}}, y:{ticks:{color:'#aaa'},grid:{color:'#333'}} } }
    });
    new Chart(hrCtx.getContext('2d'), {
      type: 'doughnut',
      data: {
        labels: ['Z1 Recovery','Z2 Aerobic','Z3 Tempo','Z4 Threshold','Z5 VO2Max'],
        datasets: [{ data:[20,45,20,12,3], backgroundColor:['#4CAF50','#2196F3','#FF9800','#F44336','#9C27B0'], borderWidth:0 }]
      },
      options: { responsive:true, maintainAspectRatio:false, plugins:{legend:{position:'bottom',labels:{color:'#aaa',font:{size:11}}}} }
    });
  }
}

function renderDashboardCharts() { renderPerformance(); }

// ============================================================
// RENDER — RACE INTELLIGENCE PAGE
// ============================================================
function renderRaceIntel() {
  const el = document.getElementById('raceIntelContent');
  if (!el) return;

  el.innerHTML =
    // HERO STATS
    '<div class="race-intel-hero mb-24">' +
      '<div class="ri-stat"><div class="ri-num">1.9</div><div class="ri-unit">KM</div><div class="ri-label">Swim \u2022 Ionian Sea</div></div>' +
      '<div class="ri-stat"><div class="ri-num">90</div><div class="ri-unit">KM</div><div class="ri-label">Bike \u2022 Peloponnese</div></div>' +
      '<div class="ri-stat"><div class="ri-num">21.1</div><div class="ri-unit">KM</div><div class="ri-label">Run \u2022 Costa Navarino</div></div>' +
      '<div class="ri-stat"><div class="ri-num">5:30</div><div class="ri-unit">TARGET</div><div class="ri-label">Total Finish Time</div></div>' +
    '</div>' +

    // SEGMENTS
    '<div class="grid grid-3 mb-24">' +
      // SWIM
      '<div class="card">' +
        '<div class="card-title"><i class="fa-solid fa-person-swimming" style="color:var(--blue)"></i> Swim \u2014 1.9km</div>' +
        '<div style="font-size:13px;line-height:1.8;color:var(--text-2)">' +
          '<strong>Venue:</strong> Navarino Bay, Ionian Sea<br>' +
          '<strong>Conditions:</strong> Calm, 20\u201322\u00b0C, saltwater<br>' +
          '<strong>Course:</strong> Rectangle, 2 laps, buoy turns<br>' +
          '<strong>Target pace:</strong> 1:55\u20132:05/100m<br>' +
          '<strong>Calum target:</strong> 38\u201340 min<br>' +
          '<strong>Wetsuit:</strong> Legal (water < 24.5\u00b0C)<br>' +
          '<strong>Key:</strong> Start wide, draft on hips, sight every 6 strokes' +
        '</div>' +
      '</div>' +
      // BIKE
      '<div class="card">' +
        '<div class="card-title"><i class="fa-solid fa-bicycle" style="color:var(--orange)"></i> Bike \u2014 90km</div>' +
        '<div style="font-size:13px;line-height:1.8;color:var(--text-2)">' +
          '<strong>Terrain:</strong> Rolling hills, 900m+ elevation<br>' +
          '<strong>Conditions:</strong> Hot, 22\u201325\u00b0C, possible headwind<br>' +
          '<strong>Target power:</strong> ~70\u201375% FTP<br>' +
          '<strong>Target pace:</strong> ~28\u201330 km/h<br>' +
          '<strong>Calum target:</strong> 3:00\u20133:15<br>' +
          '<strong>Nutrition:</strong> Gel every 35km, 750ml/hr<br>' +
          '<strong>Key:</strong> Ride within yourself, save for run' +
        '</div>' +
      '</div>' +
      // RUN
      '<div class="card">' +
        '<div class="card-title"><i class="fa-solid fa-person-running" style="color:var(--red)"></i> Run \u2014 21.1km</div>' +
        '<div style="font-size:13px;line-height:1.8;color:var(--text-2)">' +
          '<strong>Terrain:</strong> Coastal flat, mostly paved<br>' +
          '<strong>Conditions:</strong> Hot, shade limited pm<br>' +
          '<strong>Target pace:</strong> 5:20\u20135:45/km<br>' +
          '<strong>Calum target:</strong> 1:55\u20132:00<br>' +
          '<strong>Nutrition:</strong> Cola + gel from km 10<br>' +
          '<strong>Cooling:</strong> Ice sponges every aid station<br>' +
          '<strong>Key:</strong> First 5km easy, build if feeling good' +
        '</div>' +
      '</div>' +
    '</div>' +

    // TRANSITIONS
    '<div class="card mb-24">' +
      '<div class="card-title">Transitions</div>' +
      '<div class="grid grid-2">' +
        '<div>' +
          '<div style="font-weight:700;color:var(--blue);margin-bottom:8px">T1 \u2014 Swim to Bike (target: 3 min)</div>' +
          '<div style="font-size:13px;line-height:1.8;color:var(--text-2)">Strip wetsuit to waist running to transition \u00b7 Helmet on FIRST before touching bike \u00b7 Shoes pre-clipped on bike \u00b7 Flying mount at mount line \u00b7 Target 2:30\u20133:00</div>' +
        '</div>' +
        '<div>' +
          '<div style="font-weight:700;color:var(--orange);margin-bottom:8px">T2 \u2014 Bike to Run (target: 2 min)</div>' +
          '<div style="font-size:13px;line-height:1.8;color:var(--text-2)">Dismount before line \u00b7 Rack bike by seat \u00b7 Elastic laces on run shoes \u00b7 Race number belt \u00b7 Cap + sunnies \u00b7 Go \u2014 Target 1:30\u20132:00</div>' +
        '</div>' +
      '</div>' +
    '</div>' +

    // RACE DAY TIMELINE
    '<div class="card mb-24">' +
      '<div class="card-title">Race Day Timeline</div>' +
      [
        { time:'05:00', event:'Wake up, coffee, breakfast (rice + eggs + banana)' },
        { time:'05:45', event:'Body marking, wetsuit check, gear bag drop' },
        { time:'06:30', event:'Swim warm-up in Navarino Bay (10 min easy)' },
        { time:'07:00', event:'RACE START \u2014 Swim 1.9km' },
        { time:'07:40', event:'T1 \u2014 Transition (target 3 min)' },
        { time:'07:43', event:'Bike 90km depart' },
        { time:'10:55', event:'T2 \u2014 Transition (target 2 min)' },
        { time:'10:57', event:'Run 21.1km depart' },
        { time:'12:55', event:'FINISH LINE \u2014 target 5h30 total' },
      ].map(function(t){
        return '<div class="timeline-row">' +
          '<div class="timeline-time">' + t.time + '</div>' +
          '<div class="timeline-dot"></div>' +
          '<div class="timeline-event">' + t.event + '</div>' +
        '</div>';
      }).join('') +
    '</div>' +

    // EXECUTION STRATEGIES
    '<div class="card">' +
      '<div class="card-title">6 Key Execution Strategies</div>' +
      [
        { n:'1', title:'Start wide on swim', desc:'Avoid washing machine chaos. Seed yourself wide and draft on feet/hips of faster swimmers.' },
        { n:'2', title:'Bike pacing: ride your own race', desc:'Heart rate cap at Zone 3 (130\u2013148 bpm) for first 40km. The run is won or lost on the bike.' },
        { n:'3', title:'Eat on the bike, not the run', desc:'Take in 300\u2013400 kcal/hr on bike. Gels + electrolyte drink every 35km. Stomach shuts down in heat on the run.' },
        { n:'4', title:'Heat strategy', desc:'Start early in shade, ice sponges at every aid station, pour water on neck/wrists. Trained with sauna from Week 22.' },
        { n:'5', title:'First 5km of run \u2014 hold back', desc:'Perceived effort Zone 2. Many athletes blow up in km 1\u20135 after the bike. Trust the pace.' },
        { n:'6', title:'Mental framing', desc:'Divide race into 3 blocks: swim (just get through), bike (execute the plan), run (your race). One block at a time.' },
      ].map(function(s){
        return '<div style="display:flex;gap:12px;padding:12px 0;border-bottom:1px solid var(--border)">' +
          '<div style="font-family:Bebas Neue,sans-serif;font-size:24px;color:var(--red);flex-shrink:0;width:24px">' + s.n + '</div>' +
          '<div><div style="font-weight:700;margin-bottom:4px">' + s.title + '</div>' +
          '<div style="font-size:13px;color:var(--text-2)">' + s.desc + '</div></div>' +
        '</div>';
      }).join('') +
    '</div>';
}

// ============================================================
// RENDER — MY LOG PAGE
// ============================================================
function renderMyLog() {
  const log     = getLog();
  const entries = Object.entries(log).filter(function(kv){ return kv[1].done; });
  const missedEntries = entries.filter(function(kv){ return kv[1].missed; }).length;
  const enriched = entries.map(function(kv) {
    const key = kv[0], entry = kv[1];
    const match = key.match(/^w(\d+)_d(\d+)$/);
    if (!match) return null;
    const weekNum = parseInt(match[1]);
    const dayIdx  = parseInt(match[2]);
    const week    = PLAN.find(function(w){ return w.weekNum === weekNum; });
    if (!week) return null;
    return { weekNum, dayIdx, week, day: week.days[dayIdx], workout: week.days[dayIdx].workout, entry };
  }).filter(Boolean).sort(function(a,b){ return new Date(b.entry.savedAt) - new Date(a.entry.savedAt); });

  const totalDone  = enriched.length;
  const totalRunKm = enriched.filter(function(e){ return ['run','brick'].includes(e.entry.overrideType||e.workout.type); })
    .reduce(function(s,e){ return s+(e.entry.dist||0); }, 0);
  const totalSwimKm = enriched.filter(function(e){ return (e.entry.overrideType||e.workout.type)==='swim'; })
    .reduce(function(s,e){ return s+(e.entry.dist||0); }, 0);
  const totalMins  = enriched.reduce(function(s,e){ return s+(e.entry.dur||e.workout.duration||0); }, 0);

  document.getElementById('myLogStats').innerHTML = [
    { val:totalDone,                                             unit:'Sessions',  icon:'fa-check-circle',   col:'var(--green)'  },
    { val:totalRunKm.toFixed(1)+' km',                          unit:'Running',   icon:'fa-person-running',  col:'var(--red)'    },
    { val:totalSwimKm.toFixed(1)+' km',                         unit:'Swimming',  icon:'fa-person-swimming', col:'var(--blue)'   },
    { val:Math.floor(totalMins/60)+'h '+(totalMins%60)+'m',    unit:'Total Time', icon:'fa-clock',           col:'var(--orange)' },
  ].map(function(s){
    return '<div class="card" style="text-align:center;padding:20px 12px">' +
      '<i class="fa-solid ' + s.icon + '" style="font-size:22px;color:' + s.col + ';margin-bottom:8px;display:block"></i>' +
      '<div style="font-family:Bebas Neue,sans-serif;font-size:28px;color:' + s.col + '">' + s.val + '</div>' +
      '<div style="font-size:11px;color:var(--text-3);margin-top:2px">' + s.unit + '</div>' +
    '</div>';
  }).join('');

  if (enriched.length === 0) {
    document.getElementById('myLogList').innerHTML =
      '<div class="card" style="text-align:center;padding:40px;color:var(--text-3)">' +
        '<i class="fa-solid fa-clipboard-list" style="font-size:40px;margin-bottom:16px;display:block;color:var(--border)"></i>' +
        '<div>No workouts logged yet \u2014 tap any day card and hit Save</div>' +
      '</div>';
    return;
  }

  document.getElementById('myLogList').innerHTML = enriched.map(function(e) {
    const dateStr = new Date(e.entry.savedAt).toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short'});
    const planned = e.workout.distance ? e.workout.distance+' km planned' : (e.workout.duration||0)+' min planned';
    const actual  = wasMissed ? '\u2718 Missed' : e.entry.dist ? e.entry.dist+' km' : e.entry.dur ? e.entry.dur+' min' : 'Done';
    const actualCol = wasMissed ? 'var(--orange)' : 'var(--green)';
    const effectiveType = e.entry.overrideType || e.workout.type;
    const displayName   = e.entry.overrideName || e.workout.name.replace(/ \u{1F512}| \u{1F30A}| \u{1F6B4}| \u{2708}\u{FE0F}|\u{1F3C1}/gu,'');
    const wasCustom     = !!(e.entry.overrideName);
    const wasMissed     = !!(e.entry.missed);

    return '<div class="card log-entry-card">' +
      '<div class="log-entry-header">' +
        '<div class="session-type-icon ' + workoutIconClass(effectiveType) + '" style="width:38px;height:38px;flex-shrink:0">' +
          '<i class="fa-solid ' + workoutIcon(effectiveType) + '"></i>' +
        '</div>' +
        '<div style="flex:1;min-width:0">' +
          '<div style="font-weight:700;font-size:14px">' + displayName +
            (wasCustom ? ' <span class="custom-badge">CUSTOM</span>' : '') +
          '</div>' +
          '<div style="font-size:12px;color:var(--text-3);margin-top:2px">Week ' + e.weekNum + ' \u00b7 ' + e.day.dayName + ' \u00b7 ' + dateStr + '</div>' +
          (wasCustom ? '<div style="font-size:11px;color:var(--text-3)">Planned: ' + e.workout.name.replace(/ \u{1F512}| \u{1F30A}| \u{1F6B4}/gu,'') + '</div>' : '') +
        '</div>' +
        '<div style="text-align:right;flex-shrink:0">' +
          '<div style="font-size:13px;font-weight:700;color:' + actualCol + '">' + actual + '</div>' +
          '<div style="font-size:11px;color:var(--text-3)">' + planned + '</div>' +
        '</div>' +
        '<button class="log-edit-btn" onclick="openLogModal(' + e.weekNum + ',' + e.dayIdx + ')">' +
          '<i class="fa-solid fa-pen"></i>' +
        '</button>' +
      '</div>' +
      (e.entry.hr ? '<div style="font-size:11px;color:var(--text-3);margin-top:6px;padding-top:6px;border-top:1px solid var(--border)"><i class="fa-solid fa-heart-pulse" style="color:var(--red);margin-right:4px"></i>Avg HR: ' + e.entry.hr + ' bpm</div>' : '') +
      (e.entry.notes ? '<div class="log-entry-notes"><i class="fa-solid fa-note-sticky" style="color:var(--orange);margin-right:6px"></i>' + e.entry.notes + '</div>' : '') +
    '</div>';
  }).join('');
}


// ============================================================
// ACTIVITY IMPORT — Garmin + Strava CSV
// ============================================================
function toggleGarminImport() {
  const panel = document.getElementById('garminImportPanel');
  const btn   = document.getElementById('garminToggleBtn');
  if (panel.style.display === 'none') {
    panel.style.display = 'block';
    btn.innerHTML = '<i class="fa-solid fa-chevron-up"></i> Close';
  } else {
    panel.style.display = 'none';
    btn.innerHTML = '<i class="fa-solid fa-chevron-down"></i> Import Activities';
  }
}

function handleGarminDrop(event) {
  event.preventDefault();
  document.getElementById('garminDropZone').classList.remove('drag-over');
  const file = event.dataTransfer.files[0];
  if (file) handleGarminFile(file);
}

function handleGarminFile(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    try { importGarminCSV(e.target.result, file.name); }
    catch(err) { showGarminResult('error', 'Parse error: ' + err.message); }
  };
  reader.readAsText(file);
}

function parseGarminTime(str) {
  if (!str) return null;
  const parts = str.trim().split(':');
  if (parts.length === 3) return parseInt(parts[0])*60 + parseInt(parts[1]) + Math.round(parseInt(parts[2])/60);
  if (parts.length === 2) return parseInt(parts[0]) + Math.round(parseInt(parts[1])/60);
  return null;
}

function garminTypeMap(t) {
  const s = (t||'').toLowerCase();
  if (s.includes('run') || s.includes('trail')) return 'run';
  if (s.includes('swim') || s.includes('pool'))  return 'swim';
  if (s.includes('cycl') || s.includes('bike') || s.includes('spin') || s.includes('virtual')) return 'bike';
  if (s.includes('strength') || s.includes('weight') || s.includes('gym')) return 'gym';
  return null;
}

function importGarminCSV(csvText, filename) {
  var lines = csvText.split(/\r?\n/).filter(function(l){ return l.trim(); });
  if (lines.length < 2) { showGarminResult('error', 'File appears empty.'); return; }

  var headers = lines[0].split(',').map(function(h){ return h.trim().replace(/^"|"$/g,''); });

  // Detect Strava vs Garmin format
  var isStrava = headers.some(function(h){ return /activity.?date/i.test(h) || /activity.?name/i.test(h); });

  var colType  = headers.findIndex(function(h){ return /^activity.?type$/i.test(h); });
  var colDate  = headers.findIndex(function(h){ return isStrava ? /activity.?date/i.test(h) : /^date$/i.test(h); });
  var colDist  = headers.findIndex(function(h){ return /^distance$/i.test(h); });
  var colTime  = headers.findIndex(function(h){ return isStrava ? /^elapsed.?time$/i.test(h) : /^time$/i.test(h); });
  var colHR    = headers.findIndex(function(h){ return /avg.?hr/i.test(h) || /average.?heart/i.test(h); });
  var colTitle = headers.findIndex(function(h){ return isStrava ? /activity.?name/i.test(h) : /^title$/i.test(h); });

  if (colDate < 0) { showGarminResult('error', 'No date column found. Upload a Garmin Activities.csv or Strava Activities.csv export.'); return; }

  var source   = isStrava ? 'strava' : 'garmin';
  var imported = [], alreadyLogged = [];

  for (var li = 1; li < lines.length; li++) {
    var cells = lines[li].match(/("(?:[^"]|"")*"|[^,]*),?/g)||[];
    var clean = cells.map(function(c){ return c.replace(/,$/,'').trim().replace(/^"|"$/g,'').replace(/""/g,'"'); });
    if (clean.length < 3) continue;

    var dateStr   = clean[colDate]||'';
    var dateMatch = dateStr.match(/(\d{4})-(\d{2})-(\d{2})/);
    // Strava can also have "Mar 16, 2026" format
    if (!dateMatch) {
      var d2 = new Date(dateStr);
      if (!isNaN(d2)) { var y=d2.getFullYear(),mo=String(d2.getMonth()+1).padStart(2,'0'),da=String(d2.getDate()).padStart(2,'0'); dateMatch=[null,''+y,mo,da]; }
    }
    if (!dateMatch) continue;

    var actDate  = new Date(parseInt(dateMatch[1]), parseInt(dateMatch[2])-1, parseInt(dateMatch[3]));
    actDate.setHours(0,0,0,0);
    var planStart = new Date(ATHLETE.planStart); planStart.setHours(0,0,0,0);
    var daysSince = Math.round((actDate - planStart)/86400000);
    if (daysSince < 0) continue;
    var weekNum = Math.floor(daysSince/7)+1;
    var dayIdx  = daysSince%7;
    if (weekNum > 32) continue;

    // Distance: Strava gives meters, Garmin gives km
    var rawDist  = parseFloat(clean[colDist])||0;
    var distKm   = isStrava ? Math.round(rawDist/1000*100)/100 : Math.round(rawDist*100)/100;

    // Time: Strava gives seconds, Garmin gives HH:MM:SS
    var dur = null;
    if (colTime >= 0) {
      if (isStrava) { dur = Math.round((parseInt(clean[colTime])||0)/60); }
      else { dur = parseGarminTime(clean[colTime]); }
    }

    var hr    = colHR>=0 ? parseInt(clean[colHR])||null : null;
    var title = colTitle>=0 ? clean[colTitle] : null;
    var gType = colType>=0 ? clean[colType] : '';
    var mType = garminTypeMap(gType);

    // Match to a sub-session
    var planWeek = PLAN[weekNum-1];
    if (!planWeek) continue;
    var wo = planWeek.days[dayIdx].workout;

    // Find the best matching session key
    var skey = null;
    if (wo.sessions) {
      var match = wo.sessions.find(function(s){ return s.key === mType; });
      if (!match) match = wo.sessions.find(function(s){ return s.key === wo.discipline; });
      if (!match && wo.sessions.length > 0) match = wo.sessions[0];
      if (match) skey = match.key;
    }
    if (!skey) continue;

    var existing = getSubEntry(weekNum, dayIdx, skey);
    if (existing && existing.source !== 'garmin' && existing.source !== 'strava') {
      alreadyLogged.push(dateStr.substring(0,10));
      continue;
    }

    saveSubEntry(weekNum, dayIdx, skey, {
      missed: false,
      dist: distKm||null, dur: dur||null, hr: hr||null,
      notes: title ? source.charAt(0).toUpperCase()+source.slice(1)+': '+title : null,
      source: source, importedAt: new Date().toISOString(),
    });
    imported.push({ date: dateStr.substring(0,10), name: title||gType, dist: distKm, weekNum, dayIdx, skey });
  }

  var html = '';
  if (imported.length > 0) {
    html += '<div class="garmin-result-success">' +
      '<div style="font-weight:700;margin-bottom:8px"><i class="fa-solid fa-circle-check" style="color:var(--green)"></i> ' + imported.length + ' workout' + (imported.length!==1?'s':'') + ' imported from ' + filename + '</div>' +
      '<div class="garmin-result-list">' +
        imported.map(function(imp){
          return '<div class="garmin-result-row"><span style="color:var(--text-3);font-size:11px;width:80px;flex-shrink:0">Wk'+imp.weekNum+' Day'+(imp.dayIdx+1)+' \u2022 '+imp.skey+'</span>' +
            '<span style="font-size:12px;font-weight:600">'+imp.name+'</span>' +
            (imp.dist?'<span style="font-size:11px;color:var(--text-3);margin-left:auto">'+imp.dist+' km</span>':'') +
            '<span style="font-size:11px;color:var(--text-3)">'+imp.date+'</span></div>';
        }).join('') +
      '</div></div>';
    refreshAfterLog();
  }
  if (alreadyLogged.length>0) html += '<div style="font-size:11px;color:var(--orange);margin-top:8px"><i class="fa-solid fa-triangle-exclamation"></i> '+alreadyLogged.length+' skipped (already manually logged)</div>';
  if (!html) { showGarminResult('error', 'No activities matched your plan dates. Make sure you\'re uploading Activities.csv from Garmin or Strava.'); return; }
  var el = document.getElementById('garminImportResult');
  el.innerHTML = html; el.style.display='block';
}

function showGarminResult(type, msg) {
  const el  = document.getElementById('garminImportResult');
  const col = type==='error' ? 'var(--red)' : 'var(--green)';
  el.innerHTML = '<div style="padding:10px;border-radius:6px;background:rgba(0,0,0,.2);font-size:12px;color:'+col+'"><i class="fa-solid fa-'+(type==='error'?'circle-xmark':'circle-check')+'"></i> '+msg+'</div>';
  el.style.display='block';
}

// Calendar export removed — sessions are done at different times throughout the day

// ============================================================
// INIT
// ============================================================
// ============================================================
// STRAVA INTEGRATION
// ============================================================
var STRAVA_CLIENT_ID     = '234801';
var STRAVA_CLIENT_SECRET = '8a17f099dd214212bfe1f225edd143aa576e6cce';
var STRAVA_REDIRECT_URI  = 'https://calumfraserfitness-code.github.io/Ironmantraining';
var STRAVA_TOKEN_KEY     = 'strava_token_v1';
var STRAVA_LAST_SYNC_KEY = 'strava_last_sync';

function stravaGetStoredToken() {
  try { return JSON.parse(localStorage.getItem(STRAVA_TOKEN_KEY)); } catch(e) { return null; }
}
function stravaStoreToken(t) { localStorage.setItem(STRAVA_TOKEN_KEY, JSON.stringify(t)); }
function stravaIsConnected() { return !!stravaGetStoredToken(); }

function stravaConnect() {
  var url = 'https://www.strava.com/oauth/authorize'
    + '?client_id=' + STRAVA_CLIENT_ID
    + '&redirect_uri=' + encodeURIComponent(STRAVA_REDIRECT_URI)
    + '&response_type=code&approval_prompt=auto&scope=activity:read_all';
  window.location.href = url;
}

function stravaDisconnect() {
  localStorage.removeItem(STRAVA_TOKEN_KEY);
  localStorage.removeItem(STRAVA_LAST_SYNC_KEY);
  renderStravaStatus();
}

function stravaExchangeCode(code) {
  return fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: STRAVA_CLIENT_ID,
      client_secret: STRAVA_CLIENT_SECRET,
      code: code,
      grant_type: 'authorization_code',
    }),
  }).then(function(r) { if (!r.ok) throw new Error('Token exchange failed'); return r.json(); });
}

function stravaRefreshToken(refreshToken) {
  return fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: STRAVA_CLIENT_ID,
      client_secret: STRAVA_CLIENT_SECRET,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  }).then(function(r) { if (!r.ok) throw new Error('Token refresh failed'); return r.json(); });
}

function stravaGetValidToken() {
  var stored = stravaGetStoredToken();
  if (!stored) return Promise.resolve(null);
  var now = Math.floor(Date.now() / 1000);
  if (stored.expires_at - now < 300) {
    return stravaRefreshToken(stored.refresh_token).then(function(t) {
      stravaStoreToken(t);
      return t.access_token;
    }).catch(function() { return null; });
  }
  return Promise.resolve(stored.access_token);
}

function stravaFetchAllActivities(accessToken) {
  var planStartUnix = Math.floor(new Date(ATHLETE.planStart).getTime() / 1000);
  var url = 'https://www.strava.com/api/v3/athlete/activities?per_page=200&after=' + planStartUnix;
  return fetch(url, { headers: { 'Authorization': 'Bearer ' + accessToken } })
    .then(function(r) { if (!r.ok) throw new Error('Fetch activities failed'); return r.json(); });
}

function stravaTypeToKey(stravaType) {
  var map = {
    'Run':'run','TrailRun':'run','Race':'run','VirtualRun':'run',
    'Swim':'swim','OpenWaterSwim':'swim',
    'Ride':'bike','VirtualRide':'bike','EBikeRide':'bike',
    'WeightTraining':'gym','Workout':'gym','Crossfit':'gym','Lifting':'gym',
  };
  return map[stravaType] || null;
}

function stravaMatchActivity(act) {
  var actDate = new Date(act.start_date_local);
  actDate.setHours(0,0,0,0);
  var planStart = new Date(ATHLETE.planStart); planStart.setHours(0,0,0,0);
  var daysSince = Math.round((actDate - planStart) / 86400000);
  if (daysSince < 0) return null;
  var weekNum = Math.floor(daysSince / 7) + 1;
  var dayIdx  = daysSince % 7;
  if (weekNum > 32) return null;
  var wo = getPlanWorkout(weekNum, dayIdx);
  if (!wo || wo.type === 'rest') return null;
  var typeKey = stravaTypeToKey(act.type);
  if (!typeKey) return null;
  var planned = wo.sessions && wo.sessions.find(function(s) { return s.key === typeKey; });
  return {
    weekNum: weekNum,
    dayIdx:  dayIdx,
    sessionKey: planned ? typeKey : ('x' + typeKey),
    isExtra:    !planned,
    distKm:  act.distance  ? Math.round(act.distance / 10) / 100 : null,
    durMin:  act.moving_time ? Math.round(act.moving_time / 60) : null,
    hr:      act.average_heartrate ? Math.round(act.average_heartrate) : null,
    name:    act.name,
    stravaId: act.id,
  };
}

function stravaSyncActivities() {
  renderStravaStatus('syncing');
  return stravaGetValidToken().then(function(token) {
    if (!token) { renderStravaStatus(); return; }
    return stravaFetchAllActivities(token).then(function(activities) {
      var imported = 0;
      activities.forEach(function(act) {
        var m = stravaMatchActivity(act);
        if (!m) return;
        // Don't overwrite manual entries
        var existing = getSubEntry(m.weekNum, m.dayIdx, m.sessionKey);
        if (existing && existing.source !== 'strava') return;
        saveSubEntry(m.weekNum, m.dayIdx, m.sessionKey, {
          missed:   false,
          dist:     m.distKm,
          dur:      m.durMin,
          hr:       m.hr,
          notes:    m.name,
          source:   'strava',
          stravaId: m.stravaId,
        });
        imported++;
      });
      localStorage.setItem(STRAVA_LAST_SYNC_KEY, new Date().toISOString());
      renderStravaStatus('connected');
      refreshAfterLog();
      stravaShowToast('✔ ' + imported + ' activities synced from Strava');
    });
  }).catch(function(e) {
    console.error('Strava sync error:', e);
    renderStravaStatus('error');
  });
}

function stravaHandleCallback() {
  var params = new URLSearchParams(window.location.search);
  var code   = params.get('code');
  var error  = params.get('error');
  if (error) { window.history.replaceState({}, '', window.location.pathname); return; }
  if (!code)  return;
  window.history.replaceState({}, '', window.location.pathname);
  renderStravaStatus('syncing');
  stravaExchangeCode(code).then(function(tokenData) {
    stravaStoreToken(tokenData);
    return stravaSyncActivities();
  }).catch(function(e) {
    console.error('Strava auth error:', e);
    renderStravaStatus();
    stravaShowToast('Could not connect Strava — please try again');
  });
}

function renderStravaStatus(override) {
  var el = document.getElementById('stravaStatusEl');
  if (!el) return;
  var stored    = stravaGetStoredToken();
  var connected = !!stored;
  var lastSync  = localStorage.getItem(STRAVA_LAST_SYNC_KEY);
  var syncLabel = lastSync ? 'Synced ' + new Date(lastSync).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'}) : '';
  var status    = override || (connected ? 'connected' : 'disconnected');

  if (status === 'syncing') {
    el.innerHTML = '<div class="strava-bar syncing"><i class="fa-brands fa-strava strava-icon"></i><span>Syncing from Strava…</span><i class="fa-solid fa-rotate fa-spin" style="margin-left:auto;color:var(--orange)"></i></div>';
    return;
  }
  if (status === 'connected') {
    var name = stored && stored.athlete ? stored.athlete.firstname : 'Strava';
    el.innerHTML =
      '<div class="strava-bar connected">' +
        '<i class="fa-brands fa-strava strava-icon"></i>' +
        '<div class="strava-bar-info">' +
          '<span class="strava-bar-name">' + name + ' — Strava connected</span>' +
          (syncLabel ? '<span class="strava-bar-sync">' + syncLabel + '</span>' : '') +
        '</div>' +
        '<button class="strava-btn-sync" onclick="stravaSyncActivities()"><i class="fa-solid fa-rotate"></i> Sync</button>' +
        '<button class="strava-btn-disconnect" onclick="stravaDisconnect()">Disconnect</button>' +
      '</div>';
    return;
  }
  if (status === 'error') {
    el.innerHTML =
      '<div class="strava-bar error">' +
        '<i class="fa-brands fa-strava strava-icon"></i>' +
        '<span>Sync failed — </span>' +
        '<button class="strava-btn-sync" onclick="stravaSyncActivities()">Retry</button>' +
      '</div>';
    return;
  }
  // disconnected
  el.innerHTML =
    '<div class="strava-bar">' +
      '<i class="fa-brands fa-strava strava-icon"></i>' +
      '<div class="strava-bar-info">' +
        '<span class="strava-bar-name">Connect Strava</span>' +
        '<span class="strava-bar-sync">Auto-import all your runs, swims &amp; rides</span>' +
      '</div>' +
      '<button class="strava-btn-connect" onclick="stravaConnect()">Connect</button>' +
    '</div>';
}

function stravaShowToast(msg) {
  var t = document.createElement('div');
  t.className = 'strava-toast';
  t.innerHTML = '<i class="fa-brands fa-strava" style="color:#FC4C02"></i> ' + msg;
  document.body.appendChild(t);
  setTimeout(function() { t.classList.add('visible'); }, 10);
  setTimeout(function() { t.classList.remove('visible'); setTimeout(function(){ t.remove(); }, 400); }, 3500);
}

// ============================================================
function init() {
  migrateOldLog(); // convert any old w1_d0 entries to new w1_d0_gym format
  // Register PWA service worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(function(){});
  }
  stravaHandleCallback(); // handle OAuth redirect if coming back from Strava
  renderDashboard();
  renderDashboardCharts();
  renderNextWeek();

  document.querySelectorAll('.nav-link').forEach(function(link) {
    link.addEventListener('click', function(e) {
      e.preventDefault();
      navigateTo(link.dataset.page);
    });
  });

  const menuBtn = document.getElementById('menuToggle');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  menuBtn.addEventListener('click', function(){ sidebar.classList.toggle('open'); overlay.classList.toggle('visible'); });
  overlay.addEventListener('click', function(){ sidebar.classList.remove('open'); overlay.classList.remove('visible'); });

  setInterval(function() {
    const d = getDaysToRace();
    document.getElementById('countdownNum').textContent   = d;
    document.getElementById('countdownBadge').textContent = d + ' days to race';
  }, 60000);
}

document.addEventListener('DOMContentLoaded', init);
