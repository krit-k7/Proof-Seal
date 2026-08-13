import { CompiledContract, ProvableCircuitId } from '@midnight-ntwrk/compact-js';
import type { ConnectedAPI } from '@midnight-ntwrk/dapp-connector-api';
import { FetchZkConfigProvider } from '@midnight-ntwrk/midnight-js-fetch-zk-config-provider';
import {
  deployContract,
  getPublicStates,
  submitCallTx,
} from '@midnight-ntwrk/midnight-js-contracts';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import type {
  MidnightProviders,
  PrivateStateId,
  PrivateStateProvider,
} from '@midnight-ntwrk/midnight-js-types';
import * as ledger from '@midnight-ntwrk/ledger-v8';
import { Contract as ProofContract, ledger as proofLedger } from '../../../public/zk/contract/index.js';

type ProofCircuitId = ProvableCircuitId<ProofContract>;

export const CONTRACT_NAME = 'ShadowStampProof';

const compiledContract = CompiledContract.make(CONTRACT_NAME, ProofContract).pipe(
  CompiledContract.withVacantWitnesses,
  CompiledContract.withCompiledFileAssets('/zk'),
);

const hexToBytes = (hex: string): Uint8Array => {
  const normalized = hex.length % 2 === 0 ? hex : `0${hex}`;
  return new Uint8Array(
    (normalized.match(/.{2}/g) ?? []).map((byte) => parseInt(byte, 16)),
  );
};

const bytesToHex = (bytes: Uint8Array): string =>
  Array.from(bytes).map((byte) => byte.toString(16).padStart(2, '0')).join('');

/**
 * Minimal session-scoped private state provider.
 *
 * The ShadowStamp contract has no witnesses and no private state, so an
 * in-memory implementation satisfies the `MidnightProviders` contract while
 * keeping the browser bundle free of the `level` dependency that the
 * documented `levelPrivateStateProvider` relies on. Swap this for
 * `levelPrivateStateProvider` when persisting private state across reloads.
 */
const createPrivateStateProvider = (): PrivateStateProvider => {
  const states = new Map<string, unknown>();
  const signingKeys = new Map<string, string>();

  return {
    setContractAddress(_address: string): void {},
    async set(privateStateId: string, state: unknown): Promise<void> {
      states.set(privateStateId, state);
    },
    async get(privateStateId: string): Promise<unknown> {
      return states.get(privateStateId) ?? null;
    },
    async remove(privateStateId: string): Promise<void> {
      states.delete(privateStateId);
    },
    async clear(): Promise<void> {
      states.clear();
    },
    async setSigningKey(address: string, signingKey: string): Promise<void> {
      signingKeys.set(address, signingKey);
    },
    async getSigningKey(address: string): Promise<string | null> {
      return signingKeys.get(address) ?? null;
    },
    async removeSigningKey(address: string): Promise<void> {
      signingKeys.delete(address);
    },
    async clearSigningKeys(): Promise<void> {
      signingKeys.clear();
    },
    async exportPrivateStates() {
      return {
        format: 'midnight-private-state-export',
        encryptedPayload: '',
        salt: '',
      };
    },
    async importPrivateStates() {
      return { imported: 0, skipped: 0, overwritten: 0 };
    },
    async exportSigningKeys() {
      return {
        format: 'midnight-signing-key-export',
        encryptedPayload: '',
        salt: '',
      };
    },
    async importSigningKeys() {
      return { imported: 0, skipped: 0, overwritten: 0 };
    },
  };
};

export interface BuildProvidersOptions {
  api: ConnectedAPI;
  zkBaseUrl: string;
}

