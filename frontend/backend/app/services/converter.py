import shutil
import subprocess
import zipfile
from pathlib import Path

# Unicode math / Greek characters that signal complex typesetting
_MATH_CHARS = frozenset(
    "∑∫∞±×÷√∝∂∇∈∉∩∪⊂⊃≤≥≠≈∀∃"
    "αβγδεζηθικλμνξοπρστυφχψω"
    "ΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩ"
    "⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁼⁽⁾"
)


class ConversionError(RuntimeError):
    pass


def convert_file(tool: str, input_paths: list[Path], output_dir: Path, output_format: str) -> tuple[Path, str]:
    output_dir.mkdir(parents=True, exist_ok=True)
    if tool == "pdf_to_docx":
        return _pdf_to_docx(input_paths[0], output_dir)
    if tool == "pdf_to_excel":
        return _pdf_to_excel(input_paths[0], output_dir)
    if tool == "pdf_to_jpg":
        return _pdf_to_images(input_paths[0], output_dir, output_format)
    if tool == "image_to_pdf":
        return _images_to_pdf(input_paths, output_dir)
    if tool == "merge_pdf":
        return _merge_pdf(input_paths, output_dir)
    if tool == "split_pdf":
        return _split_pdf(input_paths[0], output_dir)
    if tool == "compress_pdf":
        return _compress_pdf(input_paths[0], output_dir)
    if tool == "ocr_pdf":
        return _ocr_to_text(input_paths[0], output_dir)
    if tool in {"word_to_pdf", "excel_to_pdf", "powerpoint_to_pdf"}:
        return _office_to_pdf(input_paths[0], output_dir)
    raise ConversionError(f"Tool '{tool}' is not implemented in this worker")


def _pdf_to_docx(input_path: Path, output_dir: Path) -> tuple[Path, str]:
    from pdf2docx import Converter

    output_path = output_dir / f"{input_path.stem}.docx"
    cv = Converter(str(input_path))
    try:
        cv.convert(str(output_path))
    finally:
        cv.close()
    return output_path, output_path.name


def _pdf_to_excel(input_path: Path, output_dir: Path) -> tuple[Path, str]:
    import pandas as pd
    import pdfplumber

    output_path = output_dir / f"{input_path.stem}.xlsx"
    wrote_sheet = False
    with pd.ExcelWriter(output_path, engine="openpyxl") as writer:
        with pdfplumber.open(input_path) as pdf:
            for page_index, page in enumerate(pdf.pages, start=1):
                tables = page.extract_tables()
                if tables:
                    for table_index, table in enumerate(tables, start=1):
                        frame = pd.DataFrame(table[1:], columns=table[0])
                        frame.to_excel(writer, sheet_name=f"p{page_index}_t{table_index}"[:31], index=False)
                        wrote_sheet = True
                else:
                    text = page.extract_text() or ""
                    if text.strip():
                        pd.DataFrame({"text": text.splitlines()}).to_excel(
                            writer, sheet_name=f"page_{page_index}"[:31], index=False
                        )
                        wrote_sheet = True
        if not wrote_sheet:
            pd.DataFrame({"message": ["No table or text could be extracted"]}).to_excel(
                writer, sheet_name="result", index=False
            )
    return output_path, output_path.name


def _pdf_to_images(input_path: Path, output_dir: Path, output_format: str) -> tuple[Path, str]:
    import fitz

    extension = "png" if output_format == "png" else "jpg"
    image_paths: list[Path] = []
    document = fitz.open(input_path)
    try:
        for index, page in enumerate(document, start=1):
            pixmap = page.get_pixmap(matrix=fitz.Matrix(2, 2), alpha=False)
            image_path = output_dir / f"{input_path.stem}-page-{index:03d}.{extension}"
            pixmap.save(image_path)
            image_paths.append(image_path)
    finally:
        document.close()

    if len(image_paths) == 1:
        return image_paths[0], image_paths[0].name
    archive = output_dir / f"{input_path.stem}-{extension}-pages.zip"
    _zip_files(image_paths, archive)
    return archive, archive.name


