// Keep previously saved build commands working after the collection rename.
const aliases = { aphrodite: 'flyleaf', athena: 'set-square', hermes: 'dispatch' };
for (let i = 2; i < process.argv.length; i++) {
  const arg = process.argv[i];
  if (arg === '--theme') {
    const value = process.argv[i + 1];
    if (Object.hasOwn(aliases, value)) process.argv[i + 1] = aliases[value];
  } else if (arg.startsWith('--theme=')) {
    const value = arg.slice('--theme='.length);
    if (Object.hasOwn(aliases, value)) process.argv[i] = '--theme=' + aliases[value];
  }
}
await import('../studio-exports/build.mjs');
