'use strict';

// ─── Regex Patterns ──────────────────────────────────────────────────────────

/**
 * Commit message must:
 *   - Start with a type prefix (build:|chore:|ci:|docs:|feat:|fix:|perf:|refactor:|revert:|update:|create:|style:|test:)
 *     followed by a lowercase word up to 73 chars
 *   - OR be a Merge commit
 *   - OR be "Initial commit"
 *   - AND contain a JIRA-style ticket ID (e.g. JIRA-123, TPM-12)
 */
const COMMIT_REGEX = /(?=[\s\S]*(^((build:|chore:|ci:|docs:|feat:|fix:|perf:|refactor:|revert:|update:|create:|style:|test:)(( )|())([a-z]\w{1,72}))|(Merge([\s\S]*))|(Initial commit$)))(?=[\s\S]*([A-Za-z]+(-)[0-9]))/m;

/**
 * PR title must:
 *   - Start with a JIRA-style ID (letters + dash/space + numbers)
 *   - Followed by a separator (colon, dash, or space)
 *   - Followed by any description text
 *   Example: JIRA-123: Add new feature | TPM-12 - Fix bug
 */
const PR_TITLE_REGEX = /^[A-Za-z]+(-| )[0-9]+(:|-| )(\w|\W)+$/;

/**
 * Branch name must follow:
 *   <keyword>/<JIRA_ID>-<DEVELOPER_INITIALS>
 *   - keyword: feature | bugfix | hotfix | build
 *   - JIRA_ID: e.g. JIRA-123, TPM-12 (uppercase letters, dash, digits)
 *   - DEVELOPER_INITIALS: uppercase letters only (e.g. AAB)
 *   Example: feature/JIRA-123-AAB | bugfix/TPM-12-JD
 */
const BRANCH_REGEX = /^(feature|bugfix|hotfix|build)\/[A-Z]+-[0-9]+-[A-Z]+$/;

// ─── Validators ──────────────────────────────────────────────────────────────

/**
 * Validate a single commit message.
 * Merge commits and "Initial commit" are fully exempt.
 * All others must match the type-prefix pattern AND include a ticket ID.
 */
function validateCommit(message) {
  const trimmed = (message || '').trim();

  // Exempt: Merge commits and Initial commit
  const isMerge = /^Merge/.test(trimmed);
  const isInitial = trimmed === 'Initial commit';
  if (isMerge || isInitial) {
    return { valid: true, message: trimmed, error: null };
  }

  const valid = COMMIT_REGEX.test(trimmed);
  return {
    valid,
    message: trimmed,
    error: valid ? null : buildCommitError(trimmed),
  };
}

function buildCommitError(msg) {
  const lines = [];
  const hasType = /^(build|chore|ci|docs|feat|fix|perf|refactor|revert|update|create|style|test):/.test(msg);
  const isMerge = /^Merge/.test(msg);
  const isInitial = msg === 'Initial commit';
  const hasTicket = /[A-Za-z]+-[0-9]+/.test(msg);

  if (!isMerge && !isInitial) {
    if (!hasType) {
      lines.push(
        '- Must start with a valid type prefix: ' +
        '`build:` `chore:` `ci:` `docs:` `feat:` `fix:` `perf:` `refactor:` `revert:` `update:` `create:` `style:` `test:`'
      );
    }
    if (!hasTicket) {
      lines.push('- Must include a JIRA ticket ID (e.g. `JIRA-123`, `TPM-12`)');
    }
  }

  return lines.length
    ? lines.join('\n')
    : 'Commit message does not match the required format.';
}

/**
 * Validate a PR title.
 * Returns { valid: Boolean, error: String|null }
 */
function validatePRTitle(title) {
  const trimmed = (title || '').trim();
  const valid = PR_TITLE_REGEX.test(trimmed);
  return {
    valid,
    error: valid
      ? null
      : 'PR title must start with a JIRA ticket ID followed by a description.\n' +
        'Examples: `JIRA-123: Add new feature` | `TPM-12 - Fix null pointer bug`',
  };
}

/**
 * Validate a branch name.
 * Returns { valid: Boolean, error: String|null }
 */
function validateBranch(branchName) {
  const valid = BRANCH_REGEX.test(branchName || '');
  return {
    valid,
    error: valid
      ? null
      : 'Branch name must follow: `<keyword>/<JIRA_ID>-<INITIALS>`\n' +
        '- **Keywords:** `feature` | `bugfix` | `hotfix` | `build`\n' +
        '- **JIRA ID:** uppercase letters + dash + digits (e.g. `JIRA-123`)\n' +
        '- **Initials:** uppercase letters only (e.g. `AAB`)\n\n' +
        'Examples: `feature/JIRA-123-AAB` | `bugfix/TPM-12-JD`',
  };
}

module.exports = { validateCommit, validatePRTitle, validateBranch };
