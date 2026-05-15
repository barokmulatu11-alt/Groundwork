const fs = require('fs');

// Fix settings.tsx
let settings = fs.readFileSync('./app/settings.tsx', 'utf8');
settings = settings.replace(/<ActionRow\s+Icon=\{User\}[\s\S]*?\/>/, 
  `<Card theme={theme}>
          <SettingRow 
            icon={User} 
            title="Account" 
            subtitle={session ? "Email, Password, Subscription" : "Sign in to sync your data"}
            theme={theme}
            onPress={() => {
              if (session) {
                router.push('/account-settings' as any);
              } else {
                router.push('/login' as any);
              }
            }}
          />
        </Card>`);
fs.writeFileSync('./app/settings.tsx', settings, 'utf8');
console.log("Updated settings");

// Fix more.tsx
let more = fs.readFileSync('./app/(tabs)/more.tsx', 'utf8');
more = more.replace(/import { TouchableOpacity } from 'react-native';/, '');
more = more.replace(/import { Linking, ScrollView, Share, StyleSheet, View } from 'react-native';/, "import { Linking, ScrollView, Share, StyleSheet, View, TouchableOpacity } from 'react-native';");
more = more.replace(/<ActionRow[\s\S]*?\/>/g, ''); // Not going to do this, wait. I will just replace ActionRow usage manually or via a better regex.

// Actually I'll just write it correctly.
more = more.replace(/<ActionRow\s+Icon=\{Download\}.*?router\.push\('\/downloads'\)\s*\}\s*\/>/, '');
more = more.replace(/<ActionRow\s+Icon=\{Award\}.*?router\.push\('\/achievements'\)\s*\}\s*\/>/, '');
more = more.replace(/<ActionRow\s+Icon=\{Share2\}.*?handleInvite\s*\}\s*\/>/, '');
more = more.replace(/<ActionRow\s+Icon=\{MessageSquare\}.*?handleFeedback\s*\}\s*\/>/, '');

fs.writeFileSync('./app/(tabs)/more.tsx', more, 'utf8');

