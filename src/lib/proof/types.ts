export type ProofStatus = 'generated' | 'submitted' | 'confirmed';

export interface ProofInput {
  content: string | File;
  owner: string;
  category?: string;
  contractAddress?: string;
  api?: import('@midnight-ntwrk/dapp-connector-api').ConnectedAPI;
}

export interface ProofMetadata {
  id: string;
  owner: string;
  contentHash: string;
  commitment: string;
  salt: string;
  createdAt: number;
  status: ProofStatus;
  category: string;
  revealedAt?: number | null;
}