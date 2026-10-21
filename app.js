import * as db from './db.js';

const $view = document.getElementById('view');
const $title = document.getElementById('title');
const $back = document.getElementById('back');
const $actions = document.getElementById('actions');

const esc = s => String(s ?? '').replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => crypto.randomUUID?.() ?? Date.now().toString(36) + Math.random().toString(36).slice(2);
const byName = (a, b) => a.name.localeCompare(b.name, 'ja', { numeric: true });

function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => t.classList.remove('show'), 1800);
}

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
function thumb(it) {
  return it.photos?.length
    ? `<img class="thumb" data-photo="${it.photos[0]}" alt="">`
    : `<span class="thumb">□</span>`;
}
function itemRow(it, showPath = false) {
  const sub = [showPath ? pathText(it.locationId) : '', (it.tags ?? []).map(t => '#' + t).join(' ')]
    .filter(Boolean).join('　');
  return `<a class="row" href="#/item/${it.id}">
    ${thumb(it)}
    <span class="main"><span class="name">${esc(it.name)}</span>${sub ? `<div class="sub">${esc(sub)}</div>` : ''}</span>
    <span class="qty">×${it.quantity ?? 1}</span>
  </a>`;
}
function locRow(l) {
  const kids = childLocs(l.id).length;
  const sub = [kids ? `場所 ${kids}` : '', `アイテム ${itemCount(l.id)}`].filter(Boolean).join('・');
  return `<a class="row" href="#/loc/${l.id}">
    <span class="folder">▣</span>
    <span class="main"><span class="name">${esc(l.name)}</span><div class="sub">${sub}</div></span>
    <span class="chev">›</span>
  </a>`;
}
const listOr = (rows, emptyText) => rows.length
  ? `<div class="list">${rows.join('')}</div>`
  : `<div class="empty">${emptyText}</div>`;
