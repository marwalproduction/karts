# Troubleshooting Guide

## Common Errors and Solutions

### Error: "GitHub storage not configured. Please set GITHUB_TOKEN environment variable."

**Solution:**
1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add `GITHUB_TOKEN` with your GitHub Personal Access Token
3. Make sure to select all environments (Production, Preview, Development)
4. Click Save
5. **Redeploy** your application (go to Deployments → Redeploy)

### Error: 500 Internal Server Error on `/api/upload`

**Possible causes:**

1. **Missing GITHUB_TOKEN**
   - Check Vercel environment variables
   - Make sure token is set for the correct environment
   - Redeploy after adding the token

2. **Invalid GitHub Token**
   - Token might be expired or revoked
   - Create a new token with proper permissions:
     - Contents: Read and write
     - Repository access: Select your repository

3. **Wrong Repository Configuration**
   - Check `GITHUB_OWNER` matches your GitHub username
   - Check `GITHUB_REPO` matches your repository name
   - Defaults: `marwalproduction` / `karts`

4. **Permission Issues**
   - Token needs "Contents: Read and write" permission
   - Token must have access to the repository

### Error: 404 on API endpoints

**Possible causes:**

1. **Functions not deployed**
   - Check Vercel deployment logs
   - Make sure `api/upload.js`, `api/search.js`, `api/nearby.js` exist
   - Redeploy if files are missing

2. **Route configuration**
   - Check `vercel.json` has correct function configuration
   - API routes should be in `api/` directory

### How to Check Vercel Function Logs

1. Go to Vercel Dashboard → Your Project
2. Click on a deployment
3. Click "Functions" tab
4. Click on a function execution to see logs
5. Look for error messages and stack traces

### Testing GitHub Token

You can test if your token works by checking Vercel function logs. Look for:
- "GitHub authentication failed" → Token is invalid
- "Repository not found" → Wrong owner/repo name
- "GitHub access forbidden" → Token lacks permissions

### Quick Checklist

- [ ] GITHUB_TOKEN is set in Vercel environment variables
- [ ] Token has "Contents: Read and write" permission
- [ ] Token has access to the correct repository
- [ ] GITHUB_OWNER matches your GitHub username (or is default)
- [ ] GITHUB_REPO matches your repository name (or is default)
- [ ] Application has been redeployed after setting environment variables
- [ ] Check Vercel function logs for detailed error messages

