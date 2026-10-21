import * as db from './db.js';

const $view = document.getElementById('view');
const $title = document.getElementById('title');
const $back = document.getElementById('back');
const $actions = document.getElementById('actions');
const $tabbar = document.getElementById('tabbar');

const esc = s => String(s ?? '').replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => crypto.randomUUID?.() ?? Date.now().toString(36) + Math.random().toString(36).slice(2);
const byName = (a, b) => a.name.localeCompare(b.name, 'ja', { numeric: true });

// ---------- アイコン ----------
const P = d => `<path d="${d}"/>`;
const C = (cx, cy, r) => `<circle cx="${cx}" cy="${cy}" r="${r}"/>`;
const ICONS = {
  home: P('M3.5 10.5 12 4l8.5 6.5V19a1.5 1.5 0 0 1-1.5 1.5h-4v-6h-6v6H5A1.5 1.5 0 0 1 3.5 19z'),
  search: C(11, 11, 6.5) + P('m20 20-4.2-4.2'),
  scan: P('M4 8.5V6a2 2 0 0 1 2-2h2.5M15.5 4H18a2 2 0 0 1 2 2v2.5M20 15.5V18a2 2 0 0 1-2 2h-2.5M8.5 20H6a2 2 0 0 1-2-2v-2.5M7.5 12h9'),
  settings: P('M4 7h9M17 7h3M4 17h3M11 17h9') + C(15, 7, 2) + C(9, 17, 2),
  plus: P('M12 5v14M5 12h14'),
  minus: P('M5 12h14'),
  chevR: P('m9.5 6 6 6-6 6'),
  chevL: P('m15 5-7 7 7 7'),
  check: P('m5 12.5 4.5 4.5L19 7.5'),
  x: P('M6.5 6.5l11 11M17.5 6.5l-11 11'),
  qr: P('M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2.5v2.5H14zM17.5 17.5H20V20h-2.5zM14 20h1M20 14v1'),
  edit: P('M4 20h4L18.5 9.5a2.1 2.1 0 0 0-3-3L5 17v3zM13.5 8.5l2 2'),
  trash: P('M4 7h16M10 11v6M14 11v6M6 7l1 12.5A1.5 1.5 0 0 0 8.5 21h7a1.5 1.5 0 0 0 1.5-1.5L18 7M9 7V4.5A.5.5 0 0 1 9.5 4h5a.5.5 0 0 1 .5.5V7'),
  camera: P('M4 8.5A1.5 1.5 0 0 1 5.5 7h2.3l1.7-2.5h5l1.7 2.5h2.3A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5z') + C(12, 13, 3.5),
  image: `<rect x="3.5" y="4.5" width="17" height="15" rx="2.5"/>` + C(9, 9.5, 1.5) + P('m4 17 4.5-4.5 3.5 3.5 2.5-2.5 5.5 5.5'),
  tag: P('M3.5 12V5a1.5 1.5 0 0 1 1.5-1.5h7L20.5 12 12 20.5z') + C(8, 8, 1.3),
  pin: P('M12 21s-6.5-5.8-6.5-11.5a6.5 6.5 0 0 1 13 0C18.5 15.2 12 21 12 21z') + C(12, 9.5, 2.3),
  note: P('M6 3.5h9l4 4V19a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 19V5a1.5 1.5 0 0 1 1-1.5zM9 12h6M9 16h4'),
  clock: C(12, 12, 8.5) + P('M12 7.5V12l3 2'),
  download: P('M12 4v11m-4.5-4.5L12 15l4.5-4.5M5 20h14'),
  upload: P('M12 15V4M7.5 8.5 12 4l4.5 4.5M5 20h14'),
  print: P('M7 9V4h10v5M7 17H5.5A1.5 1.5 0 0 1 4 15.5v-5A1.5 1.5 0 0 1 5.5 9h13a1.5 1.5 0 0 1 1.5 1.5v5a1.5 1.5 0 0 1-1.5 1.5H17M7 14h10v6H7z'),
  grid: P('M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z'),
  list: P('M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01'),
  shield: P('M12 3.5 5 6.5v5.5c0 4.2 2.9 7.2 7 8.5 4.1-1.3 7-4.3 7-8.5V6.5z') + P('m9 12 2 2 4-4'),
  info: C(12, 12, 8.5) + P('M12 11v5M12 8h.01'),
  // 場所用
  box: P('M20.5 7.5 12 3 3.5 7.5v9L12 21l8.5-4.5zM3.5 7.5 12 12l8.5-4.5M12 12v9'),
  room: P('M6 20.5V4.5A1 1 0 0 1 7 3.5h10a1 1 0 0 1 1 1v16M3.5 20.5h17M14.5 12h.01'),
  shelf: P('M4.5 3.5v17M19.5 3.5v17M4.5 9h15M4.5 14.5h15M4.5 20h15M7.5 9V6.5h3V9M13 14.5v-3h2.5v3'),
  drawer: `<rect x="3.5" y="4" width="17" height="16" rx="2"/>` + P('M3.5 12h17M10 8h4M10 16h4'),
  closet: P('M12 7.5a2 2 0 1 0-2-2M12 7.5v1.5l-8.5 6.5a1 1 0 0 0 .6 1.8h15.8a1 1 0 0 0 .6-1.8L12 9'),
  bag: P('M5 8h14l-1 11.5a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 6 19.5zM9 8V6.5a3 3 0 0 1 6 0V8'),
  fridge: `<rect x="6" y="3" width="12" height="18" rx="2"/>` + P('M6 10h12M9 6v2M9 13v3'),
  car: P('M4 16.5v-3.5l1.8-4.6A1.5 1.5 0 0 1 7.2 7.5h9.6a1.5 1.5 0 0 1 1.4.9L20 13v3.5zM4 13h16') + C(8, 16.5, 1.8) + C(16, 16.5, 1.8),
};
const ic = (name, cls = '') => `<svg class="ic ${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] ?? ICONS.box}</svg>`;
const PLACE_ICONS = ['room', 'shelf', 'drawer', 'box', 'closet', 'bag', 'fridge', 'car'];
const HUES = ['#6366f1', '#0ea5e9', '#14b8a6', '#22c55e', '#f59e0b', '#f97316', '#f43f5e', '#a855f7'];
const hue = s => HUES[[...String(s)].reduce((h, c) => (h * 31 + c.codePointAt(0)) >>> 0, 7) % HUES.length];
const locColor = l => l.color ?? hue(l.id);