function crumbs(id, linkLast = false) {
  const p = locPath(id);
  const parts = [`<a href="#/">すべて</a>`, ...p.map((l, i) =>
    i < p.length - 1 || linkLast ? `<a href="#/loc/${l.id}">${esc(l.name)}</a>` : esc(l.name))];
  return `<p class="crumbs">${parts.join(' › ')}</p>`;
}
function setHeader(title, { back = null, actions = '' } = {}) {
  $title.textContent = title;
  document.title = title === 'モノ管理' ? title : `${title} - モノ管理`;
  $back.hidden = !back;
  $back.onclick = () => (history.length > 1 ? history.back() : (location.hash = back));
  $actions.innerHTML = actions;
}
const parseTags = s => [...new Set(s.split(/[,、\s#]+/).map(t => t.trim()).filter(Boolean))];

// ---------- 画面 ----------
function home() {
  setHeader('モノ管理');
  const unplaced = itemsIn(null);
  $view.innerHTML = `
    <h2>場所</h2>
    ${listOr(childLocs(null).map(locRow), 'まだ場所がありません。「＋ 場所」から部屋や収納を追加しましょう。')}
    ${unplaced.length ? `<h2>場所未設定のアイテム</h2>${listOr(unplaced.map(i => itemRow(i)), '')}` : ''}
    <p class="note">場所 ${L.length}・アイテム ${I.length}</p>
    <div class="btns"><a class="btn" href="#/loc/new/edit">＋ 場所</a><a class="btn" href="#/item/new/edit">＋ アイテム</a></div>`;
}

function locView(id) {
  const l = loc(id);
  if (!l) return notFound();
  setHeader(l.name, {
    back: l.parentId ? `#/loc/${l.parentId}` : '#/',
    actions: `<a class="icon-btn" href="#/label/${id}">QR</a><a class="icon-btn" href="#/loc/${id}/edit">編集</a>`,
  });
  $view.innerHTML = `
    ${crumbs(id)}
    ${l.note ? `<p class="note">${esc(l.note)}</p>` : ''}
    <h2>中の場所</h2>
    ${listOr(childLocs(id).map(locRow), 'この中に場所はありません')}
    <div class="btns"><a class="btn" href="#/loc/new/edit?parent=${id}">＋ この中に場所を追加</a></div>
    <h2>アイテム</h2>
    ${listOr(itemsIn(id).map(i => itemRow(i)), 'アイテムはまだありません')}
    <a class="fab" href="#/item/new/edit?loc=${id}">＋ アイテム</a>`;
}

function locEdit(id, q) {
  const isNew = id === 'new';
  const l = isNew ? { id: uid(), name: '', parentId: q.get('parent') || null, note: '' } : loc(id);
  if (!l) return notFound();
  setHeader(isNew ? '場所を追加' : '場所を編集', { back: isNew ? (l.parentId ? `#/loc/${l.parentId}` : '#/') : `#/loc/${id}` });
  const exclude = new Set(isNew ? [] : descendantIds(id));
  $view.innerHTML = `
    <form class="card" id="f">
      <label class="field"><span>名前</span><input name="name" required maxlength="80" value="${esc(l.name)}" placeholder="例：リビング、押し入れ、箱A"></label>
      <label class="field"><span>どこの中？</span><select name="parentId"><option value="">（いちばん上）</option>${locOptions(l.parentId, exclude)}</select></label>
      <label class="field"><span>メモ</span><textarea name="note" maxlength="1000">${esc(l.note)}</textarea></label>
      <button class="btn primary block">保存</button>
    </form>
    ${isNew ? '' : `<div class="btns"><button class="btn danger" id="del">この場所を削除</button></div>`}`;
  const f = $view.querySelector('#f');
  if (isNew) f.name.focus();
  f.onsubmit = async e => {
    e.preventDefault();
    const v = { ...l, name: f.name.value.trim(), parentId: f.parentId.value || null, note: f.note.value.trim() };
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
    actions: `<a class="icon-btn" href="#/item/${id}/edit">編集</a>`,
  });
  const where = it.locationId
    ? locPath(it.locationId).map(l => `<a href="#/loc/${l.id}">${esc(l.name)}</a>`).join(' › ')
    : '場所未設定';
  $view.innerHTML = `
    ${it.photos?.length ? `<div class="gallery">${it.photos.map(p => `<img data-photo="${p}" alt="">`).join('')}</div>` : ''}
    <div class="card detail">
      <h3>${esc(it.name)}</h3>
      <div class="stepper">
        <button id="dec" aria-label="1つ減らす">−</button><span class="n" id="qty">${it.quantity ?? 1}</span><button id="inc" aria-label="1つ増やす">＋</button>
      </div>
      <dl class="kv">
        <dt>場所</dt><dd>${where}</dd>
        ${it.tags?.length ? `<dt>タグ</dt><dd class="chips">${it.tags.map(t => `<a class="chip" href="#/search?tag=${encodeURIComponent(t)}">#${esc(t)}</a>`).join('')}</dd>` : ''}
        ${it.note ? `<dt>メモ</dt><dd>${esc(it.note)}</dd>` : ''}
        <dt>更新</dt><dd>${new Date(it.updatedAt ?? it.createdAt).toLocaleString('ja-JP')}</dd>
      </dl>
    </div>
    <div class="btns"><button class="btn danger" id="del">削除</button></div>`;
  const step = async d => {
    it.quantity = Math.max(0, (it.quantity ?? 1) + d);
    it.updatedAt = Date.now();
    $view.querySelector('#qty').textContent = it.quantity;
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
  setHeader(isNew ? 'アイテムを追加' : 'アイテムを編集', {
    back: isNew ? (it.locationId ? `#/loc/${it.locationId}` : '#/') : `#/item/${id}`,
  });
  // 保存するまで写真の変更は保留しておく
  const kept = [...(it.photos ?? [])];
  const added = []; // { key, blob, url }

  $view.innerHTML = `
    <form class="card" id="f">
      <div class="field"><span>写真</span><div class="photos" id="photos"></div></div>
      <label class="field"><span>名前</span><input name="name" required maxlength="120" value="${esc(it.name)}" placeholder="例：延長コード"></label>
      <label class="field"><span>数量</span><input name="quantity" type="number" inputmode="numeric" min="0" step="1" value="${it.quantity ?? 1}"></label>
      <label class="field"><span>場所</span><select name="locationId"><option value="">（場所未設定）</option>${locOptions(it.locationId)}</select></label>
      <label class="field"><span>タグ（スペースかカンマ区切り）</span><input name="tags" value="${esc((it.tags ?? []).join(' '))}" placeholder="例：電気 予備"></label>
      <div class="chips" id="tagpick" style="margin:-6px 0 14px"></div>
      <label class="field"><span>メモ</span><textarea name="note" maxlength="2000">${esc(it.note)}</textarea></label>
      <button class="btn primary block">保存</button>
    </form>
    <input type="file" id="pick" accept="image/*" multiple hidden>`;
  const f = $view.querySelector('#f');
  const $photos = $view.querySelector('#photos');
  const $pick = $view.querySelector('#pick');

  function drawPhotos() {
    $photos.innerHTML = [
      ...kept.map(p => `<span class="ph"><img data-photo="${p}" alt=""><button type="button" class="rm" data-kept="${p}" aria-label="写真を外す">×</button></span>`),
      ...added.map(a => `<span class="ph"><img src="${a.url}" alt=""><button type="button" class="rm" data-added="${a.key}" aria-label="写真を外す">×</button></span>`),
      `<button type="button" class="addph" id="addph">＋<br>写真</button>`,
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
  if (isNew) f.name.focus();

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
      photos: [...kept, ...added.map(a => a.key)],
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
  $view.innerHTML = `
    <div class="search"><input id="q" type="search" placeholder="名前・メモ・タグ・場所で検索" value="${esc(text)}" autocomplete="off"></div>
    <div class="chips" id="tags" style="margin-top:10px"></div>
    <h2 id="count"></h2>
    <div id="results"></div>`;
  const $q = $view.querySelector('#q');
  function draw() {
    $view.querySelector('#tags').innerHTML = allTags().map(t =>
      `<button type="button" class="chip ${tags.has(t) ? 'on' : ''}" data-t="${esc(t)}">#${esc(t)}</button>`).join('');
    const words = text.toLowerCase().split(/\s+/).filter(Boolean);
    const hits = (words.length || tags.size) ? I.filter(it => {
      if ([...tags].some(t => !(it.tags ?? []).includes(t))) return false;
      const hay = [it.name, it.note, ...(it.tags ?? []), pathText(it.locationId)].join(' ').toLowerCase();
      return words.every(w => hay.includes(w));
    }).sort(byName) : [];
    $view.querySelector('#count').textContent = words.length || tags.size ? `${hits.length} 件` : '';
    $view.querySelector('#results').innerHTML = words.length || tags.size
      ? listOr(hits.map(i => itemRow(i, true)), '見つかりませんでした')
      : `<div class="empty">キーワードを入力するか、タグを選んでください</div>`;
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
  if (!text && !tags.size) $q.focus();
}

// ---------- QR ----------
const appUrl = hash => location.origin + location.pathname + hash;

function labelView(id) {
  const l = loc(id);
  if (!l) return notFound();
  setHeader('QRラベル', { back: `#/loc/${id}` });
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
      <label class="note" style="display:flex;gap:8px;align-items:center;justify-content:center">
        <input type="checkbox" id="withItems" ${its.length ? '' : 'disabled'}> 中身の一覧もラベルに入れる
      </label>
      <div class="btns"><button class="btn primary" id="print">印刷する</button></div>
      <p class="note">このQRはアプリ内の「スキャン」で読み取ると、この場所の中身が開きます。印刷はスマホの印刷メニューから（AirPrint / PDF保存など）。データはこの端末の中だけにあるので、他の端末では開けません。</p>
    </div>`;
  $view.querySelector('#withItems').onchange = e => { $view.querySelector('#contents').hidden = !e.target.checked; };
  $view.querySelector('#print').onclick = () => window.print();
}

// QR の文字列から、このアプリ内の画面を取り出す
function routeFromQr(text) {
  const m = text.match(/#\/(loc|item)\/([\w-]+)/);
  return m ? `#/${m[1]}/${m[2]}` : null;
}

function scanView() {
  setHeader('スキャン');
  $view.innerHTML = `
    <div class="scanner"><video id="v" playsinline muted></video><div class="frame"></div></div>
    <p class="note" id="msg">箱に貼ったQRラベルをカメラに映してください</p>
    <div class="btns">
      <button class="btn" id="fromImg">画像から読み取る</button>
    </div>
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
    const [, kind, id] = r?.match(/#\/(\w+)\/(.+)/) ?? [];
    if (r && (kind === 'loc' ? loc(id) : item(id))) {
      navigator.vibrate?.(60);
      location.hash = r;
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
      msg.textContent = 'このブラウザではカメラが使えません。「画像から読み取る」を使ってください。';
      return;
    }
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
      if (stopped) return stream.getTracks().forEach(t => t.stop());
      video.srcObject = stream;
      await video.play();
      tick();
    } catch {
      msg.textContent = 'カメラを使えませんでした。カメラの許可を確認するか、「画像から読み取る」を使ってください。';
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
  $view.innerHTML = `
    <h2>バックアップ</h2>
    <div class="card">
      <p style="margin-top:0">データはこの端末のブラウザの中だけに保存されています。アプリを消したり、ブラウザのデータを消去すると失われるので、ときどき書き出しておくと安心です。</p>
      <div class="btns">
        <button class="btn primary" id="export">書き出す</button>
        <button class="btn" id="import">読み込む</button>
      </div>
      <input type="file" id="file" accept="application/json,.json" hidden>
    </div>
    <h2>ストレージ</h2>
    <div class="card" id="storage">場所 ${L.length}・アイテム ${I.length}</div>`;

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
    toast('読み込みました');
    location.hash = '#/';
  };

  const est = await navigator.storage?.estimate?.();
  const persisted = await navigator.storage?.persisted?.();
  if (est) {
    const mb = n => (n / 1024 / 1024).toFixed(1) + ' MB';
    $view.querySelector('#storage').innerHTML += `<br>使用量 ${mb(est.usage)}${persisted ? '<br>消えにくい保存（永続化）: 有効' : ''}`;
  }
}

function notFound() {
  setHeader('見つかりません', { back: '#/' });
  $view.innerHTML = `<div class="empty">この場所・アイテムは見つかりませんでした（削除されたか、別の端末のデータです）</div>`;
}

// ---------- ルーター ----------
const routes = [
  [/^\/?$/, home, 'home'],
  [/^\/loc\/([\w-]+)\/edit$/, locEdit, 'home'],
  [/^\/loc\/([\w-]+)$/, locView, 'home'],
  [/^\/item\/([\w-]+)\/edit$/, itemEdit, 'home'],
  [/^\/item\/([\w-]+)$/, itemView, 'home'],
  [/^\/label\/([\w-]+)$/, labelView, 'home'],
  [/^\/search$/, searchView, 'search'],
  [/^\/scan$/, scanView, 'scan'],
  [/^\/settings$/, settingsView, 'settings'],
];

let cleanup = null;
async function render() {
  cleanup?.();
  cleanup = null;
  const [path, query = ''] = location.hash.slice(1).split('?');
  const q = new URLSearchParams(query);
  const route = routes.find(([re]) => re.test(path || '/'));
  document.querySelectorAll('.tabbar a').forEach(a => a.classList.toggle('active', a.dataset.tab === route?.[2]));
  if (!route) return notFound();
  const [re, view] = route;
  const result = await view((path || '/').match(re)[1], q);
  if (typeof result === 'function') cleanup = result;
  hydratePhotos();
  window.scrollTo(0, 0);
}

window.addEventListener('hashchange', render);
await load();
render();

// 端末の空き容量が少ないときに勝手に消されないよう、永続化をお願いしておく
navigator.storage?.persist?.();
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');
