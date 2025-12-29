# Environment Variables Setup for Vercel

## Required Environment Variables

Add these in your Vercel project settings (Settings → Environment Variables):

### 1. GITHUB_TOKEN (Required)
- **Name**: `GITHUB_TOKEN`
- **Value**: Your GitHub Personal Access Token
- **Environment**: Production, Preview, Development (select all)
- **⚠️ NEVER commit this to git!**

### 2. GITHUB_OWNER (Optional)
- **Name**: `GITHUB_OWNER`
- **Value**: Your GitHub username (e.g., `marwalproduction`)
- **Default**: `marwalproduction` if not set

### 3. GITHUB_REPO (Optional)
- **Name**: `GITHUB_REPO`
- **Value**: Repository name (e.g., `karts`)
- **Default**: `karts` if not set

## How to Add in Vercel

1. Go to your Vercel project dashboard
2. Click **Settings** → **Environment Variables**
3. Click **Add New**
4. Enter the variable name and value
5. Select environments (Production, Preview, Development)
6. Click **Save**
7. Redeploy your application for changes to take effect

## Security Notes

- ✅ Environment variables in Vercel are encrypted and secure
- ✅ They are only accessible to your serverless functions
- ❌ Never commit tokens or secrets to git
- ❌ Never share tokens in chat or messages
- ✅ If a token is exposed, revoke it immediately and create a new one

