import { computeCommitment, hashContent, randomHex } from './hashing';
import {
  deleteProof,
  getAllProofs,
  getProof,
  saveProof,
} from './store';
import { submitProofToContract } from './chain';
import type { ProofInput, ProofMetadata } from './types';

/**
 * Create a shadow proof and, when an on-chain contract is available, submit it.
 *
 * `ProofInput.contractAddress` configures the deployed contract to submit to.
 * When it is provided (with a wallet connected via {@link chain.building}),
 * the proof is submitted to the Midnight network and its status is marked
 * `submitted`; otherwise the proof is only stored locally as `generated`.
 */
export const createProof = async ({
  content,
  owner,
  category = 'general',
  contractAddress,
  api,
}: ProofInput): Promise<ProofMetadata> => {
  const contentHash = await hashContent(content);
  const salt = randomHex(32);
  const commitment = await computeCommitment(owner, contentHash, salt);
  const metadata: ProofMetadata = {
    id: crypto.randomUUID(),
    owner,
    contentHash,
    commitment,
    salt,
    createdAt: Date.now(),
    status: 'generated',
    category,
  };
  if (contractAddress && api) {
    try {
      await submitProofToContract({
        api,
        contractAddress,
        hash: contentHash,
        commitment,
        timestamp: BigInt(metadata.createdAt),
      });
      metadata.status = 'submitted';
    } catch (error) {
      const message = error instanceof Error ? error.message : 'on-chain submission failed';
      console.error(`[shadowstamp] on-chain submission failed: ${message}`);
    }
  }
  await saveProof(metadata);
  return metadata;
};

export const updateProofStatus = async (
  id: string,
  status: ProofMetadata['status'],
): Promise<void> => {
  const metadata = await getProof(id);
  if (metadata) {
    await saveProof({ ...metadata, status });
  }
};

export { deleteProof, getProof, getAllProofs };
export { verifyProof, revealProof, verifyRevealedProof } from './verify';
export type { ProofInput, ProofMetadata, ProofStatus } from './types';
export type { VerificationResult, RevealedProof } from './verify';