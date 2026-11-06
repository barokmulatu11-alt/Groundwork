declare module 'pg' {
  export class Pool {
    constructor(config?: any);
    query(text: string, params?: any[]): Promise<{ rows: any[]; rowCount: number }>;
    connect(): Promise<any>;
    end(): Promise<void>;
  }

  export class Client {
    constructor(config?: any);
    connect(): Promise<void>;
    query(text: string, params?: any[]): Promise<{ rows: any[]; rowCount: number }>;
    end(): Promise<void>;
  }
}