def _images_to_pdf(input_paths: list[Path], output_dir: Path) -> tuple[Path, str]:
    from PIL import Image

    output_path = output_dir / "images.pdf"
    images = []
    for input_path in input_paths:
        image = Image.open(input_path).convert("RGB")
        images.append(image)
    if not images:
        raise ConversionError("No images supplied")
    first, *rest = images
    first.save(output_path, save_all=True, append_images=rest)
    return output_path, output_path.name


def _merge_pdf(input_paths: list[Path], output_dir: Path) -> tuple[Path, str]:
    from pypdf import PdfReader, PdfWriter

    output_path = output_dir / "merged.pdf"
    writer = PdfWriter()
    for input_path in input_paths:
        reader = PdfReader(str(input_path))
        for page in reader.pages:
            writer.add_page(page)
    with output_path.open("wb") as stream:
        writer.write(stream)
    return output_path, output_path.name


def _split_pdf(input_path: Path, output_dir: Path) -> tuple[Path, str]:
    from pypdf import PdfReader, PdfWriter

    reader = PdfReader(str(input_path))
    page_paths: list[Path] = []
    for index, page in enumerate(reader.pages, start=1):
        writer = PdfWriter()
        writer.add_page(page)
        page_path = output_dir / f"{input_path.stem}-page-{index:03d}.pdf"
        with page_path.open("wb") as stream:
            writer.write(stream)
        page_paths.append(page_path)

    archive = output_dir / f"{input_path.stem}-split-pages.zip"
    _zip_files(page_paths, archive)
    return archive, archive.name


def _compress_pdf(input_path: Path, output_dir: Path) -> tuple[Path, str]:
    output_path = output_dir / f"{input_path.stem}-compressed.pdf"
    gs = shutil.which("gs") or shutil.which("gswin64c") or shutil.which("gswin32c")
    if not gs:
        raise ConversionError("Ghostscript is required for PDF compression")
    subprocess.run(
        [
            gs,
            "-sDEVICE=pdfwrite",
            "-dCompatibilityLevel=1.4",
            "-dPDFSETTINGS=/ebook",
            "-dNOPAUSE",
            "-dQUIET",
            "-dBATCH",
            f"-sOutputFile={output_path}",
            str(input_path),
        ],
        check=True,
    )
    return output_path, output_path.name


def _office_to_pdf(input_path: Path, output_dir: Path) -> tuple[Path, str]:
    soffice = shutil.which("soffice") or shutil.which("libreoffice")
    if not soffice:
        raise ConversionError("LibreOffice headless is required for Office to PDF conversion")
    subprocess.run(
        [soffice, "--headless", "--convert-to", "pdf", "--outdir", str(output_dir), str(input_path)],
        check=True,
        timeout=180,
    )
    output_path = output_dir / f"{input_path.stem}.pdf"
    if not output_path.exists():
        raise ConversionError("LibreOffice did not create a PDF")
    return output_path, output_path.name


def _ocr_to_text(input_path: Path, output_dir: Path) -> tuple[Path, str]:
    import fitz
    import pytesseract
    from PIL import Image

    output_path = output_dir / f"{input_path.stem}-ocr.txt"
    suffix = input_path.suffix.lower()
    pages: list[str] = []

    if suffix == ".pdf":
        document = fitz.open(input_path)
        try:
            for index, page in enumerate(document, start=1):
                pixmap = page.get_pixmap(matrix=fitz.Matrix(2, 2), alpha=False)
                image = Image.frombytes("RGB", [pixmap.width, pixmap.height], pixmap.samples)
                pages.append(f"--- Page {index} ---\n{pytesseract.image_to_string(image).strip()}")
        finally:
            document.close()
    else:
        image = Image.open(input_path)
        pages.append(pytesseract.image_to_string(image).strip())

    output_path.write_text("\n\n".join(pages), encoding="utf-8")
    return output_path, output_path.name


def _zip_files(paths: list[Path], archive_path: Path) -> None:
    with zipfile.ZipFile(archive_path, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        for path in paths:
            archive.write(path, arcname=path.name)
