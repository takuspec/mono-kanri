// バックアップ用の最小限の ZIP（無圧縮）。
// 写真は JPEG でもともと圧縮済みなので圧縮はせず、1枚ずつ読んで CRC を計算する。
// Blob をつなぎ合わせて作るので、写真全部を一度にメモリへ載せることはない。

const CRC_TABLE = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(bytes) {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

const UTF8 = 0x0800; // ファイル名が UTF-8 であることを示すフラグ

// files: [{ name, blob }]
export async function makeZip(files) {
  const enc = new TextEncoder();
  const now = new Date();
  const time = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1);
  const date = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();
  const body = [];
  const central = [];
  let offset = 0;

  for (const f of files) {
    const name = enc.encode(f.name);
    const crc = crc32(new Uint8Array(await f.blob.arrayBuffer()));
    const size = f.blob.size;

    const h = new DataView(new ArrayBuffer(30));
    h.setUint32(0, 0x04034b50, true);
    h.setUint16(4, 20, true);
    h.setUint16(6, UTF8, true);
    h.setUint16(10, time, true);
    h.setUint16(12, date, true);
    h.setUint32(14, crc, true);
    h.setUint32(18, size, true);
    h.setUint32(22, size, true);
    h.setUint16(26, name.length, true);
    body.push(h, name, f.blob);

    const c = new DataView(new ArrayBuffer(46));
    c.setUint32(0, 0x02014b50, true);
    c.setUint16(4, 20, true);
    c.setUint16(6, 20, true);
    c.setUint16(8, UTF8, true);
    c.setUint16(12, time, true);
    c.setUint16(14, date, true);
    c.setUint32(16, crc, true);
    c.setUint32(20, size, true);
    c.setUint32(24, size, true);
    c.setUint16(28, name.length, true);
    c.setUint32(42, offset, true);
    central.push(c, name);

    offset += 30 + name.length + size;
  }

  const cdSize = central.reduce((n, p) => n + p.byteLength, 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true);
  end.setUint16(8, files.length, true);
  end.setUint16(10, files.length, true);
  end.setUint32(12, cdSize, true);
  end.setUint32(16, offset, true);
  return new Blob([...body, ...central, end], { type: 'application/zip' });
}

// 無圧縮の ZIP を読み、名前 → Blob の Map を返す（中身はファイルの一部を指すだけで読み込まない）
export async function readZip(file) {
  const tailLen = Math.min(file.size, 22 + 0xffff);
  const tail = new DataView(await file.slice(file.size - tailLen).arrayBuffer());
  let p = tailLen - 22;
  while (p >= 0 && tail.getUint32(p, true) !== 0x06054b50) p--;
  if (p < 0) throw new Error('ZIP ファイルではありません');

  const count = tail.getUint16(p + 10, true);
  const cdSize = tail.getUint32(p + 12, true);
  const cdOffset = tail.getUint32(p + 16, true);
  const cd = new DataView(await file.slice(cdOffset, cdOffset + cdSize).arrayBuffer());
  const dec = new TextDecoder();
  const out = new Map();

  for (let i = 0, q = 0; i < count; i++) {
    if (cd.getUint32(q, true) !== 0x02014b50) throw new Error('ZIP ファイルが壊れています');
    const method = cd.getUint16(q + 10, true);
    const size = cd.getUint32(q + 20, true);
    const nameLen = cd.getUint16(q + 28, true);
    const extraLen = cd.getUint16(q + 30, true);
    const commentLen = cd.getUint16(q + 32, true);
    const local = cd.getUint32(q + 42, true);
    const name = dec.decode(new Uint8Array(cd.buffer, q + 46, nameLen));
    if (method !== 0) throw new Error('このアプリで作ったバックアップではありません');

    const lh = new DataView(await file.slice(local, local + 30).arrayBuffer());
    const start = local + 30 + lh.getUint16(26, true) + lh.getUint16(28, true);
    out.set(name, file.slice(start, start + size));
    q += 46 + nameLen + extraLen + commentLen;
  }
  return out;
}
