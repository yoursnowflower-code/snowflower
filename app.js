import { db } from './db.js';
import { character } from './characters.js';

// ───────────────────────── 선택지 ─────────────────────────
// 인지행동치료(CBT)의 자기관찰 기록지 항목을 바탕으로 구성:
// 선행 사건(상황) → 신체/정서 상태(배고픔·느낌) → 인지(기대) → 행동(먹은 것)
const PLACES = ['집', '회사·학교', '이동 중', '카페·식당', '편의점·마트', '기타'];
const ACTIVITIES = ['일·공부 중', '쉬는 중', 'TV·폰 보는 중', '혼자 있음', '누군가와 함께', '다툼·갈등 후', '식사 직후', '잠들기 전', '할 일 미루는 중', '음식을 봄·냄새 맡음'];
const EMOTIONS = ['스트레스', '불안', '지루함', '외로움', '슬픔·우울', '짜증·화', '피곤함', '허전함', '단 게 먹고 싶음', '죄책감', '기쁨·신남', '편안함', '보상받고 싶음'];
const EXPECTATIONS = ['기분이 나아질 것', '스트레스가 풀릴 것', '위로받을 것', '나에게 주는 보상', '지루함이 사라질 것', '에너지가 생길 것', '잠깐 잊을 수 있을 것', '배고픔 해결', '그냥 습관처럼', '조금만 먹고 멈출 수 있을 것'];
const LOC = { yes: '조절 못 했다', unsure: '잘 모르겠다', no: '조절했다' }; // 예전 기록 표시용
const SAT_MAX = 7;

