const fs = require('fs');
const path = require('path');

function getAllSubdirs(dir) {
  let subdirs = [];
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const fullPath = path.join(dir, entry.name);
        subdirs.push(fullPath);
        subdirs = subdirs.concat(getAllSubdirs(fullPath));
      }
    }
  } catch {
    // ignore
  }
  return subdirs;
}

const appDir = path.join(process.cwd(), 'src', 'app');
const appSubdirs = getAllSubdirs(appDir);
const relPaths = appSubdirs.map((p) => path.relative(appDir, p));
relPaths.push('');

const prefixes = [
  path.join('.next', 'server', 'app'),
  path.join('.next', 'static', 'chunks', 'app'),
  path.join('.next', 'types', 'app'),
];

for (const prefix of prefixes) {
  for (const rel of relPaths) {
    const targetDir = path.join(process.cwd(), prefix, rel);
    try {
      fs.mkdirSync(targetDir, { recursive: true });
    } catch {
      // ignore
    }
  }
}
