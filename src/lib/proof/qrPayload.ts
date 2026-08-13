import type { ProofMetadata } from './types';

export interface ProofPayload {
  id: string;
  owner: string;
  contentHash: string;
  commitment: string;
  category: string;
  createdAt: number;
  status: string;
}

const REQUIRED_KEYS: Array<keyof ProofPayload> = [
  'id',
  'owner',
  'contentHash',
  'commitment',
  'category',
  'createdAt',
  'status',
];

export const toProofPayload = (metadata: ProofMetadata): ProofPayload => ({
  id: metadata.id,
  owner: metadata.owner,
  contentHash: metadata.contentHash,
  commitment: metadata.commitment,
  category: metadata.category,
  createdAt: metadata.createdAt,
  status: metadata.status,
});

export const encodeProof = (metadata: ProofMetadata): string =>
  JSON.stringify(toProofPayload(metadata));

export const decodeProof = (encoded: string): ProofPayload => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(encoded);
  } catch {
    throw new Error('Invalid proof payload');
  }
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Invalid proof payload');
  }
  for (const key of REQUIRED_KEYS) {
    const value = (parsed as Record<string, unknown>)[key];
    if (typeof value !== (key === 'createdAt' ? 'number' : 'string')) {
      throw new Error('Invalid proof payload');
    }
  }
  return parsed as ProofPayload;
};