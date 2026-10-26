import * as db from './db.js?v=18';
import { readZip } from './zip.js?v=18';
import { decodeCsv, parseCsv, toCsv } from './csv.js?v=18';

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
  alert: P('M10.3 4.6 3 17.5A2 2 0 0 0 4.7 20.5h14.6a2 2 0 0 0 1.7-3L13.7 4.6a2 2 0 0 0-3.4 0zM12 9.5v4M12 17h.01'),
  archive: P('M3.5 4.5h17v4h-17zM5 8.5V19a1.5 1.5 0 0 0 1.5 1.5h11A1.5 1.5 0 0 0 19 19V8.5M10 12.5h4'),
  table: `<rect x="3.5" y="4.5" width="17" height="15" rx="2"/>` + P('M3.5 9.5h17M3.5 14.5h17M9.5 9.5v10'),
  layers: P('m12 3.5 8.5 4.5-8.5 4.5L3.5 8zM3.5 12.5 12 17l8.5-4.5M3.5 16.5 12 21l8.5-4.5'),
  phone: `<rect x="6.5" y="2.5" width="11" height="19" rx="2.5"/>` + P('M11 18h2'),
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

function toast(msg, kind = 'ok') {
  const t = document.getElementById('toast');
  t.innerHTML = ic(kind === 'error' ? 'alert' : 'check') + `<span>${esc(msg)}</span>`;
  t.classList.toggle('error', kind === 'error');
  t.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => t.classList.remove('show'), kind === 'error' ? 5000 : 1800);
}

// 保存に失敗したとき（多くは容量不足）に、黙って失敗しないよう知らせる
window.addEventListener('unhandledrejection', e => {
  const quota = e.reason?.name === 'QuotaExceededError';
  toast(quota
    ? '端末の空き容量が足りず、保存できませんでした。写真を減らすか、端末の空きを増やしてください。'
    : `うまく保存できませんでした。もう一度お試しください。（${e.reason?.message || e.reason?.name || '不明なエラー'}）`, 'error');
});

document.addEventListener('db-blocked', () => {
  $view.innerHTML = `<div style="margin-top:16px">${empty('alert', 'アプリを更新しています',
    'ほかのタブやウィンドウで「モノ管理」が開いたままになっています。それを閉じると自動で続きます。')}</div>`;
});

// ---------- 容量 ----------
const LOW_FREE = 100 * 1024 * 1024;
async function storageInfo() {
  const est = await navigator.storage?.estimate?.().catch(() => null);
  const persisted = await navigator.storage?.persisted?.().catch(() => undefined);
  return { usage: est?.usage, quota: est?.quota, persisted };
}
const isLow = s => !!s.quota && (s.usage / s.quota > 0.8 || s.quota - s.usage < LOW_FREE);
function fmtBytes(n) {
  if (n == null) return '—';
  if (n >= 1024 ** 3) return (n / 1024 ** 3).toFixed(1) + ' GB';
  return (n / 1024 ** 2).toFixed(n < 10 * 1024 ** 2 ? 1 : 0) + ' MB';
}

const pref = {
  get: (k, d) => { try { return localStorage.getItem(k) ?? d; } catch { return d; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* 保存できなくても動作は続ける */ } },
};

