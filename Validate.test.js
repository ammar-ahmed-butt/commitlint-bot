'use strict';

const { validateCommit, validatePRTitle, validateBranch } = require('../lib/validate');

// ─── Simple test runner ───────────────────────────────────────────────────────
let passed = 0;
let failed = 0;

function test(label, fn) {
  try {
    fn();
    console.log(`  ✓  ${label}`);
    passed++;
  } catch (e) {
    console.log(`  ✗  ${label}`);
    console.log(`       ${e.message}`);
    failed++;
  }
}

function assert(condition, msg) {
  if (!condition) throw new Error(msg || 'Assertion failed');
}

// ─── Commit Message Tests ─────────────────────────────────────────────────────
console.log('\n📝 Commit Messages\n');

test('valid: feat: with JIRA ticket', () => {
  const r = validateCommit('feat: add login page JIRA-123');
  assert(r.valid, `Expected valid, got: ${r.error}`);
});

test('valid: fix: with ticket and extra detail', () => {
  const r = validateCommit('fix: resolve null pointer error TPM-45');
  assert(r.valid, `Expected valid, got: ${r.error}`);
});

test('valid: Merge commit (no ticket required)', () => {
  const r = validateCommit('Merge pull request #10 from feature/JIRA-99-AAB');
  assert(r.valid, `Expected valid, got: ${r.error}`);
});

test('valid: Initial commit', () => {
  const r = validateCommit('Initial commit');
  assert(r.valid, `Expected valid, got: ${r.error}`);
});

test('invalid: missing ticket ID', () => {
  const r = validateCommit('feat: add some feature');
  assert(!r.valid, 'Expected invalid (no ticket ID)');
});

test('invalid: uppercase type prefix', () => {
  const r = validateCommit('FEAT: add login JIRA-1');
  assert(!r.valid, 'Expected invalid (uppercase prefix)');
});

test('invalid: missing type prefix entirely', () => {
  const r = validateCommit('added new button JIRA-5');
  assert(!r.valid, 'Expected invalid (no type prefix)');
});

test('invalid: empty string', () => {
  const r = validateCommit('');
  assert(!r.valid, 'Expected invalid');
});

// ─── PR Title Tests ───────────────────────────────────────────────────────────
console.log('\n🔖 PR Titles\n');

test('valid: TICKET-123: description', () => {
  const r = validatePRTitle('JIRA-123: Add new login feature');
  assert(r.valid, `Expected valid, got: ${r.error}`);
});

test('valid: TICKET-123 - description', () => {
  const r = validatePRTitle('TPM-12 - Fix null pointer bug');
  assert(r.valid, `Expected valid, got: ${r.error}`);
});

test('valid: TICKET-123 description (space separator)', () => {
  const r = validatePRTitle('JIRA-99 Update user profile page');
  assert(r.valid, `Expected valid, got: ${r.error}`);
});

test('invalid: no ticket ID', () => {
  const r = validatePRTitle('Add new login feature');
  assert(!r.valid, 'Expected invalid (no ticket ID)');
});

test('invalid: empty string', () => {
  const r = validatePRTitle('');
  assert(!r.valid, 'Expected invalid');
});

test('invalid: ticket with no description', () => {
  const r = validatePRTitle('JIRA-123');
  assert(!r.valid, 'Expected invalid (no description)');
});

// ─── Branch Name Tests ────────────────────────────────────────────────────────
console.log('\n🌿 Branch Names\n');

test('valid: feature/JIRA-123-AAB', () => {
  const r = validateBranch('feature/JIRA-123-AAB');
  assert(r.valid, `Expected valid, got: ${r.error}`);
});

test('valid: bugfix/TPM-12-JD', () => {
  const r = validateBranch('bugfix/TPM-12-JD');
  assert(r.valid, `Expected valid, got: ${r.error}`);
});

test('valid: hotfix/PROJ-1-AB', () => {
  const r = validateBranch('hotfix/PROJ-1-AB');
  assert(r.valid, `Expected valid, got: ${r.error}`);
});

test('valid: build/RELEASE-10-XY', () => {
  const r = validateBranch('build/RELEASE-10-XY');
  assert(r.valid, `Expected valid, got: ${r.error}`);
});

test('invalid: wrong keyword (develop/)', () => {
  const r = validateBranch('develop/JIRA-123-AAB');
  assert(!r.valid, 'Expected invalid (wrong keyword)');
});

test('invalid: lowercase JIRA ID', () => {
  const r = validateBranch('feature/jira-123-AAB');
  assert(!r.valid, 'Expected invalid (lowercase JIRA ID)');
});

test('invalid: lowercase initials', () => {
  const r = validateBranch('feature/JIRA-123-aab');
  assert(!r.valid, 'Expected invalid (lowercase initials)');
});

test('invalid: missing initials', () => {
  const r = validateBranch('feature/JIRA-123');
  assert(!r.valid, 'Expected invalid (no initials)');
});

test('invalid: no slash separator', () => {
  const r = validateBranch('featureJIRA-123-AAB');
  assert(!r.valid, 'Expected invalid (no slash)');
});

test('invalid: master branch', () => {
  const r = validateBranch('master');
  assert(!r.valid, 'Expected invalid');
});

// ─── Summary ──────────────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(40)}`);
console.log(`  ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
