#!/usr/bin/env node
// Set (or change) a dashboard login on the VM. Run it yourself, in a terminal:
//
//   cd /home/Ray/PROBEX-UI && node scripts/set-dashboard-login.mjs && pm2 restart synatra-dashboard --update-env
//
// It asks for a username and, twice, a password (not echoed). It stores only a scrypt
// hash in DASHBOARD_USERS in .env.local (mode 600), creates DASHBOARD_SESSION_SECRET if
// missing, and never prints a password, a hash or a secret. Other users are kept;
// `--remove <user>` deletes one.

import { randomBytes, scryptSync } from 'node:crypto'
import { chmodSync, existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import readline from 'node:readline'

const ENV = process.env.DASHBOARD_ENV_FILE ?? join(dirname(fileURLToPath(import.meta.url)), '..', '.env.local')

function readEnv() {
  return existsSync(ENV) ? readFileSync(ENV, 'utf8').split('\n').filter((l) => l !== '') : []
}
function get(lines, key) {
  const l = lines.find((x) => x.startsWith(`${key}=`))
  return l === undefined ? undefined : l.slice(key.length + 1)
}
function set(lines, key, value) {
  return [...lines.filter((x) => !x.startsWith(`${key}=`)), `${key}=${value}`]
}
function write(lines) {
  const tmp = `${ENV}.tmp`
  writeFileSync(tmp, lines.join('\n') + '\n', { mode: 0o600 })
  chmodSync(tmp, 0o600)
  renameSync(tmp, ENV)
}
function parseUsers(raw = '') {
  const m = new Map()
  for (const e of raw.split(',').map((s) => s.trim()).filter(Boolean)) {
    const i = e.indexOf(':'); if (i > 0) m.set(e.slice(0, i), e.slice(i + 1))
  }
  return m
}
const serialize = (m) => [...m].map(([u, h]) => `${u}:${h}`).join(',')

function ask(question, hidden = false) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true })
    if (hidden) rl._writeToOutput = (s) => { if (s.includes(question)) rl.output.write(s) }
    rl.question(question, (a) => { rl.close(); if (hidden) process.stdout.write('\n'); resolve(a) })
  })
}

let lines = readEnv()
const users = parseUsers(get(lines, 'DASHBOARD_USERS'))
if (process.argv[2] === '--remove') {
  users.delete(process.argv[3]); lines = set(lines, 'DASHBOARD_USERS', serialize(users)); write(lines)
  console.log(`removed ${process.argv[3]}; ${users.size} user(s) left`)
  process.exit(0)
}
const user = (await ask('Username: ')).trim()
if (!/^[A-Za-z0-9_.-]{3,64}$/.test(user)) { console.error('username: 3-64 letters, digits, . _ -'); process.exit(1) }
const pw = await ask('Password (not shown): ', true)
const pw2 = await ask('Repeat password: ', true)
if (pw !== pw2) { console.error('the passwords differ'); process.exit(1) }
if (pw.length < 12) { console.error('use at least 12 characters'); process.exit(1) }
const salt = randomBytes(16)
const hash = scryptSync(pw, salt, 32, { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 })
users.set(user, `scrypt:16384:8:1:${salt.toString('base64url')}:${hash.toString('base64url')}`)
lines = set(lines, 'DASHBOARD_USERS', serialize(users))
if (!get(lines, 'DASHBOARD_SESSION_SECRET')) lines = set(lines, 'DASHBOARD_SESSION_SECRET', randomBytes(48).toString('base64url'))
if (!get(lines, 'ENGINE_INTERNAL_URL')) lines = set(lines, 'ENGINE_INTERNAL_URL', 'http://127.0.0.1:8000')
write(lines)
console.log(`saved login for ${user} (${users.size} user(s)) in ${ENV}; restart: pm2 restart synatra-dashboard --update-env`)
