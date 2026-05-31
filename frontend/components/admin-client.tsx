"use client";

import { useEffect, useState } from "react";
import { Activity, Database, FileWarning, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAdminStats, HistoryItem } from "@/lib/api";
import { formatBytes } from "@/lib/utils";

type Stats = {
  total_users: number;
  conversions_today: number;
  failed_today: number;
  storage_bytes: number;
  queue_status: string;
  recent_failures: HistoryItem[];
};

function token() {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem("convertpro_token") ?? "";
}

export function AdminClient() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    getAdminStats(token())
      .then(setStats)
      .catch((error) => setMessage(error instanceof Error ? error.message : "Admin stats unavailable"));
  }, []);

  const cards = [
    { label: "Total Users", value: stats?.total_users ?? 0, icon: Users },
    { label: "Files Converted Today", value: stats?.conversions_today ?? 0, icon: Activity },
    { label: "Failed Today", value: stats?.failed_today ?? 0, icon: FileWarning },
    { label: "Storage Usage", value: formatBytes(stats?.storage_bytes ?? 0), icon: Database }
  ];

  return (
    <section className="py-10 sm:py-14">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Admin</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-normal">System Dashboard</h1>
          <p className="mt-4 text-lg leading-8 text-muted-foreground">Monitor users, conversion volume, failures, storage, and worker status.</p>
        </div>

        {message && <div className="mb-6 rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">{message}</div>}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {cards.map((card) => (
            <Card key={card.label} className="bg-white shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-medium text-muted-foreground">{card.label}</CardTitle>
                <card.icon className="h-5 w-5 text-primary" />
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold">{card.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-[0.8fr_1.2fr]">
          <Card className="bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl">Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Queue</span>
                <span className="font-medium">{stats?.queue_status ?? "unknown"}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">File expiry</span>
                <span className="font-medium">1 hour</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Storage</span>
                <span className="font-medium">Local MVP</span>
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl">Logs</CardTitle>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead className="bg-muted/70 text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">File</th>
                    <th className="px-4 py-3 font-medium">Tool</th>
                    <th className="px-4 py-3 font-medium">Error</th>
                  </tr>
                </thead>
                <tbody>
                  {(stats?.recent_failures ?? []).map((item) => (
                    <tr key={item.id} className="border-t">
                      <td className="max-w-[180px] truncate px-4 py-3 font-medium">{item.original_filename}</td>
                      <td className="px-4 py-3 text-muted-foreground">{item.tool}</td>
                      <td className="max-w-[280px] truncate px-4 py-3 text-destructive">{item.error_message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {stats && stats.recent_failures.length === 0 && <div className="p-6 text-sm text-muted-foreground">No failed jobs in recent logs.</div>}
          </Card>
        </div>
      </div>
    </section>
  );
}