// ───────────────────────── 유틸 ─────────────────────────
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const view = $('#view');

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const pad = (n) => String(n).padStart(2, '0');
function nowLocal() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
const WEEK = ['일', '월', '화', '수', '목', '금', '토'];
function fmtDate(t) {
  const d = new Date(t);
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${WEEK[d.getDay()]})`;
}
function fmtTime(t) {
  const d = new Date(t);
  const h = d.getHours();
  return `${h < 12 ? '오전' : '오후'} ${h % 12 || 12}:${pad(d.getMinutes())}`;
}
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toast.t);
  toast.t = setTimeout(() => el.classList.remove('show'), 2200);
}

// 화면을 바꿀 때 사진 objectURL을 정리한다
let objectUrls = [];
function photoUrl(blob) {
  const url = URL.createObjectURL(blob);
  objectUrls.push(url);
  return url;
}
function releaseUrls() {
  objectUrls.forEach((u) => URL.revokeObjectURL(u));
  objectUrls = [];
}

// 사진을 긴 변 1280px JPEG로 줄여 저장 공간을 아낀다
async function shrinkImage(file, max = 1280) {
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext('2d').drawImage(bmp, 0, 0, canvas.width, canvas.height);
    return await new Promise((r) => canvas.toBlob(r, 'image/jpeg', 0.82));
  } catch {
    return file;
  }
}

// ───────────────────────── 공통 UI 조각 ─────────────────────────
function chips(name, options, selected = [], multi = true) {
  const sel = new Set(selected);
  const extra = selected.filter((s) => !options.includes(s));
  return `<div class="chips" data-name="${name}" data-multi="${multi}">
    ${[...options, ...extra]
      .map((o) => `<button type="button" class="chip" aria-pressed="${sel.has(o)}" data-value="${esc(o)}">${esc(o)}</button>`)
      .join('')}
  </div>`;
}

function scale(name, value, lowLabel, highLabel) {
  const v = value ?? '';
  return `<div class="scale" data-name="${name}">
    <div class="scale-row">
      ${Array.from({ length: 11 }, (_, i) => `<button type="button" class="dot" aria-pressed="${v === i}" data-value="${i}">${i}</button>`).join('')}
    </div>
    <div class="scale-labels"><span>${lowLabel}</span><span>${highLabel}</span></div>
  </div>`;
}

function readChips(root, name) {
  return $$(`.chips[data-name="${name}"] .chip[aria-pressed="true"]`, root).map((b) => b.dataset.value);
}
function readScale(root, name) {
  const b = $(`.scale[data-name="${name}"] .dot[aria-pressed="true"]`, root);
  return b ? Number(b.dataset.value) : null;
}

function wireChoices(root) {
  root.addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (chip && root.contains(chip)) {
      const group = chip.parentElement;
      const on = chip.getAttribute('aria-pressed') === 'true';
      if (group.dataset.multi !== 'true') $$('.chip', group).forEach((c) => c.setAttribute('aria-pressed', 'false'));
      chip.setAttribute('aria-pressed', String(!on));
      return;
    }
    const cell = e.target.closest('.sat .cell');
    if (cell && root.contains(cell)) {
      const row = cell.closest('.sat');
      const n = Number(cell.dataset.n);
      const v = Number(row.dataset.value) === n ? 0 : n; // 같은 칸을 다시 누르면 비움
      row.dataset.value = v;
      $$('.cell', row).forEach((c, i) => c.classList.toggle('on', i < v));
      $('.sat-val', row).textContent = v ? `+${v}` : '';
      return;
    }
    const dot = e.target.closest('.dot');
    if (dot && root.contains(dot)) {
      const on = dot.getAttribute('aria-pressed') === 'true';
      $$('.dot', dot.parentElement).forEach((d) => d.setAttribute('aria-pressed', 'false'));
      dot.setAttribute('aria-pressed', String(!on));
    }
  });
}

// 감정·점수 → 캐릭터 표정
const EMOTION_MOOD = {
  스트레스: 'worried', 불안: 'worried', '짜증·화': 'worried', 죄책감: 'sad', '슬픔·우울': 'sad', 외로움: 'sad', 공허함: 'sad', 허전함: 'sad', '단 게 먹고 싶음': 'curious',
  지루함: 'curious', 피곤함: 'calm', '기쁨·신남': 'happy', 편안함: 'calm', '보상받고 싶음': 'curious',
};

// 먹고 난 후: 감정별 만족도 (1~7칸 채움)
const avgSat = (sat) => {
  const v = Object.values(sat || {});
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
};
const satMood = (avg) => (avg == null ? null : avg >= 5.5 ? 'happy' : avg >= 3.5 ? 'calm' : avg >= 2 ? 'worried' : 'sad');

function satRow(emotion, value) {
  return `<div class="sat" data-emotion="${esc(emotion)}" data-value="${value || 0}">
    <span class="sat-label">${esc(emotion)}</span>
    <div class="sat-cells">${Array.from({ length: SAT_MAX }, (_, i) => `<button type="button" class="cell${i < (value || 0) ? ' on' : ''}" data-n="${i + 1}" aria-label="+${i + 1}"></button>`).join('')}</div>
    <span class="sat-val">${value ? `+${value}` : ''}</span>
  </div>`;
}
function readSat(root) {
  const out = {};
  $$('.sat', root).forEach((r) => {
    const v = Number(r.dataset.value);
    if (v) out[r.dataset.emotion] = v;
  });
  return out;
}
function satBar(value) {
  return `<span class="sat-cells mini">${Array.from({ length: SAT_MAX }, (_, i) => `<i class="cell${i < value ? ' on' : ''}"></i>`).join('')}</span> <b>+${value}</b>`;
}

function wireMoods(form) {
  const update = () => {
    $$('.wcard', form).forEach((card) => {
      let mood = null;
      const v = (n) => readScale(card, n);
      if ($('.scale[data-name=craving]', card) && v('craving') != null) mood = v('craving') >= 7 ? 'worried' : v('craving') >= 4 ? 'curious' : 'calm';
      const em = readChips(card, 'emotions');
      if (em.length) mood = EMOTION_MOOD[em[em.length - 1]] || mood;
      const sat = readSat(card);
      if (Object.keys(sat).length) mood = satMood(avgSat(sat));
      if (mood && card.dataset.mood !== mood) {
        card.dataset.mood = mood;
        setMood(card, mood);
      }
    });
  };
  form.addEventListener('click', () => setTimeout(update));
  update();
}

// ───────────────────────── 카드 넘기기 ─────────────────────────
// 질문 하나를 카드 한 장에 담고, 버튼이나 좌우 스와이프로 넘긴다
function wizard(form, cards, submitLabel) {
  form.classList.add('wizard');
  form.innerHTML = `
    <div class="wiz-progress">${cards.map((_, i) => `<i data-i="${i}"></i>`).join('')}</div>
    ${cards
      .map(
        (c, i) => `<section class="wcard" data-i="${i}" hidden>
          <div class="whead">
            <div class="say-char" data-char="${c.char}">${character(c.char, c.mood)}</div>
            <h2>${c.title}</h2>
          </div>
          <div class="wbody">${c.body}</div>
        </section>`
      )
      .join('')}
    <div class="wiz-nav">
      <button type="button" class="prev">이전</button>
      <button type="button" class="next primary">다음</button>
      <button type="submit" class="primary save" hidden>${submitLabel}</button>
    </div>`;

  const secs = $$('.wcard', form);
  const dots = $$('.wiz-progress i', form);
  const prev = $('.prev', form);
  const next = $('.next', form);
  const save = $('.save', form);
  let cur = 0;

  function show(i, dir = 1) {
    cur = Math.max(0, Math.min(cards.length - 1, i));
    secs.forEach((s, k) => {
      s.hidden = k !== cur;
      s.classList.remove('in-left', 'in-right');
    });
    void secs[cur].offsetWidth;
    secs[cur].classList.add(dir > 0 ? 'in-right' : 'in-left');
    dots.forEach((d, k) => d.classList.toggle('on', k <= cur));
    prev.style.visibility = cur === 0 ? 'hidden' : 'visible';
    const last = cur === cards.length - 1;
    next.hidden = last;
    save.hidden = !last;
    cards[cur].onShow?.(secs[cur]);
    window.scrollTo({ top: 0 });
  }

  prev.addEventListener('click', () => show(cur - 1, -1));
  next.addEventListener('click', () => show(cur + 1, 1));
  dots.forEach((d) => d.addEventListener('click', () => show(+d.dataset.i, +d.dataset.i >= cur ? 1 : -1)));

  // 좌우 스와이프 (입력칸 안에서는 무시)
  let sx = null, sy = 0;
  form.addEventListener('touchstart', (e) => {
    if (e.target.closest('input, textarea')) return (sx = null);
    sx = e.touches[0].clientX;
    sy = e.touches[0].clientY;
  }, { passive: true });
  form.addEventListener('touchend', (e) => {
    if (sx == null) return;
    const dx = e.changedTouches[0].clientX - sx;
    const dy = e.changedTouches[0].clientY - sy;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) show(cur + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1);
    sx = null;
  });

  show(0);
  return { show };
}

function setMood(card, mood) {
  const holder = $('.say-char', card);
  if (holder) holder.innerHTML = character(holder.dataset.char, mood);
}

// ───────────────────────── 기록 작성/수정 ─────────────────────────
async function renderForm(id) {
  const entry = id ? await db.get(id) : null;
  if (id && !entry) return go('#/list');
  const e = entry || {};
  let photo = e.photo || null;

  setTitle(entry ? '기록 고치기' : '간식 기록');
  view.innerHTML = '<form novalidate></form>';
  const form = $('form', view);

  wizard(
    form,
    [
      {
        char: 'cookie', mood: 'happy',
        title: '언제, 무엇을 먹었나요?',
        body: `
          <input type="datetime-local" name="time" value="${esc(e.time || nowLocal())}" />
          <label class="photo-drop">
            <input type="file" accept="image/*" capture="environment" name="photo" hidden />
            <div class="photo-preview">${photo ? `<img src="${photoUrl(photo)}" alt="먹은 것 사진" />` : '<span>📷 사진 찍기</span>'}</div>
          </label>
          <button type="button" class="link remove-photo" ${photo ? '' : 'hidden'}>사진 지우기</button>
          <input type="text" name="food" placeholder="무엇을, 얼마나" value="${esc(e.food)}" />`,
      },
      {
        char: 'chips', mood: 'curious',
        title: '직전 상황',
        body: `
          <h3>장소</h3>
          ${chips('place', PLACES, e.place ? [e.place] : [], false)}
          <h3>하던 일</h3>
          ${chips('activity', ACTIVITIES, e.activity || [])}
          <textarea name="situation" rows="2" placeholder="직전에 있었던 일 (선택)">${esc(e.situation)}</textarea>`,
      },
      {
        char: 'donut', mood: 'curious',
        title: '먹고 싶음',
        body: `
          ${scale('craving', e.craving ?? e.hunger, '조금', '참기 힘들 만큼')}`,
      },
      {
        char: 'icecream', mood: 'curious',
        title: '느낌',
        body: `
          ${chips('emotions', EMOTIONS, e.emotions || [])}
          <textarea name="feelingNote" rows="2" placeholder="떠오른 생각·몸의 느낌 (선택)">${esc(e.feelingNote)}</textarea>`,
      },
      {
        char: 'choco', mood: 'curious',
        title: '먹으면 어떻게 될 것 같나요?',
        body: `
          ${chips('expectations', EXPECTATIONS, e.expectations || [])}
          <textarea name="expectationNote" rows="2" placeholder="직접 적기 (선택)">${esc(e.expectationNote)}</textarea>`,
      },
      {
        char: 'donut', mood: 'calm',
        title: '먹고 난 후',
        body: `<p class="hint center">고른 느낌이 얼마나 채워졌나요? (최대 +${SAT_MAX})</p><div class="sat-list"></div>`,
        onShow: (card) => {
          const list = $('.sat-list', card);
          const prev = { ...(e.after || {}), ...readSat(card) };
          const emos = readChips(form, 'emotions');
          list.innerHTML = emos.length
            ? emos.map((em) => satRow(em, prev[em])).join('')
            : '<p class="hint center">앞에서 고른 느낌이 없어요.</p>';
        },
      },
      {
        char: 'chips', mood: 'happy',
        title: '확인',
        body: `<div class="summary"></div>`,
        onShow: (card) => {
          const fd = new FormData(form);
          const parts = [
            ['🕐', (fd.get('time') || '').replace('T', ' ')],
            ['🍪', fd.get('food')],
            ['📍', [readChips(form, 'place')[0], ...readChips(form, 'activity')].filter(Boolean).join(', ')],
            ['💭', readChips(form, 'emotions').join(', ')],
            ['✨', readChips(form, 'expectations').join(', ')],
            ['🍃', Object.entries(readSat(form)).map(([k, v]) => `${k} +${v}`).join(', ')],
          ].filter(([, v]) => v);
          $('.summary', card).innerHTML = parts.map(([k, v]) => `<div><span>${k}</span>${esc(v)}</div>`).join('');
        },
      },
    ],
    entry ? '고친 내용 저장' : '저장하기'
  );
  wireChoices(form);

  // 답에 따라 캐릭터 표정만 바뀐다
  wireMoods(form);

  const fileInput = $('input[name=photo]', form);
  const preview = $('.photo-preview', form);
  const removeBtn = $('.remove-photo', form);
  fileInput.addEventListener('change', async () => {
    const f = fileInput.files[0];
    if (!f) return;
    preview.innerHTML = '<span>사진 처리 중…</span>';
    photo = await shrinkImage(f);
    preview.innerHTML = `<img src="${photoUrl(photo)}" alt="먹은 것 사진" />`;
    removeBtn.hidden = false;
  });
  removeBtn.addEventListener('click', () => {
    photo = null;
    fileInput.value = '';
    preview.innerHTML = '<span>📷 사진 찍기</span>';
    removeBtn.hidden = true;
  });

  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const fd = new FormData(form);
    const saved = {
      ...e,
      id: e.id || uid(),
      createdAt: e.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      time: fd.get('time') || nowLocal(),
      photo,
      food: fd.get('food').trim(),
      place: readChips(form, 'place')[0] || '',
      activity: readChips(form, 'activity'),
      situation: fd.get('situation').trim(),
      craving: readScale(form, 'craving'),
      emotions: readChips(form, 'emotions'),
      feelingNote: fd.get('feelingNote').trim(),
      expectations: readChips(form, 'expectations'),
      expectationNote: fd.get('expectationNote').trim(),
      after: readSat(form),
    };
    await db.put(saved);
    toast('저장했어요');
    go(`#/entry/${saved.id}`);
  });
}

