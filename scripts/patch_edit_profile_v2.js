const fs = require('fs');
const filePath = 'c:/Barok/Projects/Groundwork/app/edit-profile.tsx';
let content = fs.readFileSync(filePath, 'utf8');

const startMarker = '// 3. Update auth.users metadata';
const endMarker = '    } catch (e: any) {\r\n      console.error("[EditProfile] Save error:", e);';
const endMarkerAlt = '    } catch (e: any) {\n      console.error("[EditProfile] Save error:", e);';

const startIndex = content.indexOf(startMarker);
let endIndex = content.indexOf(endMarker);
if (endIndex === -1) endIndex = content.indexOf(endMarkerAlt);

if (startIndex === -1 || endIndex === -1) {
  console.error('Marker not found', { startIndex, endIndex });
  process.exit(1);
}

const replacement = `const updatedProfileObj = {
        ...(profile || {}),
        full_name: name,
        username: username.trim(),
        bio: bio,
        avatar_url: finalAvatarUrl,
        updated_at: new Date().toISOString(),
      };

      // 3. Local-first: Update Zustand store immediately for instant UI refresh
      useAuthStore.setState({
        profile: updatedProfileObj as any,
      });

      // 3.1. Save to local SQLite
      try {
        const now = new Date().toISOString();
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
      } catch (dbErr: any) {
        console.warn("[EditProfile] Local SQLite profile update warning:", dbErr);
      }

      // 3.2. Save to local cache
      await AsyncStorage.setItem(
        \`profile_\${session.user.id}\`,
        JSON.stringify(updatedProfileObj),
      );

      // 4. Update auth metadata & Neon Cloud in background / online
      try {
        await supabase.auth.updateUser({
          email: email !== session?.user?.email ? email : undefined,
          data: {
            full_name: name,
            username: username.trim(),
            bio: bio,
            avatar_url: finalAvatarUrl,
          },
        });
      } catch (authErr: any) {
        console.warn("[EditProfile] Auth updateUser warning:", authErr?.message);
      }

      // 4.1. Push to profiles table in Neon PostgREST
      try {
        const { error: profileError } = await supabase
          .from("profiles")
          .update({
            full_name: name,
            username: username.trim(),
            bio: bio,
            avatar_url: finalAvatarUrl,
            updated_at: new Date().toISOString(),
          })
          .eq("id", session!.user.id);

        if (profileError) {
          console.warn("[EditProfile] Cloud profile sync warning:", profileError.message);
        }
      } catch (cloudErr: any) {
        console.warn("[EditProfile] Cloud profile sync exception:", cloudErr);
      }

      // 4.2. Push to connect_profiles in Neon Cloud
      try {
        const now = new Date().toISOString();
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
      } catch (connectErr: any) {
        console.warn("[EditProfile] Connect cloud profile sync warning:", connectErr);
      }

      // 5. Refresh session if possible
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData?.session) {
          setSession(sessionData.session);
        }
      } catch (_) {}

      showAlert({
        title: "Profile Updated",
        message: "Your changes have been saved.",
        primaryButton: {
          text: "Done",
          onPress: () => router.back(),
        },
      });
  `;

const newContent = content.slice(0, startIndex) + replacement + content.slice(endIndex);
fs.writeFileSync(filePath, newContent, 'utf8');
console.log('Successfully patched app/edit-profile.tsx');
