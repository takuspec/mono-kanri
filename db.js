// IndexedDB への保存。データはこの端末のブラウザ内だけに保存される。
const DB_NAME = 'mono-kanri';
const STORES = ['locations', 'items', 'photos'];

let opening;
function open() {
  return opening ??= new Promise((resolve, reject) => {
    const r = indexedDB.open(DB_NAME, 1);
    r.onupgradeneeded = () => {
      const d = r.result;
      d.createObjectStore('locations', { keyPath: 'id' });
      d.createObjectStore('items', { keyPath: 'id' });
      d.createObjectStore('photos', { keyPath: 'id' }); // { id, blob }
    };
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
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
export const get = async (name, id) => req((await store(name)).get(id));
export const put = async (name, value) => req((await store(name, 'readwrite')).put(value));
export const del = async (name, id) => req((await store(name, 'readwrite')).delete(id));

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
    for (const n of STORES) {
      s[n].clear();
      for (const v of data[n] ?? []) s[n].put(v);
    }
  });
}
