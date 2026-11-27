# CLAUDE.md

VSTEP (B1–B2) self-study kit: 141 Van Lang University exams (VLU 1–141; site ids vlu-exam-01…09 are zero-padded) from vstepowl.com, a practice web app (public at https://vstep.pentium.ink), and model answers at band 5–6.

The owner is Vietnamese. **Write UI text, docs and explanations in Vietnamese. Write model answers in English.**

## Hard rules

- **vstepowl.com exams are public for exam practice.** The site owner has allowed the exams to be published for study. The project owner confirmed this on 2026-11-24.
- **Never weaken vstepowl's protections.** The site encrypts exam data in its JS, has a domain lock (redirects off-domain or localhost) and blocks headless or automated browsers. Do NOT:
  - decrypt the bundles;
  - patch the domain lock;
  - read its decrypted localStorage session;
  - evade its bot detection.
- **Getting new exams.** Use only the site's official "Tải đề thi" PDF export, clicked at human pace in the user's real Chrome (Claude in Chrome). Then parse the PDF locally.
- **npm cache is root-owned.** Pass a private cache: `npm install --cache <scratchpad>/npm-cache`.
- **Deploy is public at https://vstep.pentium.ink through Cloudflare Tunnel.** `deploy/deploy.sh` runs two containers: `vstep-web` (nginx, bound to 127.0.0.1:6698 only) and `vstep-tunnel` (cloudflared, tunnel `vstep`, config in `deploy/cloudflared/config.yml`).
  - Never bind nginx to 0.0.0.0 or to a LAN or tailnet IP. Public traffic goes only through the `vstep` tunnel.
  - Never route this app through the `homelab` tunnel. It also serves ssh.pentium.ink.
  - The tunnel credential lives in `~/.cloudflared/` and must never enter the repo.
- **Git: one branch only.** Commit and push straight to `main`.
  - No feature branches or pull requests.
  - If one was created, merge it into `main` and delete it locally and on `origin`.

## Layout and source of truth

| Path | What | Edit? |
|---|---|---|
| `de-thi/exams/vlu-N.json`, `de-thi/speaking/data.json` | Normalised exams (reading/writing/speaking). The single source of truth. | Regenerate via `tools/parse_exam_pdf.py`. |
| `de-thi/loi-giai/prompts/<id>.json` | Verbatim prompt pack per exam (`make_prompts.py`). Custom/recalled exams have `"custom": true`, `label`, `note`, `date`, `guides`, and writing only. | Custom ones by hand. |
| `de-thi/loi-giai/answers/<id>.json` | Model answers. **This is what you edit.** `answers-v1/` is the old version, kept for comparison; never edit it. | Yes |
| `de-thi/loi-giai/templates.json` | 11 fixed sentence frames (w1_informal, w1_formal, w2_{opinion, discussion, adv_disadv, cause_effect, x_solution, one_side}, s1, s2, s3). | Yes, carefully |
| `de-thi/loi-giai/vlu-N.md`, `README.md`, `KHUNG-MAU.md`, `pdf/` | **Generated.** Never hand-edit; run `build.py` / `export_pdf.mjs`. | No |
| `app/src/data/*.json` | **Generated** by `app/scripts/sync-data.mjs`, which runs before dev and build. | No |
| `de-thi/loi-giai/doi-chieu/` | Audit of answers against the user's study materials (`~/Desktop/VSTEP`): rulebooks A–F + README. | Docs |
| `deploy/` | `docker-compose.yml` (`vstep-web` nginx on 127.0.0.1:6698 + `vstep-tunnel` cloudflared), `cloudflared/config.yml` (tunnel `vstep`), `deploy.sh`, `nginx.conf`. `www/` is generated. | Yes, carefully |
| `site/` | Old mirror of the public pages. The app does not use it. | No |

## Commands

```bash
# app (run inside app/)
npm run dev          # :5173
npm run app          # build + preview on :4173 (same as double-clicking VSTEP.command)
npm test             # vitest
npm run e2e          # playwright, channel 'chrome'; starts/reuses the dev server on :5173
npm run build        # tsc -b && vite build

# model answers (run inside tools/solutions/)
python3 check.py [-q] [N|id ...]   # validator; must report 0 errors for every exam
python3 verify_prompts.py          # prompts in the .md must match the sources verbatim (141/141)
python3 build.py [N|id ...]        # render .md + index + KHUNG-MAU.md
python3 audit.py                   # before/after metrics, answers-v1 vs answers
node export_pdf.mjs http://localhost:4173/   # per-exam PDFs + combined; preview must be running

# deploy (run at repo root)
bash deploy/deploy.sh                    # build → rsync to deploy/www → vstep-web (127.0.0.1:6698) + tunnel → https://vstep.pentium.ink
bash deploy/deploy.sh status|up|down
```

## Model answer rules (enforced by `check.py`)

**Persona.**
- Minh, a researcher at a university in Ho Chi Minh City who applies AI to help doctors and patients.
- He has a **medical background** (studied medicine).
- Hometown is HCMC; Da Nang or Dak Lak are allowed when a prompt needs it.
- Hobbies: reading, coffee shops with friends, swimming at weekends.
- Keep the persona consistent within each exam.

**Level.**
- Band 5–6: sentences of at most 25 words (the long fixed frames are exempt), common words, safe grammar.
- No invented precise statistics; examples must be concrete and plausible.

**Use the frames in `templates.json` word for word in their fixed positions.**

**W1.** 150–180 words.
- One paragraph per bullet, each with 3–4 sentences (answer → reason → detail).
- `template` must be w1_informal or w1_formal.
- Greeting and sign-off must pair correctly:
  - Dear Mr/Ms X → Yours sincerely
  - Dear Sir or Madam → Yours faithfully
  - first name → Best wishes
- Formal letters: no contractions and no "!".
- At most one "!" overall.
- Don't copy the prompt.
- Any meet/invite/suggest bullet needs a day, a time and a place.

**W2.** 270–300 words in 4 paragraphs.
- `type_key` decides the structure: PEER 1 + 2 for opinion, discussion and adv_disadv; 2 + 2 for the others.
- Every body paragraph needs an example.
- The intro paraphrases the prompt, with no copied 6-word chunks.
- opinion and discussion: give your stance in the intro and in the conclusion.
- opinion: body 1 is a concession.
- Rotate linkers.

**S1.** Exactly 3 sentences per answer.

**S2.** 220–260 words, using the full S2 frame. Two reasons, each with an example; reject both other options with "because"; finish with "To sum up…" and 3 adjectives.

**S3.** 200–260 words.
- One "Firstly / Secondly / Thirdly" per mind-map idea.
- Your own idea goes under "Another important point is that…".
- End with "To sum up".
- Follow-up answers: 3–4 sentences, 35–55 words.

**Outline and vocab.**
- Each outline `reusable` string must be an exact substring of the answer.
- 3–5 vocab items, Vietnamese meanings, all taken from the text.

**Workflow after editing answers:** run `check.py` → `verify_prompts.py` → `build.py`, then build the app. Export PDFs only if asked.

## App notes

- HashRouter. Pages are `React.lazy` route chunks, so the solutions page doesn't load the reading data.
- Exam rooms are full-screen routes outside `AppShell`.
- `/bai-mau/khung` (templates page) is a static route next to `/bai-mau/:examId`.
- Timers derive from `startedAt` (wall clock), so they survive reloads.
- Storage:
  - `useStored` (useSyncExternalStore) over localStorage keys `vstep:v1:*`;
  - audio goes to IndexedDB via idb-keyval.
- `useMedia` renders a single layout per breakpoint. Don't render desktop and mobile variants at the same time.
- Phone layout (`PHONE` = max-width 720px in `AppShell.tsx`), tuned for iPhone 15 Pro (393×852):
  - bottom tab bar;
  - dense reading text using the tokens `--read-size`, `--read-lh`, `--prompt-size` and `--gutter` (`tokens.css`), scaled by `data-read` s/m/l from Settings;
  - on the solutions page, steps 3–5 are `<details>`, closed on phones.
- Safe areas: use `--safe-top`/`--safe-bottom` and `--top-h` for sticky offsets, not `--nav-h`.
- `npm run e2e` runs two projects, `desktop` and `mobile` (`tests/e2e/mobile.spec.ts`).
  - The Speaking-recording smoke test fails on this Linux box because the synthetic mic is denied. That happens even before the mobile work.
- Headless Chrome on macOS cannot open even a fake mic. The e2e tests inject a synthetic WebAudio stream, and recordings need real time (`waitForTimeout`).
- To screenshot or check a page, run `npx vite preview --port 4199 --strictPort` and drive it with Playwright (`channel: 'chrome'`). Kill the server afterwards.
