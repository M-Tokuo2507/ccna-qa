/* ===================================================================
   CCNA 一問一答 – app.js
   問題・学習記録はすべて localStorage（この端末内）に保存する
   =================================================================== */
'use strict';

const APP_VERSION = 'v3';

/* ---------- 章・節マスタ ---------- */
const SECTIONS = [];            // 教材順
const SECTION_MAP = {};         // 節コード → 節情報
CHAPTERS.forEach(ch => {
  ch.sections.forEach(([code, name]) => {
    const s = { code, name, chapterNo: ch.no, chapterName: ch.name, order: SECTIONS.length };
    SECTIONS.push(s);
    SECTION_MAP[code] = s;
  });
});

const TYPE_LABEL = { desc: '一問一答', ox: '○×', choice: '選択' };

/* ---------- localStorage 管理 ---------- */
const KEY_QUESTIONS = 'ccna_questions';
const KEY_RECORDS = 'ccna_records';
const KEY_SETTINGS = 'ccna_settings';

function loadJSON(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch { return fallback; }
}
function saveJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (e) {
    showDialog('保存に失敗しました（端末の空き容量やブラウザの設定を確認してください）。\n' + e.message);
    return false;
  }
}

/* 問題は2種類
   - 共通問題：questions-shared.js（Gitで配信、全端末共通、アプリでは読み取り専用）
   - 自作問題：localStorage（この端末で登録・編集）
   同じIDが両方にある場合は共通問題を優先し、自作側は表示しない（共通に取り込み済みとみなす） */
const sharedQuestions = [...new Map(
  (typeof SHARED_QUESTIONS !== 'undefined' ? SHARED_QUESTIONS : [])
    .filter(r => r && r.id)
    .map(normalizeQuestion)
    .filter(Boolean)
    .map(q => [q.id, { ...q, shared: true }])
).values()];
const SHARED_IDS = new Set(sharedQuestions.map(q => q.id));

let localQuestions = loadJSON(KEY_QUESTIONS, []);
let allQuestions = [];   // 共通＋自作（一覧・編集用）
let questions = [];      // 出題範囲の設定を反映したもの（出題・集計用）
function rebuildQuestions() {
  allQuestions = [...sharedQuestions, ...localQuestions.filter(q => !SHARED_IDS.has(q.id))];
  questions = studyScope() === 'own' ? allQuestions.filter(q => !q.shared) : allQuestions;
}
/** 出題範囲：'all'＝共通＋自作 / 'own'＝自作のみ */
function studyScope() {
  return loadJSON(KEY_SETTINGS, {}).scope === 'own' ? 'own' : 'all';
}
rebuildQuestions();

const loadRecords = () => loadJSON(KEY_RECORDS, {});
const saveRecords = r => saveJSON(KEY_RECORDS, r);
const loadSettings = () => loadJSON(KEY_SETTINGS, {});
const saveSettings = s => saveJSON(KEY_SETTINGS, s);
const saveQuestions = () => saveJSON(KEY_QUESTIONS, localQuestions);

function recordAnswer(id, isCorrect) {
  const records = loadRecords();
  if (!records[id]) records[id] = { correct: 0, wrong: 0 };
  if (isCorrect) records[id].correct++;
  else records[id].wrong++;
  saveRecords(records);
}

