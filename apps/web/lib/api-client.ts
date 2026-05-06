import type {
  CreateSwapResponse,
  QuoteResponse,
  SwapStatusResponse,
} from '@joobi/shared';

const baseUrl = '/api/proxy';

const handle = async <T>(res: Response): Promise<T> => {
  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(body.message ?? 'Request failed');
  }
  return res.json() as Promise<T>;
};

export const apiClient = {
  async getQuote(params: {
    sourceToken: string;
    sourceAmount: string;
    destinationToken: string;
  }) {
    const res = await fetch(`${baseUrl}/quotes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    return handle<QuoteResponse>(res);
  },
  async createSwap(params: {
    sourceToken: string;
    sourceAmount: string;
    destinationToken: string;
    destinationAddress: string;
    slippageBps: number;
    clientRequestId?: string;
  }) {
    const res = await fetch(`${baseUrl}/swaps`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    return handle<CreateSwapResponse>(res);
  },
  async getSwap(publicId: string) {
    const res = await fetch(`${baseUrl}/swaps/${publicId}`);
    return handle<SwapStatusResponse>(res);
  },
};
