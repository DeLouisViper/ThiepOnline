# Thiệp cưới Thanh Hải & Ánh Minh — online wedding invitation

React + Vite + TypeScript front end, Supabase (PostgreSQL, Auth, Storage) back end, GitHub Pages hosting.
Everything runs on free plans. The visual design is ported 1:1 from your original `thiep-cuoi HM.html`.

> **Both parts must be set up for the site to work online:** (1) a Supabase project (database, login, image storage) and (2) GitHub Pages (hosts the web pages). Without Supabase the invitation still displays, but wishes, gallery, QR codes and the admin area are inactive.

---

## 1. What's inside

```
supabase/schema.sql          ← run once in Supabase SQL Editor (tables, RLS, triggers, storage buckets)
src/lib/content.ts           ← default wedding text (used until you save your own in admin → "Nội dung thiệp")
supabase/migration-content.sql ← run once if you installed an earlier version (adds editable content)
src/components/              ← public invitation (sections, petals, music, wishes, gallery, envelope/QR)
src/admin/                   ← private dashboard (login, overview, wishes, photos, QR & settings)
src/lib/supabase.ts          ← Supabase client (public anon key only)
.github/workflows/deploy.yml ← builds + publishes to GitHub Pages on every push to main
.github/workflows/keepalive.yml ← optional free ping so Supabase doesn't pause
.env.example                 ← names of the two environment variables
TESTING.md                   ← full test checklist
```

Routes use a hash (`https://…/#/` public, `https://…/#/admin` admin). This is deliberate: it works on GitHub Pages for direct links and page refreshes without any server rewrite rules.

---

## 2. Set up Supabase (≈10 minutes)

1. Create a free account at <https://supabase.com> → **New project** (choose a region near Vietnam, e.g. Singapore). Save the database password somewhere safe.
2. **SQL Editor → New query**, paste the whole of `supabase/schema.sql`, click **Run**. (Safe to re-run.)
3. **Authentication → Users → Add user → Create new user**: enter *your* e-mail and a strong password, tick *Auto Confirm User*.
4. Back in **SQL Editor**, make that user an administrator (replace the e-mail):
   ```sql
   insert into public.admins (user_id)
   select id from auth.users where email = 'YOUR-ADMIN-EMAIL@example.com';
   ```
   Add the bride/groom the same way if they need access.
5. **Authentication → Sign In / Providers**: turn **off** “Allow new users to sign up” (so nobody can create accounts). Even if someone did, RLS only trusts users listed in `public.admins`.
6. **Project Settings → API** (or “API Keys”): copy the **Project URL** and the **anon / publishable** key. *Never* copy or use the `service_role` / secret key anywhere in this project.
7. **Authentication → URL Configuration**: set **Site URL** to your final site address (step 4 below). Password login does not use redirects, but keeping this correct avoids surprises later.

## 3. Run locally (optional)

```bash
npm install
cp .env.example .env     # then paste the URL and anon key
npm run dev              # http://localhost:5173  and  http://localhost:5173/#/admin
```

## 4. Deploy free on GitHub Pages

1. Create a GitHub account and a **public** repository (GitHub Pages on the free plan needs a public repo), e.g. `thiep-cuoi`.
2. Push this folder to it (`.env` is git-ignored, so no secrets are committed):
   ```bash
   git init && git add . && git commit -m "Wedding invitation"
   git branch -M main
   git remote add origin https://github.com/<you>/thiep-cuoi.git
   git push -u origin main
   ```
3. Repo **Settings → Secrets and variables → Actions → New repository secret**, add:
   - `VITE_SUPABASE_URL` = your Project URL
   - `VITE_SUPABASE_ANON_KEY` = your anon/publishable key
4. Repo **Settings → Pages → Build and deployment → Source: GitHub Actions**.
5. Open the **Actions** tab; the “Deploy to GitHub Pages” run publishes the site at `https://<you>.github.io/thiep-cuoi/`. Admin: `https://<you>.github.io/thiep-cuoi/#/admin`.
6. Put that address into Supabase **Site URL** (step 2.7).

The workflow sets the Vite base path automatically (`/<repo>/` for project repos, `/` for `<you>.github.io` repos or when `public/CNAME` exists).

Every later change: commit + push → site rebuilds in ~1 minute.

### Optional: custom domain
Buy a domain anywhere, add a `public/CNAME` file containing just the domain (e.g. `thiepcuoi.example.com`), set the DNS records GitHub lists under **Settings → Pages → Custom domain**, tick *Enforce HTTPS*, then update Supabase Site URL. Not required.

---

## 5. Using the admin area (`/#/admin`)

| Tab | What you can do |
|---|---|
| Nội dung & giao diện | Pick one of 16 themes (with live "Xem thử") and edit names, both families, date/time, lunar date, venue, map, timeline and closing text — no code needed; reuse the site for another couple |
| Tổng quan | Totals (all / approved / pending / hidden), album and guest-photo counts, latest wishes |
| Lời chúc | Search, filter by status, sort, read in full, approve / hide / delete (with confirmation), export CSV (UTF-8 with BOM, opens correctly in Excel) |
| Ảnh | Upload several photos with preview and captions, replace, reorder (↑ ↓), delete. Images are resized in the browser (max 1600 px) |
| Cài đặt & QR | Petals on/off, require approval, allow guest photos, music on/off + URL or upload, groom/bride QR upload with preview, optional bank name / account number / holder and a **show on invitation** switch per person |

