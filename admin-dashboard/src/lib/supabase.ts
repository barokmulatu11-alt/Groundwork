/**
 * Neon Client Adapter for Admin Dashboard
 *
 * Provides a drop-in replacement for the legacy Supabase client,
 * routing all queries directly to Neon Database and Neon Auth.
 */

export type AdminRole = 'user' | 'moderator' | 'admin' | 'owner';

export interface User {
  id: string;
  email?: string;
  user_metadata?: Record<string, any>;
  [key: string]: any;
}

export interface Session {
  token?: string;
  access_token?: string;
  user?: User;
  [key: string]: any;
}

export interface Profile {
  id: string;
  username: string | null;
  full_name: string | null;
  email: string | null;
  provider: string | null;
  avatar_url: string | null;
  role: AdminRole;
  pro_status: boolean;
  pro_until: string | null;
  is_banned?: boolean;
  created_at: string;
  updated_at: string;
}

export interface FeatureFlag {
  id: string;
  name: string;
  description: string | null;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface Announcement {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'maintenance';
  is_active: boolean;
  created_at: string;
  expires_at: string | null;
}

export interface Report {
  id: string;
  user_id: string | null;
  type: 'bug' | 'suggestion' | 'problem';
  title: string;
  description: string;
  status: 'pending' | 'resolved' | 'dismissed';
  created_at: string;
}

export interface RemoteConfig {
  key: string;
  value: any;
  description: string | null;
  updated_at: string;
}

export interface EmailTemplate {
  id: string;
  slug: string;
  name: string;
  category: string;
  description: string;
  subject: string;
  variables: string[];
  is_default: boolean;
  created_at: string;
  updated_at: string;
  body_text?: string;
  body_html?: string;
}

export interface EmailLog {
  id: string;
  template_id?: string;
  template_name: string;
  recipient: string;
  subject: string;
  status: 'sent' | 'failed';
  error?: string;
  sent_at: string;
  message_id?: string;
}

export interface QueryResult<T> {
  data: T | null;
  error: any;
  count?: number | null;
}

class QueryBuilder<T = any> implements PromiseLike<QueryResult<T>> {
  private _table: string;
  private _action: 'select' | 'insert' | 'update' | 'delete' = 'select';
  private _selectCols: string = '*';
  private _match: Record<string, any> = {};
  private _updateData: Record<string, any> | null = null;
  private _insertData: any = null;
  private _orderCol: string | null = null;
  private _orderAsc: boolean = true;
  private _limitCount: number | null = null;
  private _isSingle: boolean = false;
  private _isMaybeSingle: boolean = false;
  private _countOption: string | null = null;

  constructor(table: string) {
    this._table = table;
  }

  select(columns: string = '*', options?: { count?: 'exact' | 'planned' | 'estimated'; head?: boolean }) {
    this._action = 'select';
    this._selectCols = columns;
    if (options?.count) {
      this._countOption = options.count;
    }
    return this;
  }

  insert(data: any) {
    this._action = 'insert';
    this._insertData = data;
    return this;
  }

  upsert(data: any, _options?: any) {
    this._action = 'insert';
    this._insertData = data;
    return this;
  }

  update(data: any) {
    this._action = 'update';
    this._updateData = data;
    return this;
  }

  delete() {
    this._action = 'delete';
    return this;
  }

  eq(column: string, value: any) {
    this._match[column] = value;
    return this;
  }

  is(column: string, value: any) {
    this._match[column] = value === null ? 'null' : value;
    return this;
  }

  or(_expr: string) {
    return this;
  }

  order(column: string, options?: { ascending?: boolean }) {
    this._orderCol = column;
    this._orderAsc = options?.ascending ?? true;
    return this;
  }

  limit(count: number) {
    this._limitCount = count;
    return this;
  }

  single() {
    this._isSingle = true;
    return this;
  }

  maybeSingle() {
    this._isMaybeSingle = true;
    return this;
  }

  async execute(): Promise<QueryResult<any>> {
    try {
      if (this._action === 'select') {
        const params = new URLSearchParams({
          table: this._table,
          select: this._selectCols,
        });

        if (this._orderCol) {
          params.set('order', `${this._orderCol}.${this._orderAsc ? 'asc' : 'desc'}`);
        }
        if (this._limitCount) {
          params.set('limit', String(this._limitCount));
        }
        Object.entries(this._match).forEach(([k, v]) => {
          params.set(k, String(v));
        });

        const res = await fetch(`/api/admin/db?${params.toString()}`);
        const json = await res.json();
        if (json.error) return { data: null, error: json.error, count: 0 };

        const rows = json.data || [];
        const count = rows.length;

        if (this._isSingle) {
          if (rows.length === 0) return { data: null, error: { message: 'Row not found' }, count: 0 };
          return { data: rows[0], error: null, count: 1 };
        }
        if (this._isMaybeSingle) {
          return { data: rows[0] || null, error: null, count: rows.length > 0 ? 1 : 0 };
        }
        return { data: rows, error: null, count };
      }

      if (this._action === 'update') {
        const res = await fetch('/api/admin/db', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            table: this._table,
            data: this._updateData,
            match: this._match,
          }),
        });
        const json = await res.json();
        return { data: json.data, error: json.error };
      }

      if (this._action === 'insert') {
        const res = await fetch('/api/admin/db', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            table: this._table,
            data: this._insertData,
          }),
        });
        const json = await res.json();
        return { data: json.data, error: json.error };
      }

      if (this._action === 'delete') {
        const res = await fetch('/api/admin/db', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            table: this._table,
            match: this._match,
          }),
        });
        const json = await res.json();
        return { data: json.data, error: json.error };
      }

      return { data: null, error: null };
    } catch (e: any) {
      return { data: null, error: { message: e.message || 'Network error' } };
    }
  }

  then<TResult1 = QueryResult<T>, TResult2 = never>(
    onfulfilled?: ((value: QueryResult<T>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return this.execute().then(onfulfilled as any, onrejected);
  }
}

export const supabase = {
  from: (table: string) => new QueryBuilder(table),

  auth: {
    signInWithPassword: async (credentials: { email: string; password: string }) => {
      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(credentials),
        });
        const json = await res.json();
        if (!res.ok || json.error) {
          return { data: { session: null, user: null }, error: { message: json.error } };
        }
        return { data: { session: json.session, user: json.user }, error: null };
      } catch (err: any) {
        return { data: { session: null, user: null }, error: { message: err.message } };
      }
    },

    getSession: async () => {
      try {
        const res = await fetch('/api/auth/session');
        const json = await res.json();
        return { data: { session: json.session }, error: null };
      } catch (err: any) {
        return { data: { session: null }, error: err };
      }
    },

    getUser: async () => {
      try {
        const res = await fetch('/api/auth/session');
        const json = await res.json();
        return { data: { user: json.user }, error: null };
      } catch (err: any) {
        return { data: { user: null }, error: err };
      }
    },

    signOut: async () => {
      try {
        await fetch('/api/auth/session', { method: 'DELETE' });
      } catch {}
      return { error: null };
    },

    onAuthStateChange: (_callback: (event: string, session: any) => void) => {
      return {
        data: {
          subscription: {
            unsubscribe: () => {},
          },
        },
      };
    },
  },
};
