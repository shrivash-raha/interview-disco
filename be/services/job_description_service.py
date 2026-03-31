from io import BytesIO
from pathlib import Path

from fastapi import UploadFile

from utils.file_utils import generate_job_description_file_path

SUPPORTED_EXTENSIONS = {"txt", "pdf"}


def save_job_description_file(file: UploadFile, user_id: int, conversation_id: int) -> tuple[str, bytes]:
    original_name = Path(file.filename or "").name
    extension = Path(original_name).suffix.lower().lstrip(".")
    if extension not in SUPPORTED_EXTENSIONS:
        raise ValueError("Only .txt and .pdf job description files are supported")
    if not original_name:
        raise ValueError("Job description file name is required")

    output_path = generate_job_description_file_path(user_id, conversation_id, original_name)
    contents = file.file.read()
    with open(output_path, "wb") as destination:
        destination.write(contents)
    return output_path, contents


def extract_job_description_text_from_upload(file: UploadFile) -> str:
    original_name = Path(file.filename or "").name
    extension = Path(original_name).suffix.lower().lstrip(".")
    if extension not in SUPPORTED_EXTENSIONS:
        raise ValueError("Only .txt and .pdf job description files are supported")

    contents = file.file.read()
    file.file.seek(0)

    if extension == "txt":
        return contents.decode("utf-8", errors="ignore").strip()
    if extension == "pdf":
        try:
            from pypdf import PdfReader
        except ModuleNotFoundError as exc:
            raise RuntimeError("PDF extraction requires the pypdf package to be installed") from exc
        reader = PdfReader(BytesIO(contents))
        pages = [page.extract_text() or "" for page in reader.pages]
        return "\n".join(page.strip() for page in pages if page.strip()).strip()
    raise ValueError("Unsupported job description file type")


def extract_job_description_text(file_path: str) -> str:
    extension = Path(file_path).suffix.lower()
    if extension == ".txt":
        return Path(file_path).read_text(encoding="utf-8", errors="ignore").strip()
    if extension == ".pdf":
        try:
            from pypdf import PdfReader
        except ModuleNotFoundError as exc:
            raise RuntimeError("PDF extraction requires the pypdf package to be installed") from exc
        reader = PdfReader(file_path)
        pages = [page.extract_text() or "" for page in reader.pages]
        return "\n".join(page.strip() for page in pages if page.strip()).strip()
    raise ValueError("Unsupported job description file type")
