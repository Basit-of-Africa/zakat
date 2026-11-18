"use client";

import { useEffect, useState } from "react";

/**
 * Accounts, from the browser's side. The promise on the landing page is that
 * the server cannot read anyone's figures; this file is where that is kept.
 *
 *   password --PBKDF2 (600,000 rounds, per-user salt)--> 64 bytes
 *                                                       +- first 32: authHash, sent to the server
 *                                                       +- last 32:  vault key, never leaves this browser
 *
 * The server stores scrypt(authHash) to check sign-ins, and an AES-GCM
 * ciphertext of this browser's saved figures. Without the password it has
 * neither the key nor any way to derive it. The one cost: forget the
 * password and the vault cannot be recovered by anyone, us included.
 */

const ACCOUNT_KEY = "zakat-kit:account";
const ROUNDS = 600_000;
const enc = new TextEncoder();
const dec = new TextDecoder();

export interface Session {
  email: string;
  token: string;
  /** The vault key, base64url. Kept in this browser so a reload stays signed in. */
  key: string;
  syncedAt: string | null;
}

const b64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const unb64 = (s: string) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4)), (c) => c.charCodeAt(0));
const hex = (bytes: Uint8Array) => [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");

async function derive(password: string, salt: string): Promise<{ authHash: string; key: string }> {
  const base = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = new Uint8Array(await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: enc.encode(salt), iterations: ROUNDS }, base, 512));
  return { authHash: hex(bits.slice(0, 32)), key: b64(bits.slice(32)) };
}

async function aes(key: string) {
  return crypto.subtle.importKey("raw", unb64(key), "AES-GCM", false, ["encrypt", "decrypt"]);
}

export function readSession(): Session | null {
  try {
    const raw = window.localStorage.getItem(ACCOUNT_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

function writeSession(s: Session | null) {
  try {
    if (s) window.localStorage.setItem(ACCOUNT_KEY, JSON.stringify(s));
    else window.localStorage.removeItem(ACCOUNT_KEY);
  } catch {
    // Private mode: signed in for this tab only.
  }
  window.dispatchEvent(new Event("zakat-kit:account"));
}

/** Who is signed in on this device, kept current across tabs. */
export function useAccount(): { email: string | null; syncedAt: string | null } {
  const [s, setS] = useState<Session | null>(null);
  useEffect(() => {
    const read = () => setS(readSession());
    read();
    window.addEventListener("zakat-kit:account", read);
    window.addEventListener("storage", read);
    return () => {
      window.removeEventListener("zakat-kit:account", read);
      window.removeEventListener("storage", read);
    };
  }, []);
  return { email: s?.email ?? null, syncedAt: s?.syncedAt ?? null };
}

async function call<T>(path: string, init: RequestInit & { token?: string } = {}): Promise<T> {
  const res = await fetch(`/api/account${path}`, {
    ...init,
    headers: { "content-type": "application/json", ...(init.token ? { authorization: `Bearer ${init.token}` } : {}) },
  });
  const body = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(body.error || `Something went wrong (${res.status}).`);
  return body;
}

export async function accountsEnabled(): Promise<boolean> {
  try {
    return (await call<{ enabled: boolean }>("/status")).enabled;
  } catch {
    return false;
  }
}

/** The figures this browser has saved: every zakat-kit key except the session itself. */
function snapshot(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const k of Object.keys(window.localStorage)) {
    if (k.startsWith("zakat-kit:") && k !== ACCOUNT_KEY) out[k] = window.localStorage.getItem(k) ?? "";
  }
  return out;
}

async function seal(key: string, data: Record<string, string>): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await aes(key), enc.encode(JSON.stringify(data))));
  return `v1.${b64(iv)}.${b64(ct)}`;
}

async function open(key: string, vault: string): Promise<Record<string, string>> {
  const [v, iv, ct] = vault.split(".");
  if (v !== "v1" || !iv || !ct) throw new Error("This vault is in a format this version cannot read.");
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(iv) }, await aes(key), unb64(ct));
  return JSON.parse(dec.decode(pt)) as Record<string, string>;
}

function restore(data: Record<string, string>) {
  for (const [k, v] of Object.entries(data)) if (k.startsWith("zakat-kit:") && k !== ACCOUNT_KEY) window.localStorage.setItem(k, v);
}

export async function register(email: string, password: string): Promise<void> {
  const salt = b64(crypto.getRandomValues(new Uint8Array(16)));
  const { authHash, key } = await derive(password, salt);
  const r = await call<{ token: string; email: string }>("/register", { method: "POST", body: JSON.stringify({ email, authHash, kdfSalt: salt }) });
  writeSession({ email: r.email, token: r.token, key, syncedAt: null });
  // What this browser already holds becomes the account's first vault.
  await sync();
}

/** Sign in. If the account has a vault, its figures are restored into this browser. */
export async function login(email: string, password: string): Promise<{ restored: boolean }> {
  const { salt } = await call<{ salt: string }>("/salt", { method: "POST", body: JSON.stringify({ email }) });
  const { authHash, key } = await derive(password, salt);
  const r = await call<{ token: string; email: string; vault: string | null; vaultUpdatedAt: string | null }>("/login", { method: "POST", body: JSON.stringify({ email, authHash }) });
  if (r.vault) restore(await open(key, r.vault));
  writeSession({ email: r.email, token: r.token, key, syncedAt: r.vaultUpdatedAt });
  return { restored: Boolean(r.vault) };
}

/** Encrypt this browser's figures and store them in the account. */
export async function sync(): Promise<string> {
  const s = readSession();
  if (!s) throw new Error("You are not signed in.");
  const vault = await seal(s.key, snapshot());
  const r = await call<{ vaultUpdatedAt: string }>("/vault", { method: "PUT", token: s.token, body: JSON.stringify({ vault }) });
  writeSession({ ...s, syncedAt: r.vaultUpdatedAt });
  return r.vaultUpdatedAt;
}

/** Sign out. The figures stay in this browser unless `forget` is set. */
export async function logout(forget = false): Promise<void> {
  const s = readSession();
  if (s) await call("/logout", { method: "POST", token: s.token }).catch(() => {});
  writeSession(null);
  if (forget) for (const k of Object.keys(snapshot())) window.localStorage.removeItem(k);
}

export async function deleteAccount(): Promise<void> {
  const s = readSession();
  if (!s) return;
  await call("/vault", { method: "DELETE", token: s.token });
  writeSession(null);
}