// ---------- データ ----------
let L = []; // 場所
let I = []; // アイテム
let TP = {}; // タグの親子 { 子タグ: 親タグ }
async function load() {
  [L, I, TP] = await Promise.all([db.getAll('locations'), db.getAll('items'), db.getMeta('tagParents').then(v => v ?? {})]);
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
// ---------- タグ ----------
// TP：タグの親子 { 子タグ: 親タグ }。アイテムに付いていない親だけのタグも、ここに出てくる
const tagPathList = t => {
  const out = [];
  for (let x = t; x && out.length < 20 && !out.includes(x); x = TP[x]) out.unshift(x);
  return out;
};
const tagPath = t => tagPathList(t).join(' › ');
const tagChildren = t => Object.keys(TP).filter(c => TP[c] === t);
function tagDescendants(t) {
  const out = new Set([t]);
  const walk = x => tagChildren(x).forEach(c => { if (!out.has(c)) { out.add(c); walk(c); } });
  walk(t);
  return out;
}
// 全部のタグを「親 → その子」の順に並べる
const allTags = () => [...new Set([...I.flatMap(i => i.tags ?? []), ...Object.keys(TP), ...Object.values(TP)])]
  .sort((a, b) => tagPath(a).localeCompare(tagPath(b), 'ja'));
// 親タグで絞り込んだときは、子タグ（孫も）の付いたアイテムも当てはまる
const hasTag = (it, t) => { const ds = tagDescendants(t); return (it.tags ?? []).some(x => ds.has(x)); };
const tagLabel = t => {
  const parents = tagPathList(t).slice(0, -1);
  return `${parents.length ? `<small>${esc(parents.join(' › '))} ›</small>` : ''}#${esc(t)}`;
};

// タグの区切りは「、」「,」と改行。スペースはタグの名前の一部として残す（「タ グ」が2つに分かれない）
const parseTags = s => [...new Set(String(s).split(/[,、，\n]+/)
  .map(t => t.replace(/^[#＃]+/, '').replace(/\s+/g, ' ').trim()).filter(Boolean))];
// CSV のタグの列：「、」か「,」があればそれで区切り、なければ前の版と同じくスペースで区切る
const parseTagsLoose = s => (/[,、，]/.test(s) ? parseTags(s) : parseTags(String(s).replace(/\s+/g, '、')));

// チップ式のタグ入力。入力して Enter（か「、」）で1つのタグになる。候補をタップしても入る
const tagChip = t => `<span class="tag-chip" data-t="${esc(t)}">#${esc(t)}<button type="button" data-rm aria-label="外す">${ic('x')}</button></span>`;
const tagEditor = current => `<div class="tag-editor" data-tag-editor>
    <div class="tag-box">${current.map(tagChip).join('')}<input class="tag-input" enterkeyhint="done" placeholder="${current.length ? '' : 'タグを入力して Enter'}" autocomplete="off"></div>
    <p class="tag-hint">Enter か「、」で1つのタグになります。スペースを含む名前もそのまま使えます。</p>
    <div class="chips tag-suggest"></div>
  </div>`;
function bindTagEditors(root) {
  root.querySelectorAll('[data-tag-editor]').forEach(ed => {
    const box = ed.querySelector('.tag-box');
    const input = ed.querySelector('.tag-input');
    const sug = ed.querySelector('.tag-suggest');
    const current = () => [...box.querySelectorAll('.tag-chip')].map(c => c.dataset.t);
    const drawSuggest = () => {
      const have = new Set(current());
      const q = input.value.trim().toLowerCase();
      sug.innerHTML = allTags().filter(t => !have.has(t) && (!q || tagPath(t).toLowerCase().includes(q)))
        .map(t => `<button type="button" class="chip ${tagChildren(t).length ? 'parent' : ''}" data-add="${esc(t)}">${tagLabel(t)}</button>`).join('');
    };
    const add = list => {
      for (const t of list) if (!current().includes(t)) input.insertAdjacentHTML('beforebegin', tagChip(t));
      input.placeholder = '';
      drawSuggest();
    };
    const commit = () => {
      const v = parseTags(input.value);
      input.value = '';
      v.length ? add(v) : drawSuggest();
    };
    input.addEventListener('keydown', e => {
      if (e.isComposing || e.keyCode === 229) return; // 日本語の変換中の Enter は変換の確定に使う
      if (e.key === 'Enter') { e.preventDefault(); commit(); }
      else if (e.key === 'Backspace' && !input.value) { box.querySelector('.tag-chip:last-of-type')?.remove(); drawSuggest(); }
    });
    input.addEventListener('input', () => (/[,、，\n]/.test(input.value) ? commit() : drawSuggest()));
    input.addEventListener('blur', () => { if (input.value.trim()) commit(); });
    ed.addEventListener('click', e => {
      const rm = e.target.closest('[data-rm]');
      if (rm) { rm.closest('.tag-chip').remove(); return drawSuggest(); }
      const a = e.target.closest('[data-add]');
      if (a) return add([a.dataset.add]);
      if (e.target === box) input.focus();
    });
    drawSuggest();
  });
}
// 入力途中の文字も含めて、タグの一覧を読む
function readTags(root) {
  const ed = root.querySelector('[data-tag-editor]');
  return [...new Set([...[...ed.querySelectorAll('.tag-chip')].map(c => c.dataset.t), ...parseTags(ed.querySelector('.tag-input').value)])];
}

// タグの名前を変える。すでにある名前にすると1つにまとまる
async function renameTag(from, to) {
  const list = I.filter(i => (i.tags ?? []).includes(from))
    .map(it => ({ ...it, tags: [...new Set(it.tags.map(t => (t === from ? to : t)))] }));
  if (TP[from] && !TP[to] && TP[from] !== to) TP[to] = TP[from];
  delete TP[from];
  for (const c of Object.keys(TP)) if (TP[c] === from) TP[c] = to;
  if (TP[to] === to) delete TP[to];
  await db.setMeta('tagParents', TP);
  await saveItems(list);
  return list.length;
}
// タグを消す。アイテムから外し、子タグはひとつ上の親につなぎ直す
async function deleteTag(t) {
  const list = I.filter(i => (i.tags ?? []).includes(t)).map(it => ({ ...it, tags: it.tags.filter(x => x !== t) }));
  for (const c of Object.keys(TP)) if (TP[c] === t) { if (TP[t]) TP[c] = TP[t]; else delete TP[c]; }
  delete TP[t];
  await db.setMeta('tagParents', TP);
  await saveItems(list);
  return list.length;
}
async function setTagParent(t, parent) {
  if (parent && !tagDescendants(t).has(parent)) TP[t] = parent;
  else delete TP[t];
  await db.setMeta('tagParents', TP);
}

// ---------- タグの管理（設定から） ----------
function tagsView() {
  setHeader('タグの管理', { back: '#/settings', always: true });
  const tags = allTags();
  const count = t => I.filter(i => (i.tags ?? []).includes(t)).length;
  const total = t => I.filter(i => hasTag(i, t)).length; // 子タグの付いたアイテムも数える
  $view.innerHTML = `
    <header class="page-head"><h1 class="large">タグの管理</h1><p class="meta">${tags.length} 個</p></header>
    ${tags.length ? `<div class="group">${tags.map(t => {
      const depth = tagPathList(t).length - 1;
      return `<div class="tag-row" style="--depth:${depth}">
        <a class="tag-name" href="#/search?tag=${encodeURIComponent(t)}">${depth ? '<span class="branch">└</span>' : ''}#${esc(t)}</a>
        <span class="count">${total(t)}</span>
        <button type="button" class="icon-btn" data-tag-menu="${esc(t)}" aria-label="${esc(t)} を編集">${ic('edit')}</button>
      </div>`;
    }).join('')}</div>` : empty('tag', 'まだタグがありません', 'アイテムにタグを付けると、ここで整理できます')}
    <p class="footnote">鉛筆のボタンで、名前の変更・親タグの設定・削除ができます。ほかのタグと同じ名前に変えると、1つにまとまります。<br>親タグで絞り込むと、子タグの付いたアイテムも出てきます。</p>
    <div style="margin-top:14px"><button class="btn block" id="newParent">${ic('plus')}親タグを作る</button></div>`;

  $view.querySelectorAll('[data-tag-menu]').forEach(b => b.onclick = async () => {
    const t = b.dataset.tagMenu;
    const exclude = tagDescendants(t);
    let wantDelete = false;
    const p = sheet(`#${esc(t)}`, `
      <div class="group">
        <label class="frow"><span>名前</span><input name="tname" value="${esc(t)}" autocomplete="off"></label>
        <label class="frow"><span>親</span><select name="tparent"><option value="">なし（いちばん上）</option>${
          allTags().filter(x => !exclude.has(x)).map(x => `<option value="${esc(x)}" ${TP[t] === x ? 'selected' : ''}>${esc(tagPath(x))}</option>`).join('')}</select></label>
      </div>
      <p class="footnote">使っているアイテム ${count(t)} 件${tagChildren(t).length ? `・子タグ ${tagChildren(t).length} 個` : ''}</p>
      <div class="group" style="margin-top:14px"><button type="button" class="row-btn danger" data-del-tag>${ic('trash')}<span>このタグを削除</span></button></div>`, '保存');
    const d = sheetDialog();
    d.querySelector('[data-del-tag]').onclick = () => { wantDelete = true; d.querySelector('[data-cancel]').click(); };
    const ok = await p;
    if (wantDelete) {
      if (!(await confirmSheet(`#${t} を削除`, `${count(t)} 件のアイテムからこのタグを外します。${tagChildren(t).length ? '\n子タグは、ひとつ上の親タグの下に移ります。' : ''}`, '削除する', true))) return;
      const n = await deleteTag(t);
      toast(`#${t} を削除しました（${n} 件から外しました）`);
      return render();
    }
    if (!ok) return;
    const name = parseTags(ok.querySelector('[name=tname]').value)[0];
    const parent = ok.querySelector('[name=tparent]').value || null;
    if (name && name !== t) {
      const merging = allTags().includes(name);
      if (merging && !(await confirmSheet('タグをまとめる', `#${t} を、すでにある #${name} にまとめます。`, 'まとめる'))) return;
      await renameTag(t, name);
      await setTagParent(name, parent ?? TP[name] ?? null);
      toast(merging ? `#${name} にまとめました` : `#${name} に変えました`);
    } else {
      await setTagParent(t, parent);
      toast('保存しました');
    }
    render();
  });

  $view.querySelector('#newParent').onclick = async () => {
    const roots = allTags().filter(x => !TP[x]);
    const ok = await sheet('親タグを作る', `
      <div class="group"><label class="frow"><span>名前</span><input name="pname" placeholder="例：CLAMP作品" autocomplete="off"></label></div>
      ${roots.length ? `<p class="footnote" style="margin-top:12px">この親タグの下に入れるタグを選んでください</p>
      <div class="chips sheet-chips">${roots.map(x => `<label class="chip pick-chip"><input type="checkbox" name="kid" value="${esc(x)}">#${esc(x)}</label>`).join('')}</div>` : ''}`, '作る');
    const name = ok && parseTags(ok.querySelector('[name=pname]').value)[0];
    if (!name) return;
    const kids = [...ok.querySelectorAll('[name=kid]:checked')].map(c => c.value).filter(k => k !== name);
    for (const k of kids) if (!tagDescendants(k).has(name)) TP[k] = name;
    await db.setMeta('tagParents', TP);
    toast(kids.length ? `#${name} の下に ${kids.length} 個のタグを入れました` : '子にするタグを選ぶと、親タグができます');
    render();
  };
}


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
// 一覧などの小さな表示はサムネイル（thumbs）、詳細の大きな表示だけ原寸（photos）を読む。
// 元から小さい写真はサムネイルを作らず（thumbs には blob: null の印だけ置く）、写真そのものを一覧に使う
const photoUrls = new Map(); // `${store}:${id}` → object URL
async function photoUrl(id, store = 'thumbs') {
  const key = `${store}:${id}`;
  if (!photoUrls.has(key)) {
    const rec = await db.get(store, id);
    // サムネイルがない・いらない写真は原寸で代用する（まだ作っていないだけのときは、できたら使えるよう覚えない）
    if (store === 'thumbs' && !rec?.blob) return photoUrl(id, 'photos');
    photoUrls.set(key, rec ? URL.createObjectURL(rec.blob) : '');
  }
  return photoUrls.get(key);
}
function forgetPhoto(id) {
  for (const store of ['photos', 'thumbs']) {
    const u = photoUrls.get(`${store}:${id}`);
    if (u) URL.revokeObjectURL(u);
    photoUrls.delete(`${store}:${id}`);
  }
}
// data-photo 属性を持つ img に画像を差し込む（data-full があれば原寸）
function hydratePhotos(root = $view) {
  root.querySelectorAll('img[data-photo]').forEach(async img => {
    img.src = await photoUrl(img.dataset.photo, 'full' in img.dataset ? 'photos' : 'thumbs');
  });
  // 一覧を描き直したあと（絞り込み・表示切り替えなど）も、選択中の印を付け直す
  if (sel.on) drawSel();
}

const PHOTO = [1024, 0.78]; // 長辺・画質
const THUMB = [360, 0.75];
const THUMB_MIN = 600; // 長辺がこれ以下の写真はサムネイルを作らない

// WebP で保存できる端末か（Android・PC の Chrome など。できないブラウザは PNG を返すので、そのときは JPEG にする）
let imageType = null;
async function photoType() {
  if (!imageType) {
    const c = Object.assign(document.createElement('canvas'), { width: 2, height: 2 });
    const b = await new Promise(r => c.toBlob(r, 'image/webp', 0.8));
    imageType = b?.type === 'image/webp' ? 'image/webp' : 'image/jpeg';
  }
  return imageType;
}

// 画像を長辺 max px に縮めて保存用の形式にする。{ blob, width, height } を返す
async function shrinkImage(file, max, quality) {
  const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' }).catch(() => createImageBitmap(file));
  const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * k);
  c.height = Math.round(bmp.height * k);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#fff'; // 透明な部分（PNG のスクリーンショットなど）は白にする
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.drawImage(bmp, 0, 0, c.width, c.height);
  bmp.close?.();
  const blob = await new Promise(async r => c.toBlob(r, await photoType(), quality));
  return { blob, width: c.width, height: c.height };
}
// 保存する写真と、必要ならサムネイルを作る（サムネイルがいらないときは thumb: null）
async function makePhoto(file) {
  const photo = await shrinkImage(file, ...PHOTO);
  const thumb = Math.max(photo.width, photo.height) > THUMB_MIN ? (await shrinkImage(photo.blob, ...THUMB)).blob : null;
  return { blob: photo.blob, thumb };
}

// サムネイルがない写真（前の版で保存したもの・古いバックアップ）に後から作る。小さい写真には「いらない」印を付ける
async function ensureThumbs() {
  const [all, have] = await Promise.all([db.getAllKeys('photos'), db.getAllKeys('thumbs')]);
  const done = new Set(have);
  for (const id of all) {
    if (done.has(id)) continue;
    const p = await db.get('photos', id);
    try {
      const bmp = await createImageBitmap(p.blob);
      const small = Math.max(bmp.width, bmp.height) <= THUMB_MIN;
      bmp.close?.();
      await db.put('thumbs', { id, blob: small ? null : (await shrinkImage(p.blob, ...THUMB)).blob });
    } catch {
      return; // 容量不足などのときは、次に起動したときにまた試す
    }
  }
}

// 今ある写真を、今の設定（長辺 1024・画質 0.78・WebP）で圧縮し直す。小さくならない写真はそのまま
async function recompressPhotos(onProgress) {
  const ids = await db.getAllKeys('photos');
  let before = 0, after = 0;
  for (const [i, id] of ids.entries()) {
    onProgress(i + 1, ids.length);
    const [p, t] = await Promise.all([db.get('photos', id), db.get('thumbs', id)]);
    if (!p?.blob) continue;
    const old = p.blob.size + (t?.blob?.size ?? 0);
    try {
      const made = await makePhoto(p.blob);
      const photoBlob = made.blob.size < p.blob.size ? made.blob : p.blob;
      // サムネイルは「小さい写真には作らない」決まりに合わせて作り直す（大きくなるなら元のまま）
      const thumbBlob = made.thumb && t?.blob && t.blob.size <= made.thumb.size ? t.blob : made.thumb;
      await db.write(s => {
        s.photos.put({ id, blob: photoBlob });
        s.thumbs.put({ id, blob: thumbBlob });
      });
      forgetPhoto(id);
      before += old;
      after += photoBlob.size + (thumbBlob?.size ?? 0);
    } catch {
      before += old;
      after += old; // 読めない写真はそのまま
    }
  }
  return { count: ids.length, before, after };
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
  return `<a class="item-card" href="#/item/${it.id}" data-id="${it.id}">
    <span class="card-media">${media(it)}<span class="qty-badge ${q === 0 ? 'zero' : ''}">×${q}</span></span>
    <span class="card-body"><span class="card-name">${esc(it.name)}</span><span class="card-sub">${esc(sub)}</span></span>
  </a>`;
}
function itemRow(it, showPath = false) {
  const sub = [showPath ? pathText(it.locationId) : '', tagText(it)].filter(Boolean).join('　');
  return `<a class="row" href="#/item/${it.id}" data-id="${it.id}">
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
// 写真の一覧の列数。＋/− で変えられ、どの画面でも同じ列数で並ぶ
const gridCols = () => Number(pref.get('gridCols', 0)) || (innerWidth >= 560 ? 3 : 2);
function applyCols(n) {
  const root = document.documentElement;
  root.style.setProperty('--cols', n);
  root.classList.toggle('cols-dense', n >= 4); // 列が多いときは文字を小さく
  root.classList.toggle('cols-tiny', n >= 5);
  document.querySelectorAll('.cols-n').forEach(e => { e.textContent = `${n}列`; });
}
const colsControl = () => `<div class="seg cols">
  <button type="button" data-cols="-1" aria-label="列を減らす">${ic('minus')}</button><span class="cols-n">${gridCols()}列</span><button type="button" data-cols="1" aria-label="列を増やす">${ic('plus')}</button>
</div>`;
document.addEventListener('click', e => {
  const b = e.target.closest('[data-cols]');
  if (!b) return;
  const n = Math.min(6, Math.max(1, gridCols() + Number(b.dataset.cols)));
  pref.set('gridCols', n);
  applyCols(n);
});
const viewToggle = mode => `${mode === 'grid' ? colsControl() : ''}<div class="seg" id="mode">
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
const fmtDate = t => new Date(t).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' });

// ---------- 画面 ----------
async function home() {
  setHeader('ホーム');
  const banners = await homeBanners();
  const today = new Date().toLocaleDateString('ja-JP', { month: 'long', day: 'numeric', weekday: 'short' });
  const head = `<header class="page-head"><p class="eyebrow">${today}</p><h1 class="large">持ち物</h1></header>`;
  if (!L.length && !I.length) {
    $view.innerHTML = head + banners + empty('box', 'ようこそ',
      'まずは「リビング」「押し入れ」など、モノをしまう場所を登録しましょう。',
      `<a class="btn primary" href="#/loc/new/edit">${ic('plus')}最初の場所を追加</a>`, 'hero');
    return;
  }
  const total = I.reduce((n, i) => n + (i.quantity ?? 0), 0);
  const recent = [...I].sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0)).slice(0, 10);
  const unplaced = itemsIn(null);
  const roots = childLocs(null);
  $view.innerHTML = `${head}${banners}
    <div class="stats">
      <div class="stat accent"><b>${I.length}</b><span>アイテム</span></div>
      <div class="stat"><b>${L.length}</b><span>場所</span></div>
      <div class="stat"><b>${total}</b><span>合計の数量</span></div>
    </div>
    ${secHead('場所', roots.length, `<a class="link" href="#/loc/new/edit">${ic('plus')}追加</a>`)}
    <div class="place-grid">${roots.map(placeCard).join('') || `<a class="add-tile" href="#/loc/new/edit">${ic('plus')}場所を追加</a>`}</div>
    ${recent.length ? secHead('アイテム', I.length, `<a class="link" href="#/items">一覧を見る${ic('chevR')}</a>`) + `<div class="hscroll">${recent.map(i => itemCard(i, true)).join('')}</div>` : ''}
    ${unplaced.length ? secHead('場所未設定', unplaced.length, `<button type="button" class="link" id="placeAll">${ic('pin')}まとめて場所へ</button>`)
      + `<a class="add-tile" href="#/bulk?unplaced=1" style="margin-bottom:12px">${ic('table')}選んで場所へ移動する</a>`
      + itemsBlock(unplaced, 'list') : ''}`;
  bindBanners();
  $view.querySelector('#placeAll')?.addEventListener('click', async () => {
    const r = await pickLocation(`場所未設定の ${unplaced.length} 件を移動`);
    if (!r || !r.locationId) return;
    const now = Date.now();
    await db.write(s => unplaced.forEach(it => s.items.put({ ...it, locationId: r.locationId, updatedAt: now })));
    await load();
    toast(`${unplaced.length} 件を「${pathText(r.locationId)}」に移動しました`);
    render();
  });
}
function bindBanners() {
  $view.querySelector('[data-snooze]')?.addEventListener('click', async () => {
    await db.setMeta('backupSnoozeUntil', Date.now() + 7 * DAY);
    render();
  });
}

function locView(id) {
  const l = loc(id);
  if (!l) return notFound(true);
  setHeader(l.name, {
    back: l.parentId ? `#/loc/${l.parentId}` : '#/',
    actions: iconBtn(`#/bulk?loc=${id}`, 'table', '一覧で編集'),
  });
  const kids = childLocs(id);
  const its = itemsIn(id);
  const mode = pref.get('itemView', 'grid');
  const PLACE_SORTS = ['new', 'name', 'tag', 'qty'];
  const sort = PLACE_SORTS.includes(pref.get('placeSort', 'new')) ? pref.get('placeSort', 'new') : 'new';
  const meta = [`${itemCount(id)} アイテム`, kids.length ? `${kids.length} 場所` : ''].filter(Boolean).join(' · ');
  $view.innerHTML = `
    ${crumbs(id)}
    <header class="hero-head">
      <span class="pi pi-lg" style="--c:${locColor(l)}">${ic(l.icon || 'box')}</span>
      <div><h1 class="large">${esc(l.name)}</h1><p class="meta">${meta}</p></div>
    </header>
    ${l.note ? `<p class="note-text">${esc(l.note)}</p>` : ''}
    <div class="quick-actions">
      <button type="button" data-q="moveLoc">${ic('layers')}<span>この場所を移動</span></button>
      <a href="#/label/${id}">${ic('qr')}<span>QRラベル</span></a>
      <a href="#/loc/${id}/edit">${ic('edit')}<span>名前・アイコン</span></a>
    </div>
    ${secHead('中の場所', kids.length || '', kids.length ? `<a class="link" href="#/loc/new/edit?parent=${id}">${ic('plus')}追加</a>` : '')}
    ${kids.length
      ? `<div class="place-grid">${kids.map(placeCard).join('')}</div>`
      : `<a class="add-tile" href="#/loc/new/edit?parent=${id}">${ic('plus')}この中に場所を追加（棚・引き出し・箱など）</a>`}
    ${secHead('アイテム', its.length, (its.length ? selectBtn() : '') + `<a class="link" href="#/loc/${id}/add">${ic('plus')}アイテムを追加</a>` + (its.length ? viewToggle(mode) : ''))}
    ${its.length
      ? `<div class="sort-row">${sortPicker(PLACE_SORTS, sort)}</div>${sortedBlock(its, sort, mode)}`
      : empty('image', 'まだアイテムがありません', '登録済みのアイテムから選んで入れたり、新しく登録したりできます',
        `<a class="btn primary" href="#/loc/${id}/add">${ic('plus')}アイテムを追加</a>`)}
    ${its.length ? '<p class="footnote">「選択」を押すか写真を長押しすると、写真をタップして選び、まとめて移動・タグ付け・削除ができます。</p>' : ''}`;
  bindViewToggle();
  $view.querySelector('#sortPick')?.addEventListener('change', e => { pref.set('placeSort', e.target.value); render(); });
  $view.querySelector('[data-q="moveLoc"]').onclick = async () => {
    // 自分自身と、自分の中の場所には移せない
    const r = await pickLocation(`「${esc(l.name)}」の移動先`, l.parentId, { exclude: new Set(descendantIds(id)), noneLabel: 'いちばん上' });
    if (!r || r.locationId === (l.parentId ?? null)) return;
    await db.put('locations', { ...loc(id), parentId: r.locationId, updatedAt: Date.now() });
    await load();
    toast(`「${r.locationId ? pathText(r.locationId) : 'いちばん上'}」に移動しました`);
    render();
  };
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
    v.updatedAt = Date.now();
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
    if (!(await confirmSheet('この場所を削除', msg, '削除する', true))) return;
    const now = Date.now();
    await db.write(s => {
      for (const k of kids) s.locations.put({ ...k, parentId: l.parentId ?? null, updatedAt: now });
      for (const i of its) s.items.put({ ...i, locationId: l.parentId ?? null, updatedAt: now });
      s.locations.delete(id);
    });
    await addTombstones([id]);
    await load();
    toast('削除しました');
    location.replace(l.parentId ? `#/loc/${l.parentId}` : '#/');
  });
}

function itemView(id) {
  const it = item(id);
  if (!it) return notFound(true);
  setHeader(it.name, {
    back: it.locationId ? `#/loc/${it.locationId}` : '#/',
    actions: iconBtn(`#/item/${id}/edit`, 'edit', '編集'),
  });
  const photos = it.photos ?? [];
  const hero = photos.length
    ? `<div class="hero"><div class="carousel" id="car">${photos.map(p => `<img data-photo="${p}" data-full alt="">`).join('')}</div>
        ${photos.length > 1 ? `<div class="dots" id="dots">${photos.map((_, i) => `<i class="${i ? '' : 'on'}"></i>`).join('')}</div>` : ''}</div>`
    : `<div class="hero noimg"></div>`;
  const where = it.locationId ? pathText(it.locationId) : '場所未設定';
  const rows = [
    it.tags?.length && `<div class="info-row">${ic('tag')}<div><div class="k">タグ</div><div class="chips">${it.tags.map(t =>
      `<a class="chip soft ${tagChildren(t).length ? 'parent' : ''}" href="#/search?tag=${encodeURIComponent(t)}">${tagLabel(t)}</a>`).join('')}</div></div></div>`,
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
      <div class="quick-actions">
        <button type="button" data-q="move">${ic('pin')}<span>場所を移動</span></button>
        <button type="button" data-q="tags">${ic('tag')}<span>タグを編集</span></button>
        <a href="#/item/${id}/edit">${ic('edit')}<span>名前・写真など</span></a>
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
    if (await bulkOps.del([id])) location.replace(it.locationId ? `#/loc/${it.locationId}` : '#/');
  };
  $view.querySelector('[data-q="move"]').onclick = async () => {
    const r = await pickLocation(`「${esc(it.name)}」を移動`, it.locationId);
    if (!r || r.locationId === (it.locationId ?? null)) return;
    await saveItems([{ ...item(id), locationId: r.locationId }]);
    toast(`「${pathText(r.locationId)}」に移動しました`);
    render();
  };
  $view.querySelector('[data-q="tags"]').onclick = async () => {
    const d = await sheet('タグを編集', tagPicker(it.tags ?? []), '保存');
    if (!d) return;
    await saveItems([{ ...item(id), tags: readTags(d) }]);
    toast('タグを保存しました');
    render();
  };
}

function itemEdit(id, q) {
  const isNew = id === 'new';
  const it = isNew
    ? { id: uid(), name: '', quantity: 1, locationId: q.get('loc') || null, tags: q.getAll('tag'), note: '', photos: [] }
    : item(id);
  if (!it) return notFound();
  // 「続けてもう1つ」で来たときは何件目かを出す
  const nth = Number(q.get('n')) || 0;
  if (nth) window.scrollTo(0, 0);
  setHeader(isNew ? (nth ? `新しいアイテム（${nth}件目）` : '新しいアイテム') : 'アイテムを編集', {
    back: isNew ? (it.locationId ? `#/loc/${it.locationId}` : '#/') : `#/item/${id}`, always: true,
  });
  // 保存するまで写真の変更は保留しておく
  const kept = [...(it.photos ?? [])];
  const added = []; // { key, blob, thumb, url }

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
        <div class="frow col">${tagEditor(it.tags ?? [])}</div>
      </div>
      <div class="group-title">メモ</div>
      <div class="group"><label class="frow col"><textarea name="note" maxlength="2000" placeholder="型番、買った店、使い方など">${esc(it.note)}</textarea></label></div>
      <div class="savebar">${isNew
        ? `<div class="save-row"><button class="btn" id="saveNext">${ic('plus')}保存して次へ</button><button class="btn primary">${ic('check')}保存</button></div>`
        : `<button class="btn primary block">${ic('check')}保存</button>`}</div>
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
        const { blob, thumb } = await makePhoto(file);
        added.push({ key: uid(), blob, thumb, url: URL.createObjectURL(blob) });
      } catch {
        toast('この画像は読み込めませんでした', 'error');
      }
    }
    $pick.value = '';
    drawPhotos();
    if (isLow(await storageInfo())) toast('端末の空き容量が少なくなっています。設定画面で確認してください。', 'error');
  };
  drawPhotos();

  f.querySelectorAll('[data-d]').forEach(b => b.onclick = () => {
    f.quantity.value = Math.max(0, (parseInt(f.quantity.value, 10) || 0) + Number(b.dataset.d));
  });

  bindTagEditors(f);

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
      tags: readTags(f),
      note: f.note.value.trim(),
      photos: [...added.map(a => a.key).reverse(), ...kept],
      createdAt: it.createdAt ?? Date.now(),
      updatedAt: Date.now(),
    };
    await db.write(s => {
      for (const a of added) {
        s.photos.put({ id: a.key, blob: a.blob });
        s.thumbs.put({ id: a.key, blob: a.thumb });
      }
      for (const p of removed) { s.photos.delete(p); s.thumbs.delete(p); }
      s.items.put(v);
    });
    removed.forEach(forgetPhoto);
    for (const a of added) photoUrls.set(`photos:${a.key}`, a.url);
    await load();
    if (e.submitter?.id === 'saveNext') {
      // 同じ場所・同じタグのまま、次のアイテムの入力に進む
      const next = (nth || 1) + 1;
      const p = new URLSearchParams({ n: next });
      if (v.locationId) p.set('loc', v.locationId);
      v.tags.forEach(t => p.append('tag', t));
      toast(`「${v.name}」を保存しました`);
      location.replace(`#/item/new/edit?${p}`);
      return;
    }
    toast('保存しました');
    location.replace(`#/item/${v.id}`);
  };
}

