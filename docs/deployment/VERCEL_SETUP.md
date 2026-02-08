# Vercel Deployment Guide: EE Manager V2

**Date:** 2026-02-07
**Target:** Vercel Hosting
**Status:** Ready for Pilot

## 1. Project Configuration Checklist

- [x] **Framework:** Nuxt 4
- [x] **Build Command:** `npm run build` (or `nuxt build`)
- [x] **Output Directory:** `.output` (Standard for Nuxt 3/4)
- [x] **Node Version:** 18.x or 20.x (Recommended)
- [x] **Preset:** Auto-detected (Nitro -> Vercel)

## 2. Environment Variables (CRITICAL)

You **MUST** add these variables to your Vercel Project Settings > Environment Variables:

| Variable | Description | Source (.env) |
| :--- | :--- | :--- |
| `SUPABASE_URL` | Supabase API URL | `https://yeuzutjkxapfltvjcejz.supabase.co` |
| `SUPABASE_KEY` | Public Anon Key | `sb_publishable_...` |
| `SUPABASE_SERVICE_KEY` | Service Role Key (Keep Secret!) | `sb_secret_...` |
| `MAILERSEND_SMTP_NAME` | SMTP Name | `LH_webapp` |
| `MAILERSEND_PORT` | SMTP Port | `587` |
| `MAILERSEND_SERVER` | SMTP Server | `smtp.mailersend.net` |
| `MAILERSEND_USERNAME` | SMTP Username | `MS_...` |
| `MAILERSEND_PASSWORD` | SMTP Password | `mssp...` |

> **Security Note:** Never commit `.env` to GitHub. Add these directly in the Vercel Dashboard.

## 3. Verified Deployment Steps

### Method A: Vercel Dashboard (GitHub Integration)
1.  Push branch `chore/deployment-prep` to GitHub.
2.  Go to Vercel Dashboard > New Project.
3.  Import `EE_manager` repository.
4.  Select `chore/deployment-prep` branch (if testing) or `main` (if production).
5.  **Build Settings:** Default is usually correct (`npm run build`).
6.  **Environment Variables:** Copy/Paste the values from Section 2.
7.  Click **Deploy**.

### Method B: Vercel CLI (Local)
If you have Vercel CLI installed:
1.  Run `vercel login`.
2.  Run `vercel link` to connect the project.
3.  Run `vercel env pull` to verify envs (or sets them).
4.  Run `vercel deploy` for preview or `vercel deploy --prod` for production.

## 4. Post-Deployment Verification
Once deployed:
1.  Visit the provided Vercel URL (e.g., `ee-manager.vercel.app`).
2.  **Test 1:** Login (Verifies Supabase Auth).
3.  **Test 2:** Dashboard Load (Verifies RLS and DB Connection).
4.  **Test 3:** API Route (Check Network Tab for `/api/me` success).

## 5. Troubleshooting Common Issues
- **500 Error on Login:** Check `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` in Vercel Env Vars.
- **404 on Assets:** Ensure `public/` directory is handled (Vercel handles this automatically).
- **Timeout:** Vercel Serverless Functions have a 10s default timeout. If Reports take longer, we may need to upgrade or move to Edge Functions.
