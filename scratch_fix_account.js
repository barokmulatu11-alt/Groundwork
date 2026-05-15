const fs = require('fs');
let settings = fs.readFileSync('./app/settings.tsx', 'utf8');
settings = settings.replace(/<ActionRow[\s\S]*?Icon=\{User\}[\s\S]*?\/>/, 
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
