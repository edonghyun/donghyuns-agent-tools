#!/usr/bin/env python3
"""Serve a qa-operator dashboard folder over HTTP."""

from __future__ import annotations

import argparse
import functools
import http.server
from pathlib import Path
import socketserver
import webbrowser


class ReusableTCPServer(socketserver.TCPServer):
    allow_reuse_address = True


def main() -> None:
    parser = argparse.ArgumentParser(description="Serve artifacts/qa-operator/<slug> dashboard.")
    parser.add_argument("audit_root", help="Path to artifacts/qa-operator/<slug>")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=0)
    parser.add_argument("--open", action="store_true", help="Open the dashboard in the default browser")
    args = parser.parse_args()

    audit_root = Path(args.audit_root).resolve()
    if not (audit_root / "index.html").exists():
        raise SystemExit(f"index.html not found under {audit_root}")

    handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(audit_root))
    with ReusableTCPServer((args.host, args.port), handler) as httpd:
        host, port = httpd.server_address
        url = f"http://{host}:{port}/index.html"
        print(url, flush=True)
        if args.open:
            webbrowser.open(url)
        httpd.serve_forever()


if __name__ == "__main__":
    main()
