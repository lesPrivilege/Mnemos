/* 阴性对照 (刊例第四十三条) — copy-taboo trigger for src/lib/strings/** scope.
   Path is mirrored (lib/strings/) so the gate2 copy-taboo detector, which is
   scoped by relative path, recognizes it under --self-test the same way it
   would recognize a real src/lib/strings/*.js file. Never scanned in a
   normal run (root is scripts/collate/fixtures/, not src/). */
export const fixtureCopy = {
  headline: 'Supercharge your memory with one-click magic ✨',
}