function toast(msg) {
  const t = document.getElementById('toast');
  t.innerHTML = ic('check') + esc(msg);
  t.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => t.classList.remove('show'), 1800);
}

const pref = {
  get: (k, d) => { try { return localStorage.getItem(k) ?? d; } catch { return d; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* 保存できなくても動作は続ける */ } },
};

// ---------- データ ----------
let L = []; // 場所
let I = []; // アイテム
async function load() {
  [L, I] = await Promise.all([db.getAll('locations'), db.getAll('items')]);
}
const loc = id => L.find(l => l.id === id);
const item = id => I.find(i => i.id === id);
const childLocs = pid => L.filter(l => (l.parentId ?? null) === (pid ?? null)).sort(byName);
const itemsIn = lid => I.filter(i => (i.locationId ?? null) === (lid ?? null)).sort(byName);
function locPath(id) {
  const out = [];
  for (let l = loc(id); l && out.length < 50; l = loc(l.parentId)) out.unshift(l);
  return out;
}
const pathText = id => locPath(id).map(l => l.name).join(' › ') || '場所未設定';
function descendantIds(id) {
  const ids = [id];
  for (const c of childLocs(id)) ids.push(...descendantIds(c.id));
  return ids;
}
function itemCount(id) {
  const ids = new Set(descendantIds(id));
  return I.filter(i => ids.has(i.locationId)).length;
}
const allTags = () => [...new Set(I.flatMap(i => i.tags ?? []))].sort((a, b) => a.localeCompare(b, 'ja'));

// 選択肢用：階層順に並べた場所一覧
function locOptions(selected, exclude = new Set()) {
  const out = [];
  const walk = (pid, depth) => {
    for (const l of childLocs(pid)) {
      if (exclude.has(l.id)) continue;
      out.push(`<option value="${l.id}" ${l.id === selected ? 'selected' : ''}>${'　'.repeat(depth)}${esc(l.name)}</option>`);
      walk(l.id, depth + 1);
    }
  };
  walk(null, 0);
  return out.join('');
}

// ---------- 写真 ----------
const photoUrls = new Map();
async function photoUrl(id) {
  if (!photoUrls.has(id)) {
    const p = await db.get('photos', id);
    photoUrls.set(id, p ? URL.createObjectURL(p.blob) : '');
  }
  return photoUrls.get(id);
}
function forgetPhoto(id) {
  const u = photoUrls.get(id);
  if (u) URL.revokeObjectURL(u);
  photoUrls.delete(id);
}
// data-photo 属性を持つ img に画像を差し込む
function hydratePhotos(root = $view) {
  root.querySelectorAll('img[data-photo]').forEach(async img => {
    img.src = await photoUrl(img.dataset.photo);
  });
}
// 端末の写真は大きいので長辺 1280px の JPEG に縮小して保存する
async function shrink(file, max = 1280) {
  const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' }).catch(() => createImageBitmap(file));
  const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * k);
  c.height = Math.round(bmp.height * k);
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
  bmp.close?.();
  return new Promise(r => c.toBlob(r, 'image/jpeg', 0.82));
}

// ---------- 共通パーツ ----------
const initial = name => esc([...(name || '?')][0]);
const media = it => it.photos?.length
  ? `<img data-photo="${it.photos[0]}" alt="" loading="lazy">`
  : `<span class="ph-tile" style="--c:${hue(it.name)}">${initial(it.name)}</span>`;
const tagText = it => (it.tags ?? []).map(t => '#' + t).join(' ');

function itemCard(it, showPath = false) {
  const q = it.quantity ?? 1;
  const sub = showPath ? pathText(it.locationId) : tagText(it) || pathText(it.locationId);
  return `<a class="item-card" href="#/item/${it.id}">
    <span class="card-media">${media(it)}<span class="qty-badge ${q === 0 ? 'zero' : ''}">×${q}</span></span>
    <span class="card-body"><span class="card-name">${esc(it.name)}</span><span class="card-sub">${esc(sub)}</span></span>
  </a>`;
}
function itemRow(it, showPath = false) {
  const sub = [showPath ? pathText(it.locationId) : '', tagText(it)].filter(Boolean).join('　');
  return `<a class="row" href="#/item/${it.id}">
    <span class="row-media">${media(it)}</span>
    <span class="row-main"><span class="row-title">${esc(it.name)}</span>${sub ? `<span class="row-sub">${esc(sub)}</span>` : ''}</span>
    <span class="row-qty">×${it.quantity ?? 1}</span>${ic('chevR', 'row-chev')}
  </a>`;
}
function placeCard(l) {
  const kids = childLocs(l.id).length;
  const sub = [`${itemCount(l.id)} アイテム`, kids ? `${kids} 場所` : ''].filter(Boolean).join(' · ');
  return `<a class="place-card" href="#/loc/${l.id}">
    <span class="pi" style="--c:${locColor(l)}">${ic(l.icon || 'box')}</span>
    <span class="name">${esc(l.name)}</span>
    <span class="sub">${sub}</span>
  </a>`;
}
function itemsBlock(list, mode, showPath = false) {
  return mode === 'list'
    ? `<div class="list">${list.map(i => itemRow(i, showPath)).join('')}</div>`
    : `<div class="item-grid">${list.map(i => itemCard(i, showPath)).join('')}</div>`;
}
const secHead = (title, count = '', extra = '') =>
  `<div class="sec-head"><h2>${title}</h2>${count !== '' ? `<span class="count">${count}</span>` : ''}<span class="spacer"></span>${extra}</div>`;