Public pages pick up changes on next load (settings refresh every minute while a page is open).

**Defaults are deliberately safe:** wishes need approval, guest photo upload is off, music is off until you add a file.

---

### Themes (Mẫu giao diện)
Admin → **Nội dung & giao diện** → *Mẫu giao diện*. Sixteen built-in styles (nine originals plus Lavender, Hướng dương, Đào san hô, Rừng xanh, Cổ điển sepia, Biển xanh, Đen vàng); the first nine are: Sage cổ điển (original), Hoa khô xanh dương, Minimalism xanh, Mai lan trắng, Vườn xuân lam, Minimalism lam đậm (dark), Hồng phấn, Boho đất nung, Đỏ rượu & vàng (dark). A theme changes colours, fonts, background pattern, frame, hero/footer illustrations (`src/components/Scene.tsx`), section dividers, falling-petal shapes and card style. You can also upload your own **Ảnh nền đầu thiệp** (hero background photo) in the same tab. **Xem thử** opens `#/?theme=<id>` so you can look before saving. To add your own theme, copy one entry in `src/lib/themes.ts` (colours are plain CSS variables) and add its id to `THEME_ORDER`.

## 6. How security works

Browser code only contains the public anon key; all protection is enforced by PostgreSQL Row Level Security (RLS) and Storage policies in `schema.sql`. Hiding `/admin` is *not* relied upon.

| Who | Can |
|---|---|
| Any guest (no login) | insert a wish (name ≤ 40, message ≤ 300 enforced by DB constraints); read **approved** wishes; read gallery rows; read the view `public_wedding_settings` |
| Guest | **cannot** read pending/hidden wishes, update or delete anything, read `wedding_settings`, `admins`, or the rate-limit log |
| Logged-in user not in `public.admins` | same as a guest |
| Admin (in `public.admins`) | read/approve/hide/edit/delete wishes; manage gallery rows, settings, and files in `wedding-media` |

Details worth knowing:
- **Moderation status can't be forged.** A `BEFORE INSERT` trigger overwrites `status` from the admin setting; guests are only granted `INSERT` on three columns.
- **Bank details are never sent unless you switch them on.** Guests read a *view* that returns NULL for bank fields when “show” is off.
- **Anti-spam:** invisible honeypot field, a server-side rate limit (max 5 wishes / 10 min per visitor IP hash, 30 / min for the whole site; the raw IP is not stored), length constraints, moderation. Not bullet-proof against a determined attacker (that would need a CAPTCHA via an Edge Function), but fine for a private wedding link.
- **XSS:** wishes are rendered as React text (auto-escaped); there is no `dangerouslySetInnerHTML`. CSV export neutralises formula-injection (`=`, `+`, `-`, `@`).
- **Guest photo uploads (off by default):** bucket `guest-photos` allows *insert only* (no update/overwrite, no delete for the public), 2 MB limit, image MIME types only, file names must be a UUID + `jpg/png/webp`, and uploads are refused while the switch is off. Honest limitation: a visitor can upload a file without submitting a wish (orphan file) — hence it's off until you need it. Delete orphans from Supabase Storage if that happens.
- Files are in *public* buckets: anyone with the exact (random) URL can view them, which is what lets the invitation display them without signing URLs.

---

## 7. Free-plan limits (check current numbers at <https://supabase.com/pricing> and <https://docs.github.com/pages>)

At the time of writing, roughly:
- **Supabase Free:** ~500 MB database, ~1 GB file storage, a few GB/month of bandwidth, 50 MB max upload per file on the free plan (this project sets 10 MB / 2 MB bucket limits itself). Thousands of wishes use only a few MB of database. A few hundred gallery photos at ~300 KB each fit comfortably.
- **Inactivity pause:** free projects are paused after about 7 days without activity. A pause makes the site's wishes/gallery fail until you click *Restore* in the dashboard. Visitors count as activity, but quiet weeks before the wedding can trigger it, so `keepalive.yml` pings the API twice a week for free (uses the same two secrets). Also check the dashboard once in a while.
- **No automatic backups on Free.** Use the admin **Xuất CSV** to download the guest book after the wedding.
- **GitHub Pages:** public repo required on the free plan, soft limits ~1 GB site size / 100 GB bandwidth per month — far above what a wedding page needs. Deploys take ~1 minute.
- **Realtime:** not used. The wishes wall refreshes every 20 s while the tab is visible and right after a guest sends a wish — simpler and no realtime quota.

---

## 8. Sample configuration

- **Music:** see `public/audio/README.txt`. Easiest: upload in admin → Cài đặt & QR → Nhạc nền. Use only music you may legally use.
- **Gallery photos:** admin → Ảnh → *Chọn ảnh…* → add captions → *Lưu*.
- **QR codes:** admin → Cài đặt & QR → choose the groom's and bride's bank-app QR screenshots (PNG kept lossless so they still scan) → optionally fill bank info and tick *Hiển thị…* → *Lưu*.

Nothing is invented: until you add them, the invitation shows “Ảnh sẽ được cập nhật sớm” and “QR sẽ được cập nhật sau”, and no bank details at all.

## 9. Changing fixed text
Names, parents, addresses, venue, lunar date, timeline and map links are edited in admin → **Nội dung thiệp**; colours/fonts in `src/styles/invitation.css` (`:root` tokens, same as your original).

See **TESTING.md** for the pre-launch checklist.
