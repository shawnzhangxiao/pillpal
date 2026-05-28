"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return new Uint8Array([...rawData].map((char) => char.charCodeAt(0)));
}

interface MedStatus {
  taken: boolean;
  time: string | null;
  pills: number;
}

interface TodayData {
  coq10: MedStatus;
  folic_acid: MedStatus;
}

function Greeting() {
  const hour = new Date().getHours();
  let emoji = "☀️";
  let text = "早上好";
  if (hour >= 6 && hour < 12) { emoji = "☀️"; text = "早上好"; }
  else if (hour >= 12 && hour < 14) { emoji = "☀️"; text = "中午好"; }
  else if (hour >= 14 && hour < 18) { emoji = "🌤️"; text = "下午好"; }
  else { emoji = "🌙"; text = "晚上好"; }

  return (
    <div className="text-center mb-6">
      <p className="text-4xl mb-3">🐚</p>
      <h2 className="text-xl font-semibold text-[#2A5F8F]">
        {emoji} {text}，准妈妈
      </h2>
      <p className="text-[#7BB3E0] text-sm mt-1">
        {new Date().toLocaleDateString("zh-CN", {
          year: "numeric", month: "long", day: "numeric", weekday: "long",
        })}
      </p>
    </div>
  );
}

function TimeWindow() {
  const [inWindow, setInWindow] = useState(false);

  useEffect(() => {
    function check() { setInWindow(new Date().getHours() >= 13 && new Date().getHours() < 14); }
    check();
    const id = setInterval(check, 60000);
    return () => clearInterval(id);
  }, []);

  if (!inWindow) return null;

  return (
    <div className="card bg-[#FFF9F0] border-[#FFD8A8] mb-5 px-4 py-3 text-sm text-[#C7884A] flex items-center gap-2">
      <span>⏰</span>
      <span>服药时间到啦（13:00 - 14:00），记得按时吃药哦</span>
    </div>
  );
}

function NotificationPrompt() {
  const [status, setStatus] = useState<"unsupported" | "denied" | "subscribed" | "prompt">("prompt");
  const [subscribing, setSubscribing] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setStatus("unsupported"); return;
    }
    navigator.serviceWorker.getRegistration().then((reg) => {
      if (reg) {
        reg.pushManager.getSubscription().then((sub) => {
          setStatus(sub ? "subscribed" : "prompt");
        });
      } else { setStatus("prompt"); }
    });
  }, []);

  async function handleSubscribe() {
    setSubscribing(true);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") { setStatus("denied"); setSubscribing(false); return; }

      let reg = await navigator.serviceWorker.getRegistration();
      if (!reg) reg = await navigator.serviceWorker.register("/service-worker");

      const vapidKey = process.env.NEXT_PUBLIC_VAPID_KEY || "";
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });

      await fetch("/api/notifications/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub),
      });
      setStatus("subscribed");
    } catch (e) { console.error("Subscription failed:", e); }
    setSubscribing(false);
  }

  if (status === "unsupported" || status === "denied") return null;
  if (status === "subscribed") {
    return (
      <div className="mt-6 text-center">
        <p className="text-xs text-[#A0C4DD]">🔔 每日 13:00 准时提醒</p>
      </div>
    );
  }

  return (
    <div className="mt-6">
      <button
        onClick={handleSubscribe}
        disabled={subscribing}
        className="w-full py-3 bg-[#FFF3E0] border border-[#FFD8A8] text-[#C7884A] rounded-xl font-medium text-sm hover:bg-[#FFE8CC] transition-colors disabled:opacity-50"
      >
        {subscribing ? "正在开启..." : "🔔 开启服药提醒"}
      </button>
    </div>
  );
}

