// 간식 친구들: 손그림 느낌의 SVG 캐릭터
// 판단하지 않고 솔직하게 같이 돌아봐 주는 친구들이라, 맛있어 보이기보다 표정과 말투가 중심이 되도록 단순하게 그린다.
const INK = '#4b3a4f';
const BLUSH = '#ff9fb8';

// 표정: 얼굴 중심(cx, cy) 기준으로 그린다
const FACES = {
  happy: (x, y) => `
    <path d="M${x - 13} ${y - 2} q4 -6 8 0 M${x + 5} ${y - 2} q4 -6 8 0" />
    <path d="M${x - 7} ${y + 7} q7 8 14 0" />`,
  curious: (x, y) => `
    <circle cx="${x - 9}" cy="${y - 2}" r="3.6" fill="${INK}" stroke="none"/>
    <circle cx="${x + 9}" cy="${y - 2}" r="3.6" fill="${INK}" stroke="none"/>
    <path d="M${x + 4} ${y - 12} l9 -3" />
    <ellipse cx="${x}" cy="${y + 9}" rx="3.5" ry="4" fill="${INK}" stroke="none"/>`,
  worried: (x, y) => `
    <circle cx="${x - 9}" cy="${y}" r="3.4" fill="${INK}" stroke="none"/>
    <circle cx="${x + 9}" cy="${y}" r="3.4" fill="${INK}" stroke="none"/>
    <path d="M${x - 14} ${y - 9} l8 -3 M${x + 14} ${y - 9} l-8 -3" />
    <path d="M${x - 7} ${y + 10} q3.5 -4 7 0 q3.5 4 7 0" />`,
  sad: (x, y) => `
    <circle cx="${x - 9}" cy="${y - 1}" r="3.4" fill="${INK}" stroke="none"/>
    <circle cx="${x + 9}" cy="${y - 1}" r="3.4" fill="${INK}" stroke="none"/>
    <path d="M${x - 6} ${y + 11} q6 -6 12 0" />
    <path d="M${x + 13} ${y + 3} q-2 5 0 6 q2 -1 0 -6z" fill="#9fd6f5" stroke-width="2"/>`,
  calm: (x, y) => `
    <path d="M${x - 13} ${y - 1} q4 4 8 0 M${x + 5} ${y - 1} q4 4 8 0" />
    <path d="M${x - 5} ${y + 8} q5 4 10 0" />`,
};

const blush = (x, y) => `
  <ellipse cx="${x - 17}" cy="${y + 5}" rx="5" ry="3" fill="${BLUSH}" stroke="none" opacity=".8"/>
  <ellipse cx="${x + 17}" cy="${y + 5}" rx="5" ry="3" fill="${BLUSH}" stroke="none" opacity=".8"/>`;

