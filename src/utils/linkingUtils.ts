/**
 * Utility per estrazione sicura dei token di navigazione da deep link e URL di recupero.
 * Rispetta le direttive di sicurezza: non traccia né scrive il token nei log.
 */

export const extractResetTokenFromUrl = (url: string | null | undefined): string | null => {
  if (!url || typeof url !== 'string') return null;

  try {
    // Prova di parsing standard URL
    const parsed = new URL(url);
    const tokenFromQuery = parsed.searchParams.get('token');
    if (tokenFromQuery && tokenFromQuery.trim().length > 0) {
      return tokenFromQuery.trim();
    }

    // Controllo eventuale parametro nel fragment (#token=...)
    if (parsed.hash) {
      const hashContent = parsed.hash.replace(/^#/, '');
      const hashParams = new URLSearchParams(hashContent);
      const tokenFromHash = hashParams.get('token');
      if (tokenFromHash && tokenFromHash.trim().length > 0) {
        return tokenFromHash.trim();
      }
    }
  } catch {
    // Fallback con espressione regolare per schemi non standard o malformati
  }

  const queryMatch = url.match(/[?&#]token=([^&#]+)/i);
  if (queryMatch && queryMatch[1]) {
    try {
      const decoded = decodeURIComponent(queryMatch[1]).trim();
      if (decoded.length > 0) return decoded;
    } catch {
      return queryMatch[1].trim();
    }
  }

  return null;
};

