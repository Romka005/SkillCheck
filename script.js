// Все данные
const STORE_KEY = 'skillcheck_proto_v1';

const TASKS = [
  { id:'t1', type:'choice', title:'Что делает CSS-свойство box-sizing: border-box', maxScore:20,
    options:[
      {id:'o1', text:'Включает padding и border в заданную ширину/высоту элемента', correct:true},
      {id:'o2', text:'Убирает границы у всех элементов на странице', correct:false},
      {id:'o3', text:'Делает элемент круглым', correct:false},
      {id:'o4', text:'Отключает адаптивную вёрстку', correct:false},
    ]},
  { id:'t2', type:'choice', title:'Чем localStorage отличается от sessionStorage', maxScore:20,
    options:[
      {id:'o1', text:'localStorage хранит данные без ограничения по времени, sessionStorage — только до закрытия вкладки', correct:true},
      {id:'o2', text:'sessionStorage доступен только на HTTPS, а localStorage — везде', correct:false},
      {id:'o3', text:'Они полностью идентичны и различаются только названием', correct:false},
      {id:'o4', text:'localStorage работает только в мобильных браузерах', correct:false},
    ]},
  { id:'t3', type:'choice', title:'Что такое всплытие событий (event bubbling) в DOM', maxScore:20,
    options:[
      {id:'o1', text:'Событие сначала срабатывает на элементе, затем последовательно передаётся вверх по родителям', correct:true},
      {id:'o2', text:'Событие срабатывает одновременно на всех элементах страницы', correct:false},
      {id:'o3', text:'Механизм автоматической анимации при клике', correct:false},
      {id:'o4', text:'Способ асинхронной загрузки изображений', correct:false},
    ]},
  { id:'t4', type:'choice', title:'Чем отличаются let и var при объявлении переменной в JavaScript', maxScore:20,
    options:[
      {id:'o1', text:'let имеет блочную область видимости, var — функциональную', correct:true},
      {id:'o2', text:'var нельзя переопределять, а let можно', correct:false},
      {id:'o3', text:'let работает только внутри классов', correct:false},
      {id:'o4', text:'Разницы нет, это синонимы', correct:false},
    ]},
  { id:'t5', type:'choice', title:'Для чего используется атрибут defer у тега <script>', maxScore:20,
    options:[
      {id:'o1', text:'Откладывает выполнение скрипта до полной загрузки и парсинга HTML-документа', correct:true},
      {id:'o2', text:'Полностью блокирует загрузку страницы до выполнения скрипта', correct:false},
      {id:'o3', text:'Указывает браузеру кэшировать скрипт навсегда', correct:false},
      {id:'o4', text:'Позволяет подключать несколько версий одного скрипта одновременно', correct:false},
    ]},
];

const CANDIDATES = [
  { id:'c1', name:'Морозов Роман Дмитриевич', status:'completed', score:80, updated:'12.07.2026 14:20',
    answers:{ t1:'o1', t2:'o1', t3:'o1', t4:'o1', t5:'o2' } }, 
  { id:'c2', name:'Языков Никита Сергеевич', status:'in_progress', score:null, updated:'13.07.2026 09:05', answers:{} },
  { id:'c3', name:'Киселев Алексей Олегович', status:'pending', score:null, updated:'—', answers:{} },
  { id:'c4', name:'Чуланов Тимур Дмитриевич', status:'expired', score:40, updated:'10.07.2026 18:40',
    answers:{ t1:'o1', t2:'o3', t3:'o1', t4:'o4', t5:'o2' } }, 
];