const empty = (icon, title, text = '', action = '', cls = '') =>
  `<div class="empty ${cls}"><span class="bubble">${ic(icon)}</span><h3>${title}</h3>${text ? `<p>${text}</p>` : ''}${action}</div>`;
const viewToggle = mode => `<div class="seg" id="mode">
  <button type="button" data-mode="grid" class="${mode === 'grid' ? 'on' : ''}" aria-label="写真で表示">${ic('grid')}</button>
  <button type="button" data-mode="list" class="${mode === 'list' ? 'on' : ''}" aria-label="リストで表示">${ic('list')}</button>
</div>`;
function bindViewToggle() {
  $view.querySelector('#mode')?.addEventListener('click', e => {
    const m = e.target.closest('[data-mode]')?.dataset.mode;
    if (m) { pref.set('itemView', m); render(); }
  });
}
function crumbs(id) {
  const p = locPath(id).slice(0, -1);
  const sep = ic('chevR');
  return `<nav class="crumbs"><a href="#/">ホーム</a>${p.map(l => `${sep}<a href="#/loc/${l.id}">${esc(l.name)}</a>`).join('')}</nav>`;
}
function setHeader(title, { back = null, actions = '', always = false } = {}) {
  $title.textContent = title;
  $title.classList.toggle('always', always);
  document.title = title === 'モノ管理' ? title : `${title} - モノ管理`;
  $back.hidden = !back;
  $back.onclick = () => (history.length > 1 ? history.back() : (location.hash = back));
  $actions.innerHTML = actions;
}
const iconBtn = (href, icon, label) => `<a class="icon-btn" href="${href}" aria-label="${label}">${ic(icon)}</a>`;
const parseTags = s => [...new Set(s.split(/[,、\s#]+/).map(t => t.trim()).filter(Boolean))];
const fmtDate = t => new Date(t).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' });

// ---------- 画面 ----------
function home() {
  setHeader('ホーム');
  const today = new Date().toLocaleDateString('ja-JP', { month: 'long', day: 'numeric', weekday: 'short' });
  const head = `<header class="page-head"><p class="eyebrow">${today}</p><h1 class="large">持ち物</h1></header>`;
  if (!L.length && !I.length) {
    $view.innerHTML = head + empty('box', 'ようこそ',
      'まずは「リビング」「押し入れ」など、モノをしまう場所を登録しましょう。',
      `<a class="btn primary" href="#/loc/new/edit">${ic('plus')}最初の場所を追加</a>`, 'hero');
    return;
  }
  const total = I.reduce((n, i) => n + (i.quantity ?? 0), 0);
  const recent = [...I].sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0)).slice(0, 10);
  const unplaced = itemsIn(null);
  const roots = childLocs(null);
  $view.innerHTML = `${head}
    <a class="searchbar" href="#/search">${ic('search')}<span>名前・タグ・場所で探す</span></a>
    <div class="stats">
      <div class="stat accent"><b>${I.length}</b><span>アイテム</span></div>
      <div class="stat"><b>${L.length}</b><span>場所</span></div>
      <div class="stat"><b>${total}</b><span>合計の数量</span></div>
    </div>
    ${secHead('場所', roots.length, `<a class="link" href="#/loc/new/edit">${ic('plus')}追加</a>`)}
    <div class="place-grid">${roots.map(placeCard).join('') || `<a class="add-tile" href="#/loc/new/edit">${ic('plus')}場所を追加</a>`}</div>
    ${recent.length ? secHead('最近追加したもの') + `<div class="hscroll">${recent.map(i => itemCard(i, true)).join('')}</div>` : ''}
    ${unplaced.length ? secHead('場所未設定', unplaced.length) + itemsBlock(unplaced, 'list') : ''}`;
}

function locView(id) {
  const l = loc(id);
  if (!l) return notFound();
  setHeader(l.name, {
    back: l.parentId ? `#/loc/${l.parentId}` : '#/',
    actions: iconBtn(`#/label/${id}`, 'qr', 'QRラベル') + iconBtn(`#/loc/${id}/edit`, 'edit', '編集'),
  });
  const kids = childLocs(id);
  const its = itemsIn(id);
  const mode = pref.get('itemView', 'grid');
  const meta = [`${itemCount(id)} アイテム`, kids.length ? `${kids.length} 場所` : ''].filter(Boolean).join(' · ');
  $view.innerHTML = `
    ${crumbs(id)}
    <header class="hero-head">
      <span class="pi pi-lg" style="--c:${locColor(l)}">${ic(l.icon || 'box')}</span>
      <div><h1 class="large">${esc(l.name)}</h1><p class="meta">${meta}</p></div>
    </header>
    ${l.note ? `<p class="note-text">${esc(l.note)}</p>` : ''}
    ${secHead('中の場所', kids.length || '', kids.length ? `<a class="link" href="#/loc/new/edit?parent=${id}">${ic('plus')}追加</a>` : '')}
    ${kids.length
      ? `<div class="place-grid">${kids.map(placeCard).join('')}</div>`
      : `<a class="add-tile" href="#/loc/new/edit?parent=${id}">${ic('plus')}この中に場所を追加（棚・引き出し・箱など）</a>`}
    ${secHead('アイテム', its.length, its.length ? viewToggle(mode) : '')}
    ${its.length
      ? itemsBlock(its, mode)
      : empty('image', 'まだアイテムがありません', '下の ＋ ボタンから、写真を撮って追加できます')}`;
  bindViewToggle();
}

function locEdit(id, q) {
  const isNew = id === 'new';
  const l = isNew ? { id: uid(), name: '', parentId: q.get('parent') || null, note: '', icon: 'box' } : loc(id);
  if (!l) return notFound();
  setHeader(isNew ? '新しい場所' : '場所を編集', {
    back: isNew ? (l.parentId ? `#/loc/${l.parentId}` : '#/') : `#/loc/${id}`, always: true,
  });
  const exclude = new Set(isNew ? [] : descendantIds(id));
  let icon = l.icon || 'box';
  let color = locColor(l);
  $view.innerHTML = `
    <form id="f">
      <div class="group-title">名前と場所</div>
      <div class="group">
        <label class="frow"><span>名前</span><input name="name" required maxlength="80" value="${esc(l.name)}" placeholder="リビング、押し入れ、箱A など"></label>
        <label class="frow"><span>親</span><select name="parentId"><option value="">いちばん上</option>${locOptions(l.parentId, exclude)}</select></label>
      </div>
      <div class="group-title">アイコン</div>
      <div class="group">
        <div class="icon-pick" id="icons"></div>
        <div class="swatches" id="colors"></div>
      </div>
      <div class="group-title">メモ</div>
      <div class="group"><label class="frow col"><textarea name="note" maxlength="1000" placeholder="どこにあるか、中身の補足など">${esc(l.note)}</textarea></label></div>
      ${isNew ? '' : `<div class="group" style="margin-top:28px"><button type="button" class="row-btn danger" id="del">${ic('trash')}<span>この場所を削除</span></button></div>`}
      <div class="savebar"><button class="btn primary block">${ic('check')}保存</button></div>
    </form>`;
  const f = $view.querySelector('#f');
  const drawPick = () => {
    $view.querySelector('#icons').innerHTML = PLACE_ICONS.map(n =>
      `<button type="button" data-i="${n}" class="${n === icon ? 'on' : ''}" style="--c:${color}" aria-label="${n}">${ic(n)}</button>`).join('');
    $view.querySelector('#colors').innerHTML = HUES.map(c =>
      `<button type="button" data-c="${c}" class="${c === color ? 'on' : ''}" style="--c:${c}" aria-label="色"></button>`).join('');
  };
  $view.querySelector('#icons').onclick = e => { const b = e.target.closest('[data-i]'); if (b) { icon = b.dataset.i; drawPick(); } };
  $view.querySelector('#colors').onclick = e => { const b = e.target.closest('[data-c]'); if (b) { color = b.dataset.c; drawPick(); } };
  drawPick();
  if (isNew) f.name.focus();
  f.onsubmit = async e => {
    e.preventDefault();
    const v = { ...l, name: f.name.value.trim(), parentId: f.parentId.value || null, note: f.note.value.trim(), icon, color };
    if (!v.name) return;
    v.createdAt ??= Date.now();
    await db.put('locations', v);
    await load();
    toast('保存しました');
    location.replace(`#/loc/${v.id}`);
  };
  $view.querySelector('#del')?.addEventListener('click', async () => {
    const kids = childLocs(id), its = itemsIn(id);
    const dest = l.parentId ? `「${loc(l.parentId).name}」` : 'いちばん上';
    const msg = kids.length || its.length
      ? `「${l.name}」を削除します。中の場所 ${kids.length} 件とアイテム ${its.length} 件は${dest}に移動します。`
      : `「${l.name}」を削除しますか？`;
    if (!confirm(msg)) return;
    await db.write(s => {
      for (const k of kids) s.locations.put({ ...k, parentId: l.parentId ?? null });
      for (const i of its) s.items.put({ ...i, locationId: l.parentId ?? null });
      s.locations.delete(id);
    });
    await load();
    toast('削除しました');
    location.replace(l.parentId ? `#/loc/${l.parentId}` : '#/');
  });
}

function itemView(id) {
  const it = item(id);
  if (!it) return notFound();
  setHeader(it.name, {
    back: it.locationId ? `#/loc/${it.locationId}` : '#/',
    actions: iconBtn(`#/item/${id}/edit`, 'edit', '編集'),
  });
  const photos = it.photos ?? [];
  const hero = photos.length
    ? `<div class="hero"><div class="carousel" id="car">${photos.map(p => `<img data-photo="${p}" alt="">`).join('')}</div>
        ${photos.length > 1 ? `<div class="dots" id="dots">${photos.map((_, i) => `<i class="${i ? '' : 'on'}"></i>`).join('')}</div>` : ''}</div>`
    : `<div class="hero noimg"></div>`;
  const where = it.locationId ? pathText(it.locationId) : '場所未設定';
  const rows = [
    it.tags?.length && `<div class="info-row">${ic('tag')}<div><div class="k">タグ</div><div class="chips">${it.tags.map(t =>
      `<a class="chip soft" href="#/search?tag=${encodeURIComponent(t)}">#${esc(t)}</a>`).join('')}</div></div></div>`,
    it.note && `<div class="info-row">${ic('note')}<div><div class="k">メモ</div><div class="v">${esc(it.note)}</div></div></div>`,
    `<div class="info-row">${ic('clock')}<div><div class="k">登録日</div><div class="v">${fmtDate(it.createdAt)}${it.updatedAt && it.updatedAt - it.createdAt > 60000 ? `（${fmtDate(it.updatedAt)} 更新）` : ''}</div></div></div>`,
  ].filter(Boolean);
  $view.innerHTML = `
    ${hero}
    <div class="detail-card">
      <h1 class="large">${esc(it.name)}</h1>
      <a class="loc-pill" href="${it.locationId ? `#/loc/${it.locationId}` : '#/'}">${ic('pin')}<span>${esc(where)}</span></a>
      <div class="qty-card">
        <span class="lbl">数量<b>いくつある？</b></span>
        <div class="stepper"><button id="dec" aria-label="1つ減らす">${ic('minus')}</button><span class="n" id="qty">${it.quantity ?? 1}</span><button id="inc" aria-label="1つ増やす">${ic('plus')}</button></div>
      </div>
    </div>
    <div class="group" style="margin-top:16px">${rows.join('')}</div>
    <div class="group" style="margin-top:28px"><button class="row-btn danger" id="del">${ic('trash')}<span>このアイテムを削除</span></button></div>`;

  const car = $view.querySelector('#car');
  const dots = $view.querySelectorAll('#dots i');
  car?.addEventListener('scroll', () => {
    const i = Math.round(car.scrollLeft / car.clientWidth);
    dots.forEach((d, k) => d.classList.toggle('on', k === i));
  }, { passive: true });

  const step = async d => {
    it.quantity = Math.max(0, (it.quantity ?? 1) + d);
    it.updatedAt = Date.now();
    $view.querySelector('#qty').textContent = it.quantity;
    navigator.vibrate?.(10);
    await db.put('items', it);
  };
  $view.querySelector('#dec').onclick = () => step(-1);
  $view.querySelector('#inc').onclick = () => step(1);
  $view.querySelector('#del').onclick = async () => {
    if (!confirm(`「${it.name}」を削除しますか？`)) return;
    await db.write(s => {
      s.items.delete(id);
      for (const p of it.photos ?? []) s.photos.delete(p);
    });
    (it.photos ?? []).forEach(forgetPhoto);
    await load();
    toast('削除しました');
    location.replace(it.locationId ? `#/loc/${it.locationId}` : '#/');
  };
}

function itemEdit(id, q) {
  const isNew = id === 'new';
  const it = isNew
    ? { id: uid(), name: '', quantity: 1, locationId: q.get('loc') || null, tags: [], note: '', photos: [] }
    : item(id);
  if (!it) return notFound();
  setHeader(isNew ? '新しいアイテム' : 'アイテムを編集', {
    back: isNew ? (it.locationId ? `#/loc/${it.locationId}` : '#/') : `#/item/${id}`, always: true,
  });
  // 保存するまで写真の変更は保留しておく
  const kept = [...(it.photos ?? [])];
  const added = []; // { key, blob, url }

  $view.innerHTML = `
    <form id="f">
      <div class="photo-strip" id="photos" style="margin-top:8px"></div>
      <div class="group-title">基本情報</div>
      <div class="group">
        <label class="frow"><span>名前</span><input name="name" required maxlength="120" value="${esc(it.name)}" placeholder="延長コード など"></label>
        <div class="frow"><span>数量</span>
          <div class="stepper"><button type="button" data-d="-1" aria-label="1つ減らす">${ic('minus')}</button><input name="quantity" type="number" inputmode="numeric" min="0" step="1" value="${it.quantity ?? 1}" aria-label="数量"><button type="button" data-d="1" aria-label="1つ増やす">${ic('plus')}</button></div>
        </div>
        <label class="frow"><span>場所</span><select name="locationId"><option value="">場所未設定</option>${locOptions(it.locationId)}</select></label>
      </div>
      <div class="group-title">タグ</div>
      <div class="group">
        <div class="frow col">
          <input name="tags" value="${esc((it.tags ?? []).join(' '))}" placeholder="スペース区切りで入力（例：電気 予備）">
          <div class="chips" id="tagpick"></div>
        </div>
      </div>
      <div class="group-title">メモ</div>
      <div class="group"><label class="frow col"><textarea name="note" maxlength="2000" placeholder="型番、買った店、使い方など">${esc(it.note)}</textarea></label></div>
      <div class="savebar"><button class="btn primary block">${ic('check')}保存</button></div>
    </form>
    <input type="file" id="pick" accept="image/*" multiple hidden>`;
  const f = $view.querySelector('#f');
  const $photos = $view.querySelector('#photos');
  const $pick = $view.querySelector('#pick');

  function drawPhotos() {
    $photos.innerHTML = [
      `<button type="button" class="addph" id="addph">${ic('camera')}写真を追加</button>`,
      ...added.map(a => `<span class="ph"><img src="${a.url}" alt=""><button type="button" class="rm" data-added="${a.key}" aria-label="写真を外す">${ic('x')}</button></span>`).reverse(),
      ...kept.map(p => `<span class="ph"><img data-photo="${p}" alt=""><button type="button" class="rm" data-kept="${p}" aria-label="写真を外す">${ic('x')}</button></span>`),
    ].join('');
    hydratePhotos($photos);
  }
  $photos.onclick = e => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.id === 'addph') return $pick.click();
    if (b.dataset.kept) kept.splice(kept.indexOf(b.dataset.kept), 1);
    if (b.dataset.added) {
      const i = added.findIndex(a => a.key === b.dataset.added);
      URL.revokeObjectURL(added[i].url);
      added.splice(i, 1);
    }
    drawPhotos();
  };
  $pick.onchange = async () => {
    for (const file of $pick.files) {
      try {
        const blob = await shrink(file);
        added.push({ key: uid(), blob, url: URL.createObjectURL(blob) });
      } catch {
        toast('この画像は読み込めませんでした');
      }
    }
    $pick.value = '';
    drawPhotos();
  };
  drawPhotos();

  f.querySelectorAll('[data-d]').forEach(b => b.onclick = () => {
    f.quantity.value = Math.max(0, (parseInt(f.quantity.value, 10) || 0) + Number(b.dataset.d));
  });

  const $tagpick = $view.querySelector('#tagpick');
  function drawTagPick() {
    const cur = new Set(parseTags(f.tags.value));
    $tagpick.innerHTML = allTags().map(t =>
      `<button type="button" class="chip ${cur.has(t) ? 'on' : ''}" data-t="${esc(t)}">#${esc(t)}</button>`).join('');
  }
  $tagpick.onclick = e => {
    const t = e.target.closest('[data-t]')?.dataset.t;
    if (!t) return;
    const cur = parseTags(f.tags.value);
    f.tags.value = (cur.includes(t) ? cur.filter(x => x !== t) : [...cur, t]).join(' ');
    drawTagPick();
  };
  f.tags.oninput = drawTagPick;
  drawTagPick();

  f.onsubmit = async e => {
    e.preventDefault();
    const name = f.name.value.trim();
    if (!name) return;
    const removed = (it.photos ?? []).filter(p => !kept.includes(p));
    const v = {
      ...it,
      name,
      quantity: Math.max(0, parseInt(f.quantity.value, 10) || 0),
      locationId: f.locationId.value || null,
      tags: parseTags(f.tags.value),
      note: f.note.value.trim(),
      photos: [...added.map(a => a.key).reverse(), ...kept],
      createdAt: it.createdAt ?? Date.now(),
      updatedAt: Date.now(),
    };
    await db.write(s => {
      for (const a of added) s.photos.put({ id: a.key, blob: a.blob });
      for (const p of removed) s.photos.delete(p);
      s.items.put(v);
    });
    removed.forEach(forgetPhoto);
    for (const a of added) photoUrls.set(a.key, a.url);
    await load();
    toast('保存しました');
    location.replace(`#/item/${v.id}`);
  };
}

