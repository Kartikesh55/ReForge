from __future__ import annotations

import io
import re
import zipfile
from pathlib import Path
from typing import BinaryIO


MAX_ARCHIVE_BYTES = 100 * 1024 * 1024
MAX_EXTRACTED_BYTES = 500 * 1024 * 1024
MAX_ARCHIVE_FILES = 10_000


def safe_project_name(name: str) -> str:
    cleaned = re.sub(r"[^A-Za-z0-9._-]+", "-", name.strip()).strip(".-")
    return cleaned[:100] or "uploaded-project"


def read_archive(upload: BinaryIO) -> bytes:
    chunks: list[bytes] = []
    total = 0
    while True:
        chunk = upload.read(1024 * 1024)
        if not chunk:
            break
        total += len(chunk)
        if total > MAX_ARCHIVE_BYTES:
            raise ValueError("Uploaded ZIP exceeds the 100 MB limit.")
        chunks.append(chunk)
    return b"".join(chunks)


def extract_zip_safely(data: bytes, destination: Path) -> int:
    try:
        archive = zipfile.ZipFile(io.BytesIO(data))
    except zipfile.BadZipFile as exc:
        raise ValueError("Uploaded file is not a valid ZIP archive.") from exc

    with archive:
        members = archive.infolist()
        if not members:
            raise ValueError("Uploaded ZIP archive is empty.")
        if len(members) > MAX_ARCHIVE_FILES:
            raise ValueError("Uploaded ZIP contains too many files.")

        extracted_bytes = 0
        for member in members:
            member_path = Path(member.filename)
            if member.filename.startswith(("/", "\\")) or member_path.drive:
                raise ValueError("ZIP contains an absolute path.")
            if any(part == ".." for part in member_path.parts):
                raise ValueError("ZIP contains an unsafe path.")

            unix_mode = (member.external_attr >> 16) & 0o170000
            if unix_mode == 0o120000:
                raise ValueError("ZIP contains a symbolic link.")

            target = (destination / member_path).resolve()
            root = destination.resolve()
            if target != root and root not in target.parents:
                raise ValueError("ZIP contains a path outside the project workspace.")

            if member.is_dir():
                target.mkdir(parents=True, exist_ok=True)
                continue

            extracted_bytes += member.file_size
            if extracted_bytes > MAX_EXTRACTED_BYTES:
                raise ValueError("ZIP expands beyond the 500 MB limit.")
            target.parent.mkdir(parents=True, exist_ok=True)
            with archive.open(member) as source, target.open("wb") as output:
                while True:
                    chunk = source.read(1024 * 1024)
                    if not chunk:
                        break
                    output.write(chunk)
    return len(members)
