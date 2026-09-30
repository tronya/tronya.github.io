"""Static dev server for the games in this folder, with caching disabled."""
import os
import sys
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer


class Server(ThreadingHTTPServer):
    # The stdlib default listen backlog is 5. The game is ~30 ES modules that the
    # browser requests in parallel, so the overflow was reset outright and the page
    # hung on "loading" until a reload happened to win the race.
    request_queue_size = 128
    daemon_threads = True


class NoCacheHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


if __name__ == "__main__":
    # An explicit argument wins; otherwise the preview launcher hands us a free port
    # through PORT, so a second copy never collides with one already on 5173.
    port = int(sys.argv[1]) if len(sys.argv) > 1 else int(os.environ.get("PORT", 5173))
    handler = partial(NoCacheHandler, directory=sys.path[0])
    Server(("127.0.0.1", port), handler).serve_forever()
