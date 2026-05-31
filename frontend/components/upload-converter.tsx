"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Archive, CheckSquare, Download, DownloadCloud, FileUp, Loader2, Square, Trash2, UploadCloud } from "lucide-react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { ConversionStatus, downloadBatchZip, getStatus, startConversion, uploadFiles } from "@/lib/api";
import { cn, formatBytes } from "@/lib/utils";
import { conversionTools, ToolId } from "@/lib/tools";

const acceptMap: Record<string, string[]> = {
  "application/pdf": [".pdf"],
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
  "application/vnd.ms-excel": [".xls"],
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": [".pptx"]
};

type BatchItem = {
  id: string;
  file?: File;
  name: string;
  size: number;
  selected: boolean;
  status: "ready" | "uploading" | "queued" | "processing" | "completed" | "failed" | "deleted";
  progress: number;
  uploadId?: string;
  jobId?: string;
  result?: ConversionStatus;
  error?: string;
};

function token() {
  if (typeof window === "undefined") return undefined;
  return window.localStorage.getItem("convertpro_token") ?? undefined;
}

function itemId() {
  return typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
}

function downloadToken(downloadUrl: string) {
  return new URL(downloadUrl).searchParams.get("token") ?? "";
}

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function UploadConverter() {
  const searchParams = useSearchParams();
  const requestedTool = searchParams.get("tool") as ToolId | null;
  const initialTool = conversionTools.some((tool) => tool.id === requestedTool) ? requestedTool! : "pdf_to_docx";

  const [toolId, setToolId] = useState<ToolId>(initialTool);
  const activeTool = conversionTools.find((tool) => tool.id === toolId) ?? conversionTools[0];
  const [outputFormat, setOutputFormat] = useState(activeTool.defaultOutput);
  const [items, setItems] = useState<BatchItem[]>([]);
  const [message, setMessage] = useState<string>("");

  const groupedTool = toolId === "merge_pdf" || toolId === "image_to_pdf";
  const busy = items.some((item) => ["uploading", "queued", "processing"].includes(item.status));
  const completedItems = items.filter((item) => item.status === "completed" && item.result?.download_url);
  const selectedCompletedItems = completedItems.filter((item) => item.selected);
  const overallProgress = items.length ? Math.round(items.reduce((sum, item) => sum + item.progress, 0) / items.length) : 0;

  useEffect(() => {
    setOutputFormat(activeTool.defaultOutput);
    setItems((current) => current.map((item) => ({ ...item, status: "ready", progress: 0, result: undefined, error: undefined })));
  }, [activeTool.defaultOutput, toolId]);

  const accept = useMemo<Record<string, string[]>>(() => {
    return Object.fromEntries(
      Object.entries(acceptMap)
        .map(([mime, extensions]) => [mime, extensions.filter((ext) => activeTool.inputExtensions.includes(ext))])
        .filter(([, extensions]) => extensions.length > 0)
    ) as Record<string, string[]>;
  }, [activeTool.inputExtensions]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setMessage("");
    setItems((current) => [
      ...current,
      ...acceptedFiles.map((file) => ({
        id: itemId(),
        file,
        name: file.name,
        size: file.size,
        selected: true,
        status: "ready" as const,
        progress: 0
      }))
    ]);
  }, []);

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept,
    multiple: true,
    noClick: true,
    noKeyboard: true
  });

  function updateItem(id: string, patch: Partial<BatchItem>) {
    setItems((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  async function poll(item: BatchItem, jobId: string) {
    const current = await getStatus(jobId, token());
    updateItem(item.id, {
      status: current.status as BatchItem["status"],
      progress: current.progress,
      result: current,
      error: current.error_message ?? undefined
    });
    if (current.status === "completed" || current.status === "failed" || current.status === "deleted") {
      return current;
    }
    await new Promise((resolve) => setTimeout(resolve, 1400));
    return poll(item, jobId);
  }

  async function convertSingle(item: BatchItem) {
    if (!item.file) return;
    updateItem(item.id, { status: "uploading", progress: 8, error: undefined });
    const upload = await uploadFiles([item.file], token());
    updateItem(item.id, { status: "queued", progress: 15, uploadId: upload.file_id });
    const conversion = await startConversion(upload.file_id, toolId, outputFormat, token());
    updateItem(item.id, { status: "queued", progress: 20, jobId: conversion.job_id });
    await poll(item, conversion.job_id);
  }

  async function convertGrouped() {
    const files = items.map((item) => item.file).filter(Boolean) as File[];
    const outputName = toolId === "merge_pdf" ? `Merged PDF (${files.length} files)` : `Image PDF (${files.length} files)`;
    const resultItem: BatchItem = {
      id: itemId(),
      name: outputName,
      size: files.reduce((sum, file) => sum + file.size, 0),
      selected: true,
      status: "uploading",
      progress: 8
    };
    setItems([resultItem]);
    const upload = await uploadFiles(files, token());
    updateItem(resultItem.id, { status: "queued", progress: 15, uploadId: upload.file_id });
    const conversion = await startConversion(upload.file_id, toolId, outputFormat, token());
    updateItem(resultItem.id, { status: "queued", progress: 20, jobId: conversion.job_id });
    await poll(resultItem, conversion.job_id);
  }

  async function handleConvert() {
    if (!items.length) {
      setMessage("Select at least one file.");
      return;
    }
    if (groupedTool && items.length < 2) {
      setMessage(`${activeTool.title} requires at least two files.`);
      return;
    }

    try {
      setMessage("");
      if (groupedTool) {
        await convertGrouped();
      } else {
        await Promise.all(
          items.map(async (item) => {
            try {
              await convertSingle(item);
            } catch (error) {
              updateItem(item.id, {
                status: "failed",
                progress: 100,
                error: error instanceof Error ? error.message : "Conversion failed"
              });
            }
          })
        );
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Conversion failed");
    }
  }

  function removeItem(id: string) {
    setItems((current) => current.filter((item) => item.id !== id));
  }

  function toggleItem(id: string) {
    setItems((current) => current.map((item) => (item.id === id ? { ...item, selected: !item.selected } : item)));
  }

  function selectAllCompleted() {
    setItems((current) => current.map((item) => (item.status === "completed" ? { ...item, selected: true } : item)));
  }

  async function downloadZip(itemsToDownload: BatchItem[], filename: string) {
    if (!itemsToDownload.length) {
      setMessage("No completed files selected.");
      return;
    }
    const payload = itemsToDownload.map((item) => ({
      file_id: item.result!.file_id,
      token: downloadToken(item.result!.download_url!)
    }));
    const blob = await downloadBatchZip(payload, token());
    saveBlob(blob, filename);
  }

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.15fr_0.85fr]">
      <Card className="bg-white shadow-sm">
        <CardContent className="p-5 sm:p-6">
          <div
            {...getRootProps()}
            className={cn(
              "flex min-h-[280px] flex-col items-center justify-center rounded-lg border-2 border-dashed bg-muted/35 px-5 py-10 text-center transition",
              isDragActive && "border-primary bg-primary/5"
            )}
          >
            <input {...getInputProps()} />
            <motion.div
              animate={{ y: isDragActive ? -6 : 0, scale: isDragActive ? 1.03 : 1 }}
              className="mb-5 flex h-16 w-16 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-soft"
            >
              <UploadCloud className="h-8 w-8" />
            </motion.div>
            <h2 className="text-2xl font-semibold">Drag & Drop files</h2>
            <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
              Accepted input: {activeTool.inputs}. {groupedTool ? "These files will become one output." : "Each file will become a separate output."}
            </p>
            <Button type="button" onClick={open} className="mt-6 h-12 px-6">
              <FileUp className="mr-2 h-5 w-5" />
              Select Files
            </Button>
          </div>

          {items.length > 0 && (
            <div className="mt-5 space-y-2">
              {items.map((item) => (
                <div key={item.id} className="grid gap-3 rounded-md border bg-white px-4 py-3 sm:grid-cols-[auto_1fr_auto] sm:items-center">
                  <button
                    type="button"
                    onClick={() => toggleItem(item.id)}
                    className="flex h-9 w-9 items-center justify-center rounded-md hover:bg-muted"
                    aria-label={item.selected ? "Unselect file" : "Select file"}
                    disabled={item.status !== "completed"}
                  >
                    {item.selected && item.status === "completed" ? <CheckSquare className="h-5 w-5 text-primary" /> : <Square className="h-5 w-5 text-muted-foreground" />}
                  </button>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-medium">{item.name}</p>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs capitalize text-muted-foreground">{item.status}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{formatBytes(item.size)}</p>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${item.progress}%` }} />
                    </div>
                    {item.error && <p className="mt-2 text-xs text-destructive">{item.error}</p>}
                  </div>
                  <div className="flex justify-end gap-2">
                    {item.result?.download_url && (
                      <Button asChild size="sm" variant="outline">
                        <a href={item.result.download_url}>
                          <Download className="mr-1 h-4 w-4" />
                          Download
                        </a>
                      </Button>
                    )}
                    <Button type="button" variant="ghost" size="icon" aria-label="Remove file" onClick={() => removeItem(item.id)} disabled={busy}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-white shadow-sm">
        <CardContent className="p-5 sm:p-6">
          <div className="space-y-5">
            <div>
              <Label htmlFor="tool">Tool</Label>
              <select
                id="tool"
                value={toolId}
                onChange={(event) => setToolId(event.target.value as ToolId)}
                className="mt-2 h-11 w-full rounded-md border bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              >
                {conversionTools.map((tool) => (
                  <option key={tool.id} value={tool.id}>
                    {tool.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="format">Output Format</Label>
              <select
                id="format"
                value={outputFormat}
                onChange={(event) => setOutputFormat(event.target.value)}
                className="mt-2 h-11 w-full rounded-md border bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              >
                {activeTool.outputs.map((format) => (
                  <option key={format} value={format}>
                    {format.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            <Button type="button" size="lg" className="w-full" onClick={handleConvert} disabled={busy}>
              {busy && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
              Convert {items.length > 1 && !groupedTool ? `${items.length} Files` : ""}
            </Button>

            <div>
              <div className="mb-2 flex justify-between text-sm">
                <span className="font-medium">{busy ? "Processing" : completedItems.length ? "Completed" : "Ready"}</span>
                <span className="text-muted-foreground">{overallProgress}%</span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-muted">
                <motion.div className="h-full rounded-full bg-primary" animate={{ width: `${overallProgress}%` }} transition={{ duration: 0.35 }} />
              </div>
            </div>

            {message && <div className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">{message}</div>}

            <div className="rounded-lg border bg-muted/25 p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-medium">
                <Archive className="h-4 w-4 text-primary" />
                Download Options
              </div>
              <div className="grid gap-2">
                <Button type="button" variant="outline" className="w-full justify-start" onClick={selectAllCompleted} disabled={!completedItems.length || busy}>
                  <CheckSquare className="mr-2 h-4 w-4" />
                  Select All Completed
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full justify-start"
                  onClick={() => downloadZip(selectedCompletedItems, "convertpro-selected-files.zip")}
                  disabled={!selectedCompletedItems.length || busy}
                >
                  <DownloadCloud className="mr-2 h-4 w-4" />
                  Download Selected ZIP
                </Button>
                <Button
                  type="button"
                  className="w-full justify-start"
                  onClick={() => downloadZip(completedItems, "convertpro-all-files.zip")}
                  disabled={!completedItems.length || busy}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download All ZIP
                </Button>
              </div>
              <p className="mt-3 text-xs leading-5 text-muted-foreground">
                Completed files can be downloaded one by one, selected as a ZIP, or downloaded all together.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
