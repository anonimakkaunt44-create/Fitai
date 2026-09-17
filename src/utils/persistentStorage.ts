/**
 * Persistent Storage combining Telegram WebApp CloudStorage (cloud-backed per Telegram account)
 * and browser localStorage for zero session loss across restarts and container reboots.
 */

export const persistentStorage = {
  async getItem(key: string): Promise<string | null> {
    // 1. Try Telegram CloudStorage first if running in Telegram Mini App
    const cloudStorage = typeof window !== 'undefined' ? (window.Telegram?.WebApp as any)?.CloudStorage : null;
    if (cloudStorage?.getItem) {
      try {
        const cloudVal = await new Promise<string | null>((resolve) => {
          try {
            cloudStorage.getItem(key, (err: any, value: string) => {
              if (!err && typeof value === 'string' && value.length > 0) {
                resolve(value);
              } else {
                resolve(null);
              }
            });
          } catch {
            resolve(null);
          }
        });
        if (cloudVal) {
          // Sync back to localStorage for instant subsequent reads
          try {
            localStorage.setItem(key, cloudVal);
          } catch {}
          return cloudVal;
        }
      } catch {
        // CloudStorage fallback
      }
    }

    // 2. Fallback to browser localStorage
    try {
      if (typeof window !== 'undefined') {
        return localStorage.getItem(key);
      }
    } catch {}

    return null;
  },

  async setItem(key: string, value: string): Promise<void> {
    // 1. Save to local storage immediately
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(key, value);
      }
    } catch {}

    // 2. Save to Telegram CloudStorage permanently (survives webview closure, reloads, and device switches)
    const cloudStorage = typeof window !== 'undefined' ? (window.Telegram?.WebApp as any)?.CloudStorage : null;
    if (cloudStorage?.setItem) {
      try {
        cloudStorage.setItem(key, value, () => {});
      } catch {
        // ignore
      }
    }
  },

  async removeItem(key: string): Promise<void> {
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(key);
      }
    } catch {}

    const cloudStorage = typeof window !== 'undefined' ? (window.Telegram?.WebApp as any)?.CloudStorage : null;
    if (cloudStorage?.removeItem) {
      try {
        cloudStorage.removeItem(key, () => {});
      } catch {}
    }
  },
};