function searchView(_, q) {
  setHeader('検索');
  let text = q.get('q') ?? '';
  const tags = new Set(q.getAll('tag'));
  const mode = pref.get('itemView', 'grid');
  $view.innerHTML = `
    <header class="page-head"><h1 class="large">検索</h1></header>
    <div class="search-field"><label>${ic('search')}<input id="q" type="search" enterkeyhint="search" placeholder="名前・メモ・タグ・場所" value="${esc(text)}" autocomplete="off"></label></div>
    <div class="chips" id="tags"></div>
    <div id="results"></div>`;
  const $q = $view.querySelector('#q');
  function draw() {
    const tagList = allTags();
    $view.querySelector('#tags').innerHTML = tagList.map(t =>
      `<button type="button" class="chip ${tags.has(t) ? 'on' : ''}" data-t="${esc(t)}">#${esc(t)}</button>`).join('');
    const words = text.toLowerCase().split(/\s+/).filter(Boolean);
    const active = words.length || tags.size;
    const hits = active ? I.filter(it => {
      if ([...tags].some(t => !(it.tags ?? []).includes(t))) return false;
      const hay = [it.name, it.note, ...(it.tags ?? []), pathText(it.locationId)].join(' ').toLowerCase();
      return words.every(w => hay.includes(w));
    }).sort(byName) : [];
    $view.querySelector('#results').innerHTML = !active
      ? `<div style="margin-top:20px">${empty('search', '何を探しますか？', tagList.length ? 'キーワードを入力するか、上のタグを選んでください' : 'キーワードを入力してください')}</div>`
      : hits.length
        ? `<div class="sec-head" style="margin-top:22px"><h2>${hits.length} 件見つかりました</h2><span class="spacer"></span>${viewToggle(mode)}</div>${itemsBlock(hits, mode, true)}`
        : `<div style="margin-top:20px">${empty('search', '見つかりませんでした', '別のことばで試してみてください')}</div>`;
    bindViewToggle();
    hydratePhotos();
    // 戻ったときに検索条件が残るように URL に反映
    const p = new URLSearchParams();
    if (text) p.set('q', text);
    tags.forEach(t => p.append('tag', t));
    const qs = p.toString();
    history.replaceState(null, '', `#/search${qs ? '?' + qs : ''}`);
  }
  $q.oninput = () => { text = $q.value; draw(); };
  $view.querySelector('#tags').onclick = e => {
    const t = e.target.closest('[data-t]')?.dataset.t;
    if (!t) return;
    tags.has(t) ? tags.delete(t) : tags.add(t);
    draw();
  };
  draw();
}

