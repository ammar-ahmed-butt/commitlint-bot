'use strict';

const APP_NAME = 'standards-bot';

/**
 * Set a GitHub commit status check.
 * @param {Object} github  - Octokit GitHub client
 * @param {Object} repo    - { owner, repo }
 * @param {String} sha     - commit SHA
 * @param {String} context - status context label (shown in GitHub UI)
 * @param {String} state   - 'success' | 'failure' | 'pending' | 'error'
 * @param {String} description - short description (max 140 chars)
 */
async function setStatus(github, repo, sha, context, state, description) {
  await github.repos.createCommitStatus({
    ...repo,
    sha,
    context: `${APP_NAME}/${context}`,
    state,
    description: (description || '').substring(0, 140),
  });
}

async function setPending(github, repo, sha, context, description) {
  return setStatus(github, repo, sha, context, 'pending', description || 'Checking…');
}

async function setSuccess(github, repo, sha, context, description) {
  return setStatus(github, repo, sha, context, 'success', description || 'All checks passed ✓');
}

async function setFailure(github, repo, sha, context, description) {
  return setStatus(github, repo, sha, context, 'failure', description || 'Check failed ✗');
}

module.exports = { setPending, setSuccess, setFailure };