// 検索のタグの選び方：いちばん上のタグを並べ、親タグを選ぶと、その下に子タグの段が開く
function tagFilterChips(selected) {
  const open = new Set(); // 開く親：選んだ親タグと、選んだタグの上の親たち
  for (const t of selected) {
    tagPathList(t).slice(0, -1).forEach(x => open.add(x));
    if (tagChildren(t).length) open.add(t);
  }
  const byJa = list => list.sort((a, b) => a.localeCompare(b, 'ja'));
  const chip = t => {
    const kids = tagChildren(t).length;
    return `<button type="button" class="chip ${kids ? 'parent' : ''} ${open.has(t) ? 'open' : ''} ${selected.has(t) ? 'on' : ''}" data-t="${esc(t)}">#${esc(t)}${kids ? `<span class="kids">${kids}</span>` : ''}</button>`;
  };
  let html = `<div class="chips">${byJa(allTags().filter(t => !TP[t])).map(chip).join('')}</div>`;
  // allTags() は親 → 子の順なので、上の階層の段から順に並ぶ
  for (const p of allTags().filter(t => open.has(t))) {
    html += `<div class="chips sub-tags"><span class="sub-label">${esc(tagPath(p))} の中</span>${byJa(tagChildren(p)).map(chip).join('')}</div>`;
  }
  return html;
}

function searchView(_, q) {
  setHeader('検索');
  let text = q.get('q') ?? '';
  const tags = new Set(q.getAll('tag'));
  const mode = pref.get('itemView', 'grid');
  $view.innerHTML = `
    <header class="page-head"><h1 class="large">検索</h1></header>
    <div class="search-field"><label>${ic('search')}<input id="q" type="search" enterkeyhint="search" placeholder="名前・メモ・タグ・場所" value="${esc(text)}" autocomplete="off"></label></div>
    <div class="tag-filter" id="tags"></div>
    <div id="results"></div>`;
  const $q = $view.querySelector('#q');
  function draw() {
    const tagList = allTags();
    $view.querySelector('#tags').innerHTML = tagFilterChips(tags);
    const words = text.toLowerCase().split(/\s+/).filter(Boolean);
    const active = words.length || tags.size;
    const hits = active ? I.filter(it => {
      if ([...tags].some(t => !hasTag(it, t))) return false;
      const hay = [it.name, it.note, ...(it.tags ?? []), pathText(it.locationId)].join(' ').toLowerCase();
      return words.every(w => hay.includes(w));
    }).sort(byName) : [];
    const p = new URLSearchParams();
    if (text) p.set('q', text);
    tags.forEach(t => p.append('tag', t));
    const qs = p.toString();
    $view.querySelector('#results').innerHTML = !active
      ? `<div style="margin-top:20px">${empty('search', '何を探しますか？', tagList.length ? 'キーワードを入力するか、上のタグを選んでください' : 'キーワードを入力してください')}</div>`
      : hits.length
        ? `<div class="sec-head" style="margin-top:22px"><h2>${hits.length} 件</h2><span class="spacer"></span>${selectBtn()}<a class="icon-btn" href="#/bulk?${qs}" aria-label="一覧で編集">${ic('table')}</a>${viewToggle(mode)}</div>${itemsBlock(hits, mode, true)}`
        : `<div style="margin-top:20px">${empty('search', '見つかりませんでした', '別のことばで試してみてください')}</div>`;
    bindViewToggle();
    hydratePhotos();
    // 戻ったときに検索条件が残るように URL に反映
    history.replaceState(null, '', `#/search${qs ? '?' + qs : ''}`);
  }
  $q.oninput = () => { text = $q.value; draw(); };
  $view.querySelector('#tags').onclick = e => {
    const t = e.target.closest('[data-t]')?.dataset.t;
    if (!t) return;
    // 親タグを外したときは、その中で選んでいた子タグも外して段を閉じる
    if (tags.has(t)) tagDescendants(t).forEach(x => tags.delete(x));
    else tags.add(t);
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
        <div class="lhint">モノ管理アプリの「スキャン」で読み取り</div>
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
    if (!r && /^https?:\/\//.test(text)) {
      msg.innerHTML = `<a class="btn primary" href="${esc(text)}" target="_blank" rel="noopener">${ic('download')}QR のページを開く</a>`;
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
const DAY = 24 * 60 * 60 * 1000;

const blobToDataUrl = b => new Promise((res, rej) => {
  const r = new FileReader();
  r.onload = () => res(r.result);
  r.onerror = () => rej(r.error);
  r.readAsDataURL(b);
});

// 写真も文字（data URL）にして、1つの JSON ファイルにまとめる。
// 全体を1本の文字列にはせず、写真1枚ずつの部品をつないで Blob にするので、メモリを食いにくい
async function buildBackup() {
  const [photos, thumbs, deleted] = await Promise.all([db.getAll('photos'), db.getAll('thumbs'), db.getMeta('deleted')]);
  const head = JSON.stringify({ app: 'mono-kanri', version: 4, exportedAt: new Date().toISOString(), locations: L, items: I, deleted: deleted ?? {}, tagParents: TP });
  const parts = [head.slice(0, -1)];
  for (const [key, list] of [['photos', photos], ['thumbs', thumbs]]) {
    parts.push(`,"${key}":[`);
    for (const [i, p] of list.filter(x => x.blob).entries()) parts.push((i ? ',' : '') + JSON.stringify({ id: p.id, data: await blobToDataUrl(p.blob) }));
    parts.push(']');
  }
  parts.push('}');
  return new Blob(parts, { type: 'application/json' });
}
async function exportBackup() {
  const json = await buildBackup();
  const name = `mono-kanri-${new Date().toLocaleDateString('sv-SE')}.json`;
  const file = new File([json], name, { type: 'application/json' });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: name });
      return true;
    } catch (e) {
      if (e.name === 'AbortError') return false;
    }
  }
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(json), download: name });
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 60000);
  return true;
}

