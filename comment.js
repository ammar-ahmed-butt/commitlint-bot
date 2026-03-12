'use strict';

const BOT_MARKER = '<!-- standards-bot -->';

/**
 * Find an existing bot comment on the PR, or null.
 */
async function findBotComment(github, repo, prNumber) {
  const comments = await github.issues.listComments({
    ...repo,
    issue_number: prNumber,
    per_page: 100,
  });
  return comments.data.find(c => c.body.includes(BOT_MARKER)) || null;
}

/**
 * Post or update the single bot comment on the PR.
 * If all checks pass, delete the comment (if it exists).
 */
async function upsertComment(github, repo, prNumber, body) {
  const existing = await findBotComment(github, repo, prNumber);
  const fullBody = `${BOT_MARKER}\n${body}`;

  if (existing) {
    await github.issues.updateComment({
      ...repo,
      comment_id: existing.id,
      body: fullBody,
    });
  } else {
    await github.issues.createComment({
      ...repo,
      issue_number: prNumber,
      body: fullBody,
    });
  }
}

async function deleteComment(github, repo, prNumber) {
  const existing = await findBotComment(github, repo, prNumber);
  if (existing) {
    await github.issues.deleteComment({
      ...repo,
      comment_id: existing.id,
    });
  }
}

/**
 * Build a formatted markdown report from check results.
 * @param {Object} results - { commits, prTitle, branch }
 */
function buildReport(results) {
  const sections = [];

  // ─── Branch ────────────────────────────────────────────────────────────────
  if (!results.branch.valid) {
    sections.push(
      `## ❌ Branch Name\n\n` +
      `**\`${results.branch.name}\`** does not follow naming conventions.\n\n` +
      results.branch.error
    );
  }

  // ─── PR Title ──────────────────────────────────────────────────────────────
  if (!results.prTitle.valid) {
    sections.push(
      `## ❌ PR Title\n\n` +
      `**\`${results.prTitle.title}\`** does not follow the required format.\n\n` +
      results.prTitle.error
    );
  }

  // ─── Commits ───────────────────────────────────────────────────────────────
  const badCommits = results.commits.filter(c => !c.valid);
  if (badCommits.length > 0) {
    const commitLines = badCommits.map(c =>
      `### \`${c.sha.substring(0, 7)}\` — ${c.message.split('\n')[0]}\n${c.error}`
    ).join('\n\n');
    sections.push(`## ❌ Commit Messages (${badCommits.length} issue${badCommits.length > 1 ? 's' : ''})\n\n${commitLines}`);
  }

  if (sections.length === 0) {
    return null; // All good, no comment needed
  }

  return [
    '# 🤖 Standards Bot Report',
    '',
    'The following issues were found. Please fix them before merging.',
    '',
    '---',
    '',
    sections.join('\n\n---\n\n'),
    '',
    '---',
    '',
    '<details>',
    '<summary>📋 Naming conventions</summary>',
    '',
    '**Commit messages:** `<type>: <description> [TICKET-ID]`  ',
    'Types: `build` `chore` `ci` `docs` `feat` `fix` `perf` `refactor` `revert` `update` `create` `style` `test`',
    '',
    '**PR titles:** `TICKET-ID: Description` or `TICKET-ID - Description`',
    '',
    '**Branch names:** `<keyword>/<JIRA_ID>-<INITIALS>`  ',
    'Keywords: `feature` `bugfix` `hotfix` `build`',
    '',
    '</details>',
  ].join('\n');
}

module.exports = { upsertComment, deleteComment, buildReport };
