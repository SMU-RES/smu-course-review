/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_STATIC_MODE?: string
  readonly VITE_DYNAMIC_SITE_URL?: string
  readonly VITE_STATIC_SITE_URL?: string
}

declare const __BUILD_TIME__: string

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

declare module 'sql.js' {
  export interface Database {
    prepare(sql: string): Statement
    run(sql: string, params?: unknown[]): Database
    close(): void
  }

  export interface Statement {
    bind(params?: (string | number | null | Uint8Array)[]): boolean
    step(): boolean
    getAsObject(): Record<string, unknown>
    free(): void
  }

  export interface SqlJsStatic {
    Database: new (data?: ArrayLike<number>) => Database
  }

  export interface InitSqlJsOptions {
    locateFile?: (file: string) => string
    wasmBinary?: ArrayBuffer
  }

  export default function initSqlJs(options?: InitSqlJsOptions): Promise<SqlJsStatic>
}
