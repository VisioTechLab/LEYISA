/**
 * Limitation des tentatives de connexion (US-001), en mémoire.
 * La clé combine l'adresse et l'identifiant : un tiers ne peut pas bloquer le
 * compte d'un collègue depuis une autre machine. Le blocage est temporaire.
 * Stockage en mémoire : suffisant pour une seule instance de démonstration ;
 * le choix définitif (mémoire ou base) reste à décider avec Joel.
 */
interface Entry {
  failures: number;
  blockedUntil: number;
  lastFailureAt: number;
}

export class LoginThrottle {
  private readonly entries = new Map<string, Entry>();
  private readonly maxFailures: number;
  private readonly lockoutMs: number;
  private readonly now: () => number;

  constructor(maxFailures: number, lockoutMinutes: number, now: () => number = Date.now) {
    this.maxFailures = maxFailures;
    this.lockoutMs = lockoutMinutes * 60_000;
    this.now = now;
  }

  static key(ip: string, login: string): string {
    return `${ip}|${login.toLowerCase()}`;
  }

  /** Nombre de secondes d'attente restantes, ou 0 si la tentative est permise. */
  retryAfterSeconds(key: string): number {
    const entry = this.entries.get(key);
    if (!entry) return 0;
    const remaining = entry.blockedUntil - this.now();
    return remaining > 0 ? Math.ceil(remaining / 1000) : 0;
  }

  recordFailure(key: string): void {
    const current = this.now();
    const entry = this.entries.get(key);
    // Les échecs anciens (plus vieux qu'une période de blocage) sont oubliés.
    const fresh = !entry || current - entry.lastFailureAt > this.lockoutMs;
    const failures = fresh ? 1 : entry.failures + 1;
    const blockedUntil = failures >= this.maxFailures ? current + this.lockoutMs : 0;
    this.entries.set(key, { failures: blockedUntil ? 0 : failures, blockedUntil, lastFailureAt: current });
    this.prune(current);
  }

  recordSuccess(key: string): void {
    this.entries.delete(key);
  }

  private prune(current: number): void {
    if (this.entries.size < 10_000) return;
    for (const [key, entry] of this.entries) {
      if (entry.blockedUntil < current && current - entry.lastFailureAt > this.lockoutMs) {
        this.entries.delete(key);
      }
    }
  }
}
