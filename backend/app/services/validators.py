from app.services.storage import StoredFile, StorageService


class UploadValidationError(ValueError):
    pass


ALLOWED_EXTENSIONS = {".pdf", ".docx", ".xlsx", ".xls", ".pptx", ".jpg", ".jpeg", ".png"}

SIGNATURES = {
    ".pdf": [b"%PDF"],
    ".jpg": [b"\xff\xd8\xff"],
    ".jpeg": [b"\xff\xd8\xff"],
    ".png": [b"\x89PNG\r\n\x1a\n"],
    ".docx": [b"PK\x03\x04"],
    ".xlsx": [b"PK\x03\x04"],
    ".pptx": [b"PK\x03\x04"],
    ".xls": [b"\xd0\xcf\x11\xe0"],
}

TOOL_CONFIG = {
    "pdf_to_docx": {
        "min_files": 1,
        "max_files": 1,
        "inputs": {".pdf"},
        "outputs": {"docx"},
        "default_output": "docx",
    },
    "pdf_to_excel": {
        "min_files": 1,
        "max_files": 1,
        "inputs": {".pdf"},
        "outputs": {"xlsx"},
        "default_output": "xlsx",
    },
    "pdf_to_jpg": {
        "min_files": 1,
        "max_files": 1,
        "inputs": {".pdf"},
        "outputs": {"jpg", "png"},
        "default_output": "jpg",
    },
    "image_to_pdf": {
        "min_files": 1,
        "max_files": 20,
        "inputs": {".jpg", ".jpeg", ".png"},
        "outputs": {"pdf"},
        "default_output": "pdf",
    },
    "merge_pdf": {
        "min_files": 2,
        "max_files": 20,
        "inputs": {".pdf"},
        "outputs": {"pdf"},
        "default_output": "pdf",
    },
    "split_pdf": {
        "min_files": 1,
        "max_files": 1,
        "inputs": {".pdf"},
        "outputs": {"zip"},
        "default_output": "zip",
    },
    "compress_pdf": {
        "min_files": 1,
        "max_files": 1,
        "inputs": {".pdf"},
        "outputs": {"pdf"},
        "default_output": "pdf",
    },
    "ocr_pdf": {
        "min_files": 1,
        "max_files": 1,
        "inputs": {".pdf", ".jpg", ".jpeg", ".png"},
        "outputs": {"txt"},
        "default_output": "txt",
    },
    "word_to_pdf": {
        "min_files": 1,
        "max_files": 1,
        "inputs": {".docx"},
        "outputs": {"pdf"},
        "default_output": "pdf",
    },
    "excel_to_pdf": {
        "min_files": 1,
        "max_files": 1,
        "inputs": {".xlsx", ".xls"},
        "outputs": {"pdf"},
        "default_output": "pdf",
    },
    "powerpoint_to_pdf": {
        "min_files": 1,
        "max_files": 1,
        "inputs": {".pptx"},
        "outputs": {"pdf"},
        "default_output": "pdf",
    },
}


def validate_stored_file(stored_file: StoredFile) -> None:
    if stored_file.suffix not in ALLOWED_EXTENSIONS:
        raise UploadValidationError("Unsupported file type")

    path = StorageService().path_for(stored_file.storage_key)
    with path.open("rb") as stream:
        head = stream.read(16)
    if not any(head.startswith(signature) for signature in SIGNATURES[stored_file.suffix]):
        raise UploadValidationError("File content does not match the declared file type")

    with path.open("rb") as stream:
        sample = stream.read(4096)
    if b"EICAR-STANDARD-ANTIVIRUS-TEST-FILE" in sample:
        raise UploadValidationError("File failed the security scan")
