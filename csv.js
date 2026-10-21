// CSV の読み込み。Excel（日本語版）の「CSV」は Shift_JIS、「CSV UTF-8」や Google スプレッドシートは UTF-8 で保存されるので両方読む。

export async function decodeCsv(file) {
  const buf = await file.arrayBuffer();
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buf); // 先頭の BOM は自動で取り除かれる
  } catch {
    return new TextDecoder('shift_jis').decode(buf);
  }
}

// "..." で囲まれたセル（中のカンマ・改行・"" を含む）にも対応する
export function parseCsv(text) {
  const rows = [];
  let row = [], cell = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c !== '"') cell += c;
      else if (text[i + 1] === '"') { cell += '"'; i++; }
      else quoted = false;
    } else if (c === '"') {
      quoted = true;
    } else if (c === ',') {
      row.push(cell);
      cell = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += c;
    }
  }
  if (cell !== '' || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

export function toCsv(rows) {
  return rows.map(r => r.map(v => /[",\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v).join(',')).join('\r\n') + '\r\n';
}
