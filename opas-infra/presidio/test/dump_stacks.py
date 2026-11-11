"""Dump every thread's stack in each gunicorn process of this container.

Used by Infra CI when a Presidio container never becomes healthy. The container runs
with PYTHONFAULTHANDLER=1, so SIGABRT makes Python print all thread stacks to stderr
(docker logs) before exiting, which shows exactly where a worker is stuck. Workers go
first, then the master (PID 1).

    docker exec -i <container> python - < presidio/test/dump_stacks.py
"""

import os
import signal
import time

workers = []
for pid in os.listdir("/proc"):
    if not pid.isdigit() or pid in ("1", str(os.getpid())):
        continue
    try:
        cmdline = open(f"/proc/{pid}/cmdline", "rb").read()
    except OSError:
        continue
    if b"gunicorn" in cmdline:
        workers.append(int(pid))

print(f"gunicorn workers: {workers or 'none'}", flush=True)
for pid in workers:
    os.kill(pid, signal.SIGABRT)
time.sleep(1)
os.kill(1, signal.SIGABRT)
