const fs = require('fs');

let more = fs.readFileSync('./app/(tabs)/more.tsx', 'utf8');
more = more.replace(/import { Linking, ScrollView, Share, StyleSheet, View } from 'react-native';/, "import { Linking, ScrollView, Share, StyleSheet, View, TouchableOpacity } from 'react-native';");
more = more.replace("separator: {", "iconBox: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },\n  separator: {");
fs.writeFileSync('./app/(tabs)/more.tsx', more, 'utf8');

let settings = fs.readFileSync('./app/settings.tsx', 'utf8');
// settings.tsx already had iconBox from the original styles! Wait, I replaced styles.create({ with styles.create({ cardStyles, but I might have overwritten it or it might have duplicate iconBox?
// Let's check if it has iconBox
if (settings.indexOf('iconBox: {') !== -1) {
    // it exists, but SettingRow uses it. Is it correct?
} else {
    settings = settings.replace("separator: {", "iconBox: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },\n  separator: {");
    fs.writeFileSync('./app/settings.tsx', settings, 'utf8');
}
