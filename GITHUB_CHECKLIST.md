# GitHub Checklist

## Before First Push
- Ensure `supabase-config.local.js` is ignored by git.
- Confirm `supabase-config.example.js` only has placeholder values.
- Remove local junk files (for example `.DS_Store`) from tracking.
- Add a license file if you want others to reuse the code.

## Safety Checks
Run before commit/push:

```bash
rg -n "service_role|SUPABASE_ANON_KEY|SECRET|TOKEN|PASSWORD|PRIVATE|-----BEGIN|sk_live|sk_test|AIza" .
```

```bash
git status --short
```

```bash
git check-ignore -v supabase-config.local.js
```

## Recommended First Commit Scope
- UI files: `index.html`, `styles.css`, `app.js`
- Docs: `README.md`, `SUPABASE_SETUP.md`, `GITHUB_CHECKLIST.md`
- Repo hygiene: `.gitignore`
- Config template only: `supabase-config.example.js`

## Do Not Commit
- `supabase-config.local.js` (real keys)
- Any `service_role` keys
- Machine-local artifacts (`.DS_Store`, logs)
