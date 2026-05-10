declare module '@mastra/libsql' {
  import { MastraCompositeStore } from '@mastra/core/storage';

  type LibSQLBaseConfig = {
    id: string;
    maxRetries?: number;
    initialBackoffMs?: number;
    disableInit?: boolean;
  };

  type LibSQLConfig =
    | (LibSQLBaseConfig & {
        url: string;
        authToken?: string;
      })
    | (LibSQLBaseConfig & {
        client: unknown;
      });

  export class LibSQLStore extends MastraCompositeStore {
    constructor(config: LibSQLConfig);
  }

  export { LibSQLStore as DefaultStorage };
}
