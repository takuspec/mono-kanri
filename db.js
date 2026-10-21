// IndexedDB への保存。データはこの端末のブラウザ内だけに保存される。
const DB_NAME = 'mono-kanri';
// thumbs: 一覧用の小さな写真（photos と同じ id）。meta: バックアップ日時などの設定
const STORES = ['locations', 'items', 'photos', 'thumbs', 'meta'];
const DATA_STORES = ['locations', 'items', 'photos', 'thumbs'];

let opening;
function open() {
  return opening ??= new Promise((resolve, reject) => {
    const r = indexedDB.open(DB_NAME, 2);
    r.onupgradeneeded = () => {
      const d = r.result;
      for (const n of STORES) {
        if (!d.objectStoreNames.contains(n)) d.createObjectStore(n, { keyPath: n === 'meta' ? 'key' : 'id' });
      }
    };
    r.onsuccess = () => {
      const d = r.result;
      // 新しい版のアプリが別タブで開かれたら、更新を邪魔しないように閉じる
      d.onversionchange = () => d.close();
      resolve(d);
    };
    r.onerror = () => reject(r.error);
    // 古い版のアプリが別のタブで開いたままだと、データベースの更新が止まる
    r.onblocked = () => document.dispatchEvent(new Event('db-blocked'));
  });
}

const req = r => new Promise((resolve, reject) => {
  r.onsuccess = () => resolve(r.result);
  r.onerror = () => reject(r.error);
});

async function store(name, mode = 'readonly') {
  return (await open()).transaction(name, mode).objectStore(name);
}

export const getAll = async name => req((await store(name)).getAll());
export const getAllKeys = async name => req((await store(name)).getAllKeys());
export const get = async (name, id) => req((await store(name)).get(id));
export const put = async (name, value) => req((await store(name, 'readwrite')).put(value));
export const del = async (name, id) => req((await store(name, 'readwrite')).delete(id));

export const getMeta = async key => (await get('meta', key))?.value;
export const setMeta = (key, value) => put('meta', { key, value });

// 複数ストアをまとめて書き換える（全部成功するか、全部取り消し）
export async function write(fn) {
  const t = (await open()).transaction(STORES, 'readwrite');
  fn(Object.fromEntries(STORES.map(n => [n, t.objectStore(n)])));
  return new Promise((resolve, reject) => {
    t.oncomplete = () => resolve();
    t.onerror = t.onabort = () => reject(t.error);
  });
}

export async function replaceAll(data) {
  await write(s => {
    for (const n of DATA_STORES) {
      s[n].clear();
      for (const v of data[n] ?? []) s[n].put(v);
    }
  });
}
