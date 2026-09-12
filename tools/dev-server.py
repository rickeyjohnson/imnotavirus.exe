#!/usr/bin/env python3
"""Static file server for local testing that never caches.

The game itself needs no server — open index.html directly. This exists so the
preview browser always sees the files on disk instead of a cached copy.

    python3 tools/dev-server.py [port]
"""

import sys
from functools import partial
from pathlib import Path
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer


class NoCacheHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, must-revalidate")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def log_message(self, fmt, *args):
        pass


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8765
    root = Path(__file__).resolve().parent.parent
    handler = partial(NoCacheHandler, directory=str(root))
    with ThreadingHTTPServer(("127.0.0.1", port), handler) as httpd:
        print(f"serving http://127.0.0.1:{port} (no-store)")
        httpd.serve_forever()


if __name__ == "__main__":
    main()