// ---------- QR ----------
const appUrl = hash => location.origin + location.pathname + hash;

function labelView(id) {
  const l = loc(id);
  if (!l) return notFound();
  setHeader('QRラベル', { back: `#/loc/${id}`, always: true });
  const qr = qrcode(0, 'M');
  qr.addData(appUrl(`#/loc/${id}`));
  qr.make();
  const parent = locPath(id).slice(0, -1).map(x => x.name).join(' › ');
  const its = itemsIn(id);
  $view.innerHTML = `
    <div class="label-sheet">
      <div class="label">
        ${qr.createSvgTag({ cellSize: 4, margin: 2, scalable: true })}
        <div class="lname">${esc(l.name)}</div>
        ${parent ? `<div class="lpath">${esc(parent)}</div>` : ''}
        <div class="lpath" id="contents" hidden>${its.map(i => esc(i.name)).join('、')}</div>
      </div>
    </div>
    <div class="no-print">
      <div class="group" style="margin-top:20px">
        <label class="toggle-row"><span>中身の一覧もラベルに入れる</span><span class="switch"><input type="checkbox" id="withItems" ${its.length ? '' : 'disabled'}><span></span></span></label>
      </div>
      <div style="margin-top:16px"><button class="btn primary block" id="print">${ic('print')}印刷する</button></div>
      <p class="footnote">箱に貼っておけば、アプリの「スキャン」で読み取るだけで中身が開きます。データはこの端末の中だけにあるので、ほかの端末では開けません。</p>
    </div>`;
  $view.querySelector('#withItems').onchange = e => { $view.querySelector('#contents').hidden = !e.target.checked; };
  $view.querySelector('#print').onclick = () => window.print();
}