// JSON（今の形式・最初の版の形式）と ZIP（バージョン 1.2〜1.6 の形式）の両方を読める
async function readBackup(file) {
  const head = new Uint8Array(await file.slice(0, 2).arrayBuffer());
  const photos = [], thumbs = [];
  let data;
  if (head[0] === 0x50 && head[1] === 0x4b) { // "PK"
    const entries = await readZip(file);
    data = JSON.parse(await entries.get('data.json').text());
    for (const [name, blob] of entries) {
      const m = name.match(/^(photos|thumbs)\/([\w-]+)\.jpg$/);
      if (m) (m[1] === 'photos' ? photos : thumbs).push({ id: m[2], blob: new Blob([blob], { type: 'image/jpeg' }) });
    }
  } else {
    data = JSON.parse(await file.text());
    const toBlob = async p => ({ id: p.id, blob: await (await fetch(p.data)).blob() });
    for (const p of data.photos ?? []) photos.push(await toBlob(p));
    for (const t of data.thumbs ?? []) thumbs.push(await toBlob(t));
  }
  if (data.app !== 'mono-kanri' || !Array.isArray(data.items) || !Array.isArray(data.locations)) throw new Error('not a backup');
  return { locations: data.locations, items: data.items, deleted: data.deleted ?? {}, tagParents: data.tagParents ?? {}, photos, thumbs };
}

async function settingsView() {
  setHeader('設定');
  const photoCount = I.reduce((n, i) => n + (i.photos?.length ?? 0), 0);
  const [s, last] = await Promise.all([storageInfo(), db.getMeta('lastBackupAt')]);
  const pct = s.quota ? Math.min(100, (s.usage / s.quota) * 100) : 0;
  const persistRow = s.persisted
    ? '<span>有効</span>'
    : s.persisted === false ? '<button class="link" id="persist">有効にする</button>' : '<span>この端末では使えません</span>';
  $view.innerHTML = `
    <header class="page-head"><h1 class="large">設定</h1></header>
    <div class="group-title">バックアップ</div>
    <div class="group">
      <button class="row-btn" id="export"><span class="lead">${ic('download')}</span><span>バックアップを書き出す</span>${ic('chevR', 'row-chev')}</button>
      <button class="row-btn" id="import"><span class="lead" style="background:#14b8a6">${ic('upload')}</span><span>バックアップから復元</span>${ic('chevR', 'row-chev')}</button>
      <button class="row-btn" id="merge"><span class="lead" style="background:#22c55e">${ic('layers')}</span><span>ファイルを合わせて取り込む</span>${ic('chevR', 'row-chev')}</button>
      <div class="kv-row"><span>前回のバックアップ</span><span>${last ? fmtDate(last) : 'まだありません'}</span></div>
    </div>
    <p class="footnote">写真も含めて1つの JSON ファイルにまとめます。iPhone は「"ファイル"に保存」、Android は Google ドライブなどに保存しておくと、機種変更のときもそのまま復元できます。<br>「復元」は今のデータを全部置き換えます。PC から送ったファイルなど、両方で編集したデータは「合わせて取り込む」を使うと、新しく直した方を残して合わせます。</p>
    <input type="file" id="file" accept=".zip,application/zip,.json,application/json" hidden>
    <input type="file" id="mergeFile" accept=".json,application/json,.zip,application/zip" hidden>
    ${pcServer ? `<div class="group-title">スマホと受け渡し</div>
    <div class="group"><a class="row-btn" href="#/transfer"><span class="lead" style="background:#22c55e">${ic('phone')}</span><span>スマホとデータを受け渡す</span>${ic('chevR', 'row-chev')}</a></div>
    <p class="footnote">PC サーバー（server.py）で開いているときだけ表示されます。</p>` : ''}

    <div class="group-title">まとめて登録</div>
    <div class="group">
      <a class="row-btn" href="#/tags"><span class="lead" style="background:#ec4899">${ic('tag')}</span><span>タグの管理</span>${ic('chevR', 'row-chev')}</a>
      <a class="row-btn" href="#/text"><span class="lead" style="background:#a855f7">${ic('note')}</span><span>テキストでまとめて追加</span>${ic('chevR', 'row-chev')}</a>
      <button class="row-btn" id="csv"><span class="lead" style="background:#f59e0b">${ic('table')}</span><span>CSV ファイルから追加</span>${ic('chevR', 'row-chev')}</button>
      <a class="row-btn" href="#/bulk"><span class="lead" style="background:#0ea5e9">${ic('table')}</span><span>すべてのアイテムを一覧で編集</span>${ic('chevR', 'row-chev')}</a>
      <button class="row-btn" id="csvTemplate"><span class="lead" style="background:#64748b">${ic('download')}</span><span>ひな形の CSV をダウンロード</span>${ic('chevR', 'row-chev')}</button>
    </div>
    <p class="footnote">PC の Excel や Google スプレッドシートで「名前・数量・場所・タグ・メモ」を1行に1つずつ入力し、CSV で保存して読み込みます。場所は「押し入れ/箱A」のように書くと、まだない場所は自動で作ります。</p>
    <input type="file" id="csvFile" accept=".csv,text/csv,text/comma-separated-values" hidden>

    <div class="group-title">容量</div>
    <div class="group">
      <div class="usage">
        <div class="usage-top"><b>${fmtBytes(s.usage)}</b><span>上限 ${fmtBytes(s.quota)}</span></div>
        <div class="bar ${isLow(s) ? 'low' : ''}"><i style="width:${s.usage ? Math.max(pct, 1.5) : 0}%"></i></div>
        <p>場所 ${L.length}・アイテム ${I.length}・写真 ${photoCount} 枚</p>
      </div>
      <div class="kv-row"><span>消えにくい保存</span>${persistRow}</div>
      <div class="kv-row"><span>写真の保存形式</span><span>${(await photoType()) === 'image/webp' ? 'WebP' : 'JPEG'}・長辺 ${PHOTO[0]}px</span></div>
      ${photoCount ? `<button class="row-btn" id="recompress"><span class="lead" style="background:#0ea5e9">${ic('image')}</span><span>今ある写真を圧縮し直す</span>${ic('chevR', 'row-chev')}</button>` : ''}
    </div>
    <p class="footnote">「消えにくい保存」が有効だと、端末の空きが少なくなってもブラウザがデータを消しにくくなります。ホーム画面に追加して使うと有効になりやすくなります。</p>

    <div class="group-title">このアプリについて</div>
    <div class="group"><div class="kv-row"><span>モノ管理</span><span>バージョン 1.17</span></div></div>`;

  const $export = $view.querySelector('#export');
  $export.onclick = async () => {
    if ($export.disabled) return;
    const label = $export.querySelector('span:not(.lead)');
    $export.disabled = true;
    label.textContent = 'バックアップを作成中…';
    try {
      if (await exportBackup()) {
        await db.setMeta('lastBackupAt', Date.now());
        toast('バックアップを書き出しました');
        render();
      }
    } finally {
      $export.disabled = false;
      label.textContent = 'バックアップを書き出す';
    }
  };

  const $file = $view.querySelector('#file');
  $view.querySelector('#import').onclick = () => $file.click();
  $file.onchange = async () => {
    const f = $file.files[0];
    $file.value = '';
    if (!f) return;
    let data;
    try {
      data = await readBackup(f);
    } catch {
      return toast('このアプリのバックアップファイルではないようです', 'error');
    }
    if (!(await confirmSheet('バックアップから復元', `今のデータを消して、バックアップ（場所 ${data.locations.length}・アイテム ${data.items.length}・写真 ${data.photos.length} 枚）に置き換えます。`, '置き換える', true))) return;
    await db.replaceAll(data);
    await db.setMeta('tagParents', data.tagParents ?? {});
    for (const u of photoUrls.values()) if (u) URL.revokeObjectURL(u);
    photoUrls.clear();
    await load();
    ensureThumbs();
    toast('復元しました');
    location.hash = '#/';
  };

  const $mergeFile = $view.querySelector('#mergeFile');
  $view.querySelector('#merge').onclick = () => $mergeFile.click();
  $mergeFile.onchange = async () => {
    const f = $mergeFile.files[0];
    $mergeFile.value = '';
    if (f && await mergeFromFile(f)) location.hash = '#/';
  };

  const $csv = $view.querySelector('#csvFile');
  $view.querySelector('#csv').onclick = () => $csv.click();
  $csv.onchange = async () => {
    const f = $csv.files[0];
    $csv.value = '';
    if (!f) return;
    const { rows, skipped } = csvToRows(parseCsv(await decodeCsv(f)));
    pendingImport = { ...planImport(rows), skipped, fileName: f.name };
    location.hash = '#/import';
  };
  $view.querySelector('#csvTemplate').onclick = () =>
    downloadFile(new Blob(['﻿' + toCsv(CSV_TEMPLATE)], { type: 'text/csv' }), 'mono-kanri-ひな形.csv');

  const $re = $view.querySelector('#recompress');
  $re?.addEventListener('click', async () => {
    if ($re.disabled) return;
    if (!(await confirmSheet('写真を圧縮し直す', `今ある写真 ${photoCount} 枚を、長辺 ${PHOTO[0]}px・${(await photoType()) === 'image/webp' ? 'WebP' : 'JPEG'} で保存し直して容量を減らします。
画質は少し下がり、元には戻せません。小さくならない写真はそのままにします。
念のため、先にバックアップを書き出しておくと安心です。`, '圧縮する'))) return;
    const label = $re.querySelector('span:not(.lead)');
    $re.disabled = true;
    try {
      const r = await recompressPhotos((i, n) => { label.textContent = `圧縮しています… ${i} / ${n}`; });
      toast(`${fmtBytes(r.before)} → ${fmtBytes(r.after)} になりました`);
    } finally {
      render();
    }
  });

  $view.querySelector('#persist')?.addEventListener('click', async () => {
    const ok = await navigator.storage.persist();
    toast(ok ? '消えにくい保存を有効にしました' : 'ブラウザに許可されませんでした。ホーム画面に追加してから試してください。', ok ? 'ok' : 'error');
    render();
  });
}

// ホームに出すお知らせ（iPhone のホーム画面追加・容量不足・バックアップ）
const banner = (icon, title, text, actions = '', cls = '') =>
  `<div class="banner ${cls}"><span class="lead">${ic(icon)}</span><div><b>${title}</b><p>${text}</p>${actions ? `<div class="banner-actions">${actions}</div>` : ''}</div></div>`;
