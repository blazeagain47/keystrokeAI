"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles } from "lucide-react";
import { useAuthStore } from "@/store/auth";

type Props = { className?: string; memberSince?: string | null };

export default function NotificationsCard({ className = "", memberSince }: Props) {
  const user = useAuthStore((s) => s.user);
  const dateText = memberSince ?? (user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : null);
  return (
    <Card className={`rounded-2xl border border-white/10 bg-gray-900/40 backdrop-blur-md hover:shadow-[0_0_30px_rgba(255,110,0,.15)] transition-shadow ${className}`}>
      <CardContent className="p-4 md:p-5">
        <div className="text-base font-semibold text-white mb-2">Member Since</div>
        <div className="text-2xl font-semibold tracking-tight text-white">{dateText ?? "—"}</div>
        <div className="text-white/70 text-sm mt-1 flex items-center gap-1">
          <Sparkles className="h-4 w-4" />
          <span>Thanks for being here ✨</span>
        </div>
      </CardContent>
    </Card>
  );
}