export const buildProviders = async ({
  api,
  zkBaseUrl,
}: BuildProvidersOptions): Promise<MidnightProviders<ProofCircuitId, PrivateStateId>> => {
  const config = await api.getConfiguration();
  setNetworkId(config.networkId);

  const zkConfigProvider = new FetchZkConfigProvider<ProofCircuitId>(
    zkBaseUrl,
    fetch.bind(window),
  );

  const publicDataProvider = indexerPublicDataProvider(
    config.indexerUri,
    config.indexerWsUri,
  );

  const provingProvider = await api.getProvingProvider(zkConfigProvider);
  const proofProvider: MidnightProviders['proofProvider'] = {
    proveTx: async (unprovenTx) =>
      unprovenTx.prove(provingProvider, ledger.CostModel.initialCostModel()),
  };

  const { shieldedCoinPublicKey, shieldedEncryptionPublicKey } =
    await api.getShieldedAddresses();
  const walletProvider: MidnightProviders['walletProvider'] = {
    getCoinPublicKey: () => shieldedCoinPublicKey,
    getEncryptionPublicKey: () => shieldedEncryptionPublicKey,
    balanceTx: async (tx) => {
      const serialized = tx.serialize();
      const hex = bytesToHex(serialized);
      const result = await api.balanceUnsealedTransaction(hex);
      return ledger.Transaction.deserialize(
        'signature',
        'proof',
        'binding',
        hexToBytes(result.tx),
      );
    },
  };

  const midnightProvider: MidnightProviders['midnightProvider'] = {
    submitTx: async (tx) => {
      const serialized = tx.serialize();
      await api.submitTransaction(bytesToHex(serialized));
      return tx.identifiers()[0];
    },
  };

  return {
    privateStateProvider: createPrivateStateProvider(),
    publicDataProvider,
    zkConfigProvider,
    proofProvider,
    walletProvider,
    midnightProvider,
  };
};

export const zkBaseUrl = () =>
  typeof window === 'undefined' ? '/zk' : `${window.location.origin}/zk`;

export interface SubmitProofArgs {
  api: ConnectedAPI;
  contractAddress: string;
  hash: string;
  commitment: string;
  timestamp: bigint;
}

export const submitProofToContract = async ({
  api,
  contractAddress,
  hash,
  commitment,
  timestamp,
}: SubmitProofArgs): Promise<string> => {
  const providers = await buildProviders({ api, zkBaseUrl: zkBaseUrl() });
  const result = await submitCallTx(providers, {
    compiledContract,
    contractAddress,
    circuitId: ProvableCircuitId<ProofContract>('submitProof'),
    args: [hexToBytes(hash), hexToBytes(commitment), timestamp],
  });
  return result.public.txHash;
};

export const verifyProofOnChain = async (
  api: ConnectedAPI,
  contractAddress: string,
  hash: string,
): Promise<boolean> => {
  const providers = await buildProviders({ api, zkBaseUrl: zkBaseUrl() });
  const publicStates = await getPublicStates(
    providers.publicDataProvider,
    contractAddress,
  );
  const proofLedgerView = proofLedger(publicStates.contractState.data);
  return proofLedgerView.commitmentByHash.member(hexToBytes(hash));
};

export const deployProofContract = async (api: ConnectedAPI): Promise<string> => {
  const providers = await buildProviders({ api, zkBaseUrl: zkBaseUrl() });
  const deployed = await deployContract(providers, {
    compiledContract,
  });
  return deployed.deployTxData.public.contractAddress;
};

const CONTRACT_ADDRESS_KEY = 'shadowstamp:contractAddress';

export const getStoredContractAddress = (): string | null => {
  if (typeof localStorage === 'undefined') {
    return null;
  }
  return localStorage.getItem(CONTRACT_ADDRESS_KEY);
};

export const storeContractAddress = (address: string): void => {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(CONTRACT_ADDRESS_KEY, address);
  }
};

/**
 * Resolve the deployed ShadowStamp contract address for a connected wallet,
 * deploying a fresh instance on first use and caching the address locally.
 */
export const getOrDeployContract = async (api: ConnectedAPI): Promise<string> => {
  const stored = getStoredContractAddress();
  if (stored) {
    return stored;
  }
  const address = await deployProofContract(api);
  storeContractAddress(address);
  return address;
};