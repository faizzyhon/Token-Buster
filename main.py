#!/usr/bin/env python3
"""
Token Buster - Entry Point
Author: Muhammad Faizan | github.com/faizzyhon | instagram.com/faizzyhon
"""
import sys, os, argparse

BANNER = """
╔══════════════════════════════════════════════════════╗
║   ⚡  TOKEN BUSTER  v1.0                             ║
║   AI Token Optimizer - Reduce usage by 5x-10x       ║
║   Author:    Muhammad Faizan                         ║
║   GitHub:    github.com/faizzyhon                    ║
║   Instagram: instagram.com/faizzyhon                 ║
╚══════════════════════════════════════════════════════╝
"""

def main():
    parser = argparse.ArgumentParser(description="Token Buster")
    parser.add_argument("--port",       type=int, default=5000)
    parser.add_argument("--host",       default="0.0.0.0")
    parser.add_argument("--debug",      action="store_true")
    parser.add_argument("--no-browser", action="store_true")
    args = parser.parse_args()

    print(BANNER)

    os.environ["TOKEN_BUSTER_PORT"]  = str(args.port)
    os.environ["TOKEN_BUSTER_DEBUG"] = "1" if args.debug else "0"

    from token_buster.db.database import get_db
    get_db()
    print("  [OK] Database ready")

    from token_buster.core.tokenizer import get_engine
    engine = get_engine()
    print(f"  [OK] Tokenizer: {engine.backend}")

    try:
        import watchdog
        try:
            from importlib.metadata import version
            wv = version("watchdog")
        except Exception:
            wv = "installed"
        print(f"  [OK] File watcher: watchdog {wv}")
    except ImportError:
        print("  [!!] Watchdog not installed - file watching disabled")

    print(f"\n  Dashboard : http://localhost:{args.port}")
    print(f"  API Health: http://localhost:{args.port}/api/health")
    print(f"\n  Press Ctrl+C to stop.\n")

    if not args.no_browser:
        import threading, webbrowser, time
        def _open():
            time.sleep(1.5)
            webbrowser.open(f"http://localhost:{args.port}")
        threading.Thread(target=_open, daemon=True).start()

    from token_buster.backend.app import app
    app.run(host=args.host, port=args.port, debug=args.debug, use_reloader=False)

if __name__ == "__main__":
    main()