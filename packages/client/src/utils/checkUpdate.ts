/**
 * Check npm registry for newer version of hivechat.
 * Non-blocking, never throws — returns null on any failure.
 */
export async function checkUpdate(currentVersion: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000); // 3s timeout

    const res = await fetch('https://registry.npmjs.org/hivechat/latest', {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    clearTimeout(timeout);

    if (!res.ok) return null;

    const data = (await res.json()) as { version?: string };
    if (!data.version) return null;

    // Compare semver: only notify if registry version is newer
    if (isNewer(data.version, currentVersion)) {
      return data.version;
    }
    return null;
  } catch {
    // Network error, timeout, etc. — silently ignore
    return null;
  }
}

/** Simple semver comparison: returns true if a > b */
function isNewer(a: string, b: string): boolean {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    const va = pa[i] ?? 0;
    const vb = pb[i] ?? 0;
    if (va > vb) return true;
    if (va < vb) return false;
  }
  return false;
}
