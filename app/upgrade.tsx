import { Redirect } from 'expo-router';

export default function UpgradeScreen() {
  return <Redirect href={'/rewards' as any} />;
}