// QR の文字列から、このアプリ内の画面を取り出す
function routeFromQr(text) {
  const m = text.match(/#\/(loc|item)\/([\w-]+)/);
  return m ? { kind: m[1], id: m[2] } : null;
}

function scanView() {
  setHeader('スキャン');
  $view.innerHTML = `
    <header class="page-head"><h1 class="large">スキャン</h1></header>
    <div class="scanner"><video id="v" playsinline muted></video><div class="frame"></div><div class="line"></div></div>
    <p class="scan-msg" id="msg">箱に貼ったQRラベルを枠の中に映してください</p>
    <button class="btn block" id="fromImg">${ic('image')}写真から読み取る</button>
    <input type="file" id="img" accept="image/*" hidden>`;
  const video = $view.querySelector('#v');
  const msg = $view.querySelector('#msg');
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  let stream, raf, stopped = false;

  function decode(src, w, h) {
    const scale = Math.min(1, 800 / Math.max(w, h));
    canvas.width = Math.round(w * scale);
    canvas.height = Math.round(h * scale);
    ctx.drawImage(src, 0, 0, canvas.width, canvas.height);
    const d = ctx.getImageData(0, 0, canvas.width, canvas.height);
    return jsQR(d.data, d.width, d.height, { inversionAttempts: 'dontInvert' })?.data;
  }
  function found(text) {
    const r = routeFromQr(text);
    if (r && (r.kind === 'loc' ? loc(r.id) : item(r.id))) {
      navigator.vibrate?.(60);
      location.hash = `#/${r.kind}/${r.id}`;
      return true;
    }
    msg.textContent = r ? 'この端末には登録されていないラベルです' : 'このアプリのQRではないようです';
    return false;
  }
  function tick() {
    if (stopped) return;
    if (video.readyState >= 2) {
      const text = decode(video, video.videoWidth, video.videoHeight);
      if (text && found(text)) return;
    }
    raf = requestAnimationFrame(tick);
  }
  (async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      msg.textContent = 'このブラウザではカメラが使えません。「写真から読み取る」を使ってください。';
      return;
    }
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
      if (stopped) return stream.getTracks().forEach(t => t.stop());
      video.srcObject = stream;
      await video.play();
      tick();
    } catch {
      msg.textContent = 'カメラを使えませんでした。カメラの許可を確認するか、「写真から読み取る」を使ってください。';
    }
  })();

  const $img = $view.querySelector('#img');
  $view.querySelector('#fromImg').onclick = () => $img.click();
  $img.onchange = async () => {
    const file = $img.files[0];
    if (!file) return;
    const bmp = await createImageBitmap(file);
    const text = decode(bmp, bmp.width, bmp.height);
    $img.value = '';
    if (!text) msg.textContent = 'QRコードが見つかりませんでした';
    else found(text);
  };

  return () => {
    stopped = true;
    cancelAnimationFrame(raf);
    stream?.getTracks().forEach(t => t.stop());
  };
}

