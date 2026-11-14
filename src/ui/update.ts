// Asks the live site whether a newer build is out, so an installed copy (home-screen app)
// can update without being closed. vite.config.ts writes version.json next to index.html.

export type UpdateCheck = 'new' | 'current' | 'offline';

export async function checkForUpdate(): Promise<UpdateCheck> {
  if (__BUILD_COMMIT__ === 'dev') return 'current';
  try {
    const res = await fetch(`version.json?t=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) return 'offline';
    const live = (await res.json()) as { commit?: string };
    return live.commit && live.commit !== __BUILD_COMMIT__ ? 'new' : 'current';
  } catch {
    return 'offline';
  }
}

/** Load the newest build. The query string skips any cached copy of the page. */
export function reloadToUpdate() {
  const url = new URL(location.href);
  url.searchParams.set('v', String(Date.now()));
  location.replace(url.toString());
}
