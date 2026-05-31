"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Download, RefreshCw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { deleteFile, getHistory, HistoryItem } from "@/lib/api";
import { formatBytes } from "@/lib/utils";

function getToken() {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem("convertpro_token") ?? "";
}

export function DashboardClient() {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function load() {
    const token = getToken();
    if (!token) {
      setMessage("Login required.");
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      setItems(await getHistory(token));
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load history");
    } finally {
      setLoading(false);
    }
  }

  async function remove(fileId: string) {
    await deleteFile(fileId, getToken());
    setItems((current) => current.filter((item) => item.id !== fileId));
  }

  useEffect(() => {
    load();
  }, []);

  const completed = items.filter((item) => item.status === "completed").length;
  const usedBytes = items.reduce((sum, item) => sum + item.file_size, 0);

  return (
    <section className="py-10 sm:py-14">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Dashboard</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-normal">Conversion History</h1>
          </div>
          <Button onClick={load} variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card className="bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Download Again</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold">{completed}</p>
              <p className="mt-1 text-sm text-muted-foreground">Completed files before expiry</p>
            </CardContent>
          </Card>
          <Card className="bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Account Usage</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold">{formatBytes(usedBytes)}</p>
              <p className="mt-1 text-sm text-muted-foreground">Uploaded in recent jobs</p>
            </CardContent>
          </Card>
          <Card className="bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Plan Status</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold">Free</p>
              <p className="mt-1 text-sm text-muted-foreground">10 MB, 5 conversions daily</p>
            </CardContent>
          </Card>
        </div>

        <Card className="overflow-hidden bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-muted/70 text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">File</th>
                  <th className="px-4 py-3 font-medium">Tool</th>
                  <th className="px-4 py-3 font-medium">Size</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Created</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-t">
                    <td className="max-w-[220px] truncate px-4 py-3 font-medium">{item.original_filename}</td>
                    <td className="px-4 py-3 text-muted-foreground">{item.tool ?? "-"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatBytes(item.file_size)}</td>
                    <td className="px-4 py-3 capitalize">{item.status}</td>
                    <td className="px-4 py-3 text-muted-foreground">{new Date(item.created_at).toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <Button asChild size="sm" variant="outline" disabled={!item.download_url}>
                          <a href={item.download_url ?? "#"}>
                            <Download className="mr-1 h-4 w-4" />
                            Download
                          </a>
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => remove(item.id)} aria-label="Delete file">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!loading && items.length === 0 && (
            <div className="p-8 text-center text-muted-foreground">
              {message ? message : "No conversions yet."}{" "}
              <Link href="/convert" className="font-medium text-primary">
                Convert a file
              </Link>
            </div>
          )}
          {loading && <div className="p-8 text-center text-muted-foreground">Loading history...</div>}
        </Card>
      </div>
    </section>
  );
}