// ---------- 設定・バックアップ ----------
const blobToDataUrl = b => new Promise((res, rej) => {
  const r = new FileReader();
  r.onload = () => res(r.result);
  r.onerror = () => rej(r.error);
  r.readAsDataURL(b);
});

async function settingsView() {
  setHeader('設定');
  const photoCount = I.reduce((n, i) => n + (i.photos?.length ?? 0), 0);
  $view.innerHTML = `
    <header class="page-head"><h1 class="large">設定</h1></header>
    <div class="group-title">バックアップ</div>
    <div class="group">
      <button class="row-btn" id="export"><span class="lead">${ic('download')}</span><span>バックアップを書き出す</span>${ic('chevR', 'row-chev')}</button>
      <button class="row-btn" id="import"><span class="lead" style="background:#14b8a6">${ic('upload')}</span><span>バックアップから復元</span>${ic('chevR', 'row-chev')}</button>
    </div>
    <p class="footnote">データはこの端末のブラウザの中だけに保存されています。アプリを消したりブラウザのデータを消去すると失われるので、ときどき書き出しておくと安心です。</p>
    <input type="file" id="file" accept="application/json,.json" hidden>
    <div class="group-title">この端末のデータ</div>
    <div class="group" id="storage">
      <div class="kv-row"><span>場所</span><span>${L.length}</span></div>
      <div class="kv-row"><span>アイテム</span><span>${I.length}</span></div>
      <div class="kv-row"><span>写真</span><span>${photoCount} 枚</span></div>
    </div>
    <div class="group-title">このアプリについて</div>
    <div class="group">
      <div class="kv-row"><span>モノ管理</span><span>バージョン 1.1</span></div>
    </div>`;

  $view.querySelector('#export').onclick = async () => {
    const photos = await db.getAll('photos');
    const data = {
      app: 'mono-kanri', version: 1, exportedAt: new Date().toISOString(),
      locations: L, items: I,
      photos: await Promise.all(photos.map(async p => ({ id: p.id, data: await blobToDataUrl(p.blob) }))),
    };
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    const name = `mono-kanri-${new Date().toISOString().slice(0, 10)}.json`;
    const file = new File([blob], name, { type: 'application/json' });
    if (navigator.canShare?.({ files: [file] })) {
      try { await navigator.share({ files: [file], title: name }); return; } catch (e) { if (e.name === 'AbortError') return; }
    }
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: name });
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  const $file = $view.querySelector('#file');
  $view.querySelector('#import').onclick = () => $file.click();
  $file.onchange = async () => {
    const f = $file.files[0];
    $file.value = '';
    if (!f) return;
    let data;
    try {
      data = JSON.parse(await f.text());
      if (data.app !== 'mono-kanri' || !Array.isArray(data.items)) throw 0;
    } catch {
      return toast('バックアップファイルではないようです');
    }
    if (!confirm(`今のデータを消して、バックアップ（場所 ${data.locations.length}・アイテム ${data.items.length}）に置き換えます。よろしいですか？`)) return;
    const photos = await Promise.all((data.photos ?? []).map(async p => ({ id: p.id, blob: await (await fetch(p.data)).blob() })));
    await db.replaceAll({ locations: data.locations, items: data.items, photos });
    [...photoUrls.keys()].forEach(forgetPhoto);
    await load();
    toast('復元しました');
    location.hash = '#/';
  };

  const est = await navigator.storage?.estimate?.();
  const persisted = await navigator.storage?.persisted?.();
  const $s = $view.querySelector('#storage');
  if (est) $s.insertAdjacentHTML('beforeend', `<div class="kv-row"><span>使用量</span><span>${(est.usage / 1024 / 1024).toFixed(1)} MB</span></div>`);
  if (persisted !== undefined) $s.insertAdjacentHTML('beforeend', `<div class="kv-row"><span>消えにくい保存</span><span>${persisted ? '有効' : '無効'}</span></div>`);
}

