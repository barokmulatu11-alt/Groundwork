const fs = require('fs');
const content = fs.readFileSync('./node_modules/@neondatabase/auth/dist/index.mjs', 'utf8');
const endpoints = [...content.matchAll(/["'](\/[a-zA-Z0-9_\-\/]+)["']/g)].map(m => m[1]);
console.log('Endpoints in @neondatabase/auth:');
console.log([...new Set(endpoints)].filter(e => e.startsWith('/')));

const neonAuthModule = require('@neondatabase/auth');
console.log('\nModule keys:', Object.keys(neonAuthModule));
