"""モノ管理の PC サーバー。ComfyUI と同じ感覚で、PC で起動して使う。

    python server.py              （起動するとブラウザが開く）
    python server.py --no-browser

- PC では http://localhost:8200 でアプリを使う（データは PC のブラウザに保存される）
- 同じ Wi-Fi のスマホとは、QR コードからファイルをダウンロード／アップロードして受け渡す
  （スマホのアプリは https、このサーバーは http なので、アプリから直接は通信できないため）

受け渡し用の URL には起動ごとに変わる合言葉（トークン）が入るので、
同じ Wi-Fi の他の人が URL を知らずにデータを持ち出すことはできない。
"""
import json
import os
import re
import secrets
import socket
import sys
import time
import webbrowser
from datetime import date
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import unquote, urlparse

PORT = int(os.environ.get("MONO_KANRI_PORT", "8200"))
ROOT = os.path.dirname(os.path.abspath(__file__))
BOX = os.path.join(ROOT, "transfer")  # 受け渡し中のファイル置き場（git には入れない）
INBOX = os.path.join(BOX, "inbox")
OUTBOX = os.path.join(BOX, "outbox")  # 中身に合わせて .json か .zip が付く
TOKEN = secrets.token_urlsafe(9)
MAX_UPLOAD = 4 * 1024 ** 3

# アプリとして配るファイルだけを出す（server.py や transfer/ は出さない）
APP_FILE = re.compile(r"^/(|index\.html|[\w-]+\.(?:js|css|webmanifest)|icons/[\w.-]+\.png|vendor/[\w.-]+\.js)$")
INBOX_FILE = re.compile(r"^/api/inbox/(phone-[\w-]+\.(?:json|zip))$")
TOKEN_PATH = re.compile(r"^/t/([\w-]+)/(upload|download)$")
BOM = bytes([0xEF, 0xBB, 0xBF])  # UTF-8 の BOM
TYPES = {".json": "application/json", ".zip": "application/zip"}


def kind_of(head):
    """ファイルの先頭から種類を決める（バックアップは JSON、バージョン 1.6 までは ZIP）"""
    if head.startswith(b"PK"):
        return ".zip"
    if head.removeprefix(BOM).lstrip().startswith(b"{"):
        return ".json"
    return None


def outbox_file():
    for ext in TYPES:
        if os.path.isfile(OUTBOX + ext):
            return OUTBOX + ext
    return None


def lan_ip():
    """スマホから届く PC の IP アドレス（実際には通信しない）"""
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(("10.255.255.255", 1))
        return s.getsockname()[0]
    except OSError:
        return "127.0.0.1"
    finally:
        s.close()


def base_url():
    return f"http://{lan_ip()}:{PORT}"