// ───────────────────────── 상세 ─────────────────────────
function row(label, value) {
  if (value == null || value === '' || (Array.isArray(value) && !value.length)) return '';
  const v = Array.isArray(value) ? value.map((x) => `<span class="tag">${esc(x)}</span>`).join('') : esc(value);
  return `<div class="row"><dt>${label}</dt><dd>${v}</dd></div>`;
}

async function renderEntry(id) {
  const e = await db.get(id);
  if (!e) return go('#/list');
  setTitle(`${fmtDate(e.time)} ${fmtTime(e.time)}`);
  view.innerHTML = `
    ${e.photo ? `<img class="hero" src="${photoUrl(e.photo)}" alt="먹은 것 사진" />` : ''}
    <section class="card">
      <dl>
        ${row('먹은 것', e.food)}
        ${row('장소', e.place)}
        ${row('하던 일', e.activity)}
        ${row('직전 상황', e.situation)}
        ${row('먹고 싶음', (e.craving ?? e.hunger) != null ? `${e.craving ?? e.hunger} / 10` : '')}
        ${row('느낌', e.emotions)}
        ${row('생각·몸의 느낌', e.feelingNote)}
        ${row('기대', e.expectations)}
        ${row('기대 메모', e.expectationNote)}
        ${row('조절', LOC[e.loc])}
      </dl>
    </section>
    ${
      e.after && Object.keys(e.after).length
        ? `<section class="card"><h2>먹고 난 후</h2><dl>${Object.entries(e.after).map(([k, v]) => `<div class="row"><dt>${esc(k)}</dt><dd>${satBar(v)}</dd></div>`).join('')}</dl></section>`
        : ''
    }
    <div class="actions">
      <a class="button" href="#/edit/${e.id}">수정</a>
      <button type="button" class="danger" id="del">삭제</button>
    </div>`;

  $('#del').addEventListener('click', async () => {
    if (!confirm('이 기록을 삭제할까요?')) return;
    await db.delete(e.id);
    toast('삭제했어요');
    go('#/list');
  });
}

