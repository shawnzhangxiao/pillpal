"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";

export default function LoginPage() {
  const { login } = useAuth();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    const err = await login(phone, password);
    if (err) setError(err);
    setSubmitting(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🐚</div>
          <h1 className="text-2xl font-semibold text-[#2A5F8F]">小贝壳</h1>
          <p className="text-[#7BB3E0] text-sm mt-1">为小公主的到来做好准备</p>
        </div>

        {/* Form Card */}
        <form onSubmit={handleSubmit} className="card p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#5B8FAF] mb-1.5">手机号</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="请输入手机号"
              className="w-full px-4 py-3 bg-[#F8FAFB] border border-[#D4EAF7] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#7BB3E0] focus:border-transparent text-gray-700 placeholder-gray-300"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#5B8FAF] mb-1.5">密码</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="请输入密码"
              className="w-full px-4 py-3 bg-[#F8FAFB] border border-[#D4EAF7] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#7BB3E0] focus:border-transparent text-gray-700 placeholder-gray-300"
              required
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 btn-primary disabled:opacity-50"
          >
            {submitting ? "登录中..." : "登录"}
          </button>

          <p className="text-center text-sm text-[#A0C4DD]">
            还没有账号？{" "}
            <Link href="/register" className="text-[#3B7CB9] hover:underline font-medium">
              注册
            </Link>
          </p>
        </form>

        {/* Footer */}
        <p className="text-center text-xs text-[#BCD4E6] mt-8">
          🌊 每天按时吃药，迎接我们的小公主 👶🏻🌸
        </p>
      </div>
    </div>
  );
}
