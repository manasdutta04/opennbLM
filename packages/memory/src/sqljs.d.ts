declare module "sql.js" {
  interface SqlJsDatabase {
    exec(sql: string): void;
    prepare(sql: string): { bind(params?: unknown[] | Record<string, unknown>): void; step(): boolean; getAsObject(): Record<string, unknown>; free(): void };
    run(sql: string, params?: unknown[]): void;
    export(): Uint8Array;
    close(): void;
  }
  interface SqlJsStatic { Database: new (data?: Uint8Array) => SqlJsDatabase; }
  interface InitSqlJsOptions { locateFile?: (file: string) => string; }
  const initSqlJs: (options?: InitSqlJsOptions) => Promise<SqlJsStatic>;
  export default initSqlJs;
}
