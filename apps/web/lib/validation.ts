export const TON_ADDRESS_REGEX = /^([EU]Q[A-Za-z0-9_-]{46}|0:[a-fA-F0-9]{64})$/u;

export const isValidTonAddress = (value: string): boolean => TON_ADDRESS_REGEX.test(value.trim());

export const isPositiveDecimal = (value: string): boolean =>
  /^\d+(\.\d+)?$/.test(value) && Number(value) > 0;
