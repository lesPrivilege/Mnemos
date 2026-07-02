# Handoff — Stage Release: Package & Verify v1.3.0

Run this after `feat/learning-loop` lands. This stage (since v1.2.0) shipped five
features on `main`:

```
feat/auto-backup            daily snapshot to Documents/Mnemos, Settings controls
feat/import-ux-cleanup      Anki text/CSV import, 恢复 tab, copy sync
feat/srs-learning-steps     learning steps, lapses/leech, suspend, review UI
feat/daily-reminder         local notifications, Settings 提醒 card
feat/learning-loop          错题→闪卡, 高亮→闪卡 via Import prefill
```

## Step 1 — Pre-flight (CLI)

1. `main` clean, all five branches merged; delete merged feature branches.
2. `npm run build` and `npx vitest run` green.
3. Grep sweep: no leftover `alert(`/native `confirm(` in `src/` (except the
   documented `useReadingHome` fallback); no `console.log` debris introduced this
   stage; check the Settings 提醒 card title reads 「提醒 · REMINDER」(a summary
   earlier showed 「毒醒」— verify it's not in the code).
4. Version bump: `package.json` → `1.3.0`. CHANGELOG entry covering the five
   features + notable data notes (backup files now include reading `bodies`; new
   card fields `lapses/suspended/leech`; new localStorage keys
   `mnemos-auto-backup-*`, `mnemos-reminder-*`). Commit:
   `docs: changelog v1.3.0, bump version`.
5. `npx cap sync android`, build the APK the same way as previous stage builds.

## Step 2 — Device verification (user, on phone)

Ordered so data-destructive checks come last. Tick each.

**Fresh-launch basics**
- [ ] App launches, all three module homes render, dark/light toggle works.

**Auto backup**
- [ ] ~10s after launch, today's `mnemos-auto-*.json` exists (Documents/Mnemos or
      the fallback dir per the Settings status line); non-zero size.
- [ ] 「立即备份」 refreshes status; toggle off + relaunch → no new write.

**Import & Anki**
- [ ] Anki-exported .txt (with cloze + HTML field) imports via 闪卡 tab; cards
      correct in preview and after import.
- [ ] 恢复 tab: pick the newest auto-backup → full-backup preview counts correct →
      **merge** import round-trips (spot-check one reading doc body opens).
- [ ] A backup file dropped/picked on the 做题 tab still routes to backup preview.

**SRS kernel**
- [ ] New card: 记住 → reappears ~3 cards later with 「学习中 · 2/2」 → 记住 →
      graduated (due tomorrow). 容易 first-touch graduates immediately.
- [ ] First-pass 记住 shows 「稍后」 not 「1d」.
- [ ] Undo works for: first-pass, graduation, Again.
- [ ] Leech: lapse a mature card to 8 → toast + suspended → hidden from due count →
      Browse shows dimmed + LEECH tag → 恢复 → due again.

**Reminder**
- [ ] Toggle on → permission prompt → status line shows next reminder with count.
- [ ] Set time +2 min, background app → notification fires, count + 错题 suffix
      correct, tap opens app.
- [ ] Clear all due cards → resume app → today's pending reminder cancelled.
- [ ] Deny-permission path (revoke in system settings, re-toggle): toggle reverts
      with the danger note.

**Learning loop**
- [ ] 错题本 → 生成闪卡 → preview (options + LaTeX intact) → import → deck exists,
      cards reviewable; regenerate → duplicates skipped.
- [ ] Reader highlight (one with note, one without) → 生成闪卡 → fronts/backs per
      spec, source line present.

**Regression sweep (10 min free use)**
- [ ] One full review session (flip, rate, undo, complete, continue-card).
- [ ] One quiz set incl. a multi-answer question; wrong book consistent across
      home count / practice mode / Wrong page.
- [ ] Reader: scroll (smooth), highlight persists after reload, TOC jump, settings.
- [ ] Activity page numbers sane; reading minutes not inflated.

## Step 3 — Wrap up

If all green: report pass. If the user approves, push `main` (this is the one step
that requires explicit approval — ask first). List any failures with repro steps
instead of attempting drive-by fixes; each failure goes back through a fix branch.
