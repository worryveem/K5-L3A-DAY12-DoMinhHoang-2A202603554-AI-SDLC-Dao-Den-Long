import { mkdir, cp, copyFile, readFile } from 'node:fs/promises';
await mkdir('dist/vendor',{recursive:true});
await cp('public','dist',{recursive:true});
await cp('src','dist/src',{recursive:true});
await copyFile('game.contract.json','dist/game.contract.json');
for(const file of ['three.module.js','three.core.js'])await copyFile(`node_modules/three/build/${file}`,`dist/vendor/${file}`);
const license=await readFile('node_modules/three/LICENSE','utf8');
await import('node:fs/promises').then(fs=>fs.writeFile('dist/vendor/THREE-LICENSE.txt',license));
console.log('Static game built in dist/');
