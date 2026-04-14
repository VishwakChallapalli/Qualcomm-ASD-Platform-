#!/usr/bin/env node
/**
 * Start Next.js, Express API, Emotion server, and Whisper server in one terminal.
 * Press Ctrl+C to stop all processes.
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const serverDir = path.join(root, 'server');
const emotionDir = path.join(root, 'emotion-server');
const whisperDir = path.join(root, 'whisper-server');

/** @type {import('node:child_process').ChildProcess[]} */
const children = [];

function npmCli() {
  return process.platform === 'win32' ? 'npm.cmd' : 'npm';
}

function venvPython(cwd) {
  const rel =
    process.platform === 'win32'
      ? path.join('venv', 'Scripts', 'python.exe')
      : path.join('venv', 'bin', 'python');
  const full = path.join(cwd, rel);
  return fs.existsSync(full) ? full : null;
}

function pythonCommand(cwd, label) {
  const v = venvPython(cwd);
  if (v) return v;
  const fallback = process.platform === 'win32' ? 'python' : 'python3';
  console.warn(
    `[dev-all] ${label}: no venv at ${path.join(cwd, 'venv')} — using "${fallback}" (install: cd ${path.basename(cwd)} && python3 -m venv venv && source venv/bin/activate && pip install -r requirements.txt)`
  );
  return fallback;
}

function run(name, command, args, options = {}) {
  const { useShell = false, ...rest } = options;
  const child = spawn(command, args, {
    stdio: 'inherit',
    shell: useShell,
    ...rest,
  });
  child.on('error', (err) => {
    console.error(`[dev-all] ${name} failed to start:`, err.message);
  });
  child.on('exit', (code, signal) => {
    if (signal) console.log(`[dev-all] ${name} stopped (${signal})`);
    else if (code !== 0 && code !== null) console.log(`[dev-all] ${name} exited with code ${code}`);
  });
  children.push(child);
  return child;
}

function shutdown() {
  for (const c of children) {
    if (c && !c.killed && c.pid) {
      try {
        c.kill('SIGTERM');
      } catch {
        /* ignore */
      }
    }
  }
  setTimeout(() => process.exit(0), 500).unref();
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

const skipPython =
  process.env.SKIP_PYTHON_SERVERS === '1' || process.env.SKIP_PYTHON === '1';

console.log(
  skipPython
    ? '[dev-all] Starting: Next (3000), API (5001) — Python servers skipped (SKIP_PYTHON_SERVERS=1)'
    : '[dev-all] Starting: Next (3000), API (5001), Emotion (5050), Whisper (5051)'
);
console.log('[dev-all] Use: npm run dev:all  (colon)  or  npm run devall');
console.log('[dev-all] If Next fails: stop other "next dev" and free port 3000; delete .next/dev/lock if stuck.\n');

// Avoid shell:true + args (DEP0190); npm on Windows is npm.cmd
run('next', npmCli(), ['run', 'dev'], { cwd: root, env: process.env, useShell: false });

run('api', process.execPath, [path.join(serverDir, 'index.js')], {
  cwd: root,
  env: process.env,
});

if (!skipPython) {
  const emotionPy = pythonCommand(emotionDir, 'emotion');
  run('emotion', emotionPy, ['server.py'], {
    cwd: emotionDir,
    env: { ...process.env, PYTHONUNBUFFERED: '1' },
    useShell: process.platform === 'win32' && !path.isAbsolute(emotionPy),
  });

  const whisperPy = pythonCommand(whisperDir, 'whisper');
  run('whisper', whisperPy, ['server.py'], {
    cwd: whisperDir,
    env: { ...process.env, PYTHONUNBUFFERED: '1' },
    useShell: process.platform === 'win32' && !path.isAbsolute(whisperPy),
  });
}
