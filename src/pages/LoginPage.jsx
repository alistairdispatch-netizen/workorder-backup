/**
 * Login Page
 * Authentication page with mobile-first professional design.
 *
 * 設計原則：
 * - 商業風格：深藍色系、專業簡潔
 * - 手機優先：大觸控區域、清晰字體
 * - 輸入框 16px 防止 iOS 縮放
 * - Desktop (md:)：雙欄分割，左側品牌區，右側表單
 * - Mobile：維持單欄，上深色標題，下表單卡片
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store';
import api from '../api';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [versionInfo, setVersionInfo] = useState({});

  const { login } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    if (!username.trim() || !password.trim()) {
      setError('請輸入帳號和密碼');
      setIsLoading(false);
      return;
    }

    // Rate limiting - wait 3 seconds
    await new Promise(resolve => setTimeout(resolve, 3000));

    const result = await login(username, password);

    if (result.success) {
      navigate('/orders');
    } else {
      setError(result.error);
    }

    setIsLoading(false);
  };

  useEffect(() => {
    api.get('/version').then(res => setVersionInfo(res.data)).catch(() => {});
  }, []);

  return (
    <div className="min-h-screen flex flex-col">

      {/* ============================================ */}
      {/* Desktop: 雙欄版 (md: 以上) */}
      {/* ============================================ */}
      <div className="hidden md:grid md:grid-cols-2 md:min-h-screen">

        {/* 左側品牌區 */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 flex flex-col items-center justify-center px-8">
          {/* Logo */}
          <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center mb-8 shadow-2xl">
            <svg
              className="w-10 h-10 text-blue-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.8}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
              />
            </svg>
          </div>

          {/* 系統名稱 */}
          <h1 className="text-4xl font-bold text-white tracking-wide mb-2 text-center">
            三好工業
          </h1>
          <p className="text-2xl font-medium text-white/80 mb-4 text-center">
            工作管理系統
          </p>

          {/* Tagline */}
          <p className="text-slate-400 text-lg text-center">
            高效、穩定、可靠
          </p>

          {/* 版權文字 */}
          <p className="text-slate-500 text-sm mt-12">
            © 2026 Internal Use Only
          </p>
        </div>

        {/* 右側表單區 */}
        <div className="bg-white flex items-center justify-center px-6">
          <div className="w-full max-w-sm">

            <form onSubmit={handleSubmit} className="space-y-6">

              {/* 標題 */}
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-slate-800 mb-1">
                  歡迎回來
                </h2>
                <p className="text-slate-500 text-sm">
                  請登入以繼續
                </p>
              </div>

              {/* Error message */}
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-base font-medium text-center">
                  {error}
                </div>
              )}

              {/* 帳號欄位 */}
              <div className="space-y-2">
                <label htmlFor="username" className="label text-base font-semibold text-slate-700 text-center block">
                  帳號
                </label>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="input text-base text-center"
                  placeholder="請輸入帳號"
                  autoComplete="username"
                  disabled={isLoading}
                  style={{ fontSize: '16px' }}
                />
              </div>

              {/* 密碼欄位 */}
              <div className="space-y-2">
                <label htmlFor="password" className="label text-base font-semibold text-slate-700 text-center block">
                  密碼
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input text-base text-center"
                  placeholder="請輸入密碼"
                  autoComplete="current-password"
                  disabled={isLoading}
                  style={{ fontSize: '16px' }}
                />
              </div>

              {/* 登入按鈕 */}
              <button
                type="submit"
                disabled={isLoading}
                className="btn btn-primary w-full flex items-center justify-center gap-3 rounded-xl text-base font-semibold py-4 mt-2 shadow-md max-w-none"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    登入中...
                  </>
                ) : (
                  '登入'
                )}
              </button>
            </form>

            {/* Footer hint */}
            <p className="text-center text-slate-400 text-sm mt-8">
              系統僅允許已授權人員存取
            </p>
            {versionInfo.version && (
              <p className="text-center text-slate-500 text-xs mt-1">
                v{versionInfo.version} · {versionInfo.team}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ============================================ */}
      {/* Mobile: 單欄版 (預設) */}
      {/* ============================================ */}
      <div className="flex flex-col md:hidden min-h-screen">

        {/* Header area — 深藍色背景 */}
        <div className="bg-gradient-to-b from-blue-900 to-slate-900 px-6 pt-14 pb-10">

          {/* Logo */}
          <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mb-6 shadow-xl mx-auto">
            <svg
              className="w-9 h-9 text-blue-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.8}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
              />
            </svg>
          </div>

          {/* Title block — 居中 */}
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white tracking-wide mb-1 text-center">
              三好工業
            </h1>
            <p className="text-lg font-medium text-white/80 mb-2 text-center">
              工作管理系統
            </p>
            <p className="text-slate-300 text-base text-center">
              請登入以繼續
            </p>
          </div>
        </div>

        {/* Form card — 白色卡片上浮 */}
        <div className="flex-1 bg-white rounded-t-3xl px-6 pt-8 pb-10 safe-area-bottom shadow-[0_-4px_30px_rgba(0,0,0,0.15)]">

          <form onSubmit={handleSubmit} className="space-y-6">

            {/* Error message */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-base font-medium text-center">
                {error}
              </div>
            )}

            {/* 帳號欄位 */}
            <div className="space-y-2">
              <label htmlFor="username-mobile" className="label text-base font-semibold text-slate-700 text-center block">
                帳號
              </label>
              <input
                id="username-mobile"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="input text-base text-center"
                placeholder="請輸入帳號"
                autoComplete="username"
                disabled={isLoading}
                style={{ fontSize: '16px' }}
              />
            </div>

            {/* 密碼欄位 */}
            <div className="space-y-2">
              <label htmlFor="password-mobile" className="label text-base font-semibold text-slate-700 text-center block">
                密碼
              </label>
              <input
                id="password-mobile"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input text-base text-center"
                placeholder="請輸入密碼"
                autoComplete="current-password"
                disabled={isLoading}
                style={{ fontSize: '16px' }}
              />
            </div>

            {/* 登入按鈕 — 藍色主調、充滿整個卡片寬度 */}
            <button
              type="submit"
              disabled={isLoading}
              className="btn btn-primary w-full flex items-center justify-center gap-3 rounded-xl text-base font-semibold py-4 mt-2 shadow-md max-w-none"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  登入中...
                </>
              ) : (
                '登入'
              )}
            </button>
          </form>

          {/* Footer hint — 居中 */}
          <p className="text-center text-slate-400 text-sm mt-8">
            系統僅允許已授權人員存取
          </p>
          {versionInfo.version && (
            <p className="text-center text-slate-500 text-xs mt-1">
              v{versionInfo.version} · {versionInfo.team}
            </p>
          )}
        </div>
      </div>

    </div>
  );
}
