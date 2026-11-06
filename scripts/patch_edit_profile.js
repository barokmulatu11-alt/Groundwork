const fs = require('fs');

let profileCode = fs.readFileSync('app/edit-profile.tsx', 'utf8');

// Replace isOnline
const oldIsOnlineRegex = /const isOnline = async \(\): Promise<boolean> => \{[\s\S]*?return response\.ok;[\s\S]*?\};/;
const newIsOnline = `const isOnline = async (): Promise<boolean> => {
  try {
    // 1. Primary check: standard global generate_204 connectivity test
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    const ping = await fetch("https://clients3.google.com/generate_204", {
      method: "HEAD",
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (ping.status === 204 || ping.ok) {
      return true;
    }
  } catch (_) {}

  try {
    // 2. Fallback check: Neon API responds (any HTTP status > 0 proves internet connectivity)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    const apiUrl = process.env.EXPO_PUBLIC_NEON_API_URL || "https://ep-gentle-night-b4oacb89.apirest.c-6.us-east-2.aws.neon.tech/neondb/rest/v1";
    const response = await fetch(apiUrl, {
      method: "HEAD",
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response.status > 0;
  } catch (e) {
    return false;
  }
};`;

profileCode = profileCode.replace(oldIsOnlineRegex, newIsOnline);

// Replace connect_profiles direct update with upsert + non-fatal catch
const oldConnectSyncRegex = /\/\/ 4\.5\. Direct update to connect_profiles[\s\S]*?throw new Error\(`Profile sync failed: \$\{dbErr\.message\}`\);\s*\}/;
const newConnectSync = `// 4.5. Direct update to connect_profiles table (SQLite & Supabase connect)
        try {
          const now = new Date().toISOString();
          try {
            db.runSync(
              "INSERT OR REPLACE INTO connect_profiles (id, user_id, username, bio, avatar_url, institution, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
              [
                session!.user.id,
                session!.user.id,
                username.trim(),
                bio,
                finalAvatarUrl,
                institution.trim() || null,
                now,
              ],
            );
          } catch (_) {}

          await connectSupabase
            .from("connect_profiles")
            .upsert({
              user_id: session!.user.id,
              username: username.trim(),
              bio,
              avatar_url: finalAvatarUrl,
              institution: institution.trim() || null,
              updated_at: now,
            });
        } catch (dbErr: any) {
          console.warn("[EditProfile] Connect profile sync warning:", dbErr);
        }`;

profileCode = profileCode.replace(oldConnectSyncRegex, newConnectSync);

fs.writeFileSync('app/edit-profile.tsx', profileCode, 'utf8');
console.log('app/edit-profile.tsx patched successfully');
