import "server-only";
import { createHash, randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

/**
 * Accounts, as the server sees them. It never holds a password or a figure:
 *
 *   - `authHash` is derived from the password in the browser (lib/account.ts)
 *     and only ever arrives already hashed; we scrypt it again before storing.
 *   - `vault` is ciphertext, encrypted in the browser with a key that never
 *     leaves it. We store it and hand it back; we cannot read it.
 *
 * MongoDB when MONGODB_URI is set; otherwise, outside production, an in-memory
 * store so the flow can be tried locally. In production without a database,
 * accounts are off and the pages say so.
 */
const scrypt = promisify(scryptCb) as (pw: string | Buffer, salt: Buffer, len: number) => Promise<Buffer>;

export interface UserDoc {
  id: string;
  email: string;
  /** Salt for the browser's key derivation, so it can sign in from a new device. */
  kdfSalt: string;
  verifier: string; // scrypt(authHash) as salt:hash, hex
  vault: string | null;
  vaultUpdatedAt: string | null;
  createdAt: string;
}

interface SessionDoc {
  tokenHash: string;
  userId: string;
  expiresAt: number;
}

interface Store {
  findByEmail(email: string): Promise<UserDoc | null>;
  findById(id: string): Promise<UserDoc | null>;
  insert(u: UserDoc): Promise<boolean>;
  setVault(id: string, vault: string, at: string): Promise<void>;
  remove(id: string): Promise<void>;
  addSession(s: SessionDoc): Promise<void>;
  session(tokenHash: string): Promise<SessionDoc | null>;
  dropSession(tokenHash: string): Promise<void>;
}

const SESSION_DAYS = 30;

function memoryStore(): Store {
  const users = new Map<string, UserDoc>();
  const sessions = new Map<string, SessionDoc>();
  return {
    async findByEmail(email) { return [...users.values()].find((u) => u.email === email) ?? null; },
    async findById(id) { return users.get(id) ?? null; },
    async insert(u) { if ([...users.values()].some((x) => x.email === u.email)) return false; users.set(u.id, u); return true; },
    async setVault(id, vault, at) { const u = users.get(id); if (u) { u.vault = vault; u.vaultUpdatedAt = at; } },
    async remove(id) { users.delete(id); for (const [k, s] of sessions) if (s.userId === id) sessions.delete(k); },
    async addSession(s) { sessions.set(s.tokenHash, s); },
    async session(h) { const s = sessions.get(h); return s && s.expiresAt > Date.now() ? s : null; },
    async dropSession(h) { sessions.delete(h); },
  };
}

async function mongoStore(uri: string): Promise<Store> {
  const { MongoClient } = await import("mongodb");
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 5_000 });
  await client.connect();
  const db = client.db(process.env.ZAKAT_DB_NAME || "zakat_kit");
  const users = db.collection<UserDoc>("users");
  const sessions = db.collection<SessionDoc & { expire: Date }>("sessions");
  await Promise.all([
    users.createIndex({ id: 1 }, { unique: true }),
    users.createIndex({ email: 1 }, { unique: true }),
    sessions.createIndex({ tokenHash: 1 }, { unique: true }),
    sessions.createIndex({ expire: 1 }, { expireAfterSeconds: 0 }),
  ]);
  const plain = { projection: { _id: 0 } } as const;
  return {
    findByEmail: (email) => users.findOne({ email }, plain),
    findById: (id) => users.findOne({ id }, plain),
    async insert(u) {
      try { await users.insertOne({ ...u }); return true; } catch (e) { if ((e as { code?: number }).code === 11000) return false; throw e; }
    },
    async setVault(id, vault, at) { await users.updateOne({ id }, { $set: { vault, vaultUpdatedAt: at } }); },
    async remove(id) { await users.deleteOne({ id }); await sessions.deleteMany({ userId: id }); },
    async addSession(s) { await sessions.insertOne({ ...s, expire: new Date(s.expiresAt) }); },
    async session(h) { const s = await sessions.findOne({ tokenHash: h }, plain); return s && s.expiresAt > Date.now() ? s : null; },
    async dropSession(h) { await sessions.deleteOne({ tokenHash: h }); },
  };
}

// Kept on globalThis: Next bundles each route handler separately, so a
// module-level variable would give every route its own store, and an account
// made by /register would not exist for /vault.
const shared = globalThis as unknown as { __zakatStore?: Promise<Store | null> };

/** The store, or null when accounts are off (production with no database). */
export function getStore(): Promise<Store | null> {
  shared.__zakatStore ??= (async () => {
    const uri = process.env.MONGODB_URI;
    if (uri) return mongoStore(uri);
    if (process.env.NODE_ENV === "production") return null;
    return memoryStore();
  })().catch((e) => {
    shared.__zakatStore = undefined;
    throw e;
  });
  return shared.__zakatStore;
}

export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export async function makeVerifier(authHash: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scrypt(authHash, salt, 32);
  return `${salt.toString("hex")}:${key.toString("hex")}`;
}

export async function checkVerifier(authHash: string, verifier: string): Promise<boolean> {
  const [saltHex, keyHex] = verifier.split(":");
  const key = await scrypt(authHash, Buffer.from(saltHex, "hex"), 32);
  const want = Buffer.from(keyHex, "hex");
  return key.length === want.length && timingSafeEqual(key, want);
}

export async function newSession(store: Store, userId: string): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  await store.addSession({ tokenHash: hashToken(token), userId, expiresAt: Date.now() + SESSION_DAYS * 864e5 });
  return token;
}

/** The signed-in user for a request, from its bearer token. */
export async function userFor(req: Request): Promise<{ store: Store; user: UserDoc; tokenHash: string } | null> {
  const store = await getStore();
  if (!store) return null;
  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const s = await store.session(hashToken(token));
  if (!s) return null;
  const user = await store.findById(s.userId);
  return user ? { store, user, tokenHash: hashToken(token) } : null;
}

/** Best-effort limit on sign-in attempts per address, per instance. */
const attempts: Map<string, { n: number; until: number }> = ((globalThis as unknown as { __zakatAttempts?: Map<string, { n: number; until: number }> }).__zakatAttempts ??= new Map());
export function tooManyAttempts(key: string, max = 10, windowMs = 15 * 60_000): boolean {
  const now = Date.now();
  const a = attempts.get(key);
  if (!a || a.until < now) {
    attempts.set(key, { n: 1, until: now + windowMs });
    return false;
  }
  a.n++;
  return a.n > max;
}

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

export const normaliseEmail = (e: unknown) => (typeof e === "string" ? e.trim().toLowerCase() : "");
export const validEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) && e.length <= 200;