// ───────────────────────── 목록 ─────────────────────────
async function renderList() {
  const list = await db.all();
  setTitle('나의 간식 일지');
  if (!list.length) {
    view.innerHTML = `<div class="empty">${character('cookie', 'calm', 'big')}<p>아직 기록이 없어요.</p><p>간식을 먹을 때마다 기록하면<br/>나만의 패턴이 보이기 시작해요.</p><a class="button primary" href="#/new">첫 기록 남기기</a></div>`;
    return;
  }
  const byDay = new Map();
  for (const e of list) {
    const k = e.time.slice(0, 10);
    if (!byDay.has(k)) byDay.set(k, []);
    byDay.get(k).push(e);
  }
  view.innerHTML = [...byDay.values()]
    .map(
      (items) => `
      <h2 class="day">${fmtDate(items[0].time)} <small>${items.length}회</small></h2>
      <ul class="entries">
        ${items
          .map(
            (e) => `<li><a href="#/entry/${e.id}" class="entry">
              <div class="thumb">${e.photo ? `<img src="${photoUrl(e.photo)}" alt="" loading="lazy" />` : character('cookie', satMood(avgSat(e.after)) || 'calm')}</div>
              <div class="body">
                <div class="line1"><b>${fmtTime(e.time)}</b> ${esc(e.food || '')}</div>
                <div class="line2">${[e.place, ...(e.emotions || [])].filter(Boolean).slice(0, 4).map((t) => `<span class="tag">${esc(t)}</span>`).join('')}</div>
              </div>
            </a></li>`
          )
          .join('')}
      </ul>`
    )
    .join('');
}

