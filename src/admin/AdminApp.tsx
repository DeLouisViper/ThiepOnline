import { useCallback, useEffect, useState, type FormEvent } from 'react';
import type { Session } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import '../styles/admin.css';
import { Overview } from './Overview';
import { WishesManager } from './WishesManager';
import { PhotosManager } from './PhotosManager';
import { SettingsManager } from './SettingsManager';
import { ContentManager } from './ContentManager';

type Tab = 'overview' | 'content' | 'wishes' | 'photos' | 'settings';
const TABS: [Tab, string][] = [
  ['overview', 'Tổng quan'],
  ['content', 'Nội dung & giao diện'],
  ['wishes', 'Lời chúc'],
  ['photos', 'Ảnh'],
  ['settings', 'Cài đặt & QR'],
];

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!supabase || busy) return;
    setBusy(true);
    setErr(null);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) {
      const m = error.message || '';
      setErr(
        /invalid login credentials/i.test(m)
          ? 'Email hoặc mật khẩu không đúng.'
          : /email not confirmed/i.test(m)
            ? 'Tài khoản chưa được xác nhận (cần tick "Auto Confirm User" khi tạo user).'
            : /api key|apikey|jwt/i.test(m)
              ? 'Khóa Supabase không đúng — kiểm tra secret VITE_SUPABASE_ANON_KEY trên GitHub.'
              : /fetch|network/i.test(m)
                ? 'Không kết nối được Supabase — kiểm tra secret VITE_SUPABASE_URL trên GitHub.'
                : `Lỗi đăng nhập: ${m}`,
      );
    }
    setBusy(false);
  };

  return (
    <div className="adm-card adm-login">
      <h1>Quản trị thiệp cưới</h1>
      <form onSubmit={submit}>
        <label className="field">
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" required />
        </label>
        <label className="field">
          Mật khẩu
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
        </label>
        {err && <div className="msg err">{err}</div>}
        <button className="btn primary" disabled={busy}>{busy ? 'Đang đăng nhập…' : 'Đăng nhập'}</button>
      </form>
    </div>
  );
}

export default function AdminApp() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [tab, setTab] = useState<Tab>('overview');

  useEffect(() => {
    if (!supabase) {
      setReady(true);
      return;
    }
    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  // Ask the DATABASE whether this user is an administrator (the real security check is RLS;
  // this call only decides which screen to show).
  const checkAdmin = useCallback(async () => {
    if (!supabase || !session) {
      setIsAdmin(null);
      return;
    }
    const { data, error } = await supabase.rpc('is_admin');
    setIsAdmin(!error && data === true);
  }, [session]);
  useEffect(() => {
    void checkAdmin();
  }, [checkAdmin]);

  const signOut = () => void supabase?.auth.signOut();

  if (!isSupabaseConfigured) {
    return (
      <div className="adm">
        <div className="adm-card">
          <h1>Chưa cấu hình Supabase</h1>
          <p>Hãy tạo file <code>.env</code> (xem <code>.env.example</code>) rồi build lại, hoặc thêm secrets trong GitHub Actions.</p>
        </div>
      </div>
    );
  }
  if (!ready) return <div className="adm">Đang tải…</div>;
  if (!session) return <div className="adm"><Login /></div>;
  if (isAdmin === null) return <div className="adm">Đang kiểm tra quyền…</div>;
  if (!isAdmin) {
    return (
      <div className="adm">
        <div className="adm-card adm-login">
          <h1>Không có quyền truy cập</h1>
          <p>Tài khoản <b>{session.user.email}</b> chưa được cấp quyền quản trị.</p>
          <button className="btn" onClick={signOut}>Đăng xuất</button>
        </div>
      </div>
    );
  }

  return (
    <div className="adm">
      <div className="adm-top">
        <h1>Quản trị thiệp cưới</h1>
        <div className="row">
          <span className="who">{session.user.email}</span>
          <a className="btn sm" href="#/">Xem thiệp</a>
          <button className="btn sm" onClick={signOut}>Đăng xuất</button>
        </div>
      </div>
      <div className="adm-tabs" role="tablist">
        {TABS.map(([k, label]) => (
          <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>
            {label}
          </button>
        ))}
      </div>
      {tab === 'overview' && <Overview />}
      {tab === 'content' && <ContentManager />}
      {tab === 'wishes' && <WishesManager />}
      {tab === 'photos' && <PhotosManager />}
      {tab === 'settings' && <SettingsManager />}
    </div>
  );
}