// 몸통 + 얼굴 위치
const BODIES = {
  cookie: {
    name: '쿠키',
    face: [60, 62],
    body: `
      <path d="M60 16 C88 14 106 36 104 62 C102 90 82 106 58 104 C32 102 14 84 16 58 C18 34 34 18 60 16Z" fill="#f4c98f"/>
      <ellipse cx="38" cy="40" rx="5" ry="4" fill="#8a5a44" stroke="none"/>
      <ellipse cx="82" cy="36" rx="4" ry="3.5" fill="#8a5a44" stroke="none"/>
      <ellipse cx="86" cy="80" rx="5" ry="4" fill="#8a5a44" stroke="none"/>
      <ellipse cx="34" cy="78" rx="4" ry="3" fill="#8a5a44" stroke="none"/>`,
  },
  chips: {
    name: '칩칩이',
    face: [60, 66],
    body: `
      <path d="M26 22 l8 -6 l8 6 l8 -6 l8 6 l8 -6 l8 6 l8 -6 l8 6 C98 50 100 80 94 104 L26 104 C20 80 22 50 26 22Z" fill="#9fd6f5"/>
      <path d="M28 86 C50 80 70 92 92 86 L94 104 L26 104Z" fill="#ffb3c7"/>`,
  },
  donut: {
    name: '도넛',
    face: [60, 70],
    body: `
      <circle cx="60" cy="62" r="44" fill="#f2d3a4"/>
      <path d="M22 56 C24 30 46 18 60 18 C78 18 98 30 98 56 C94 64 90 58 86 64 C82 70 78 62 72 66 C64 70 58 62 50 66 C42 70 38 62 32 66 C26 68 24 62 22 56Z" fill="#ffb3c7"/>
      <ellipse cx="60" cy="40" rx="9" ry="6" fill="#fff7fa"/>
      <path d="M36 40 l5 -3 M80 34 l4 4 M70 52 l5 -1 M44 54 l3 4" stroke="#4fa8dc" stroke-width="3"/>`,
  },
  icecream: {
    name: '아이스',
    face: [60, 50],
    body: `
      <path d="M38 64 L60 112 L82 64Z" fill="#f2d3a4"/>
      <path d="M46 72 l22 22 M58 66 l16 16 M74 72 l-22 22 M62 66 l-16 16" stroke-width="2.4"/>
      <path d="M30 60 C20 40 34 16 60 16 C86 16 100 40 90 60 C86 68 78 62 72 68 C66 72 60 64 54 68 C46 72 42 64 36 68 C32 68 30 64 30 60Z" fill="#ffb3c7"/>`,
  },
  choco: {
    name: '초코바',
    face: [60, 46],
    body: `
      <rect x="32" y="12" width="56" height="96" rx="12" fill="#a77560"/>
      <path d="M32 72 L88 66 L88 96 C88 103 83 108 76 108 L44 108 C37 108 32 103 32 96Z" fill="#9fd6f5"/>
      <path d="M40 86 h40" stroke="#fff7fa" stroke-width="3"/>`,
  },
};

export const CHARACTER_IDS = Object.keys(BODIES);

export function character(id = 'cookie', mood = 'happy', cls = '') {
  const c = BODIES[id] || BODIES.cookie;
  const [x, y] = c.face;
  return `<svg class="char ${cls}" viewBox="0 0 120 120" role="img" aria-label="${c.name}">
    <g filter="url(#wobble)" stroke="${INK}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" fill="none">
      ${c.body}
      ${blush(x, y)}
      ${(FACES[mood] || FACES.happy)(x, y)}
    </g>
  </svg>`;
}

export function say(id, mood, text) {
  return `<div class="say">
    <div class="say-char" data-char="${id}">${character(id, mood)}</div>
    <div class="bubble">${text}</div>
  </div>`;
}

export function gang(mood = 'happy') {
  return `<div class="gang">${['chips', 'cookie', 'icecream', 'donut', 'choco'].map((id, i) => character(id, i % 2 ? 'calm' : mood)).join('')}</div>`;
}

// 달력 캐릭터: 폭식이(폭식한 날) / 건강이(폭식 없는 날)
// 같은 쿠키 몸통 크기에, 작은 팔다리와 소품으로 성격을 보여준다.
const CHIP = '#7a4a32';
const PINK = '#ff8fab';