// ───────────────────────── 패턴 ─────────────────────────
function count(list, getter) {
  const m = new Map();
  for (const e of list) for (const v of [].concat(getter(e) || [])) if (v) m.set(v, (m.get(v) || 0) + 1);
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
}

function bars(pairs, total, limit = 5) {
  if (!pairs.length) return '<p class="hint">아직 데이터가 없어요.</p>';
  const max = pairs[0][1];
  return `<ul class="bars">${pairs
    .slice(0, limit)
    .map(
      ([k, v]) => `<li><span class="label">${esc(k)}</span><span class="bar"><i style="width:${(v / max) * 100}%"></i></span><span class="val">${v}회${total ? ` · ${Math.round((v / total) * 100)}%` : ''}</span></li>`
    )
    .join('')}</ul>`;
}

let insightRange = 30;
let calMonth = null; // 'YYYY-MM'
let calDay = null;   // 'YYYY-MM-DD'

function calendar(all) {
  if (!calMonth) calMonth = nowLocal().slice(0, 7);
  const [y, m] = calMonth.split('-').map(Number);
  const first = new Date(y, m - 1, 1);
  const days = new Date(y, m, 0).getDate();
  const byDay = new Map();
  for (const e of all) {
    const k = e.time.slice(0, 10);
    if (!byDay.has(k)) byDay.set(k, []);
    byDay.get(k).push(e);
  }
  const today = nowLocal().slice(0, 10);
  let bingeDays = 0, okDays = 0;
  const cells = [];
  for (let i = 0; i < first.getDay(); i++) cells.push('<div></div>');
  for (let d = 1; d <= days; d++) {
    const k = `${calMonth}-${pad(d)}`;
    const list = byDay.get(k) || [];
    const sats = list.map((e) => avgSat(e.after)).filter((v) => v != null);
    const avg = sats.length ? sats.reduce((a, b) => a + b, 0) / sats.length : null;
    const low = avg != null && avg < 3.5;
    if (list.length) low ? bingeDays++ : okDays++;
    const cls = ['day-cell', low ? 'binge' : list.length ? 'ok' : '', k === today ? 'today' : '', k === calDay ? 'sel' : ''].join(' ');
    cells.push(`<button type="button" class="${cls}" data-day="${k}">
      <span class="d">${d}</span>
      ${list.length ? character('cookie', satMood(avg) || 'calm') : ''}
      ${list.length > 1 ? `<span class="cnt">${list.length}</span>` : ''}
    </button>`);
  }
  const sel = calDay && byDay.get(calDay);
  return `<section class="card cal">
    <div class="cal-head">
      <button type="button" class="cal-nav" data-step="-1" aria-label="이전 달">‹</button>
      <h2>${y}년 ${m}월</h2>
      <button type="button" class="cal-nav" data-step="1" aria-label="다음 달">›</button>
    </div>
    <div class="cal-grid wk">${WEEK.map((w) => `<div>${w}</div>`).join('')}</div>
    <div class="cal-grid">${cells.join('')}</div>
    <div class="cal-legend">
      <span>${character('cookie', 'worried')} 만족 낮은 날 <b>${bingeDays}</b></span>
      <span>${character('cookie', 'happy')} 그 외 <b>${okDays}</b></span>
    </div>
    ${
      calDay
        ? `<div class="cal-day">
            <h3>${fmtDate(calDay + 'T00:00')}</h3>
            ${
              sel
                ? `<ul class="entries">${sel
                    .map((e) => `<li><a href="#/entry/${e.id}" class="entry"><div class="body"><div class="line1"><b>${fmtTime(e.time)}</b> ${esc(e.food || '')}</div><div class="line2">${(e.emotions || []).slice(0, 3).map((t) => `<span class="tag">${esc(t)}</span>`).join('')}</div></div>${e.after && Object.keys(e.after).length ? `<span class="sat-avg">+${avgSat(e.after).toFixed(1)}</span>` : ''}</a></li>`)
                    .join('')}</ul>`
                : '<p class="hint">기록 없음</p>'
            }
          </div>`
        : ''
    }
  </section>`;
}

