import { ERROR_CODES } from 'src/common/constants/error.codes';

type DeepValue<T> = T extends object
  ? { [K in keyof T]: DeepValue<T[K]> }[keyof T]
  : T;

export type ApplicationErrorCode = DeepValue<typeof ERROR_CODES>;