// 폭식이: 한입 베어먹힌 통통 쿠키, 혀 날름, 입가 부스러기, 두 손으로 배를 감싸 쥠
const POKSIK = `
  <path d="M12 39 q-1 2.5 2.5 2.5 M28 39 q1 2.5 -2.5 2.5" fill="none" stroke="${INK}" stroke-width="2.4" stroke-linecap="round"/>
  <path d="M21 4 C10 4 2.5 12 2.5 22 C2.5 32.5 10.5 39.5 21 39.5 C31.5 39.5 38.5 32 38.5 22 C38.5 19.5 38 17.5 37.3 15.6 a3.2 3.2 0 0 1 -3.9 -2.6 a3.2 3.2 0 0 1 -3.2 -3.7 a3.2 3.2 0 0 1 -3 -3.8 C25.5 4.5 23.4 4 21 4Z" fill="#e9b06a" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/>
  <circle cx="11" cy="12" r="1.6" fill="${CHIP}"/><circle cx="6.5" cy="27" r="1.4" fill="${CHIP}"/><circle cx="34" cy="28" r="1.5" fill="${CHIP}"/>
  <path d="M10.5 17.5 l4.2 2.1 l-4.2 2.1 M27.5 17.5 l-4.2 2.1 l4.2 2.1" fill="none" stroke="${INK}" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"/>
  <ellipse cx="9" cy="24.5" rx="3.4" ry="2.3" fill="${PINK}"/><ellipse cx="29" cy="24.5" rx="3.4" ry="2.3" fill="${PINK}"/>
  <path d="M14.5 24 q4.5 4.5 9 0" fill="none" stroke="${INK}" stroke-width="2.1" stroke-linecap="round"/>
  <path d="M19.4 26 q2.4 .4 2.5 3 q-2.5 1.2 -3.8 -1.3z" fill="#ff6f91" stroke="${INK}" stroke-width="1.2"/>
  <circle cx="13" cy="29" r="1" fill="${CHIP}"/><circle cx="25.5" cy="29.5" r=".9" fill="${CHIP}"/><circle cx="23" cy="31.2" r=".7" fill="${CHIP}"/>
  <path d="M8.5 31 q4 4.5 8 2.6 M29.5 31 q-4 4.5 -8 2.6" fill="none" stroke="${INK}" stroke-width="2.3" stroke-linecap="round"/>`;

// 건강이: 동그란 쿠키, 하늘색 운동 머리띠, 두 팔 번쩍 화이팅, 운동화
const GEONGANG = `
  <path d="M15 38.5 l-1.5 2.5 h-3 M25 38.5 l1.5 2.5 h3" fill="none" stroke="${INK}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M6 20 q-4 -3 -3.5 -8 M34 20 q4 -3 3.5 -8" fill="none" stroke="${INK}" stroke-width="2.4" stroke-linecap="round"/>
  <circle cx="2.6" cy="10.6" r="2" fill="#f4c98f" stroke="${INK}" stroke-width="1.8"/><circle cx="37.4" cy="10.6" r="2" fill="#f4c98f" stroke="${INK}" stroke-width="1.8"/>
  <circle cx="20" cy="22" r="16.5" fill="#f4c98f" stroke="${INK}" stroke-width="2.4"/>
  <circle cx="10" cy="28" r="1.5" fill="${CHIP}"/><circle cx="30.5" cy="29" r="1.5" fill="${CHIP}"/><circle cx="20" cy="33.5" r="1.2" fill="${CHIP}"/>
  <path d="M4.2 15 Q20 9 35.8 15 L35.6 19.6 Q20 13.8 4.4 19.6 Z" fill="#4fa8dc" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>
  <path d="M5 17.3 Q20 11.6 35 17.3" fill="none" stroke="#fff" stroke-width="1.3"/>
  <circle cx="15" cy="23" r="1.9" fill="${INK}"/><circle cx="25" cy="23" r="1.9" fill="${INK}"/>
  <path d="M14.5 27 q5.5 5.5 11 0" fill="none" stroke="${INK}" stroke-width="2.2" stroke-linecap="round"/>
  <ellipse cx="10.5" cy="26" rx="2.4" ry="1.6" fill="#ff9fb8"/><ellipse cx="29.5" cy="26" rx="2.4" ry="1.6" fill="#ff9fb8"/>
  <path d="M31.8 22.5 q-1.6 2.6 0 3.4 q1.6 -.8 0 -3.4z" fill="#9fd6f5" stroke="${INK}" stroke-width="1"/>`;

export const DAY_CHARS = { binge: { name: '폭식이', svg: POKSIK }, ok: { name: '건강이', svg: GEONGANG } };

export function dayFace(binge) {
  const c = binge ? DAY_CHARS.binge : DAY_CHARS.ok;
  return `<svg class="dayface" viewBox="0 0 40 43" role="img" aria-label="${c.name}">${c.svg}</svg>`;
}