/* ---------- ユーティリティ ---------- */
const $ = id => document.getElementById(id);

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function newId() {
  return 'q' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function sectionLabel(code) {
  const s = SECTION_MAP[code];
  return s ? `${s.code} ${s.name}` : `${code}（目次にない節）`;
}

function sortByTextbook(list) {
  const ord = q => (SECTION_MAP[q.section] ? SECTION_MAP[q.section].order : 9999);
  return [...list].sort((a, b) => ord(a) - ord(b) || (a.createdAt || 0) - (b.createdAt || 0));
}

function isWeak(r) { return r && r.wrong > 0 && r.wrong >= r.correct; }

function getWeakQuestions() {
  const records = loadRecords();
  return questions.filter(q => isWeak(records[q.id]));
}
function getUnlearnedQuestions() {
  const records = loadRecords();
  return questions.filter(q => !records[q.id]);
}

/** 問題群の集計（学習済み数・正答率） */
function summarize(qs, records) {
  let done = 0, c = 0, t = 0;
  qs.forEach(q => {
    const r = records[q.id];
    if (r) { done++; c += r.correct; t += r.correct + r.wrong; }
  });
  return { total: qs.length, done, rate: t > 0 ? Math.round((c / t) * 100) : null };
}

let toastTimer = null;
function toast(msg) {
  const el = $('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
}

/* ---------- 画面遷移 ---------- */
let currentScreen = 'home';
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  $('screen-' + id).classList.add('active');
  currentScreen = id;
  window.scrollTo(0, 0);
  if (id === 'home') updateHome();
  if (id === 'chapters') buildChapterList();
  if (id === 'list') buildQuestionList();
  if (id === 'settings') buildSettings();
}

/* ---------- ホーム ---------- */
function updateHome() {
  const records = loadRecords();
  const sum = summarize(questions, records);
  const weak = getWeakQuestions().length;
  const unlearned = getUnlearnedQuestions().length;
  $('stat-count').textContent = questions.length;
  $('stat-done').textContent = sum.done;
  $('stat-rate').textContent = sum.rate === null ? '--%' : sum.rate + '%';
  $('stat-weak').textContent = weak;
  $('desc-weak').textContent = `間違えた問題を復習（${weak}問）`;
  $('desc-unlearned').textContent = `まだ解いていない問題（${unlearned}問）`;
  const count = parseInt(loadSettings().randomCount ?? 10, 10);
  $('desc-random').textContent = `全範囲から${count === 0 ? '全問' : count + '問'}シャッフル`;

  const empty = questions.length === 0;
  document.querySelectorAll('.mode-btn[data-mode="category"], .mode-btn[data-mode="random"]')
    .forEach(b => b.classList.toggle('is-empty', empty));
  document.querySelector('.mode-btn[data-mode="weak"]').classList.toggle('is-empty', weak === 0);
  document.querySelector('.mode-btn[data-mode="unlearned"]').classList.toggle('is-empty', unlearned === 0);

  // 共通問題があるときだけ出題範囲の切り替えを表示
  $('scope-row').style.display = sharedQuestions.length ? 'flex' : 'none';
  const scope = studyScope();
  document.querySelectorAll('#scope-switch button').forEach(b => b.classList.toggle('active', b.dataset.scope === scope));
}

function setScope(scope) {
  const s = loadSettings();
  s.scope = scope;
  saveSettings(s);
  rebuildQuestions();
  updateHome();
}

/** 出題する問題がないときのメッセージ */
function noQuestionMessage() {
  if (allQuestions.length === 0) return 'まず問題を登録してください';
  if (questions.length === 0) return '自作問題がありません（出題範囲：自作のみ）';
  return 'この範囲には問題がありません';
}

/* ---------- 章・節の選択 ---------- */
function buildChapterList() {
  const list = $('chapter-list');
  const records = loadRecords();
  list.innerHTML = '';

  const allBtn = document.createElement('button');
  allBtn.className = 'category-btn all';
  const allSum = summarize(questions, records);
  allBtn.innerHTML = `<span class="cat-name">全範囲（教材順）</span>
    <span class="cat-count">${allSum.done}/${allSum.total}</span>
    <span class="cat-rate">${allSum.rate === null ? '--' : allSum.rate + '%'}</span>`;
  allBtn.onclick = () => startQuiz(sortByTextbook(questions), '全範囲', false);
  list.appendChild(allBtn);

  CHAPTERS.forEach(ch => {
    const qs = questions.filter(q => SECTION_MAP[q.section] && SECTION_MAP[q.section].chapterNo === ch.no);
    const sum = summarize(qs, records);
    const btn = document.createElement('button');
    btn.className = 'category-btn' + (qs.length === 0 ? ' empty' : '');
    btn.innerHTML = `<span class="cat-name"><span class="cat-code">第${ch.no}章</span>${esc(ch.name)}</span>
      <span class="cat-count">${sum.done}/${sum.total}</span>
      <span class="cat-rate">${sum.rate === null ? '--' : sum.rate + '%'}</span>`;
    btn.onclick = () => openSections(ch.no);
    list.appendChild(btn);
  });
}

function openSections(chNo) {
  const ch = CHAPTERS.find(c => c.no === chNo);
  const records = loadRecords();
  $('sections-title').textContent = `第${ch.no}章 ${ch.name}`;
  const list = $('section-list');
  list.innerHTML = '';

  const chQs = questions.filter(q => SECTION_MAP[q.section] && SECTION_MAP[q.section].chapterNo === chNo);
  const allSum = summarize(chQs, records);
  const allBtn = document.createElement('button');
  allBtn.className = 'category-btn all' + (chQs.length === 0 ? ' empty' : '');
  allBtn.innerHTML = `<span class="cat-name">この章のすべて</span>
    <span class="cat-count">${allSum.done}/${allSum.total}</span>
    <span class="cat-rate">${allSum.rate === null ? '--' : allSum.rate + '%'}</span>`;
  allBtn.onclick = () => startQuiz(shuffle(chQs), `第${ch.no}章`);
  list.appendChild(allBtn);

  ch.sections.forEach(([code, name]) => {
    const qs = questions.filter(q => q.section === code);
    const sum = summarize(qs, records);
    const btn = document.createElement('button');
    btn.className = 'category-btn' + (qs.length === 0 ? ' empty' : '');
    btn.innerHTML = `<span class="cat-name"><span class="cat-code">${code}</span>${esc(name)}</span>
      <span class="cat-count">${sum.done}/${sum.total}</span>
      <span class="cat-rate">${sum.rate === null ? '--' : sum.rate + '%'}</span>`;
    btn.onclick = () => startQuiz(shuffle(qs), `${code} ${name}`);
    list.appendChild(btn);
  });
  showScreen('sections');
}

/* ---------- クイズエンジン ---------- */
let currentQuiz = [];
let currentIndex = 0;
let quizResults = [];
let quizSource = [];      // 「もう一度」用
let quizLabel = '';
let quizShuffled = true;
let answered = false;

function startQuiz(list, label, shuffled = true) {
  if (!list.length) {
    toast(noQuestionMessage());
    return;
  }
  quizSource = list.map(q => q.id);
  quizLabel = label;
  quizShuffled = shuffled;
  currentQuiz = list;
  currentIndex = 0;
  quizResults = [];
  showScreen('quiz');
  renderQuestion();
}

function renderQuestion() {
  const q = currentQuiz[currentIndex];
  const total = currentQuiz.length;
  answered = false;

  $('quiz-counter').textContent = `${currentIndex + 1} / ${total}`;
  $('progress-fill').style.width = `${((currentIndex + 1) / total) * 100}%`;
  $('quiz-section').textContent = sectionLabel(q.section);
  $('quiz-type').textContent = TYPE_LABEL[q.type];
  $('question-text').textContent = q.question;

  ['answer-ox', 'answer-choice', 'answer-desc', 'explanation-area'].forEach(id => { $(id).style.display = 'none'; });

  if (q.type === 'ox') renderOX(q);
  else if (q.type === 'choice') renderChoice(q);
  else renderDesc(q);
  window.scrollTo(0, 0);
}

function finishAnswer(q, isCorrect) {
  answered = true;
  // 編集から戻って同じ問題に再回答した場合は二重に記録しない
  if (quizResults.some(r => r.id === q.id)) return;
  recordAnswer(q.id, isCorrect);
  quizResults.push({ id: q.id, correct: isCorrect });
}

function renderOX(q) {
  const area = $('answer-ox');
  area.style.display = 'flex';
  area.querySelectorAll('.ox-btn').forEach(btn => {
    btn.className = 'ox-btn';
    btn.onclick = () => {
      if (answered) return;
      const user = btn.dataset.answer === 'true';
      const ok = user === q.answer;
      finishAnswer(q, ok);
      area.querySelectorAll('.ox-btn').forEach(b => {
        const val = b.dataset.answer === 'true';
        b.classList.add('disabled');
        if (val === user) b.classList.add(ok ? 'selected-correct' : 'selected-wrong');
        if (val === q.answer && !ok) b.classList.add('correct-answer');
      });
      showExplanation(ok, q.explanation, q.answer ? '正解は 〇（正しい）' : '正解は ×（誤り）');
    };
  });
}

function renderChoice(q) {
  const area = $('answer-choice');
  area.style.display = 'flex';
  area.innerHTML = '';
  const order = shuffle(q.choices.map((_, i) => i));
  order.forEach(i => {
    const btn = document.createElement('button');
    btn.className = 'choice-btn';
    btn.textContent = q.choices[i];
    btn.dataset.index = i;
    btn.onclick = () => {
      if (answered) return;
      const ok = i === q.answer;
      finishAnswer(q, ok);
      area.querySelectorAll('.choice-btn').forEach(b => {
        const bi = Number(b.dataset.index);
        b.classList.add('disabled');
        if (bi === i) b.classList.add(ok ? 'selected-correct' : 'selected-wrong');
        if (bi === q.answer && !ok) b.classList.add('correct-answer');
      });
      showExplanation(ok, q.explanation, '正解：' + q.choices[q.answer]);
    };
    area.appendChild(btn);
  });
}

function renderDesc(q) {
  $('answer-desc').style.display = 'flex';
  $('btn-show-answer').style.display = 'block';
  $('desc-answer-area').style.display = 'none';
  $('btn-show-answer').onclick = () => {
    $('btn-show-answer').style.display = 'none';
    $('desc-answer-area').style.display = 'block';
    $('desc-model-answer').textContent = q.answer;
    $('desc-explanation').textContent = q.explanation || '';
    $('desc-explanation-box').style.display = q.explanation ? 'block' : 'none';
  };
  document.querySelectorAll('.score-btn').forEach(btn => {
    btn.onclick = () => {
      if (answered) return;
      finishAnswer(q, btn.dataset.correct === 'true');
      goNext();
    };
  });
}

function showExplanation(isCorrect, text, correctLabel) {
  $('explanation-area').style.display = 'block';
  $('result-icon').innerHTML = isCorrect
    ? '<span class="result-correct-text">正解！</span>'
    : `<span class="result-wrong-text">不正解</span><span class="result-hint">${esc(correctLabel)}</span>`;
  $('explanation-text').textContent = text || '';
  $('btn-next').textContent = currentIndex + 1 < currentQuiz.length ? '次の問題 →' : '結果を見る';
  setTimeout(() => $('explanation-area').scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50);
}

function goNext() {
  currentIndex++;
  if (currentIndex < currentQuiz.length) renderQuestion();
  else showResult();
}

function showResult() {
  const correct = quizResults.filter(r => r.correct).length;
  const total = quizResults.length;
  $('result-correct').textContent = correct;
  $('result-total').textContent = total;
  $('result-rate').textContent = total ? `${quizLabel}　正答率 ${Math.round((correct / total) * 100)}%` : quizLabel;

  const byId = Object.fromEntries(allQuestions.map(q => [q.id, q]));
  $('result-breakdown').innerHTML = quizResults.map(r => {
    const q = byId[r.id];
    if (!q) return '';
    const t = q.question.length > 40 ? q.question.slice(0, 40) + '…' : q.question;
    return `<div class="breakdown-row"><span>${esc(t)}</span><span style="color:var(${r.correct ? '--correct' : '--wrong'})">${r.correct ? '○' : '×'}</span></div>`;
  }).join('');
  $('btn-retry-wrong').style.display = quizResults.some(r => !r.correct) ? 'block' : 'none';
  showScreen('result');
}

function quitQuiz() {
  if (quizResults.length > 0) showResult();
  else showScreen('home');
}

/* ---------- 問題の登録・編集 ---------- */
let editingId = null;
let editReturn = 'home';
let editType = 'desc';
let editOx = true;
let choiceDraft = [];
let choiceCorrect = 0;

function buildSectionSelect(sel, withAll) {
  sel.innerHTML = '';
  if (withAll) sel.add(new Option('すべての節', ''));
  CHAPTERS.forEach(ch => {
    const g = document.createElement('optgroup');
    g.label = `第${ch.no}章 ${ch.name}`;
    ch.sections.forEach(([code, name]) => g.appendChild(new Option(`${code} ${name}`, code)));
    sel.appendChild(g);
  });
}

function setEditType(type) {
  editType = type;
  document.querySelectorAll('#f-type button').forEach(b => b.classList.toggle('active', b.dataset.type === type));
  $('wrap-desc').style.display = type === 'desc' ? 'flex' : 'none';
  $('wrap-ox').style.display = type === 'ox' ? 'flex' : 'none';
  $('wrap-choice').style.display = type === 'choice' ? 'flex' : 'none';
  if (type === 'choice' && choiceDraft.length === 0) { choiceDraft = ['', '', '', '']; choiceCorrect = 0; renderChoiceInputs(); }
}

function setEditOx(val) {
  editOx = val;
  document.querySelectorAll('#f-ox button').forEach(b => b.classList.toggle('active', (b.dataset.ox === 'true') === val));
}

function renderChoiceInputs() {
  const wrap = $('choice-list');
  wrap.innerHTML = '';
  choiceDraft.forEach((text, i) => {
    const row = document.createElement('div');
    row.className = 'choice-row';
    const mark = document.createElement('button');
    mark.type = 'button';
    mark.className = 'choice-mark' + (i === choiceCorrect ? ' on' : '');
    mark.textContent = i === choiceCorrect ? '✓' : '';
    mark.setAttribute('aria-label', `選択肢${i + 1}を正解にする`);
    mark.onclick = () => { choiceCorrect = i; renderChoiceInputs(); };
    const input = document.createElement('input');
    input.type = 'text';
    input.value = text;
    input.placeholder = `選択肢${i + 1}`;
    input.oninput = () => { choiceDraft[i] = input.value; };
    const del = document.createElement('button');
    del.type = 'button';
    del.className = 'choice-del';
    del.textContent = '✕';
    del.setAttribute('aria-label', `選択肢${i + 1}を削除`);
    del.onclick = () => {
      if (choiceDraft.length <= 2) { toast('選択肢は2つ以上必要です'); return; }
      choiceDraft.splice(i, 1);
      if (choiceCorrect >= i && choiceCorrect > 0) choiceCorrect--;
      renderChoiceInputs();
    };
    row.append(mark, input, del);
    wrap.appendChild(row);
  });
  $('btn-add-choice').style.display = choiceDraft.length >= 6 ? 'none' : 'inline-block';
}

/** 登録（id=null）または編集画面を開く */
function openEdit(id, returnTo, presetSection) {
  editingId = id;
  editReturn = returnTo;
  const settings = loadSettings();
  const q = id ? allQuestions.find(x => x.id === id) : null;
  const readonly = !!(q && q.shared);

  $('edit-title').textContent = readonly ? '共通問題' : q ? '問題を編集' : '問題を登録';
  $('btn-save').textContent = q ? '保存する' : '登録する';
  $('btn-save').style.display = readonly ? 'none' : 'block';
  $('btn-delete').style.display = q && !readonly ? 'block' : 'none';
  $('edit-hint').style.display = q ? 'none' : 'block';
  $('shared-hint').style.display = readonly ? 'block' : 'none';
  $('edit-fields').disabled = readonly;

  $('f-section').value = q ? q.section : (presetSection || settings.lastSection || SECTIONS[0].code);
  $('f-question').value = q ? q.question : '';
  $('f-answer').value = q && q.type === 'desc' ? q.answer : '';
  $('f-explanation').value = q ? (q.explanation || '') : '';
  setEditOx(q && q.type === 'ox' ? q.answer : true);
  choiceDraft = q && q.type === 'choice' ? [...q.choices] : [];
  choiceCorrect = q && q.type === 'choice' ? q.answer : 0;
  if (choiceDraft.length) renderChoiceInputs();
  setEditType(q ? q.type : (settings.lastType || 'desc'));

  showScreen('edit');
}

function readEditForm() {
  const section = $('f-section').value;
  const question = $('f-question').value.trim();
  const explanation = $('f-explanation').value.trim();
  if (!question) return { error: '問題を入力してください' };
  const q = { section, type: editType, question, explanation };
  if (editType === 'desc') {
    q.answer = $('f-answer').value.trim();
    if (!q.answer) return { error: '解答を入力してください' };
  } else if (editType === 'ox') {
    q.answer = editOx;
  } else {
    const items = choiceDraft.map((t, i) => ({ t: t.trim(), i })).filter(c => c.t);
    if (items.length < 2) return { error: '選択肢を2つ以上入力してください' };
    const correct = items.findIndex(c => c.i === choiceCorrect);
    if (correct < 0) return { error: '正解の選択肢が空欄です' };
    q.choices = items.map(c => c.t);
    q.answer = correct;
  }
  return { q };
}

function saveEdit(e) {
  e.preventDefault();
  const { q, error } = readEditForm();
  if (error) { toast(error); return; }

  const settings = loadSettings();
  settings.lastSection = q.section;
  settings.lastType = q.type;
  saveSettings(settings);

  if (editingId) {
    const idx = localQuestions.findIndex(x => x.id === editingId);
    if (idx < 0) return;
    const updated = { ...localQuestions[idx], ...q, updatedAt: Date.now() };
    if (updated.type !== 'choice') delete updated.choices;
    localQuestions[idx] = updated;
    if (!saveQuestions()) return;
    rebuildQuestions();
    toast('保存しました');
    // 出題中の問題も差し替える
    const qi = currentQuiz.findIndex(x => x.id === editingId);
    if (qi >= 0) currentQuiz[qi] = updated;
    backFromEdit();
  } else {
    const item = { id: newId(), ...q, createdAt: Date.now() };
    localQuestions.push(item);
    if (!saveQuestions()) { localQuestions.pop(); return; }
    rebuildQuestions();
    const n = allQuestions.filter(x => x.section === q.section).length;
    toast(`登録しました（${q.section}：${n}問目）`);
    // 節と形式はそのままで続けて入力
    $('f-question').value = '';
    $('f-answer').value = '';
    $('f-explanation').value = '';
    if (editType === 'choice') { choiceDraft = ['', '', '', '']; choiceCorrect = 0; renderChoiceInputs(); }
    window.scrollTo(0, 0);
  }
}

function deleteEditing() {
  const id = editingId;
  showDialog('この問題を削除しますか？\n（学習記録も削除されます）', () => {
    localQuestions = localQuestions.filter(q => q.id !== id);
    saveQuestions();
    rebuildQuestions();
    const records = loadRecords();
    delete records[id];
    saveRecords(records);
    toast('削除しました');
    if (editReturn === 'quiz') {
      const qi = currentQuiz.findIndex(x => x.id === id);
      if (qi >= 0) currentQuiz.splice(qi, 1);
      quizResults = quizResults.filter(r => r.id !== id);
      if (currentIndex >= currentQuiz.length) { quizResults.length ? showResult() : showScreen('home'); return; }
    }
    backFromEdit();
  }, '削除');
}

function backFromEdit() {
  if (editReturn === 'quiz') {
    showScreen('quiz');
    renderQuestion();
  } else {
    showScreen(editReturn);
  }
}

/* ---------- 問題一覧 ---------- */
function buildQuestionList() {
  const filter = $('list-filter').value;
  const word = $('list-search').value.trim().toLowerCase();
  const records = loadRecords();

  let list = sortByTextbook(allQuestions);
  if (filter.startsWith('ch:')) {
    const no = Number(filter.slice(3));
    list = list.filter(q => SECTION_MAP[q.section] && SECTION_MAP[q.section].chapterNo === no);
  } else if (filter === 'weak') {
    list = list.filter(q => isWeak(records[q.id]));
  } else if (filter === 'local') {
    list = list.filter(q => !q.shared);
  } else if (filter === 'shared') {
    list = list.filter(q => q.shared);
  } else if (filter) {
    list = list.filter(q => q.section === filter);
  }
  if (word) {
    list = list.filter(q => [q.question, typeof q.answer === 'string' ? q.answer : '', q.explanation, ...(q.choices || [])]
      .join('\n').toLowerCase().includes(word));
  }

  $('list-count').textContent = `${list.length}問`;
  const wrap = $('question-list');
  if (allQuestions.length === 0) {
    wrap.innerHTML = '<p class="empty-msg">まだ問題がありません。<br>右上の「＋登録」から追加してください。</p>';
    return;
  }
  if (list.length === 0) {
    wrap.innerHTML = '<p class="empty-msg">該当する問題はありません。</p>';
    return;
  }
  wrap.innerHTML = list.map(q => {
    const r = records[q.id];
    const ans = q.type === 'desc' ? q.answer : q.type === 'ox' ? (q.answer ? '〇' : '×') : q.choices[q.answer];
    const stat = r ? `<span class="${isWeak(r) ? 'rate-bad' : ''}">○${r.correct} ×${r.wrong}</span>` : '<span>未学習</span>';
    return `<button class="q-item" data-id="${esc(q.id)}">
      <div class="q-meta"><span>${esc(q.section)}</span><span>${TYPE_LABEL[q.type]}</span><span class="src-${q.shared ? 'shared' : 'local'}">${q.shared ? '共通' : '自作'}</span>${stat}</div>
      <div class="q-text">${esc(q.question)}</div>
      <div class="q-answer">→ ${esc(ans)}</div>
    </button>`;
  }).join('');
}

function buildListFilter() {
  const sel = $('list-filter');
  sel.innerHTML = '';
  sel.add(new Option('すべて', ''));
  sel.add(new Option('苦手問題のみ', 'weak'));
  sel.add(new Option('自作問題のみ', 'local'));
  sel.add(new Option('共通問題のみ', 'shared'));
  CHAPTERS.forEach(ch => {
    const g = document.createElement('optgroup');
    g.label = `第${ch.no}章 ${ch.name}`;
    g.appendChild(new Option(`第${ch.no}章 すべて`, 'ch:' + ch.no));
    ch.sections.forEach(([code, name]) => g.appendChild(new Option(`${code} ${name}`, code)));
    sel.appendChild(g);
  });
}

/* ---------- 設定・バックアップ ---------- */
function applyTheme() {
  const theme = loadSettings().theme || 'auto';
  const dark = theme === 'dark' || (theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  document.querySelector('meta[name="theme-color"]').content = dark ? '#0d1823' : '#0f2a44';
}

function buildSettings() {
  const s = loadSettings();
  $('select-theme').value = s.theme || 'auto';
  $('select-count').value = String(s.randomCount ?? 10);
  $('last-backup').textContent = s.lastBackup
    ? `前回の書き出し：${new Date(s.lastBackup).toLocaleString('ja-JP')}`
    : 'まだ書き出していません。';
  const own = getOwnQuestions().length;
  $('app-version').textContent = `CCNA 一問一答 ${APP_VERSION}　/　共通 ${sharedQuestions.length}問・自作 ${own}問`;
}

/** この端末で登録した問題（共通に取り込み済みのものは除く） */
function getOwnQuestions() {
  return localQuestions.filter(q => !SHARED_IDS.has(q.id));
}

async function exportData() {
  const own = getOwnQuestions();
  if (own.length === 0 && Object.keys(loadRecords()).length === 0) { toast('書き出すデータがありません'); return; }
  // 共通問題はGitにあるので書き出さない（学習記録は共通問題の分も含める）
  const data = {
    app: 'ccna-qa',
    version: 1,
    exportedAt: new Date().toISOString(),
    questions: own,
    records: loadRecords()
  };
  const d = new Date();
  const pad = n => String(n).padStart(2, '0');
  const name = `ccna-questions-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}.json`;
  const blob = new Blob([JSON.stringify(data, null, 1)], { type: 'application/json' });

  try {
    const file = new File([blob], name, { type: 'application/json' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: name });
      markBackedUp();
      return;
    }
  } catch (e) {
    if (e.name === 'AbortError') return; // 共有シートをキャンセル
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  markBackedUp();
}

function markBackedUp() {
  const s = loadSettings();
  s.lastBackup = Date.now();
  saveSettings(s);
  buildSettings();
  toast('書き出しました');
}

/** 読み込みデータを検証して問題形式に揃える。不正な行は null */
function normalizeQuestion(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const section = String(raw.section ?? '').trim();
  const question = String(raw.question ?? '').trim();
  const type = ['desc', 'ox', 'choice'].includes(raw.type) ? raw.type : 'desc';
  if (!SECTION_MAP[section] || !question) return null;
  const q = {
    id: raw.id ? String(raw.id) : newId(),
    section, type, question,
    explanation: String(raw.explanation ?? '').trim(),
    createdAt: Number(raw.createdAt) || Date.now()
  };
  if (raw.updatedAt) q.updatedAt = Number(raw.updatedAt);
  if (type === 'desc') {
    q.answer = String(raw.answer ?? '').trim();
    if (!q.answer) return null;
  } else if (type === 'ox') {
    q.answer = raw.answer === true || raw.answer === 'true' || raw.answer === '○' || raw.answer === '〇';
  } else {
    if (!Array.isArray(raw.choices)) return null;
    q.choices = raw.choices.map(c => String(c).trim()).filter(Boolean);
    q.answer = Number(raw.answer);
    if (q.choices.length < 2 || !(q.answer >= 0 && q.answer < q.choices.length)) return null;
  }
  return q;
}

function importData(file) {
  const reader = new FileReader();
  reader.onload = () => {
    let data;
    try { data = JSON.parse(reader.result); } catch { showDialog('JSONとして読み込めませんでした。'); return; }
    const rawList = Array.isArray(data) ? data : (data && Array.isArray(data.questions) ? data.questions : null);
    if (!rawList) { showDialog('問題データが見つかりませんでした。'); return; }

    const normalized = rawList.map(normalizeQuestion).filter(Boolean);
    const skipped = rawList.length - normalized.length;
    const valid = normalized.filter(q => !SHARED_IDS.has(q.id));
    const alreadyShared = normalized.length - valid.length;
    const existing = new Set(localQuestions.map(q => q.id));
    const updates = valid.filter(q => existing.has(q.id)).length;
    const adds = valid.length - updates;
    const importRecords = data && !Array.isArray(data) && data.records && typeof data.records === 'object' ? data.records : null;

    if (valid.length === 0 && !importRecords) {
      showDialog(`読み込める問題がありませんでした。${alreadyShared ? `\n（${alreadyShared}問は共通問題に取り込み済み）` : ''}${skipped ? `\n（${skipped}件は形式不正）` : ''}`);
      return;
    }

    let msg = `${valid.length}問を読み込みます。\n・新規 ${adds}問\n・上書き ${updates}問（同じIDの問題）`;
    if (alreadyShared) msg += `\n・対象外 ${alreadyShared}問（共通問題に取り込み済み）`;
    if (skipped) msg += `\n・スキップ ${skipped}件（節コード不明・必須項目なし）`;
    if (importRecords) msg += '\n学習記録も読み込みます。';
    showDialog(msg, () => {
      const map = new Map(localQuestions.map(q => [q.id, q]));
      valid.forEach(q => map.set(q.id, q));
      localQuestions = [...map.values()];
      saveQuestions();
      rebuildQuestions();
      const known = new Set(allQuestions.map(q => q.id));
      if (importRecords) {
        const records = loadRecords();
        Object.entries(importRecords).forEach(([id, r]) => {
          if (known.has(id) && r && Number.isFinite(r.correct) && Number.isFinite(r.wrong)) {
            records[id] = { correct: r.correct, wrong: r.wrong };
          }
        });
        saveRecords(records);
      }
      buildSettings();
      toast('読み込みました');
    }, '読み込む');
  };
  reader.readAsText(file);
}

/* ---------- ダイアログ ---------- */
function showDialog(msg, onConfirm, confirmLabel = '実行') {
  $('dialog-msg').textContent = msg;
  $('dialog-overlay').style.display = 'flex';
  const confirmBtn = $('dialog-confirm');
  const cancelBtn = $('dialog-cancel');
  if (onConfirm) {
    confirmBtn.textContent = confirmLabel;
    confirmBtn.style.display = 'block';
    cancelBtn.textContent = 'キャンセル';
    confirmBtn.onclick = () => { $('dialog-overlay').style.display = 'none'; onConfirm(); };
  } else {
    confirmBtn.style.display = 'none';
    cancelBtn.textContent = 'OK';
  }
  cancelBtn.onclick = () => { $('dialog-overlay').style.display = 'none'; };
}

/* ---------- イベント登録 ---------- */
document.addEventListener('DOMContentLoaded', () => {
  applyTheme();
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);
  buildSectionSelect($('f-section'), false);
  buildListFilter();

  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const mode = btn.dataset.mode;
      if (mode === 'add') return openEdit(null, 'home');
      if (mode === 'list') return showScreen('list');
      if (questions.length === 0) return toast(noQuestionMessage());
      if (mode === 'category') return showScreen('chapters');
      if (mode === 'weak') {
        const weak = getWeakQuestions();
        if (!weak.length) return toast('苦手問題はありません');
        return startQuiz(shuffle(weak), '苦手問題');
      }
      if (mode === 'unlearned') {
        const un = getUnlearnedQuestions();
        if (!un.length) return toast('未学習の問題はありません');
        return startQuiz(sortByTextbook(un), '未学習', false);
      }
      if (mode === 'random') {
        const count = parseInt(loadSettings().randomCount ?? 10, 10);
        const all = shuffle(questions);
        return startQuiz(count === 0 ? all : all.slice(0, count), 'ランダム');
      }
    });
  });

  document.querySelectorAll('[data-target]').forEach(btn => {
    btn.addEventListener('click', () => showScreen(btn.dataset.target));
  });
  $('btn-settings').onclick = () => showScreen('settings');
  document.querySelectorAll('#scope-switch button').forEach(b => { b.onclick = () => setScope(b.dataset.scope); });

  // クイズ
  $('btn-quit').onclick = quitQuiz;
  $('btn-next').onclick = goNext;
  $('btn-quiz-edit').onclick = () => {
    const q = currentQuiz[currentIndex];
    if (q.shared) { toast('共通問題はPC側で修正します'); return; }
    openEdit(q.id, 'quiz');
  };
  $('btn-retry').onclick = () => {
    const byId = Object.fromEntries(allQuestions.map(q => [q.id, q]));
    const list = quizSource.map(id => byId[id]).filter(Boolean);
    startQuiz(quizShuffled ? shuffle(list) : list, quizLabel, quizShuffled);
  };
  $('btn-retry-wrong').onclick = () => {
    const byId = Object.fromEntries(allQuestions.map(q => [q.id, q]));
    const list = quizResults.filter(r => !r.correct).map(r => byId[r.id]).filter(Boolean);
    startQuiz(shuffle(list), quizLabel + '（間違えた問題）');
  };

  // 登録・編集
  $('edit-form').addEventListener('submit', saveEdit);
  $('btn-edit-back').onclick = backFromEdit;
  $('btn-delete').onclick = deleteEditing;
  document.querySelectorAll('#f-type button').forEach(b => { b.onclick = () => setEditType(b.dataset.type); });
  document.querySelectorAll('#f-ox button').forEach(b => { b.onclick = () => setEditOx(b.dataset.ox === 'true'); });
  $('btn-add-choice').onclick = () => { choiceDraft.push(''); renderChoiceInputs(); };

  // 一覧
  $('list-filter').onchange = buildQuestionList;
  $('list-search').oninput = buildQuestionList;
  $('btn-list-add').onclick = () => {
    const f = $('list-filter').value;
    openEdit(null, 'list', SECTION_MAP[f] ? f : null);
  };
  $('question-list').addEventListener('click', e => {
    const item = e.target.closest('.q-item');
    if (item) openEdit(item.dataset.id, 'list');
  });

  // 設定
  $('select-theme').onchange = e => { const s = loadSettings(); s.theme = e.target.value; saveSettings(s); applyTheme(); };
  $('select-count').onchange = e => { const s = loadSettings(); s.randomCount = parseInt(e.target.value, 10); saveSettings(s); };
  $('btn-export').onclick = exportData;
  $('btn-import').onclick = () => $('import-file').click();
  $('import-file').onchange = e => {
    const f = e.target.files[0];
    if (f) importData(f);
    e.target.value = '';
  };
  $('btn-reset-records').onclick = () => showDialog('すべての学習記録（正解・不正解の回数）をリセットしますか？\n問題は残ります。', () => {
    saveRecords({});
    toast('学習記録をリセットしました');
  }, 'リセット');
  $('btn-delete-all').onclick = () => {
    const own = getOwnQuestions();
    if (!own.length) { toast('自作問題はありません'); return; }
    showDialog(`この端末で登録した${own.length}問と、その学習記録を削除しますか？\n（共通問題は消えません）\n元に戻せません。先に書き出しておくことをおすすめします。`, () => {
      const records = loadRecords();
      localQuestions.forEach(q => { if (!SHARED_IDS.has(q.id)) delete records[q.id]; });
      saveRecords(records);
      localQuestions = [];
      saveQuestions();
      rebuildQuestions();
      buildSettings();
      toast('自作問題を削除しました');
    }, '削除');
  };

  updateHome();

  // ストレージを消されにくくする（対応ブラウザのみ）
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
});

/* ---------- Service Worker 登録 ---------- */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(err => console.log('SW registration failed:', err));
  });
}
