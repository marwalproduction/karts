// Test endpoint to verify GitHub token configuration
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const token = process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_OWNER || 'marwalproduction';
  const repo = process.env.GITHUB_REPO || 'karts';

  const status = {
    tokenConfigured: !!token,
    tokenLength: token ? token.length : 0,
    owner,
    repo,
    message: ''
  };

  if (!token) {
    status.message = 'GITHUB_TOKEN is not set. Please add it in Vercel environment variables.';
    return res.status(200).json(status);
  }

  // Try to verify token works
  try {
    const { Octokit } = require('@octokit/rest');
    const octokit = new Octokit({ auth: token });
    
    // Try to get repository info
    const { data } = await octokit.repos.get({
      owner,
      repo,
    });

    status.message = 'GitHub token is valid and repository is accessible!';
    status.repositoryExists = true;
    status.repositoryName = data.full_name;
    
    res.json(status);
  } catch (error) {
    status.message = `GitHub API error: ${error.message}`;
    status.errorStatus = error.status;
    status.errorDetails = error.response?.data?.message || error.message;
    
    if (error.status === 401) {
      status.message = 'GitHub token is invalid or expired. Please create a new token.';
    } else if (error.status === 403) {
      status.message = 'GitHub token lacks permissions. Check token has "Contents: Read and write" permission.';
    } else if (error.status === 404) {
      status.message = `Repository ${owner}/${repo} not found. Check GITHUB_OWNER and GITHUB_REPO environment variables.`;
    }
    
    res.status(200).json(status);
  }
};