async function homeBanners() {
  const out = [];
  // navigator.standalone は iPhone / iPad の Safari にだけある
  if (navigator.standalone === false) {
    out.push(banner('phone', 'ホーム画面に追加して使ってください',
      'Safari のまま使うと、しばらく開かなかったときにデータが消されることがあります。共有ボタンから「ホーム画面に追加」を選んでください。', '', 'warn'));
  }
  const s = await storageInfo();
  if (isLow(s)) {
    out.push(banner('alert', '空き容量が少なくなっています',
      `使用量 ${fmtBytes(s.usage)}（上限 ${fmtBytes(s.quota)}）。バックアップを取ってから、写真を整理してください。`,
      '<a class="btn sm" href="#/settings">確認する</a>', 'warn'));
  }
  const [last, snooze] = await Promise.all([db.getMeta('lastBackupAt'), db.getMeta('backupSnoozeUntil')]);
  const now = Date.now();
  const due = I.length > 0 && (last ? now - last > 30 * DAY : I.length >= 10) && !(snooze > now);
  if (due) {
    out.push(banner('archive', 'バックアップしておきましょう',
      last ? `前回のバックアップから ${Math.floor((now - last) / DAY)} 日たっています。` : 'まだ一度もバックアップしていません。データはこの端末の中だけにあります。',
      '<a class="btn sm primary" href="#/settings">書き出す</a><button type="button" class="btn sm" data-snooze>あとで</button>'));
  }
  return out.join('');
}

// ---------- CSV からまとめて追加 ----------
const CSV_COLS = {
  name: ['名前', '品名', '商品名', 'name'],
  quantity: ['数量', '個数', 'quantity', 'qty'],
  location: ['場所', 'location'],
  tags: ['タグ', 'tag', 'tags'],
  note: ['メモ', '備考', 'note'],
};
const CSV_TEMPLATE = [
  ['名前', '数量', '場所', 'タグ', 'メモ'],
  ['延長コード', '2', 'リビング/テレビ台', '電気、予備', '3mと1m'],
  ['KINGDOM HEARTS III ブリングアーツ リク', '1', '押し入れ/フィギュア棚', 'キングダムハーツ、フィギュア', ''],
  ['単3電池', '8', 'キッチン/引き出し', '消耗品', ''],
];

// 1行目が見出しなら列名で、なければ「名前・数量・場所・タグ・メモ」の順として読む
function csvToRows(table) {
  const rows = table.filter(r => r.some(c => c.trim()));
  const head = (rows[0] ?? []).map(c => c.trim().toLowerCase());
  const idx = Object.fromEntries(Object.entries(CSV_COLS).map(([k, names]) => [k, head.findIndex(h => names.includes(h))]));
  const hasHeader = idx.name >= 0;
  if (!hasHeader) Object.assign(idx, { name: 0, quantity: 1, location: 2, tags: 3, note: 4 });
  const out = [];
  let skipped = 0;
  for (const r of hasHeader ? rows.slice(1) : rows) {
    const get = k => (idx[k] >= 0 ? r[idx[k]] ?? '' : '').trim();
    const name = get('name');
    if (!name) { skipped++; continue; }
    const qty = parseInt(get('quantity').normalize('NFKC').replace(/[^\d]/g, ''), 10);
    out.push({
      name,
      quantity: Number.isFinite(qty) ? qty : 1,
      path: get('location').split(/\s*[/／>＞›]\s*/).filter(Boolean),
      tags: parseTagsLoose(get('tags')),
      note: get('note'),
    });
  }
  return { rows: out, skipped };
}

// 場所は「押し入れ/箱A」のような書き方で、なければ新しく作る
function planImport(rows) {
  const all = [...L];
  const newLocs = [];
  const now = Date.now();
  const items = rows.map((r, i) => {
    let pid = null;
    for (const name of r.path) {
      let l = all.find(x => (x.parentId ?? null) === pid && x.name === name);
      if (!l) {
        l = { id: uid(), name, parentId: pid, note: '', icon: 'box', createdAt: now, updatedAt: now };
        all.push(l);
        newLocs.push(l);
      }
      pid = l.id;
    }
    return { id: uid(), name: r.name, quantity: r.quantity, locationId: pid, tags: r.tags, note: r.note, photos: [], createdAt: now + i, updatedAt: now + i };
  });
  const pathOf = id => {
    const out = [];
    for (let l = all.find(x => x.id === id); l; l = all.find(x => x.id === l.parentId)) out.unshift(l.name);
    return out.join(' › ');
  };
  return { items, newLocs, pathOf };
}

let pendingImport = null;

// ---------- テキストでまとめて追加（comfy-app の「まとめて登録」と同じ書き方） ----------
// [押し入れ > フィギュア棚] #タグ   … この行から下は、この場所・このタグで登録する
// 名前 ×2 #タグ = メモ              … 1行に1アイテム。×数・#タグ・= メモ は省略できる
const TEXT_EXAMPLE = `[押し入れ > フィギュア棚] #キングダムハーツ #フィギュア
KINGDOM HEARTS III ブリングアーツ ソラ
KINGDOM HEARTS III ブリングアーツ リク ×2 = 1体は箱なし

[リビング > テレビ台]
延長コード ×3 #電気
HDMIケーブル`;

