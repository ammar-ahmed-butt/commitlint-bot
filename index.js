'use strict';

const { validateCommit, validatePRTitle, validateBranch } = require('./lib/validate');
const { setPending, setSuccess, setFailure } = require('./lib/status');
const { upsertComment, deleteComment, buildReport } = require('./lib/comment');

module.exports = (robot) => {
  // Trigger on PR open, reopen, edit, or new commits pushed
  robot.on([
    'pull_request.opened',
    'pull_request.reopened',
    'pull_request.edited',
    'pull_request.synchronize',
  ], check);
};

async function check(context) {
  const { github, payload } = context;
  const pr = payload.pull_request;
  const repo = context.repo();
  const headSha = pr.head.sha;
  const prNumber = pr.number;
  const branchName = pr.head.ref;
  const prTitle = pr.title;

  // ─── Set all statuses to pending ─────────────────────────────────────────
  await Promise.all([
    setPending(github, repo, headSha, 'branch-name', 'Validating branch name…'),
    setPending(github, repo, headSha, 'pr-title', 'Validating PR title…'),
    setPending(github, repo, headSha, 'commit-messages', 'Validating commit messages…'),
  ]);

  // ─── Fetch commits on this PR ─────────────────────────────────────────────
  let commitList = [];
  try {
    const response = await github.pullRequests.listCommits({
      ...repo,
      pull_number: prNumber,
      per_page: 100,
    });
    commitList = response.data;
  } catch (err) {
    context.log.error('Failed to fetch commits:', err);
  }

  // ─── Run validations ──────────────────────────────────────────────────────
  const branchResult = {
    ...validateBranch(branchName),
    name: branchName,
  };

  const prTitleResult = {
    ...validatePRTitle(prTitle),
    title: prTitle,
  };

  const commitResults = commitList.map(c => ({
    ...validateCommit(c.commit.message),
    sha: c.sha,
  }));

  const results = {
    branch: branchResult,
    prTitle: prTitleResult,
    commits: commitResults,
  };

  // ─── Set individual status checks ────────────────────────────────────────
  await Promise.all([
    branchResult.valid
      ? setSuccess(github, repo, headSha, 'branch-name', `Branch name OK: ${branchName}`)
      : setFailure(github, repo, headSha, 'branch-name', `Invalid branch name: ${branchName}`),

    prTitleResult.valid
      ? setSuccess(github, repo, headSha, 'pr-title', 'PR title OK')
      : setFailure(github, repo, headSha, 'pr-title', 'PR title does not match required format'),

    commitResults.length === 0
      ? setSuccess(github, repo, headSha, 'commit-messages', 'No commits to check')
      : commitResults.every(c => c.valid)
        ? setSuccess(github, repo, headSha, 'commit-messages', `All ${commitResults.length} commit(s) pass`)
        : setFailure(
            github, repo, headSha, 'commit-messages',
            `${commitResults.filter(c => !c.valid).length} of ${commitResults.length} commit(s) failed`
          ),
  ]);

  // ─── Post or update PR comment ────────────────────────────────────────────
  const report = buildReport(results);

  if (report) {
    await upsertComment(github, repo, prNumber, report);
  } else {
    // All checks passed — remove any previous failure comment
    await deleteComment(github, repo, prNumber);
  }
}
