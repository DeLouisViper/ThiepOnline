# Test checklist (do this before sending the invitation)

Use a real phone and a desktop browser. Tick each item.

## A. Public wishes (no login)
- [ ] Open the site in a private/incognito window. Invitation loads, no login prompt.
- [ ] Submit a wish with name + message. Button shows “Đang gửi…”, then the green success message.
- [ ] With **require approval ON**: wish does NOT appear publicly; appears in admin as “Chờ duyệt”.
- [ ] Approve it in admin → it appears on the public wall (within ~20 s or after refresh).
- [ ] Switch approval OFF, send another → appears immediately.
- [ ] Open the site on a *different device* → the same approved wishes are visible (stored in Supabase).
- [ ] Empty name / empty message → error shown, nothing saved.
- [ ] 41-char name / 301-char message cannot be typed (maxlength), and a direct API insert is rejected (see D).
- [ ] Double-click the send button → only one wish saved.
- [ ] Send the identical wish twice within a minute → second is refused with a message.
- [ ] Send 6 wishes quickly → the rate-limit message appears on the 6th.
- [ ] Type `<script>alert(1)</script>` and `<b>bold</b>` as a wish → shown as plain text, nothing executes.
- [ ] Turn off Wi-Fi, submit → clear error, **no** success message.
- [ ] Vietnamese text (ắ, ợ, ề, đ…) shows correctly on the wall and in admin.

## B. Admin authentication & permissions
- [ ] `/#/admin` while logged out shows only the login form.
- [ ] Wrong password → “Email hoặc mật khẩu không đúng.”
- [ ] Correct admin login → dashboard.
- [ ] Create a second Supabase user that is **not** in `public.admins`, log in → “Không có quyền truy cập”.
- [ ] Refresh `…/#/admin` on the deployed site → still works (no 404).
- [ ] Sign out → back to login.

## C. Admin functions
- [ ] Overview counts match the wishes list.
- [ ] Search by name and by message text; filter by status; sort newest/oldest.
- [ ] Open a wish in full, approve, hide (disappears from public), delete (confirmation shown).
- [ ] Export CSV → opens in Excel/Sheets with Vietnamese characters intact.

## D. Database security (RLS) — run in an incognito window's DevTools console or with curl using only the anon key
- [ ] `GET /rest/v1/wishes?select=*` returns only `approved` rows.
- [ ] `PATCH`/`DELETE` on `/rest/v1/wishes?id=eq.<id>` as anon changes/deletes nothing (0 rows / 401-403).
- [ ] `GET /rest/v1/wedding_settings` as anon → 401/403 or empty (permission denied).
- [ ] `GET /rest/v1/admins` and `/rest/v1/wish_rate_log` as anon → denied.
- [ ] `POST /rest/v1/wishes` with `{"guest_name":"x","message":"y","status":"approved"}` as anon → rejected (status column not grantable).
- [ ] `POST` with a 400-char message → rejected by the constraint.
- [ ] Upload to `wedding-media` as anon → rejected.
- [ ] With bank “show” OFF, `GET /rest/v1/public_wedding_settings` returns NULL bank fields.

## E. Photos & QR
- [ ] Upload 3 photos with captions; previews show before saving; they appear in the public album (lightbox opens on tap).
- [ ] Reorder, replace one, edit a caption, delete one; public album follows.
- [ ] Upload a `.gif`/`.pdf` or a >20 MB image → refused with a message.
- [ ] Upload groom QR and bride QR (preview first) → open the public envelope → both show and **scan correctly** with a banking app.
- [ ] Bank details: fill in, “show” OFF → not on public page; ON → shown; each side independent.
- [ ] Guest photo attachments: enable in settings → guest can attach a photo and it shows on the wall; disable → the field disappears.

## F. Music & animation
- [ ] Music enabled with a valid file → hero shows “Mở thiệp & bật nhạc”; tapping it starts music and scrolls.
- [ ] “Mở thiệp (không bật nhạc)” opens without sound.
- [ ] Floating ▶/❚❚ button pauses/resumes; music keeps playing while scrolling; only one audio plays.
- [ ] Broken music URL → button disabled and a short notice, page still works.
- [ ] Petals fall softly; 🌸 button turns them off/on and remembers the choice.
- [ ] Petals never block taps on buttons/inputs; text stays readable.
- [ ] Phone/OS “reduce motion” ON → no petals, no animated reveals.
- [ ] Switch to another tab and back → no jank.

## G. Layout
- [ ] iPhone Safari, Android Chrome, iPad, desktop: no horizontal scrolling, buttons easy to tap.
- [ ] Countdown ticks; calendar highlights Fri 30 Oct; “Thêm vào lịch” opens Google Calendar with 19:00 and the venue.
- [ ] Map loads and “Chỉ đường” opens Google Maps.

## H. Deployment
- [ ] GitHub Actions “Deploy to GitHub Pages” is green.
- [ ] Site opens at `https://<you>.github.io/<repo>/` with styles and fonts.
- [ ] Repo contains no `.env` and no service-role key (`git log -p | grep -i service_role` is empty).
- [ ] Supabase Site URL matches the live address; sign-ups are disabled.
- [ ] Run “Keep Supabase awake” manually once (Actions → Run workflow) → green.