UPLOAD_PAGE = """<!doctype html>
<html lang="ja"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>PC に送る - モノ管理</title>
<style>
  :root { color-scheme: light dark; }
  body { margin: 0; font-family: -apple-system, "Hiragino Sans", "Noto Sans JP", sans-serif; background: #f5f5f8; color: #0f1729; }
  @media (prefers-color-scheme: dark) { body { background: #0b0d12; color: #eef0f6; } .card { background: #161922 !important; } }
  main { max-width: 480px; margin: 0 auto; padding: 32px 16px; }
  h1 { font-size: 24px; margin: 0 0 6px; }
  p { color: #5b6474; line-height: 1.7; font-size: 15px; }
  .card { background: #fff; border-radius: 16px; padding: 18px; box-shadow: 0 1px 3px rgba(16,24,40,.08); }
  label.btn { display: flex; align-items: center; justify-content: center; min-height: 52px; border-radius: 14px;
    background: linear-gradient(135deg, #4f46e5, #6366f1); color: #fff; font-weight: 700; font-size: 17px; cursor: pointer; }
  input { display: none; }
  progress { width: 100%; height: 10px; margin-top: 16px; }
  #msg { font-weight: 600; color: inherit; }
  .ok { color: #10b981 !important; } .ng { color: #e11d48 !important; }
</style></head>
<body><main>
  <h1>PC に送る</h1>
  <p>モノ管理の「設定 → バックアップを書き出す」で保存したファイル（.json）を選んでください。</p>
  <div class="card">
    <label class="btn">ファイルを選んで送る<input type="file" id="f" accept=".json,application/json,.zip,application/zip"></label>
    <progress id="bar" max="1" value="0" hidden></progress>
    <p id="msg"></p>
  </div>
</main>
<script>
const f = document.getElementById('f'), bar = document.getElementById('bar'), msg = document.getElementById('msg');
f.onchange = () => {
  const file = f.files[0];
  if (!file) return;
  const x = new XMLHttpRequest();
  x.open('POST', location.pathname);
  bar.hidden = false; bar.value = 0; msg.className = ''; msg.textContent = '送っています…';
  x.upload.onprogress = e => { if (e.lengthComputable) bar.value = e.loaded / e.total; };
  x.onload = () => {
    if (x.status === 200) { msg.className = 'ok'; msg.textContent = 'PC に送りました。PC の画面で「合わせて取り込む」を押してください。'; }
    else { msg.className = 'ng'; msg.textContent = '送れませんでした：' + x.responseText; }
    f.value = '';
  };
  x.onerror = () => { msg.className = 'ng'; msg.textContent = 'PC に接続できませんでした。同じ Wi-Fi か確認してください。'; };
  x.send(file);
};
</script>
</body></html>
"""