async function renderInsights() {
  setTitle('달력 · 통계');
  const all = await db.all();
  const since = new Date();
  since.setDate(since.getDate() - insightRange + 1);
  since.setHours(0, 0, 0, 0);
  const list = insightRange ? all.filter((e) => new Date(e.time) >= since) : all;
  const n = list.length;

  const hours = Array(24).fill(0);
  list.forEach((e) => hours[new Date(e.time).getHours()]++);
  const hmax = Math.max(1, ...hours);
  const peak = hours.indexOf(Math.max(...hours));

  const cravings = list.map((e) => e.craving ?? e.hunger).filter((v) => v != null);
  const avgCraving = cravings.length ? cravings.reduce((a, b) => a + b, 0) / cravings.length : null;
  const recDays = new Set(list.map((e) => e.time.slice(0, 10))).size;
  // 감정별 평균 만족도: 그 느낌이 먹어서 실제로 얼마나 채워졌는지
  const satBy = new Map();
  for (const e of list) for (const [k, v] of Object.entries(e.after || {})) {
    const t = satBy.get(k) || { sum: 0, n: 0 };
    t.sum += v; t.n++;
    satBy.set(k, t);
  }
  const satRows = [...satBy.entries()].map(([k, t]) => [k, t.sum / t.n, t.n]).sort((a, b) => a[1] - b[1]);

  view.innerHTML = `
    ${calendar(all)}

    <div class="segmented" role="tablist">
      ${[[7, '7일'], [30, '30일'], [0, '전체']]
        .map(([v, l]) => `<button type="button" data-range="${v}" aria-pressed="${insightRange === v}">${l}</button>`)
        .join('')}
    </div>

    ${
      !n
        ? '<p class="hint center">이 기간에는 기록이 없어요.</p>'
        : `
    <div class="stats">
      <div class="stat"><b>${n}</b><span>간식 횟수</span></div>
      <div class="stat"><b>${recDays}일</b><span>기록한 날</span></div>
      <div class="stat"><b>${avgCraving != null ? avgCraving.toFixed(1) : '–'}</b><span>평균 먹고 싶음 (10점)</span></div>
      <div class="stat"><b>${peak}시</b><span>가장 많이 먹는 시간</span></div>
    </div>

    <section class="card">
      <h2>시간대</h2>
      <div class="hours" aria-label="시간대별 간식 횟수">
        ${hours.map((v, h) => `<div class="h" title="${h}시 ${v}회"><i style="height:${(v / hmax) * 100}%"></i></div>`).join('')}
      </div>
      <div class="hours-axis"><span>0시</span><span>6시</span><span>12시</span><span>18시</span><span>24시</span></div>
    </section>

    <section class="card"><h2>감정</h2>${bars(count(list, (e) => e.emotions), n)}</section>
    <section class="card"><h2>먹고 난 후 만족도</h2>${
      satRows.length
        ? `<p class="hint">느낌별 평균 (최대 +${SAT_MAX})</p><ul class="sat-stats">${satRows.map(([k, avg, c]) => `<li><span class="label">${esc(k)}</span>${satBar(Math.round(avg))}<small>${c}회</small></li>`).join('')}</ul>`
        : '<p class="hint">"먹고 난 후"를 기록하면 여기에 보여요.</p>'
    }</section>
    <section class="card"><h2>상황</h2>${bars(count(list, (e) => e.activity), n)}</section>
    <section class="card"><h2>장소</h2>${bars(count(list, (e) => e.place), n)}</section>
    <section class="card"><h2>기대</h2>${bars(count(list, (e) => e.expectations), n)}</section>`
    }`;

  $$('.segmented button', view).forEach((b) =>
    b.addEventListener('click', () => {
      insightRange = Number(b.dataset.range);
      renderInsights();
    })
  );
  $$('.cal-nav', view).forEach((b) =>
    b.addEventListener('click', () => {
      const [y, m] = calMonth.split('-').map(Number);
      const d = new Date(y, m - 1 + Number(b.dataset.step), 1);
      calMonth = `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
      calDay = null;
      renderInsights();
    })
  );
  $$('.day-cell', view).forEach((b) =>
    b.addEventListener('click', () => {
      calDay = calDay === b.dataset.day ? null : b.dataset.day;
      renderInsights();
    })
  );
}

// ───────────────────────── 설정 / 내보내기 ─────────────────────────
const blobToDataUrl = (blob) =>
  new Promise((r) => {
    const fr = new FileReader();
    fr.onload = () => r(fr.result);
    fr.readAsDataURL(blob);
  });
const dataUrlToBlob = (u) => fetch(u).then((r) => r.blob());

function download(name, data, type) {
  const url = URL.createObjectURL(new Blob([data], { type }));
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function csvCell(v) {
  const s = Array.isArray(v) ? v.join(' / ') : String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

async function renderSettings() {
  setTitle('설정');
  const n = (await db.all()).length;
  view.innerHTML = `
    <section class="card">
      <h2>데이터</h2>
      <p class="hint">모든 기록과 사진은 <b>이 기기 안에만</b> 저장되고 어디로도 전송되지 않아요. (${n}개 기록)</p>
      <div class="stack">
        <button type="button" id="csv">상담용 표로 내보내기 (CSV)</button>
        <button type="button" id="json">전체 백업 (사진 포함, JSON)</button>
        <label class="button">백업 불러오기<input type="file" id="import" accept="application/json,.json" hidden /></label>
        <button type="button" class="danger" id="wipe">모든 기록 삭제</button>
      </div>
    </section>

    <section class="card about">
      <h2>이 앱은</h2>
      <p>폭식 치료에 쓰이는 인지행동치료(CBT)의 <b>자기관찰 기록</b>을 돕습니다. 먹기 직전의 상황·느낌·생각(기대)을 적으며 "먹으면 나아질 것"이라는 자동적 사고와 나만의 패턴을 알아차리도록 도와요.</p>
      <ul>
        <li>먹기 <b>직전·도중</b>에 바로 적을수록 정확해요.</li>
        <li>판단하지 말고 있는 그대로 적어요. 기록 자체가 이미 잘하고 있는 거예요.</li>
        <li>CSV를 상담 선생님과 함께 보면 도움이 돼요.</li>
      </ul>
      <p class="hint">이 앱은 전문적인 진단이나 치료를 대신하지 않아요. 폭식이 잦거나 구토·굶기 같은 보상 행동이 있거나 마음이 많이 힘들다면 전문가의 도움을 받아 주세요. (정신건강 위기상담 ☎ 109)</p>
    </section>`;

  $('#csv').addEventListener('click', async () => {
    const list = (await db.all()).reverse();
    const head = ['시간', '먹은 것', '장소', '하던 일', '직전 상황', '먹고 싶음', '느낌', '생각·몸의 느낌', '기대', '기대 메모', '먹고 난 후'];
    const rows = list.map((e) => {
      return [e.time.replace('T', ' '), e.food, e.place, e.activity, e.situation, e.craving ?? e.hunger, e.emotions, e.feelingNote, e.expectations, e.expectationNote, Object.entries(e.after || {}).map(([k, v]) => `${k} +${v}`)].map(csvCell).join(',');
    });
    download(`간식일지_${nowLocal().slice(0, 10)}.csv`, '﻿' + [head.join(','), ...rows].join('\n'), 'text/csv;charset=utf-8');
  });

  $('#json').addEventListener('click', async () => {
    const list = await db.all();
    const out = await Promise.all(list.map(async (e) => ({ ...e, photo: e.photo ? await blobToDataUrl(e.photo) : null })));
    download(`간식일지_백업_${nowLocal().slice(0, 10)}.json`, JSON.stringify({ app: 'snackjournal', version: 1, entries: out }), 'application/json');
  });

  $('#import').addEventListener('change', async (ev) => {
    const f = ev.target.files[0];
    if (!f) return;
    try {
      const data = JSON.parse(await f.text());
      const entries = data.entries || [];
      for (const e of entries) {
        if (!e.id || !e.time) continue;
        await db.put({ ...e, photo: e.photo ? await dataUrlToBlob(e.photo) : null });
      }
      toast(`${entries.length}개 기록을 불러왔어요`);
      renderSettings();
    } catch {
      toast('백업 파일을 읽지 못했어요');
    }
  });

  $('#wipe').addEventListener('click', async () => {
    if (!confirm('모든 기록과 사진을 삭제할까요? 되돌릴 수 없어요.')) return;
    await db.clear();
    toast('모두 삭제했어요');
    renderSettings();
  });
}

// ───────────────────────── 라우터 ─────────────────────────
function setTitle(t) {
  $('#title').textContent = t;
}
function go(hash) {
  if (location.hash === hash) route();
  else location.hash = hash;
}

async function route() {
  releaseUrls();
  const [, page = 'new', id] = (location.hash || '#/new').split('/');
  const tab = { new: 'new', edit: 'new', list: 'list', entry: 'list', insights: 'insights', settings: 'settings' }[page] || 'new';
  $$('.tabbar a').forEach((a) => a.classList.toggle('active', a.dataset.tab === tab));
  window.scrollTo(0, 0);
  const pages = { new: () => renderForm(), edit: () => renderForm(id), entry: () => renderEntry(id), list: renderList, insights: renderInsights, settings: renderSettings };
  await (pages[page] || pages.new)();
}

window.addEventListener('hashchange', route);
route();

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
