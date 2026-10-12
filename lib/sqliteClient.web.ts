// Web platform shim for SQLite.
// On web, Groundwork uses localStorage-backed createWebDb() in lib/db.ts.
// Directly importing expo-sqlite on web causes Metro to bundle wa-sqlite.js (a massive Emscripten binary),
// which crashes jest-worker with SIGTERM / OOM on Windows.

export type SQLiteDatabase = any;

const SQLiteShim = {
  openDatabaseSync: () => {
    throw new Error('expo-sqlite is not supported or used on web. createWebDb() is used instead.');
  },
};

export default SQLiteShim;

