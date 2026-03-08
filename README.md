# AtomicStreak

AtomicStreak is a lightweight habit tracker built to help you keep daily streaks alive with a simple "never break the chain" workflow.

## Features
- Add habits with an optional identity cue
- Mark/unmark daily check-ins
- Track current streak, longest streak, total reps, and consistency
- 28-day visual chain strip per habit
- Anonymous Supabase auth + per-user cloud sync

## Tech Stack
- Vanilla HTML, CSS, JavaScript
- Supabase (Auth + Postgres)
- No build step required

## Project Structure
```text
.
├── index.html
├── styles.css
├── app.js
├── supabase-config.example.js
├── supabase-config.local.js   # local only (ignored)
├── SUPABASE_SETUP.md
├── GITHUB_CHECKLIST.md
└── README.md
```

## Quick Start
1. Clone the repo:
   ```bash
   git clone <your-repo-url>
   cd AtomicStreak
   ```
2. Create local config:
   ```bash
   cp supabase-config.example.js supabase-config.local.js
   ```
3. Fill in your Supabase values in `supabase-config.local.js`.
4. Complete DB setup from [SUPABASE_SETUP.md](./SUPABASE_SETUP.md).
5. Open `index.html` in your browser.

## Supabase Setup
Use [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) for:
- SQL schema
- RLS policies
- auth requirements

## Security Notes
- Never commit real keys in tracked files.
- Keep secrets only in `supabase-config.local.js`.
- Never use a Supabase `service_role` key in frontend code.

Run a quick safety scan before pushing:
```bash
rg -n "service_role|SUPABASE_ANON_KEY|SECRET|TOKEN|PASSWORD|PRIVATE|-----BEGIN|sk_live|sk_test|AIza" .
```

## GitHub Publish Checklist
See [GITHUB_CHECKLIST.md](./GITHUB_CHECKLIST.md).

## Roadmap Ideas
- Habit reorder and archive
- Notes per check-in
- PWA/offline support
- Weekly review screen

## Contributing
PRs are welcome for bug fixes and UX improvements. Keep changes focused and include reproduction steps for bug reports.

## License
No license file is included yet. Add one (for example MIT) before accepting external contributions.