function notFound() {
  setHeader('見つかりません', { back: '#/', always: true });
  $view.innerHTML = `<div style="margin-top:12px">${empty('info', '見つかりませんでした', '削除されたか、別の端末のデータです')}</div>`;
}

// ---------- タブバー ----------
$back.innerHTML = ic('chevL');
$tabbar.innerHTML = `
  <a href="#/" data-tab="home">${ic('home')}<span>ホーム</span></a>
  <a href="#/search" data-tab="search">${ic('search')}<span>検索</span></a>
  <button class="tab-add" id="tabAdd" aria-label="アイテムを追加">${ic('plus')}</button>
  <a href="#/scan" data-tab="scan">${ic('scan')}<span>スキャン</span></a>
  <a href="#/settings" data-tab="settings">${ic('settings')}<span>設定</span></a>`;
// 場所を開いているときは、その場所に追加する
document.getElementById('tabAdd').onclick = () => {
  const m = location.hash.match(/^#\/loc\/([\w-]+)$/);
  location.hash = '#/item/new/edit' + (m ? `?loc=${m[1]}` : '');
};

// ---------- ルーター ----------
const routes = [
  [/^\/?$/, home, 'home'],
  [/^\/loc\/([\w-]+)\/edit$/, locEdit, 'home', true],
  [/^\/loc\/([\w-]+)$/, locView, 'home'],
  [/^\/item\/([\w-]+)\/edit$/, itemEdit, 'home', true],
  [/^\/item\/([\w-]+)$/, itemView, 'home'],
  [/^\/label\/([\w-]+)$/, labelView, 'home'],
  [/^\/search$/, searchView, 'search'],
  [/^\/scan$/, scanView, 'scan'],
  [/^\/settings$/, settingsView, 'settings'],
];

let cleanup = null;
let lastPath = null;
async function render() {
  cleanup?.();
  cleanup = null;
  const [path, query = ''] = location.hash.slice(1).split('?');
  const q = new URLSearchParams(query);
  const route = routes.find(([re]) => re.test(path || '/'));
  document.querySelectorAll('.tabbar a').forEach(a => a.classList.toggle('active', a.dataset.tab === route?.[2]));
  document.body.classList.toggle('editing', !!route?.[3]);
  // 画面が変わったときだけ入場アニメーションとスクロール位置のリセットをする
  if (path !== lastPath) {
    $view.style.animation = 'none';
    void $view.offsetWidth;
    $view.style.animation = '';
    window.scrollTo(0, 0);
  }
  lastPath = path;
  if (!route) return notFound();
  const [re, view] = route;
  const result = await view((path || '/').match(re)[1], q);
  if (typeof result === 'function') cleanup = result;
  hydratePhotos();
  onScroll();
}

const onScroll = () => document.body.classList.toggle('scrolled', window.scrollY > 28);
window.addEventListener('scroll', onScroll, { passive: true });
window.addEventListener('hashchange', render);
await load();
render();

// 端末の空き容量が少ないときに勝手に消されないよう、永続化をお願いしておく
navigator.storage?.persist?.();
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');
