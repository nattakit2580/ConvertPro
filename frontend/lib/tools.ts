import type { LucideIcon } from "lucide-react";
import {
  Archive,
  Combine,
  FileImage,
  FileSpreadsheet,
  FileText,
  Image,
  Presentation,
  ScanText,
  Scissors,
  Shrink
} from "lucide-react";

export type ToolId =
  | "pdf_to_docx"
  | "pdf_to_excel"
  | "pdf_to_jpg"
  | "image_to_pdf"
  | "word_to_pdf"
  | "excel_to_pdf"
  | "powerpoint_to_pdf"
  | "merge_pdf"
  | "split_pdf"
  | "compress_pdf"
  | "ocr_pdf";

export type ConversionTool = {
  id: ToolId;
  title: string;
  description: string;
  icon: LucideIcon;
  inputs: string;
  outputs: string[];
  defaultOutput: string;
  inputExtensions: string[];
  multiple?: boolean;
  mvp: boolean;
};

export const conversionTools: ConversionTool[] = [
  {
    id: "pdf_to_docx",
    title: "PDF to Word",
    description: "Convert PDF documents into editable DOCX files.",
    icon: FileText,
    inputs: "PDF",
    outputs: ["docx"],
    defaultOutput: "docx",
    inputExtensions: [".pdf"],
    mvp: true
  },
  {
    id: "pdf_to_excel",
    title: "PDF to Excel",
    description: "Extract tables and text into structured XLSX workbooks.",
    icon: FileSpreadsheet,
    inputs: "PDF",
    outputs: ["xlsx"],
    defaultOutput: "xlsx",
    inputExtensions: [".pdf"],
    mvp: true
  },
  {
    id: "pdf_to_jpg",
    title: "PDF to Image",
    description: "Render PDF pages as JPG or PNG images.",
    icon: Image,
    inputs: "PDF",
    outputs: ["jpg", "png"],
    defaultOutput: "jpg",
    inputExtensions: [".pdf"],
    mvp: true
  },
  {
    id: "image_to_pdf",
    title: "Image to PDF",
    description: "Combine JPG and PNG images into a single PDF.",
    icon: FileImage,
    inputs: "JPG, PNG",
    outputs: ["pdf"],
    defaultOutput: "pdf",
    inputExtensions: [".jpg", ".jpeg", ".png"],
    multiple: true,
    mvp: true
  },
  {
    id: "word_to_pdf",
    title: "Word to PDF",
    description: "Export DOCX files to clean PDF output.",
    icon: FileText,
    inputs: "DOCX",
    outputs: ["pdf"],
    defaultOutput: "pdf",
    inputExtensions: [".docx"],
    mvp: false
  },
  {
    id: "excel_to_pdf",
    title: "Excel to PDF",
    description: "Convert spreadsheets into portable PDF files.",
    icon: FileSpreadsheet,
    inputs: "XLSX, XLS",
    outputs: ["pdf"],
    defaultOutput: "pdf",
    inputExtensions: [".xlsx", ".xls"],
    mvp: false
  },
  {
    id: "powerpoint_to_pdf",
    title: "PowerPoint to PDF",
    description: "Convert presentations into shareable PDFs.",
    icon: Presentation,
    inputs: "PPTX",
    outputs: ["pdf"],
    defaultOutput: "pdf",
    inputExtensions: [".pptx"],
    mvp: false
  },
  {
    id: "merge_pdf",
    title: "Merge PDF",
    description: "Combine multiple PDFs into one ordered document.",
    icon: Combine,
    inputs: "PDF",
    outputs: ["pdf"],
    defaultOutput: "pdf",
    inputExtensions: [".pdf"],
    multiple: true,
    mvp: true
  },
  {
    id: "split_pdf",
    title: "Split PDF",
    description: "Separate PDF pages into a downloadable ZIP archive.",
    icon: Scissors,
    inputs: "PDF",
    outputs: ["zip"],
    defaultOutput: "zip",
    inputExtensions: [".pdf"],
    mvp: true
  },
  {
    id: "compress_pdf",
    title: "Compress PDF",
    description: "Reduce PDF size with Ghostscript compression.",
    icon: Shrink,
    inputs: "PDF",
    outputs: ["pdf"],
    defaultOutput: "pdf",
    inputExtensions: [".pdf"],
    mvp: false
  },
  {
    id: "ocr_pdf",
    title: "OCR PDF",
    description: "Extract text from scanned PDFs and images.",
    icon: ScanText,
    inputs: "PDF, JPG, PNG",
    outputs: ["txt"],
    defaultOutput: "txt",
    inputExtensions: [".pdf", ".jpg", ".jpeg", ".png"],
    mvp: false
  }
];

export const featuredTools = conversionTools.filter((tool) => tool.mvp);
