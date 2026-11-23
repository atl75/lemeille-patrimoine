/** État local uniquement : les protections contractuelles restent côté serveur. */
export class EditionMandat {
  private versions = new Map<string, number>();
  private saved = new Map<string, number>();
  private pending = new Set<string>();
  modifier(id: string) { this.versions.set(id, this.version(id) + 1); }
  version(id: string) { return this.versions.get(id) || 0; }
  nonEnregistre(id: string) { return this.version(id) !== (this.saved.get(id) || 0); }
  confirmer(id: string, version: number) {
    this.saved.set(id, version);
    return !this.nonEnregistre(id);
  }
  commencer(id: string) {
    if (this.pending.has(id)) return false;
    this.pending.add(id); return true;
  }
  terminer(id: string) { this.pending.delete(id); }
  enCours(id: string) { return this.pending.has(id); }
}

export function mandatFige(m: {
  mandateSignStatus?: string;
  mandateSignature?: { dataUrl?: string; signedAt?: string };
  signers?: { dataUrl?: string; signedAt?: string }[];
}) {
  return m.mandateSignStatus === 'SIGNED' || Boolean(m.mandateSignature?.dataUrl || m.mandateSignature?.signedAt)
    || Boolean(m.signers?.some(s => s.dataUrl || s.signedAt));
}
