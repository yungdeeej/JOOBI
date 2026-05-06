import './setup.js';
import { describe, it, expect } from 'vitest';
import {
  ACTIVE_TIMELINE,
  SWAP_STATES,
  SOURCE_TOKENS,
  DESTINATION_TOKENS,
  TERMINAL_STATES,
} from '@joobi/shared';

describe('shared types', () => {
  it('includes COMPLETED in active timeline and as terminal', () => {
    expect(ACTIVE_TIMELINE).toContain('COMPLETED');
    expect(TERMINAL_STATES.has('COMPLETED')).toBe(true);
  });

  it('matches SWAP_STATES count expected by spec', () => {
    expect(SWAP_STATES.length).toBe(15);
  });

  it('source/destination tokens align with spec', () => {
    expect(SOURCE_TOKENS).toEqual(['SOL', 'USDC_SOL', 'USDT_SOL']);
    expect(DESTINATION_TOKENS).toEqual(['TON', 'JOOBI']);
  });
});