function parseText(text) {
  let path = [];
  let groupTags = [];
  const rows = [];
  for (const raw of text.split(/\r?\n/)) {
    let line = raw.trim();
    if (!line || line.startsWith('//')) continue;
    const head = line.match(/^[[［](.*?)[\]］]\s*(.*)$/);
    if (head) {
      path = head[1].split(/\s*[>＞/／›]\s*/).filter(Boolean);
      groupTags = (head[2].match(/[#＃][^\s#＃]+/g) ?? []).map(t => t.slice(1));
      continue;
    }
    let note = '';
    const eq = line.search(/[=＝]/);
    if (eq >= 0) {
      note = line.slice(eq + 1).trim();
      line = line.slice(0, eq).trim();
    }
    const tags = [...groupTags];
    line = line.replace(/(^|\s)[#＃]([^\s#＃]+)/g, (_, sp, t) => { tags.push(t); return ' '; }).trim();
    let quantity = 1;
    // 「×2」「x2」「*2」や「8本」「3個」のように末尾に書いた数は数量にする
    line = line.replace(/\s*(?:[×✕xX*＊]\s*([0-9０-９]+)|\s([0-9０-９]+)\s*(?:個|本|枚|冊|つ|体|台|箱|着|足))$/, (_, a, b) => {
      quantity = parseInt((a ?? b).normalize('NFKC'), 10);
      return '';
    }).trim();
    if (line) rows.push({ name: line, quantity, path, tags: [...new Set(tags)], note });
  }
  return rows;
}

function textView(_, q) {
  const locId = q.get('loc');
  setHeader('テキストでまとめて追加', { back: locId ? `#/loc/${locId}` : '#/settings', always: true });
  let draft = pref.get('textDraft', '');
  if (!draft.trim() && locId && loc(locId)) draft = `[${locPath(locId).map(l => l.name).join(' > ')}]\n`;
  $view.innerHTML = `
    <details class="panel help" ${pref.get('textHelpSeen', '') ? '' : 'open'}>
      <summary>${ic('info')}書き方</summary>
      <ul>
        <li>1行に1つずつ、名前を書きます</li>
        <li><code>[押し入れ > フィギュア棚]</code> の行から下は、その場所に入ります（なければ作ります）</li>
        <li>見出しの行に <code>#タグ</code> を付けると、その下の全部に付きます</li>
        <li>名前のあとに <code>×2</code> や <code>8本</code> で数量、<code>#タグ</code> でタグ、<code>= メモ</code> でメモ</li>
      </ul>
      <pre>${esc(TEXT_EXAMPLE)}</pre>
      <button type="button" class="link" id="useExample">${ic('edit')}この例を入れてみる</button>
    </details>
    <textarea id="txt" class="bigtext" spellcheck="false" placeholder="[場所 > 場所] #タグ&#10;名前&#10;名前 ×2">${esc(draft)}</textarea>
    <p class="footnote" id="live"></p>
    <div class="savebar"><button class="btn primary block" id="next">${ic('check')}内容を確認する</button></div>`;

  const $txt = $view.querySelector('#txt');
  const $live = $view.querySelector('#live');
  const $next = $view.querySelector('#next');
  function update() {
    pref.set('textDraft', $txt.value);
    const rows = parseText($txt.value);
    const { newLocs } = planImport(rows);
    $live.textContent = rows.length
      ? `${rows.length} 件のアイテム${newLocs.length ? `・新しい場所 ${newLocs.length}` : ''}`
      : '名前を1行に1つずつ書いてください';
    $next.disabled = !rows.length;
  }
  $txt.oninput = update;
  $view.querySelector('details').ontoggle = () => pref.set('textHelpSeen', '1');
  $view.querySelector('#useExample').onclick = () => {
    $txt.value = TEXT_EXAMPLE;
    update();
    $txt.focus();
  };
  $next.onclick = () => {
    pendingImport = {
      ...planImport(parseText($txt.value)), skipped: 0, fileName: 'テキストで入力',
      title: 'テキストから追加', back: location.hash, onDone: () => pref.set('textDraft', ''),
    };
    location.hash = '#/import';
  };
  update();
  if (!draft.trim() || draft.endsWith('\n')) {
    $txt.focus();
    $txt.setSelectionRange($txt.value.length, $txt.value.length);
  }
}


function importView() {
  if (!pendingImport) return void location.replace('#/settings');
  const { items, newLocs, skipped, pathOf, fileName, title = 'CSVから追加', back = '#/settings', onDone } = pendingImport;
  setHeader(title, { back, always: true });
  const MAX = 100;
  const row = it => `<div class="row">
    <span class="row-media"><span class="ph-tile" style="--c:${hue(it.name)}">${initial(it.name)}</span></span>
    <span class="row-main"><span class="row-title">${esc(it.name)}</span><span class="row-sub">${esc([it.locationId ? pathOf(it.locationId) : '場所未設定', tagText(it)].filter(Boolean).join('　'))}</span></span>
    <span class="row-qty">×${it.quantity}</span>
  </div>`;
  $view.innerHTML = `
    <p class="meta" style="margin:4px 2px 0">${esc(fileName)}</p>
    <div class="stats">
      <div class="stat accent"><b>${items.length}</b><span>追加するアイテム</span></div>
      <div class="stat"><b>${newLocs.length}</b><span>新しく作る場所</span></div>
      <div class="stat"><b>${skipped}</b><span>飛ばす行</span></div>
    </div>
    ${skipped ? '<p class="footnote">名前が空の行は飛ばします。</p>' : ''}
    ${!items.length
      ? `<div style="margin-top:20px">${empty('info', '追加できる行がありませんでした', '1列目に名前を入れた CSV か、「名前」という見出しのある CSV を選んでください')}</div>`
      : `${newLocs.length ? secHead('新しく作る場所', newLocs.length) + `<div class="chips">${newLocs.map(l => `<span class="chip">${ic('box')}${esc(pathOf(l.id))}</span>`).join('')}</div>` : ''}
         ${secHead('追加するアイテム', items.length)}
         <div class="list">${items.slice(0, MAX).map(row).join('')}</div>
         ${items.length > MAX ? `<p class="footnote">ほか ${items.length - MAX} 件</p>` : ''}
         <p class="footnote">写真はあとからアイテムごとに追加できます。</p>
         <div class="savebar"><button class="btn primary block" id="go">${ic('check')}${items.length} 件を追加する</button></div>`}`;
  $view.querySelector('#go')?.addEventListener('click', async e => {
    e.currentTarget.disabled = true;
    await db.write(s => {
      for (const l of newLocs) s.locations.put(l);
      for (const it of items) s.items.put(it);
    });
    pendingImport = null;
    onDone?.();
    await load();
    toast(`${items.length} 件を追加しました`);
    location.replace('#/');
  });
}

function downloadFile(blob, name) {
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: name });
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 60000);
}

// ---------- 一覧で編集（表の形でまとめて直す・選んだものに一括でタグ付けなど） ----------

// 下から出てくるシート。OK なら dialog 要素、キャンセルなら null を返す
function sheetDialog() {
  let d = document.getElementById('dlg');
  if (!d) {
    d = Object.assign(document.createElement('dialog'), { id: 'dlg', className: 'sheet-dlg' });
    document.body.append(d);
  }
  return d;
}
function sheet(title, body, okLabel, danger = false) {
  const d = sheetDialog();
  d.innerHTML = `<form method="dialog" class="sheet-body">
    <h3>${title}</h3>${body}
    <div class="save-row"><button type="button" class="btn" data-cancel>キャンセル</button><button value="ok" class="btn primary${danger ? ' danger' : ''}">${okLabel}</button></div>
  </form>`;
  bindTagEditors(d);
  d.showModal();
  // 閉じたときのイベントは画面が止まっていると届かないことがあるので、ボタンを押した時点で返す
  return new Promise(res => {
    const done = ok => { if (d.open) d.close(); res(ok ? d : null); };
    d.querySelector('form').onsubmit = e => { e.preventDefault(); done(true); };
    d.querySelector('[data-cancel]').onclick = () => done(false);
    d.oncancel = () => done(false); // Esc キーなど
  });
}
// ブラウザの確認ダイアログの代わり（ダイアログが出ないブラウザでも使える）
async function confirmSheet(title, message, okLabel = 'OK', danger = false) {
  const body = message ? `<p class="sheet-msg">${esc(message).replace(/\n/g, '<br>')}</p>` : '';
  return !!(await sheet(title, body, okLabel, danger));
}
const tagPicker = current => `<div class="group"><div class="frow col">${tagEditor(current)}</div></div>`;

// 移動先を選ぶ。まだない場所は名前を入れればその場で作る（「押し入れ > 箱A」のように書ける）
const pickLocation = async (title, current = null, { exclude = new Set(), noneLabel = '場所未設定' } = {}) => {
  const d = await sheet(title, `
    <div class="group">
      <label class="frow"><span>場所</span><select name="loc"><option value="">${noneLabel}</option>${locOptions(current, exclude)}</select></label>
      <label class="frow"><span>新規</span><input name="newLoc" placeholder="新しい場所（例：押し入れ > 箱A）" autocomplete="off"></label>
    </div>
    <p class="footnote">新しい場所の名前を入れると、その場所を作って移動します。</p>`, '移動する');
  if (!d) return null;
  const path = d.querySelector('[name=newLoc]').value.split(/\s*[>＞/／›]\s*/).filter(Boolean);
  if (!path.length) return { locationId: d.querySelector('[name=loc]').value || null };
  const { items, newLocs } = planImport([{ name: '_', quantity: 1, path, tags: [], note: '' }]);
  if (newLocs.length) {
    await db.write(s => newLocs.forEach(l => s.locations.put(l)));
    await load();
  }
  return { locationId: items[0].locationId };
};

// ---------- 選んだアイテムへの一括操作（選択モード・一覧で編集・アイテム画面で共通）。変えたら true ----------
const pickItems = ids => { const set = new Set(ids); return I.filter(i => set.has(i.id)); };
async function saveItems(list) {
  const now = Date.now();
  await db.write(s => list.forEach(it => s.items.put({ ...it, updatedAt: now })));
  await load();
}
const bulkOps = {
  async move(ids) {
    const r = await pickLocation(`${ids.length} 件の場所を移動`);
    if (!r) return false;
    // 新しい場所を作ると読み直すので、アイテムはそのあとで取り直す
    await saveItems(pickItems(ids).map(it => ({ ...it, locationId: r.locationId })));
    toast(`${ids.length} 件を「${pathText(r.locationId)}」に移動しました`);
    return true;
  },
  async tagAdd(ids) {
    const d = await sheet(`${ids.length} 件にタグを追加`, tagPicker([]), '追加する');
    const add = d ? readTags(d) : [];
    if (!add.length) return false;
    await saveItems(pickItems(ids).map(it => ({ ...it, tags: [...new Set([...(it.tags ?? []), ...add])] })));
    toast(`${ids.length} 件に ${add.map(t => '#' + t).join(' ')} を追加しました`);
    return true;
  },
  async tagRemove(ids) {
    const present = [...new Set(pickItems(ids).flatMap(i => i.tags ?? []))].sort((a, b) => a.localeCompare(b, 'ja'));
    if (!present.length) { toast('選んだアイテムにはタグがありません', 'error'); return false; }
    const d = await sheet(`${ids.length} 件からタグを外す`,
      `<div class="chips sheet-chips">${present.map(t => `<label class="chip toggle"><input type="checkbox" name="t" value="${esc(t)}">#${esc(t)}</label>`).join('')}</div>`, '外す');
    const rm = d ? [...d.querySelectorAll('[name=t]:checked')].map(c => c.value) : [];
    if (!rm.length) return false;
    await saveItems(pickItems(ids).map(it => ({ ...it, tags: (it.tags ?? []).filter(t => !rm.includes(t)) })));
    toast(`${ids.length} 件から ${rm.map(t => '#' + t).join(' ')} を外しました`);
    return true;
  },
  async del(ids) {
    const list = pickItems(ids);
    const what = list.length === 1 ? `「${list[0].name}」` : `${list.length} 件のアイテム`;
    if (!(await confirmSheet(`${what}を削除`, '写真も一緒に消えます。元に戻せません。', '削除する', true))) return false;
    await db.write(s => list.forEach(it => {
      s.items.delete(it.id);
      for (const p of it.photos ?? []) { s.photos.delete(p); s.thumbs.delete(p); }
    }));
    await addTombstones(list.map(it => it.id));
    list.forEach(it => (it.photos ?? []).forEach(forgetPhoto));
    await load();
    toast(`${list.length} 件を削除しました`);
    return true;
  },
};
const BULK_BUTTONS = `
  <button type="button" data-act="move">${ic('pin')}<span>場所を移動</span></button>
  <button type="button" data-act="tagAdd">${ic('tag')}<span>タグ追加</span></button>
  <button type="button" data-act="tagRemove">${ic('x')}<span>タグを外す</span></button>
  <button type="button" data-act="del" class="danger">${ic('trash')}<span>削除</span></button>`;

// ---------- 選択モード：カードを長押し（または「選択」）で複数選び、下のバーでまとめて操作する ----------
const sel = { on: false, ids: new Set(), bar: null };
const cardOf = el => el.closest('.item-card[data-id], .row[data-id]');
const visibleIds = () => [...new Set([...$view.querySelectorAll('.item-card[data-id], .row[data-id]')].map(e => e.dataset.id))];
const selectBtn = () => `<button type="button" class="link" data-select-start>${ic('check')}選択</button>`;

function startSelect(firstId) {
  if (!sel.on) {
    sel.on = true;
    sel.ids.clear();
    document.body.classList.add('selecting');
    sel.bar = Object.assign(document.createElement('div'), { className: 'bulkbar selbar' });
    sel.bar.innerHTML = `
      <div class="sel-top"><button type="button" class="link" data-sel-all></button><span class="sel-count"></span><button type="button" class="link" data-sel-done>完了</button></div>
      <div class="bulk-actions">${BULK_BUTTONS}</div>`;
    sel.bar.onclick = async e => {
      if (e.target.closest('[data-sel-done]')) return exitSelect();
      if (e.target.closest('[data-sel-all]')) {
        const all = visibleIds();
        const every = all.every(id => sel.ids.has(id));
        all.forEach(id => (every ? sel.ids.delete(id) : sel.ids.add(id)));
        return drawSel();
      }
      const act = e.target.closest('[data-act]')?.dataset.act;
      if (act && sel.ids.size && await bulkOps[act]([...sel.ids])) {
        exitSelect();
        render();
      }
    };
    document.body.append(sel.bar);
  }
  if (firstId) sel.ids.add(firstId);
  drawSel();
}
function exitSelect() {
  if (!sel.on) return;
  sel.on = false;
  sel.ids.clear();
  sel.bar?.remove();
  sel.bar = null;
  document.body.classList.remove('selecting');
  $view.querySelectorAll('.picked').forEach(e => e.classList.remove('picked'));
  $view.querySelectorAll('[data-select-start]').forEach(b => b.classList.remove('active'));
}
function drawSel() {
  if (!sel.on) return;
  $view.querySelectorAll('.item-card[data-id], .row[data-id]').forEach(e => e.classList.toggle('picked', sel.ids.has(e.dataset.id)));
  sel.bar.querySelector('.sel-count').textContent = sel.ids.size ? `${sel.ids.size} 件を選択中` : 'タップして選んでください';
  sel.bar.querySelectorAll('[data-act]').forEach(b => { b.disabled = !sel.ids.size; });
  const all = visibleIds();
  sel.bar.querySelector('[data-sel-all]').textContent = all.length && all.every(id => sel.ids.has(id)) ? '選択を解除' : 'すべて選択';
  // 「選択」ボタンがある画面は、それをもう一度押して終える。ない画面（ホームの長押しなど）だけ「完了」を出す
  const btns = $view.querySelectorAll('[data-select-start]');
  btns.forEach(b => b.classList.add('active'));
  sel.bar.querySelector('[data-sel-done]').hidden = btns.length > 0;
}
(function bindSelect() {
  let timer = null, start = null, longPressed = false;
  const cancel = () => clearTimeout(timer);
  $view.addEventListener('pointerdown', e => {
    longPressed = false;
    const c = cardOf(e.target);
    if (!c || sel.on || document.body.classList.contains('editing')) return;
    start = [e.clientX, e.clientY];
    timer = setTimeout(() => {
      longPressed = true;
      navigator.vibrate?.(15);
      startSelect(c.dataset.id);
    }, 450);
  });
  $view.addEventListener('pointerup', cancel);
  $view.addEventListener('pointercancel', cancel);
  $view.addEventListener('pointermove', e => {
    if (start && Math.hypot(e.clientX - start[0], e.clientY - start[1]) > 10) cancel();
  });
  // 長押しで出るブラウザのメニュー（リンクのプレビューなど）を出さない
  $view.addEventListener('contextmenu', e => { if (cardOf(e.target)) e.preventDefault(); });
  $view.addEventListener('click', e => {
    if (e.target.closest('[data-select-start]')) return sel.on ? exitSelect() : startSelect();
    const c = cardOf(e.target);
    if (!c) return;
    if (longPressed) { e.preventDefault(); longPressed = false; return; }
    if (!sel.on) return;
    e.preventDefault(); // 選択モード中は開かずに、選ぶ／外す
    const id = c.dataset.id;
    sel.ids.has(id) ? sel.ids.delete(id) : sel.ids.add(id);
    drawSel();
  });
})();

function bulkView(_, q) {
  const locId = q.get('loc');
  const unplacedOnly = q.has('unplaced');
  const inScope = locId ? new Set(descendantIds(locId)) : null;
  const tags = q.getAll('tag');
  let text = q.get('q') ?? '';
  const selected = new Set();
  setHeader('一覧で編集', { back: locId ? `#/loc/${locId}` : '#/', always: true });
  const scope = locId
    ? `${esc(pathText(locId))}（中の場所も含む）`
    : unplacedOnly ? '場所未設定のアイテム'
      : text || tags.length ? '検索結果' : 'すべてのアイテム';

  $view.innerHTML = `
    <p class="meta" style="margin:4px 2px 10px">${ic('layers')}${scope}${tags.length ? '　' + tags.map(t => '#' + esc(t)).join(' ') : ''}</p>
    <div class="search-field"><label>${ic('search')}<input id="bq" type="search" placeholder="この中で絞り込む" value="${esc(text)}" autocomplete="off"></label></div>
    <div class="bulk-sub">
      <label class="chk"><input type="checkbox" id="all"><span>表示中をすべて選択</span></label>
      <span id="cnt"></span>
    </div>
    <div class="sheet-wrap"><table class="grid">
      <thead><tr><th class="c-sel"></th><th class="c-name">名前</th><th class="c-qty">数量</th><th class="c-loc">場所</th><th class="c-tags">タグ</th><th class="c-note">メモ</th></tr></thead>
      <tbody id="rows"></tbody>
    </table></div>
    <p class="footnote">セルをタップするとその場で直せます。入力し終えると自動で保存されます。</p>
    <div class="bulkbar" id="bar">
      <span class="sel-count" id="selcnt"></span>
      <div class="bulk-actions">${BULK_BUTTONS}</div>
    </div>
`;

  const $rows = $view.querySelector('#rows');
  const $all = $view.querySelector('#all');
  let visible = [];

  const row = it => `<tr data-id="${it.id}" class="${selected.has(it.id) ? 'on' : ''}">
    <td class="c-sel"><input type="checkbox" class="sel" ${selected.has(it.id) ? 'checked' : ''} aria-label="選択"></td>
    <td class="c-name"><div class="name-cell"><a class="mini" href="#/item/${it.id}" aria-label="開く">${media(it)}</a><input data-f="name" value="${esc(it.name)}" aria-label="名前"></div></td>
    <td class="c-qty"><input data-f="quantity" type="number" inputmode="numeric" min="0" value="${it.quantity ?? 1}" aria-label="数量"></td>
    <td class="c-loc"><button type="button" class="cell-btn" data-pick>${esc(pathText(it.locationId))}</button></td>
    <td class="c-tags"><input data-f="tags" value="${esc((it.tags ?? []).join('、'))}" placeholder="—" aria-label="タグ（、区切り）"></td>
    <td class="c-note"><textarea data-f="note" rows="1" placeholder="—" aria-label="メモ">${esc(it.note)}</textarea></td>
  </tr>`;

  function draw() {
    const words = text.toLowerCase().split(/\s+/).filter(Boolean);
    visible = I.filter(it => {
      if (inScope && !inScope.has(it.locationId)) return false;
      if (unplacedOnly && it.locationId) return false;
      if (tags.some(t => !hasTag(it, t))) return false;
      const hay = [it.name, it.note, ...(it.tags ?? []), pathText(it.locationId)].join(' ').toLowerCase();
      return words.every(w => hay.includes(w));
    }).sort(byName);
    $rows.innerHTML = visible.length
      ? visible.map(row).join('')
      : `<tr><td colspan="6" class="grid-empty">該当するアイテムがありません</td></tr>`;
    hydratePhotos($rows);
    drawSelection();
  }
  function drawSelection() {
    // 絞り込みで見えなくなったものは選択から外す
    const ids = new Set(visible.map(i => i.id));
    for (const id of selected) if (!ids.has(id)) selected.delete(id);
    $view.querySelector('#cnt').textContent = `${visible.length} 件`;
    $view.querySelector('#selcnt').textContent = selected.size ? `${selected.size} 件を選択中` : '行を選ぶと、まとめて操作できます';
    $view.querySelectorAll('[data-act]').forEach(b => { b.disabled = !selected.size; });
    $all.checked = visible.length > 0 && selected.size === visible.length;
    $all.indeterminate = selected.size > 0 && selected.size < visible.length;
  }

  $view.querySelector('#bq').oninput = e => { text = e.target.value; draw(); };
  $all.onchange = () => {
    if ($all.checked) visible.forEach(i => selected.add(i.id));
    else selected.clear();
    $rows.querySelectorAll('tr[data-id]').forEach(tr => {
      const on = selected.has(tr.dataset.id);
      tr.classList.toggle('on', on);
      tr.querySelector('.sel').checked = on;
    });
    drawSelection();
  };

  // セルの編集は、入力し終えたとき（フォーカスが外れたとき）に1件ずつ保存する
  $rows.addEventListener('change', async e => {
    const el = e.target;
    const tr = el.closest('tr[data-id]');
    if (!tr) return;
    const it = item(tr.dataset.id);
    if (el.classList.contains('sel')) {
      el.checked ? selected.add(it.id) : selected.delete(it.id);
      tr.classList.toggle('on', el.checked);
      return drawSelection();
    }
    const f = el.dataset.f;
    let v = el.value;
    if (f === 'name') {
      v = v.trim();
      if (!v) { el.value = it.name; return toast('名前は空にできません', 'error'); }
    }
    if (f === 'quantity') v = Math.max(0, parseInt(v, 10) || 0);
    if (f === 'tags') v = parseTags(v);
    if (f === 'note') v = v.trim();
    if (JSON.stringify(v) === JSON.stringify(it[f] ?? (f === 'tags' ? [] : ''))) return;
    Object.assign(it, { [f]: v, updatedAt: Date.now() });
    el.value = Array.isArray(v) ? v.join('、') : v;
    await db.put('items', it);
    el.classList.remove('saved');
    void el.offsetWidth;
    el.classList.add('saved');
  });
  // メモ欄は内容に合わせて高さを変える
  $rows.addEventListener('input', e => {
    if (e.target.tagName !== 'TEXTAREA') return;
    e.target.style.height = 'auto';
    e.target.style.height = e.target.scrollHeight + 'px';
  });
  $rows.addEventListener('click', async e => {
    const b = e.target.closest('[data-pick]');
    if (!b) return;
    const id = b.closest('tr').dataset.id;
    const r = await pickLocation(`「${esc(item(id).name)}」の場所`, item(id).locationId);
    if (!r) return;
    const it = item(id); // 新しい場所を作ると読み直すので取り直す
    Object.assign(it, r, { updatedAt: Date.now() });
    await db.put('items', it);
    b.textContent = pathText(it.locationId);
  });

  $view.querySelector('#bar').onclick = async e => {
    const act = e.target.closest('[data-act]')?.dataset.act;
    if (!act || !selected.size || !(await bulkOps[act]([...selected]))) return;
    for (const id of [...selected]) if (!item(id)) selected.delete(id);
    draw();
  };

  draw();
  // 開いた時点で、複数行のメモが全部見えるように高さを合わせる
  $rows.querySelectorAll('textarea').forEach(t => { if (t.value.includes('\n')) t.style.height = t.scrollHeight + 'px'; });
}

// ---------- 合わせて取り込む（PC とスマホのファイル受け渡し） ----------
// 削除したものの id と日時を覚えておき、相手のファイルにまだ残っていても復活しないようにする
async function addTombstones(ids) {
  const now = Date.now();
  const deleted = (await db.getMeta('deleted')) ?? {};
  for (const id of ids) deleted[id] = now;
  await db.setMeta('deleted', deleted);
}

const stamp = r => r.updatedAt ?? r.createdAt ?? 0;

// ファイルの中身と今のデータを、1件ずつ「新しく編集された方」を残して合わせる
async function planMerge(data) {
  // ほかのタブで編集していても取りこぼさないよう、保存されている最新の内容から合わせる
  await load();
  const deleted = { ...((await db.getMeta('deleted')) ?? {}) };
  for (const [id, t] of Object.entries(data.deleted ?? {})) deleted[id] = Math.max(deleted[id] ?? 0, t);
  const replaced = new Set();
  const mergeList = (local, remote) => {
    const map = new Map(local.map(r => [r.id, r]));
    for (const r of remote) {
      const l = map.get(r.id);
      if (!l || stamp(r) > stamp(l)) {
        if (l) replaced.add(r.id);
        map.set(r.id, { ...r });
      }
    }
    for (const [id, r] of map) if (deleted[id] != null && deleted[id] >= stamp(r)) map.delete(id);
    return [...map.values()];
  };
  const locs = mergeList(L, data.locations);
  const items = mergeList(I, data.items);

  // 消えた場所の中にあったものは、いちばん上・場所未設定へ。親子がループしたら切る
  const byId = new Map(locs.map(l => [l.id, l]));
  for (const l of locs) if (l.parentId && !byId.has(l.parentId)) l.parentId = null;
  for (const l of locs) {
    const seen = new Set([l.id]);
    for (let p = byId.get(l.parentId); p; p = byId.get(p.parentId)) {
      if (p.id === l.id) { l.parentId = null; break; }
      if (seen.has(p.id)) break;
      seen.add(p.id);
    }
  }
  for (const it of items) if (it.locationId && !byId.has(it.locationId)) it.locationId = null;

  // 写真は、残るアイテムが使っていて、まだこの端末にないものだけ取り込む
  const need = new Set(items.flatMap(i => i.photos ?? []));
  const [havePhotos, haveThumbs] = (await Promise.all([db.getAllKeys('photos'), db.getAllKeys('thumbs')])).map(k => new Set(k));
  const before = new Set([...L, ...I].map(r => r.id));
  const after = new Set([...locs, ...items].map(r => r.id));
  return {
    locs, items, deleted, tagParents: { ...(data.tagParents ?? {}), ...TP }, // 同じタグはこの端末の設定を優先
    addPhotos: data.photos.filter(p => need.has(p.id) && !havePhotos.has(p.id)),
    addThumbs: (data.thumbs ?? []).filter(t => need.has(t.id) && !haveThumbs.has(t.id)),
    dropPhotos: [...havePhotos].filter(id => !need.has(id)),
    stats: {
      added: [...after].filter(id => !before.has(id)).length,
      updated: [...replaced].filter(id => after.has(id)).length,
      removed: [...before].filter(id => !after.has(id)).length,
    },
  };
}

async function applyMerge(plan) {
  await db.write(s => {
    s.locations.clear();
    plan.locs.forEach(l => s.locations.put(l));
    s.items.clear();
    plan.items.forEach(i => s.items.put(i));
    plan.addPhotos.forEach(p => s.photos.put(p));
    plan.addThumbs.forEach(t => s.thumbs.put(t));
    plan.dropPhotos.forEach(id => { s.photos.delete(id); s.thumbs.delete(id); });
    s.meta.put({ key: 'deleted', value: plan.deleted });
    s.meta.put({ key: 'tagParents', value: plan.tagParents });
  });
  plan.dropPhotos.forEach(forgetPhoto);
  await load();
  ensureThumbs();
}

const statsText = ({ added, updated, removed }) =>
  added + updated + removed ? `追加 ${added}・更新 ${updated}・削除 ${removed}` : '変更はありません';

// ファイルを選んで、確認してから合わせる（スマホでも PC でも使う）
async function mergeFromFile(file, from = 'このファイル') {
  let data;
  try {
    data = await readBackup(file);
  } catch {
    toast('このアプリのファイルではないようです', 'error');
    return false;
  }
  const plan = await planMerge(data);
  const { added, updated, removed } = plan.stats;
  if (!added && !updated && !removed && !plan.addPhotos.length) {
    toast(`${from}と同じ内容でした。変更はありません`);
    return true;
  }
  if (!(await confirmSheet('ファイルを合わせて取り込む', `${from}の内容を合わせます。
追加 ${added} 件・更新 ${updated} 件・削除 ${removed} 件

両方で同じものを直していたときは、あとから直した方が残ります。`, '合わせる'))) return false;
  await applyMerge(plan);
  toast(`合わせました（${statsText(plan.stats)}）`);
  return true;
}

// ---------- PC サーバー（python server.py）で開いているときだけ使う受け渡し画面 ----------
let pcServer = null; // { uploadUrl, ip, port }

const qrSvg = text => {
  const qr = qrcode(0, 'M');
  qr.addData(text);
  qr.make();
  return qr.createSvgTag({ cellSize: 4, margin: 2, scalable: true });
};

function transferView() {
  if (!pcServer) return notFound();
  setHeader('スマホと受け渡し', { back: '#/settings', always: true });
  $view.innerHTML = `
    <div class="group-title">PC → スマホ</div>
    <div class="panel">
      <ol class="steps">
        <li>下のボタンで、スマホに送るファイルを用意します</li>
        <li>出てきた QR コードをスマホのカメラで読み、ファイルをダウンロードします</li>
        <li>スマホのモノ管理で「設定 → ファイルを合わせて取り込む」を押し、そのファイルを選びます</li>
      </ol>
      <button class="btn primary block" id="mk">${ic('phone')}スマホに送るファイルを用意する</button>
      <div id="out"></div>
    </div>

    <div class="group-title">スマホ → PC</div>
    <div class="panel">
      <ol class="steps">
        <li>スマホのモノ管理で「設定 → バックアップを書き出す」を押し、「"ファイル"に保存」などで保存します</li>
        <li>この QR コードをスマホのカメラで読み、開いたページでそのファイルを送ります</li>
        <li>届くと下に出るので、「合わせて取り込む」を押します</li>
      </ol>
      <div class="qr-box">${qrSvg(pcServer.uploadUrl)}<p class="url">${esc(pcServer.uploadUrl)}</p></div>
      <div id="inbox"></div>
    </div>
    <p class="footnote">スマホと PC が同じ Wi-Fi につながっている必要があります。スマホで開けないときは、Windows のファイアウォールで Python の通信を「プライベート ネットワーク」で許可してください。</p>`;

  const $mk = $view.querySelector('#mk');
  $mk.onclick = async () => {
    $mk.disabled = true;
    $mk.lastChild.textContent = 'ファイルを用意しています…';
    try {
      const res = await fetch('api/outbox', { method: 'POST', body: await buildBackup() });
      if (!res.ok) throw new Error(res.status);
      const { downloadUrl } = await res.json();
      $view.querySelector('#out').innerHTML = `
        <div class="qr-box">${qrSvg(downloadUrl)}<p class="url">${esc(downloadUrl)}</p></div>
        <p class="footnote" style="text-align:center">用意した時点の内容です。PC で編集したら、もう一度ボタンを押してください。</p>`;
    } catch {
      toast('ファイルを用意できませんでした。server.py が動いているか確認してください', 'error');
    } finally {
      $mk.disabled = false;
      $mk.lastChild.textContent = 'スマホに送るファイルを用意し直す';
    }
  };

  // スマホから届いたファイルを2秒ごとに確かめる
  const $inbox = $view.querySelector('#inbox');
  let shown = null;
  async function poll() {
    const files = await fetch('api/inbox').then(r => (r.ok ? r.json() : [])).catch(() => []);
    const key = files.map(f => f.name).join();
    if (key === shown) return;
    shown = key;
    $inbox.innerHTML = files.length
      ? `<div class="group" style="margin-top:14px">${files.map(f => `
          <div class="kv-row"><span>${ic('download')} スマホから届いたファイル<br><small>${new Date(f.time).toLocaleString('ja-JP')}・${fmtBytes(f.size)}</small></span>
          <button class="btn sm primary" data-merge="${esc(f.name)}">合わせて取り込む</button></div>`).join('')}</div>`
      : '<p class="waiting">スマホからのファイルを待っています…</p>';
  }
  $inbox.onclick = async e => {
    const name = e.target.closest('[data-merge]')?.dataset.merge;
    if (!name) return;
    const blob = await fetch(`api/inbox/${encodeURIComponent(name)}`).then(r => r.blob());
    if (await mergeFromFile(blob, 'スマホから届いたファイル')) {
      await fetch(`api/inbox/${encodeURIComponent(name)}`, { method: 'DELETE' });
      shown = null;
      poll();
    }
  };
  poll();
  const timer = setInterval(poll, 2000);
  return () => clearInterval(timer);
}

// ---------- すべてのアイテム（ホームの「一覧を見る →」から。検索結果と同じ見せ方） ----------
// 並べ替え。タグ順は「名前の順でいちばん先に来るタグ」でまとめ、タグのないものは最後
const firstTag = it => [...(it.tags ?? [])].sort((a, b) => tagPath(a).localeCompare(tagPath(b), 'ja'))[0];
const SORTS = {
  new: ['新しい順', (a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0)],
  name: ['名前順', byName],
  tag: ['タグ順', (a, b) => (firstTag(a) ? tagPath(firstTag(a)) : '￿').localeCompare(firstTag(b) ? tagPath(firstTag(b)) : '￿', 'ja') || byName(a, b)],
  qty: ['数量の多い順', (a, b) => (b.quantity ?? 0) - (a.quantity ?? 0) || byName(a, b)],
  place: ['場所順', (a, b) => pathText(a.locationId).localeCompare(pathText(b.locationId), 'ja') || byName(a, b)],
};
const sortPicker = (keys, current) => `<label class="sort-pick">${ic('list')}<select id="sortPick" aria-label="並べ替え">${keys.map(k =>
  `<option value="${k}" ${k === current ? 'selected' : ''}>${SORTS[k][0]}</option>`).join('')}</select></label>`;
// 並べ替えて表示する。タグ順のときはタグごとに見出しを付けて分ける
function sortedBlock(list, sort, mode, showPath = false) {
  const sorted = [...list].sort(SORTS[sort][1]);
  if (sort !== 'tag') return itemsBlock(sorted, mode, showPath);
  const groups = new Map();
  for (const it of sorted) {
    const t = firstTag(it) ?? '';
    if (!groups.has(t)) groups.set(t, []);
    groups.get(t).push(it);
  }
  return [...groups].map(([t, its]) =>
    `<h3 class="group-label">${t ? tagLabel(t) : 'タグなし'}<span>${its.length}</span></h3>${itemsBlock(its, mode, showPath)}`).join('');
}

function itemsView(_, q) {
  setHeader('すべてのアイテム', { back: '#/' });
  let text = q.get('q') ?? '';
  let sort = SORTS[q.get('sort')] ? q.get('sort') : pref.get('itemSort', 'new');
  const mode = pref.get('itemView', 'grid');
  if (!I.length) {
    $view.innerHTML = `<header class="page-head"><h1 class="large">すべてのアイテム</h1></header>
      ${empty('box', 'まだアイテムがありません', '下の ＋ ボタンから追加できます')}`;
    return;
  }
  $view.innerHTML = `
    <header class="page-head"><h1 class="large">すべてのアイテム</h1><p class="meta">${I.length} 件</p></header>
    <div class="search-field"><label>${ic('search')}<input id="fq" type="search" enterkeyhint="search" placeholder="この中で絞り込む" value="${esc(text)}" autocomplete="off"></label></div>
    <div class="sec-head" style="margin-top:4px">
      ${sortPicker(['new', 'name', 'tag', 'qty', 'place'], sort)}
      <span class="spacer"></span>${selectBtn()}${viewToggle(mode)}
    </div>
    <div id="list"></div>
    <a class="add-tile" href="#/bulk" style="margin-top:16px">${ic('table')}一覧で編集する</a>`;

  function draw() {
    const words = text.toLowerCase().split(/\s+/).filter(Boolean);
    const list = I.filter(it => {
      const hay = [it.name, it.note, ...(it.tags ?? []), pathText(it.locationId)].join(' ').toLowerCase();
      return words.every(w => hay.includes(w));
    });
    $view.querySelector('#list').innerHTML = list.length
      ? (words.length ? `<p class="result-count" style="margin-top:4px">${list.length} 件</p>` : '') + sortedBlock(list, sort, mode, true)
      : empty('search', '見つかりませんでした', '別のことばで試してみてください');
    hydratePhotos();
    // 戻ってきたとき・表示を切り替えたときに条件が残るよう URL に反映
    const p = new URLSearchParams();
    if (text) p.set('q', text);
    if (sort !== 'new') p.set('sort', sort);
    const qs = p.toString();
    history.replaceState(null, '', `#/items${qs ? '?' + qs : ''}`);
  }
  $view.querySelector('#fq').oninput = e => { text = e.target.value; draw(); };
  $view.querySelector('#sortPick').onchange = e => {
    sort = e.target.value;
    pref.set('itemSort', sort);
    draw();
  };
  bindViewToggle();
  draw();
}

// ホーム画面に追加したアプリとして開いているか（Safari などのブラウザのタブではないか）
const inInstalledApp = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

// fromQr：QR ラベルの行き先（場所・アイテム）の画面から来たとき
// ---------- 場所に入れる：写真の一覧から、今あるアイテムを選んでこの場所に移す ----------
// 「場所未設定」と「ほかの場所にあるもの」を分けて並べる。タップで選ぶ／外す
const pickCard = it => `<button type="button" class="item-card" data-pid="${it.id}">
    <span class="card-media">${media(it)}<span class="qty-badge">×${it.quantity ?? 1}</span></span>
    <span class="card-body"><span class="card-name">${esc(it.name)}</span><span class="card-sub">${esc(it.locationId ? pathText(it.locationId) : tagText(it) || '場所未設定')}</span></span>
  </button>`;

function putView(id) {
  const l = loc(id);
  if (!l) return notFound();
  setHeader(`「${l.name}」にアイテムを追加`, { back: `#/loc/${id}`, always: true });
  const chosen = new Set();
  let text = '';
  $view.innerHTML = `
    <a class="add-tile" href="#/item/new/edit?loc=${id}" style="margin-top:8px">${ic('camera')}新しいアイテムを登録する</a>
    <div class="search-field" style="margin-top:8px"><label>${ic('search')}<input id="pq" type="search" placeholder="登録済みのアイテムを名前・タグ・場所で絞り込む" autocomplete="off"></label></div>
    <div class="sec-head" style="margin:4px 2px 0"><span class="meta" style="margin:0">登録済みのアイテムから選ぶ</span><span class="spacer"></span>${colsControl()}</div>
    <div id="groups"></div>
    <div class="savebar put-bar">
      <span class="sel-count" id="pcount"></span>
      <button class="btn primary block" id="put">${ic('check')}追加する</button>
    </div>`;
  const $groups = $view.querySelector('#groups');
  const $put = $view.querySelector('#put');

  function draw() {
    const words = text.toLowerCase().split(/\s+/).filter(Boolean);
    const match = it => {
      const hay = [it.name, it.note, ...(it.tags ?? []), pathText(it.locationId)].join(' ').toLowerCase();
      return words.every(w => hay.includes(w));
    };
    const unplaced = I.filter(it => !it.locationId && match(it)).sort(byName);
    const elsewhere = I.filter(it => it.locationId && it.locationId !== id && match(it))
      .sort((a, b) => pathText(a.locationId).localeCompare(pathText(b.locationId), 'ja') || byName(a, b));
    const group = (title, list, hint) => list.length
      ? secHead(title, list.length, `<button type="button" class="link" data-all="${title}">すべて選択</button>`)
        + (hint ? `<p class="footnote" style="margin:-6px 4px 10px">${hint}</p>` : '')
        + `<div class="item-grid pickable" data-group="${title}">${list.map(pickCard).join('')}</div>`
      : '';
    $groups.innerHTML = unplaced.length || elsewhere.length
      ? group('場所未設定', unplaced) + group('ほかの場所にあるもの', elsewhere, '選ぶと、今の場所からここへ移ります')
      : `<div style="margin-top:20px">${empty('box', words.length ? '見つかりませんでした' : 'ほかのアイテムはありません', words.length ? '別のことばで試してみてください' : '新しいアイテムは下の ＋ から登録できます')}</div>`;
    hydratePhotos($groups);
    drawChosen();
  }
  function drawChosen() {
    $groups.querySelectorAll('[data-pid]').forEach(c => c.classList.toggle('picked', chosen.has(c.dataset.pid)));
    $groups.querySelectorAll('[data-all]').forEach(b => {
      const ids = [...$groups.querySelectorAll(`[data-group="${b.dataset.all}"] [data-pid]`)].map(c => c.dataset.pid);
      b.textContent = ids.length && ids.every(x => chosen.has(x)) ? '選択を解除' : 'すべて選択';
    });
    $view.querySelector('#pcount').textContent = chosen.size ? `${chosen.size} 件を選択中` : '追加したいアイテムをタップして選んでください';
    $put.disabled = !chosen.size;
    $put.lastChild.textContent = chosen.size ? `${chosen.size} 件を追加する` : '追加する';
  }
  $groups.onclick = e => {
    const all = e.target.closest('[data-all]');
    if (all) {
      const ids = [...$groups.querySelectorAll(`[data-group="${all.dataset.all}"] [data-pid]`)].map(c => c.dataset.pid);
      const every = ids.every(x => chosen.has(x));
      ids.forEach(x => (every ? chosen.delete(x) : chosen.add(x)));
      return drawChosen();
    }
    const c = e.target.closest('[data-pid]');
    if (!c) return;
    chosen.has(c.dataset.pid) ? chosen.delete(c.dataset.pid) : chosen.add(c.dataset.pid);
    drawChosen();
  };
  $view.querySelector('#pq').oninput = e => { text = e.target.value; draw(); };
  $put.onclick = async () => {
    if (!chosen.size) return;
    $put.disabled = true;
    await saveItems(pickItems([...chosen]).map(it => ({ ...it, locationId: id })));
    toast(`${chosen.size} 件を「${l.name}」に追加しました`);
    location.replace(`#/loc/${id}`);
  };
  draw();
}

function notFound(fromQr = false) {
  setHeader('見つかりません', { back: '#/', always: true });
  if (fromQr && !inInstalledApp()) {
    // iPhone のカメラで QR を読むと、ホーム画面のアプリではなく Safari で開く。Safari 側にはアプリのデータがない
    $view.innerHTML = `<div style="margin-top:12px">
      ${empty('scan', 'アプリの中で読み取ってください', 'このラベルは、ホーム画面に追加した「モノ管理」で読み取ると開けます。iPhone のカメラで読むと Safari で開いてしまい、アプリのデータが見えません。')}
      <div class="panel" style="margin-top:14px"><ol class="steps" style="margin:0">
        <li>ホーム画面の「モノ管理」を開く</li>
        <li>下のタブの「スキャン」を押す</li>
        <li>このラベルの QR コードを枠に映す</li>
      </ol></div></div>`;
    return;
  }
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
  [/^\/loc\/([\w-]+)\/add$/, putView, 'home', true],
  [/^\/loc\/([\w-]+)$/, locView, 'home'],
  [/^\/item\/([\w-]+)\/edit$/, itemEdit, 'home', true],
  [/^\/item\/([\w-]+)$/, itemView, 'home'],
  [/^\/label\/([\w-]+)$/, labelView, 'home'],
  [/^\/search$/, searchView, 'search'],
  [/^\/items$/, itemsView, 'home'],
  [/^\/scan$/, scanView, 'scan'],
  [/^\/settings$/, settingsView, 'settings'],
  [/^\/tags$/, tagsView, 'settings'],
  [/^\/import$/, importView, 'settings', true],
  [/^\/bulk$/, bulkView, 'home', true],
  [/^\/transfer$/, transferView, 'settings'],
  [/^\/text$/, textView, 'home', true],
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
    exitSelect();
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
// PC サーバー（server.py）から開いているかを確かめる。GitHub Pages では見つからないので null のまま
pcServer = await fetch('api/ping', { cache: 'no-store' }).then(r => (r.ok ? r.json() : null)).catch(() => null);
applyCols(gridCols());
await load();
await render();
ensureThumbs();

// 端末の空き容量が少ないときに勝手に消されないよう、永続化をお願いしておく
navigator.storage?.persist?.();
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');
