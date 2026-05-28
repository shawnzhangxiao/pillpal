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

function TimeWindow() {
  const [inWindow, setInWindow] = useState(false);

  useEffect(() => {
    function check() {
      const h = new Date().getHours();
      setInWindow(h >= 13 && h < 14);
    }
    check();
    const id = setInterval(check, 60000);
    return () => clearInterval(id);
  }, []);

  if (!inWindow) return null;

  return (
    <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-xl text-sm">
      服药窗口 13:00-14:00，记得按时吃药
    </div>
  );
}

function Greeting() {
  const hour = new Date().getHours();
  let text = "早上好";
  if (hour >= 12 && hour < 18) text = "下午好";
  else if (hour >= 18) text = "晚上好";

  return (
    <div className="text-center mb-4">
      <h2 className="text-xl font-semibold text-gray-800">{text}，夫人</h2>
      <p className="text-gray-400 text-sm mt-1">
        {new Date().toLocaleDateString("zh-CN", {
          year: "numeric",
          month: "long",
          day: "numeric",
          weekday: "long",
        })}
      </p>
    </div>
  );
}

export default function DashboardPage() {
  const { logout } = useAuth();
  const [data, setData] = useState<TodayData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchToday = useCallback(async () => {
    const res = await fetch("/api/today");
    if (res.ok) {
      setData(await res.json());
    } else {
      setError("加载失败");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchToday();
  }, [fetchToday]);

  async function handleTake(med: "coq10" | "folic_acid") {
    const res = await fetch("/api/take", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ med }),
    });
    if (res.ok) {
      setData(await res.json());
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-400">加载中...</p>
      </div>
    );
  }

  const allTaken = data?.coq10.taken && data?.folic_acid.taken;

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="max-w-sm mx-auto">
        <Greeting />
        <TimeWindow />

        {allTaken && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm text-center mt-3">
            今日已完成全部服药
          </div>
        )}

        <div className="mt-6 space-y-3">
          <MedCard
            name="辅酶Q10"
            pills={data?.coq10.pills || 1}
            taken={data?.coq10.taken || false}
            time={data?.coq10.time ?? null}
            onTake={() => handleTake("coq10")}
          />
          <MedCard
            name="叶酸"
            pills={data?.folic_acid.pills || 2}
            taken={data?.folic_acid.taken || false}
            time={data?.folic_acid.time ?? null}
            onTake={() => handleTake("folic_acid")}
          />
        </div>

        <NotificationPrompt />

        <button
          onClick={logout}
          className="mt-8 w-full py-2 text-gray-400 text-sm hover:text-gray-600 transition-colors"
        >
          退出登录
        </button>
      </div>
    </div>
  );
}

function NotificationPrompt() {
  const [status, setStatus] = useState<"unsupported" | "denied" | "subscribed" | "prompt">("prompt");
  const [subscribing, setSubscribing] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setStatus("unsupported");
      return;
    }
    navigator.serviceWorker.getRegistration().then((reg) => {
      if (reg) {
        reg.pushManager.getSubscription().then((sub) => {
          setStatus(sub ? "subscribed" : "prompt");
        });
      } else {
        setStatus("prompt");
      }
    });
  }, []);

  async function handleSubscribe() {
    setSubscribing(true);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setStatus("denied");
        setSubscribing(false);
        return;
      }

      let reg = await navigator.serviceWorker.getRegistration();
      if (!reg) {
        reg = await navigator.serviceWorker.register("/service-worker");
      }

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
    } catch (e) {
      console.error("Subscription failed:", e);
    }
    setSubscribing(false);
  }

  if (status === "unsupported" || status === "denied") return null;
  if (status === "subscribed") {
    return (
      <div className="mt-6 text-center text-xs text-green-600">
        通知提醒已开启，每天13:00会收到推送
      </div>
    );
  }

  return (
    <div className="mt-6">
      <button
        onClick={handleSubscribe}
        disabled={subscribing}
        className="w-full py-3 bg-blue-50 border border-blue-200 text-blue-700 rounded-xl font-medium text-sm hover:bg-blue-100 transition-colors disabled:opacity-50"
      >
        {subscribing ? "正在开启..." : "开启通知提醒"}
      </button>
      <p className="text-center text-xs text-gray-400 mt-2">每天13:00提醒夫人吃药</p>
    </div>
  );
}

function MedCard({
  name,
  pills,
  taken,
  time,
  onTake,
}: {
  name: string;
  pills: number;
  taken: boolean;
  time: string | null;
  onTake: () => void;
}) {
  return (
    <div
      className={`rounded-xl p-5 border-2 transition-all ${
        taken
          ? "bg-green-50 border-green-300"
          : "bg-white border-gray-100 shadow-sm"
      }`}
    >
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">{name}</h3>
          <p className="text-gray-400 text-sm mt-0.5">每次 {pills} 粒</p>
          {taken && time && (
            <p className="text-green-600 text-xs mt-1">
              已服用 {new Date(time).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}
            </p>
          )}
        </div>
        <button
          onClick={onTake}
          disabled={taken}
          className={`px-5 py-2.5 rounded-lg font-medium text-sm transition-all ${
            taken
              ? "bg-green-100 text-green-600 cursor-default"
              : "bg-green-500 text-white hover:bg-green-600 active:scale-95"
          }`}
        >
          {taken ? "已服用" : "标记服用"}
        </button>
      </div>
    </div>
  );
}
