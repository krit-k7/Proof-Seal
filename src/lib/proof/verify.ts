import { computeCommitment, hashContent } from './hashing';
import { getAllProofs, getProof, saveProof } from './store';
import type { ProofMetadata } from './types';

export interface VerificationResult {
  valid: boolean;
  contentHash: string;
  proofs: ProofMetadata[];
}

export const verifyProof = async ({
  content,
  owner,
}: {
  content: string | File;
  owner?: string;
}): Promise<VerificationResult> => {
  const contentHash = await hashContent(content);
  const matches = (await getAllProofs()).filter(
    (proof) => proof.contentHash === contentHash,
  );
  if (!owner) {
    return { valid: matches.length > 0, contentHash, proofs: [] };
  }
  const owned = matches.filter((proof) => proof.owner === owner);
  return { valid: owned.length > 0, contentHash, proofs: owned };
};

export interface RevealedProof {
  id: string;
  owner: string;
  contentHash: string;
  salt: string;
  commitment: string;
  revealedAt: number;
}

export const revealProof = async (
  id: string,
  owner: string,
): Promise<RevealedProof> => {
  const metadata = await getProof(id);
  if (!metadata) {
    throw new Error('Proof not found');
  }
  if (metadata.owner !== owner) {
    throw new Error('Not authorized to reveal this proof');
  }
  const revealedAt = Date.now();
  await saveProof({ ...metadata, revealedAt });
  return {
    id: metadata.id,
    owner: metadata.owner,
    contentHash: metadata.contentHash,
    salt: metadata.salt,
    commitment: metadata.commitment,
    revealedAt,
  };
};

export const verifyRevealedProof = async (params: {
  commitment: string;
  owner: string;
  contentHash: string;
  salt: string;
}): Promise<boolean> => {
  const expected = await computeCommitment(
    params.owner,
    params.contentHash,
    params.salt,
  );
  return expected === params.commitment;
};