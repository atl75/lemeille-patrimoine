export const BUDGET_DVF_MS = 90_000;

export class DvfSearchInterrupted extends Error {
  readonly reason: 'deadline' | 'client';
  constructor(reason: 'deadline' | 'client') {
    super('Recherche DVF interrompue');
    this.reason = reason;
  }
}

/** Budget partagé entre géocodage, téléchargements et contrôle des résultats. */
export async function withDvfBudget<T>(
  operation: (budget: { signal: AbortSignal; check: () => void }) => Promise<T>,
  { signal, timeoutMs = BUDGET_DVF_MS, now = () => performance.now() }: {
    signal?: AbortSignal; timeoutMs?: number; now?: () => number;
  } = {},
): Promise<T> {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) throw new Error('Budget DVF invalide');
  if (signal?.aborted) throw new DvfSearchInterrupted('client');
  const deadline = now() + timeoutMs;
  const controller = new AbortController();
  let interrupted: DvfSearchInterrupted | undefined;
  let rejectInterruption!: (error: DvfSearchInterrupted) => void;
  const interruption = new Promise<never>((_, reject) => { rejectInterruption = reject; });
  function interrupt(reason: 'deadline' | 'client') {
    if (interrupted) return;
    interrupted = new DvfSearchInterrupted(reason);
    rejectInterruption(interrupted);
    controller.abort();
  }
  const onAbort = () => interrupt('client');
  const timer = setTimeout(() => interrupt('deadline'), timeoutMs);
  signal?.addEventListener('abort', onAbort, { once: true });
  const check = () => {
    // Le parsing synchrone peut retarder le timer : ne pas publier de résultat périmé.
    if (!interrupted && now() >= deadline) interrupt('deadline');
    if (interrupted) throw interrupted;
  };
  try {
    const work = Promise.resolve().then(() => { check(); return operation({ signal: controller.signal, check }); });
    const result = await Promise.race([work, interruption]);
    check();
    return result;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onAbort);
  }
}