class Handler(SimpleHTTPRequestHandler):
    extensions_map = {
        **SimpleHTTPRequestHandler.extensions_map,
        ".js": "text/javascript",
        ".css": "text/css",
        ".webmanifest": "application/manifest+json",
        ".png": "image/png",
        ".html": "text/html",
    }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    # ---------- 共通 ----------
    def is_local(self):
        return self.client_address[0] in ("127.0.0.1", "::1")

    def send_body(self, body, ctype, code=200, extra=None):
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        for k, v in (extra or {}).items():
            self.send_header(k, v)
        super().end_headers()
        self.wfile.write(body)

    def send_json(self, obj, code=200):
        self.send_body(json.dumps(obj, ensure_ascii=False).encode(), "application/json; charset=utf-8", code)

    def end_headers(self):
        # アプリのファイルは毎回更新を確かめる（古いファイルが混ざらないように）
        self.send_header("Cache-Control", "no-cache")
        super().end_headers()

    def receive(self, base):
        """送られてきたバックアップを一時ファイル経由で保存する。(エラー文, 保存先) を返す"""
        size = int(self.headers.get("Content-Length") or 0)
        if not 0 < size <= MAX_UPLOAD:
            return "ファイルの大きさが正しくありません", None
        os.makedirs(os.path.dirname(base), exist_ok=True)
        tmp = base + ".part"
        ext = None
        with open(tmp, "wb") as out:
            left = size
            while left:
                chunk = self.rfile.read(min(left, 1024 * 1024))
                if not chunk:
                    break
                if ext is None:
                    ext = kind_of(chunk)
                    if not ext:
                        out.close()
                        os.remove(tmp)
                        return "モノ管理のバックアップファイルではありません", None
                out.write(chunk)
                left -= len(chunk)
        if left:
            os.remove(tmp)
            return "途中で切れました", None
        os.replace(tmp, base + ext)
        return None, base + ext

    def log_message(self, fmt, *args):
        pass  # アクセスのたびに出すとうるさいので、受け渡しのときだけ print する

    # ---------- GET ----------
    def do_GET(self):
        path = unquote(urlparse(self.path).path)

        if path == "/api/ping":
            if not self.is_local():
                return self.send_error(403)
            return self.send_json({"uploadUrl": f"{base_url()}/t/{TOKEN}/upload", "ip": lan_ip(), "port": PORT})

        if path == "/api/inbox":
            if not self.is_local():
                return self.send_error(403)
            files = []
            if os.path.isdir(INBOX):
                for name in sorted(os.listdir(INBOX)):
                    if INBOX_FILE.match("/api/inbox/" + name):
                        st = os.stat(os.path.join(INBOX, name))
                        files.append({"name": name, "size": st.st_size, "time": int(st.st_mtime * 1000)})
            return self.send_json(files)

        m = INBOX_FILE.match(path)
        if m:
            if not self.is_local():
                return self.send_error(403)
            p = os.path.join(INBOX, m.group(1))
            if not os.path.isfile(p):
                return self.send_error(404)
            with open(p, "rb") as f:
                return self.send_body(f.read(), TYPES[os.path.splitext(p)[1]])

        m = TOKEN_PATH.match(path)
        if m:
            if not secrets.compare_digest(m.group(1), TOKEN):
                return self.send_error(404)
            if m.group(2) == "upload":
                return self.send_body(UPLOAD_PAGE.encode(), "text/html; charset=utf-8")
            box = outbox_file()
            if not box:
                return self.send_body("PC でまだファイルを用意していません".encode(), "text/plain; charset=utf-8", 404)
            ext = os.path.splitext(box)[1]
            with open(box, "rb") as f:
                body = f.read()
            print(f"  [PC→スマホ] スマホがダウンロードしました（{self.client_address[0]}）")
            name = f"mono-kanri-pc-{date.today().isoformat()}{ext}"
            return self.send_body(body, TYPES[ext], extra={"Content-Disposition": f'attachment; filename="{name}"'})

        if APP_FILE.match(path):
            return super().do_GET()
        self.send_error(404)

    # ---------- POST ----------
    def do_POST(self):
        path = unquote(urlparse(self.path).path)

        if path == "/api/outbox":
            if not self.is_local():
                return self.send_error(403)
            old = outbox_file()
            err, saved = self.receive(OUTBOX + ".new")
            if not err:
                if old:
                    os.remove(old)
                os.replace(saved, OUTBOX + os.path.splitext(saved)[1])
            if err:
                return self.send_json({"error": err}, 400)
            print("  [PC→スマホ] 送るファイルを用意しました")
            return self.send_json({"downloadUrl": f"{base_url()}/t/{TOKEN}/download"})

        m = TOKEN_PATH.match(path)
        if m and m.group(2) == "upload" and secrets.compare_digest(m.group(1), TOKEN):
            name = time.strftime("phone-%Y%m%d-%H%M%S") + f"-{secrets.token_hex(2)}"
            err, _ = self.receive(os.path.join(INBOX, name))
            if err:
                return self.send_body(err.encode(), "text/plain; charset=utf-8", 400)
            print(f"  [スマホ→PC] ファイルが届きました（{self.client_address[0]}）")
            return self.send_body(b"ok", "text/plain; charset=utf-8")

        self.send_error(404)

    # ---------- DELETE ----------
    def do_DELETE(self):
        m = INBOX_FILE.match(unquote(urlparse(self.path).path))
        if not m or not self.is_local():
            return self.send_error(403)
        p = os.path.join(INBOX, m.group(1))
        if os.path.isfile(p):
            os.remove(p)
        self.send_response(204)
        self.end_headers()


def main():
    # Windows の画面（cp932）で出せない文字があっても止まらないようにする
    for stream in (sys.stdout, sys.stderr):
        try:
            stream.reconfigure(errors="replace")
        except AttributeError:
            pass
    try:
        server = ThreadingHTTPServer(("0.0.0.0", PORT), Handler)
    except OSError:
        sys.exit(f"ポート {PORT} が使われています。ほかの server.py が動いていないか確認してください。")
    url = f"http://localhost:{PORT}"
    print("モノ管理 PC サーバーを起動しました")
    print(f"  PC で開く : {url}")
    print(f"  スマホから: {base_url()}（受け渡しはアプリの「設定 → スマホとデータを受け渡す」から）")
    print("  止めるとき: Ctrl+C")
    if "--no-browser" not in sys.argv:
        webbrowser.open(url)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n停止しました")


if __name__ == "__main__":
    main()