function escapeHtml(str){
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// Состояние 
function defaultState(){
  return {
    role:'candidate',
    session:{
      status:'pending', // pending | in_progress | completed | expired
      startedAt:null,
      timeLimitSec: 8*60,
      remainingSec: 8*60,
      currentIndex:0,
      answers:{} // taskId -> {selected}
    }
  };
}

let state = load();
function load(){
  try{
    const raw = localStorage.getItem(STORE_KEY);
    if(raw) return JSON.parse(raw);
  }catch(e){}
  return defaultState();
}
function save(){
  try{ localStorage.setItem(STORE_KEY, JSON.stringify(state)); }catch(e){}
}

// Переключение роли/экрана
function setRole(role){
  state.role = role;
  document.getElementById('btn-role-candidate').classList.toggle('active', role==='candidate');
  document.getElementById('btn-role-recruiter').classList.toggle('active', role==='recruiter');
  save();
  if(role==='candidate'){
    routeCandidate();
  } else {
    showView('recruiter-list');
    renderRecruiterList();
  }
}

function showView(name){
  document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
  document.getElementById('view-'+name).classList.add('active');
}

function routeCandidate(){
  stopTimer();
  const s = state.session;
  if(s.status==='pending'){
    showView('assignment');
    renderAssignment();
  } else if(s.status==='in_progress'){
    showView('exam');
    renderExam();
    startTimer();
  } else {
    showView('results');
    renderResults();
  }
}

// Экран назначения
function renderAssignment(){
  const totalScore = TASKS.reduce((a,t)=>a+t.maxScore,0);
  document.getElementById('assignment-card').innerHTML = `
    <div class="assign-head">
      <div>
        <span class="badge pending">Ожидает прохождения</span>
        <h2 style="margin:12px 0 0;font-size:19px;">Тест: Frontend-разработчик (Middle)</h2>
      </div>
      <button class="btn" onclick="startTest()">Начать тестирование</button>
    </div>
    <div class="assign-meta">
      <div class="meta-item">Заданий<b>${TASKS.length}</b></div>
      <div class="meta-item">Лимит времени<b>8:00</b></div>
      <div class="meta-item">Проходной балл<b>60%</b></div>
      <div class="meta-item">Макс. баллов<b>${totalScore}</b></div>
    </div>
  `;
}

function startTest(){
  const s = state.session;
  s.status='in_progress';
  s.startedAt = Date.now();
  s.remainingSec = s.timeLimitSec;
  s.currentIndex = 0;
  s.answers = {};
  save();
  const warn = document.getElementById('time-warning');
  if(warn) warn.classList.remove('show');
  routeCandidate();
}

// Таймер 
let timerHandle=null, autosaveTick=0;

function startTimer(){
  stopTimer();
  updateTimerRing();
  timerHandle = setInterval(()=>{
    const s = state.session;
    s.remainingSec = Math.max(0, s.remainingSec-1);
    autosaveTick++;
    updateTimerRing();
    if(autosaveTick % 30 === 0){ doAutosave(); } //  каждые 30с автосохранение
    if(s.remainingSec===59){ showTimeWarning(); } // предупреждение за минуту до конца
    if(s.remainingSec<=0){
      s.status='expired';
      save();
      stopTimer();
      routeCandidate();
    } else {
      save();
    }
  },1000);
}
function stopTimer(){ if(timerHandle){ clearInterval(timerHandle); timerHandle=null; } }

function showTimeWarning(){
  const el = document.getElementById('time-warning');
  if(el) el.classList.add('show');
}

function doAutosave(){
  save();
  const dot=document.getElementById('sync-dot');
  const label=document.getElementById('sync-label');
  if(!dot) return;
  dot.classList.remove('pulse'); void dot.offsetWidth; dot.classList.add('pulse');
  label.textContent = 'сохранено ' + new Date().toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
}

function updateTimerRing(){
  const s = state.session;
  const ring = document.getElementById('timer-ring');
  const text = document.getElementById('timer-text');
  if(!ring) return;
  const circumference = 138.2;
  const frac = s.remainingSec / s.timeLimitSec;
  ring.style.strokeDashoffset = (circumference * (1-frac)).toFixed(1);
  const low = frac < 0.15;
  ring.style.stroke = low ? 'var(--danger)' : 'var(--accent)';
  const m = Math.floor(s.remainingSec/60), sec = s.remainingSec%60;
  text.textContent = `${m}:${sec.toString().padStart(2,'0')}`;
}

function renderExam(){
  const s = state.session;
  document.getElementById('exam-title').textContent = 'Тест: Frontend-разработчик (Middle)';
  renderQNav();
  renderQuestion();
}

function renderQNav(){
  const s = state.session;
  const wrap = document.getElementById('qnav');
  wrap.innerHTML = TASKS.map((t,i)=>{
    const answered = isAnswered(t);
    const cls = ['','current','answered'].filter((c,ci)=>{
      if(ci===1) return i===s.currentIndex;
      if(ci===2) return answered && i!==s.currentIndex;
      return false;
    }).join(' ');
    return `<button class="${cls}" onclick="goToQuestion(${i})">${i+1}</button>`;
  }).join('');
  renderUnansweredCounter();
}

// Навигация по вопросам
function renderUnansweredCounter(){
  const el = document.getElementById('unanswered-counter');
  if(!el) return;
  const left = TASKS.filter(t=>!isAnswered(t)).length;
  if(left===0){
    el.textContent = 'Все вопросы отвечены';
    el.classList.add('all-done');
  } else {
    el.textContent = `Без ответа: ${left} из ${TASKS.length}`;
    el.classList.remove('all-done');
  }
}

function isAnswered(task){
  const a = state.session.answers[task.id];
  return !!(a && a.selected);
}

function goToQuestion(i){ state.session.currentIndex=i; save(); renderQNav(); renderQuestion(); }
function nextQuestion(){ if(state.session.currentIndex<TASKS.length-1){ state.session.currentIndex++; save(); renderQNav(); renderQuestion(); } }
function prevQuestion(){ if(state.session.currentIndex>0){ state.session.currentIndex--; save(); renderQNav(); renderQuestion(); } }

// Вопрос и ответ
const TYPE_LABEL = {choice:'Тип: выбор ответа'};

function renderQuestion(){
  const s = state.session;
  const t = TASKS[s.currentIndex];
  const a = s.answers[t.id] || (s.answers[t.id]={});
  document.getElementById('q-type').textContent = TYPE_LABEL[t.type];
  document.getElementById('q-title').textContent = t.title;
  document.getElementById('q-max').textContent = `Максимум баллов: ${t.maxScore}`;

  const body = document.getElementById('q-body');
  body.innerHTML = t.options.map(o=>`
    <label class="option ${a.selected===o.id?'selected':''}">
      <input type="radio" name="opt" ${a.selected===o.id?'checked':''} onclick="selectOption('${t.id}','${o.id}')">
      ${o.text}
    </label>`).join('');
}

function selectOption(taskId, optId){
  state.session.answers[taskId] = state.session.answers[taskId] || {};
  state.session.answers[taskId].selected = optId;
  save(); renderQNav(); renderQuestion();
}

function resetAnswer(){
  const s = state.session;
  const t = TASKS[s.currentIndex];
  if(!confirm('Сбросить ответ на этот вопрос?')) return;
  s.answers[t.id] = {};
  save(); renderQNav(); renderQuestion();
}

// Завершение и подсчёт
function submitTest(){
  if(!confirm('Завершить тестирование? Изменить ответы после этого будет нельзя.')) return;
  const s = state.session;
  stopTimer();
  s.status='completed';
  s.finishedAt = Date.now();
  save();
  routeCandidate();
}

// Результаты — общая функция подсчёта, переиспользуется и для кандидата, и для рекрутера
function scoreAnswers(answers){
  let total=0, max=0;
  const rows = TASKS.map((t,i)=>{
    max += t.maxScore;
    const correctOpt = t.options.find(o=>o.correct);
    const selected = answers ? answers[t.id] : null;
    // answers у кандидата (state.session.answers) хранит {selected}, у CANDIDATES — просто id строкой
    const selectedId = selected && typeof selected === 'object' ? selected.selected : selected;
    const ok = selectedId === correctOpt.id;
    const status = ok?'ok':'no';
    const points = ok? t.maxScore : 0;
    total += points;
    return {n:i+1, title:t.title, type:TYPE_LABEL[t.type].replace('Тип: ',''), status, points, maxScore:t.maxScore};
  });
  return {rows, total, max};
}

function scoreSession(){
  return scoreAnswers(state.session.answers);
}

function renderResults(){
  const {rows,total,max} = scoreSession();
  const pct = Math.round((total/max)*100);
  document.getElementById('score-pct').textContent = pct+'%';
  const circumference = 2*Math.PI*44;
  const fg = document.getElementById('score-ring-fg');
  fg.setAttribute('stroke-dasharray', circumference.toFixed(1));
  fg.setAttribute('stroke-dashoffset', (circumference*(1-pct/100)).toFixed(1));
  fg.style.stroke = pct>=60 ? 'var(--accent)' : 'var(--danger)';

  document.getElementById('score-summary').innerHTML = `
    Набрано <b>${total}</b> из <b>${max}</b> баллов.<br>
    Статус сессии: <span class="badge ${state.session.status}">${statusLabel(state.session.status)}</span><br>
    Все задания проверены автоматически.
  `;

  document.getElementById('results-body').innerHTML = rows.map(r=>`
    <tr>
      <td>${r.n}</td>
      <td>${escapeHtml(r.title)}</td>
      <td>${r.type}</td>
      <td><span class="dot ${r.status}"></span>${statusRowLabel(r.status)}</td>
      <td>${r.points} / ${r.maxScore}</td>
    </tr>`).join('');
}
function statusRowLabel(s){ return {ok:'Верно', no:'Неверно'}[s]; }
function statusLabel(s){ return {pending:'ожидает', in_progress:'проходит', completed:'завершено', expired:'истёк срок'}[s]; }

function restartDemo(){
  state.session = defaultState().session;
  save();
  routeCandidate();
}

// Рекрутер: список
let scoreSortDir = null; // null | 'asc' | 'desc'

function toggleSort(){
  scoreSortDir = scoreSortDir === 'desc' ? 'asc' : scoreSortDir === 'asc' ? null : 'desc';
  const arrow = document.getElementById('sort-arrow');
  arrow.textContent = scoreSortDir==='desc' ? '↓' : scoreSortDir==='asc' ? '↑' : '↕';
  renderRecruiterList();
}

function renderRecruiterList(){
  const filter = document.getElementById('status-filter').value;
  let list = CANDIDATES.filter(c => filter==='all' || c.status===filter);
  if(scoreSortDir){
    list = [...list].sort((a,b)=>{
      const av = a.score ?? -1, bv = b.score ?? -1; // кандидаты без балла — в конец
      return scoreSortDir==='desc' ? bv-av : av-bv;
    });
  }
  const body = document.getElementById('recruiter-body');
  if(!list.length){ body.innerHTML = `<tr><td colspan="5" class="empty">Нет кандидатов с выбранным статусом</td></tr>`; return; }
  body.innerHTML = list.map(c=>`
    <tr class="cand-row" onclick="openCandidate('${c.id}')">
      <td>${escapeHtml(c.name)}</td>
      <td><span class="badge ${c.status}">${statusLabel(c.status)}</span></td>
      <td>${c.score!==null ? c.score+'%' : '—'}</td>
      <td style="color:var(--muted);">${c.updated}</td>
      <td style="color:var(--accent);">Открыть →</td>
    </tr>`).join('');
}

// Рекрутер: детальный отчёт
function openCandidate(id){
  const c = CANDIDATES.find(x=>x.id===id);
  showView('recruiter-detail');
  document.getElementById('rd-name').textContent = c.name;
  document.getElementById('rd-sub').textContent = `Статус: ${statusLabel(c.status)} · Вакансия: Frontend-разработчик (Middle)`;

  const pct = c.score ?? 0;
  const circumference = 2*Math.PI*44;
  const fg = document.getElementById('rd-ring-fg');
  fg.setAttribute('stroke-dasharray', circumference.toFixed(1));
  fg.setAttribute('stroke-dashoffset', (circumference*(1-pct/100)).toFixed(1));
  fg.style.stroke = pct>=60 ? 'var(--accent)' : 'var(--danger)';
  document.getElementById('rd-pct').textContent = (c.score!==null? pct+'%':'—');

  const avg = 64;
  document.getElementById('rd-compare').innerHTML = c.score!==null ? `
    Результат кандидата: <b>${c.score}%</b><br>
    Средний балл по вакансии: <b>${avg}%</b><br>
    ${c.score>=avg ? 'Выше среднего по вакансии' : 'Ниже среднего по вакансии'}
  ` : 'Тестирование ещё не завершено — итоговый отчёт появится после сдачи.';

  // теперь берём фиксированные ответы кандидата вместо случайной генерации
  const rows = (c.score!==null && c.answers) ? scoreAnswers(c.answers).rows : [];
  document.getElementById('rd-body').innerHTML = rows.length ? rows.map(r=>`
    <tr>
      <td>${r.n}</td><td>${escapeHtml(r.title)}</td><td>${r.type}</td>
      <td><span class="dot ${r.status}"></span>${statusRowLabel(r.status)}</td>
      <td>${r.points} / ${r.maxScore}</td>
    </tr>`).join('') : `<tr><td colspan="5" class="empty">Кандидат ещё проходит тестирование</td></tr>`;
}

window.addEventListener('beforeunload', function(e){
  if(state.session.status === 'in_progress'){
    e.preventDefault();
    e.returnValue = ''; // браузер сам покажет стандартный текст предупреждения
  }
});

// beforeunload и инициализация
(function init(){
  setRole(state.role || 'candidate');
})();