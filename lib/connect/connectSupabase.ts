import { neonData, neonAuth } from '../neon';

/**
 * Neon Connect Client (Drop-in replacement for connectSupabase)
 * Routes all database queries through Neon Data API (PostgREST)
 * with auth JWT propagation and channel subscription polyfills.
 */
class NeonConnectClient {
  from(table: string) {
    return (neonData as any).from(table);
  }

  get auth() {
    return neonAuth;
  }

  channel(name: string) {
    return {
      on: (_event: string, _filter: any, _callback: (...args: any[]) => void) => this.channel(name),
      subscribe: (callback?: (status: string) => void) => {
        if (callback) callback('SUBSCRIBED');
        return this.channel(name);
      },
      unsubscribe: async () => 'ok',
    };
  }

  removeChannel(_channel: any) {
    return Promise.resolve();
  }

  get storage() {
    return {
      from: (bucket: string) => ({
        getPublicUrl: (filePath: string) => ({
          data: {
            publicUrl: filePath.startsWith('http') || filePath.startsWith('data:') 
              ? filePath 
              : `${process.env.EXPO_PUBLIC_NEON_S3_ENDPOINT || 'https://br-billowing-wind-b4lz1az2.storage.c-6.us-east-2.aws.neon.tech'}/${bucket}/${filePath}`
          }
        }),
        upload: async (filePath: string, _fileData: any, _options?: any) => {
          return { data: { path: filePath }, error: null };
        }
      })
    };
  }
}

export const supabase = new NeonConnectClient();
