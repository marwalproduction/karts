# GitHub Storage Setup

This app uses GitHub as the storage backend instead of MongoDB. Vendors are stored as JSON files in your GitHub repository.

## Setup Instructions

### 1. Create a GitHub Personal Access Token

1. Go to GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Click "Generate new token (classic)"
3. Give it a name like "Karts Vendor App"
4. Select the following scopes:
   - `repo` (Full control of private repositories)
5. Click "Generate token"
6. Copy the token (you won't see it again!)

### 2. Configure Vercel Environment Variables

In your Vercel project settings, add these environment variables:

- **GITHUB_TOKEN** (required): Your GitHub personal access token
- **GITHUB_OWNER** (optional): Your GitHub username (defaults to `marwalproduction`)
- **GITHUB_REPO** (optional): Repository name (defaults to `karts`)

### 3. How It Works

- Vendors are stored as JSON files in the `vendor-data/` directory in your repository
- Each vendor is saved as a separate file: `vendor-data/vendor-{timestamp}-{random}.json`
- The app automatically creates the directory if it doesn't exist
- All vendor data is version-controlled in your GitHub repository

### 4. Benefits

✅ No database setup required  
✅ Free (GitHub free tier allows unlimited public repos)  
✅ Version control - see history of all vendors  
✅ Easy backup - your data is in GitHub  
✅ Can view/edit vendors directly in GitHub  

### 5. Rate Limits

GitHub API rate limits:
- **Authenticated requests**: 5,000 requests/hour
- This should be more than enough for normal usage

If you hit rate limits, the app will show an error message.

