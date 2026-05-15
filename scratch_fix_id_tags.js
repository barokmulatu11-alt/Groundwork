const fs = require('fs');
const filePath = 'c:\\Users\\HP\\Desktop\\Groundwork\\app\\notes\\[id].tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Find the last RichEditor
const lastRichEditor = content.lastIndexOf('/>');
const customAlert = content.indexOf('<CustomAlert');

if (lastRichEditor !== -1 && customAlert !== -1) {
    const part1 = content.substring(0, lastRichEditor + 2);
    const part2 = content.substring(customAlert);
    const newContent = part1 + '\n            </View>\n          </ScrollView>\n        </View>\n      </KeyboardAvoidingView>\n      ' + part2;
    fs.writeFileSync(filePath, newContent);
    console.log('Fixed closing tags in [id].tsx');
} else {
    console.log('Could not find markers');
}
