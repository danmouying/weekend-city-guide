import { copyFile, mkdir, access } from 'node:fs/promises';
const files = ['index.html', 'app.js', 'core.js', 'data.js', 'styles.css', 'credits.html', 'favicon.svg', 'lake.jpg', 'gallery.jpg', 'coffee.jpg'];
await mkdir(new URL('./dist/', import.meta.url), {recursive:true});
for (const name of files) {
  const source = new URL('./' + name, import.meta.url);
  await access(source);
  await copyFile(source, new URL('./dist/' + name, import.meta.url));
}
console.log('Static site ready: dist/');
