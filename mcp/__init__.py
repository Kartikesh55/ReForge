import sys
from pathlib import Path

# Add site-packages mcp to __path__ so official subpackages (server, types, client) resolve
for p in sys.path:
    if "site-packages" in p:
        candidate = Path(p) / "mcp"
        if candidate.is_dir() and str(candidate) not in __path__:
            __path__.append(str(candidate))

from .reforge_server import mcp_server

__all__ = ["mcp_server"]