export default function DashboardPage() {
  const { logout } = useAuth();
  const [data, setData] = useState<TodayData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchToday = useCallback(async () => {
    const res = await fetch("/api/today");
    if (res.ok) setData(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { fetchToday(); }, [fetchToday]);

  async function handleTake(med: "coq10" | "folic_acid") {
    const res = await fetch("/api/take", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ med }),
    });
    if (res.ok) setData(await res.json());
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-[#7BB3E0] animate-pulse">🌊</p>
      </div>
    );
  }

  const allTaken = data?.coq10.taken && data?.folic_acid.taken;

  return (
    <div className="min-h-screen px-4 py-8 pb-20">
      <div className="max-w-sm mx-auto">
        <Greeting />
        <TimeWindow />

        {/* All done celebration */}
        {allTaken && (
          <div className="card bg-[#F0FAF4] border-[#A8D8A8] mb-5 px-4 py-4 text-center">
            <p className="text-3xl mb-1">🌸</p>
            <p className="text-[#5A9A6F] font-medium">今天的药都吃好啦</p>
            <p className="text-[#8BC4A0] text-xs mt-0.5">小公主在健康成长中</p>
          </div>
        )}

        {/* Medication Cards */}
        <div className="space-y-3">
          <MedCard
            emoji="💊"
            name="辅酶Q10"
            subtitle="守护细胞能量"
            pills={1}
            taken={data?.coq10.taken || false}
            time={data?.coq10.time ?? null}
            onTake={() => handleTake("coq10")}
          />
          <MedCard
            emoji="💊"
            name="叶酸"
            subtitle="宝宝神经发育"
            pills={2}
            taken={data?.folic_acid.taken || false}
            time={data?.folic_acid.time ?? null}
            onTake={() => handleTake("folic_acid")}
          />
        </div>

        {/* Baby girl decoration */}
        <div className="mt-6 text-center select-none">
          <p className="text-3xl">👶🏻🌸🎀</p>
          <p className="text-xs text-[#E8B4C4] mt-1">等待我们的小公主</p>
        </div>

        {/* Notification */}
        <NotificationPrompt />

        {/* Footer */}
        <div className="mt-8 text-center space-y-1">
          <p className="text-xs text-[#BCD4E6]">
            🌊 CoQ10 + 叶酸 · 为小公主的健康每一天
          </p>
          <button
            onClick={logout}
            className="text-xs text-[#CCDDE8] hover:text-[#A0C4DD] transition-colors"
          >
            退出登录
          </button>
        </div>
      </div>
    </div>
  );
}

function MedCard({
  emoji, name, subtitle, pills, taken, time, onTake,
}: {
  emoji: string; name: string; subtitle: string; pills: number;
  taken: boolean; time: string | null; onTake: () => void;
}) {
  return (
    <div
      className={`card p-5 transition-all duration-300 ${
        taken ? "bg-[#F8FDF9] border-[#C5E8D0]" : "hover:shadow-lg"
      }`}
    >
      <div className="flex items-center gap-4">
        {/* Pill icon */}
        <div
          className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 ${
            taken ? "bg-[#E8F5EC]" : "bg-[#F0F4F8]"
          }`}
        >
          {emoji}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-[#3D6A8E]">{name}</h3>
          <p className="text-xs text-[#A0C4DD]">{subtitle}</p>
          <div className="flex items-center gap-2 mt-1">
            {[...Array(pills)].map((_, i) => (
              <span key={i} className={`text-sm ${taken ? "opacity-30" : ""}`}>💊</span>
            ))}
            <span className="text-xs text-[#A0C4DD]">×{pills}粒/次</span>
          </div>
          {taken && time && (
            <p className="text-xs text-[#8BC4A0] mt-1">
              已于 {new Date(time).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })} 服用
            </p>
          )}
        </div>

        {/* Action button */}
        <button
          onClick={onTake}
          disabled={taken}
          className={`flex-shrink-0 px-4 py-2.5 rounded-xl font-medium text-sm transition-all ${
            taken
              ? "btn-disabled text-sm"
              : "btn-primary"
          }`}
        >
          {taken ? "已服用 ✓" : "我吃了"}
        </button>
      </div>
    </div>
  );
}
