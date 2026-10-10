// Writer helper: node tools/wf.cjs <dest-relative-or-abs> < content
// Writes stdin to a file under the project root as UTF-8 (no BOM), creating dirs.
const fs = require("fs");
const path = require("path");
const root = "C:/wamp64/www/nexusbusinessmanager";
const target = path.isAbsolute(process.argv[2]) ? process.argv[2] : path.join(root, process.argv[2]);
fs.mkdirSync(path.dirname(target), { recursive: true });
const data = Buffer.from(fs.readFileSync(0));
if (data.length >= 3 && data[0] === 0xef && data[1] === 0xbb && data[2] === 0xbf) {
  fs.writeFileSync(target, data.subarray(3)); // strip BOM defensively
} else {
  fs.writeFileSync(target, data);
}
console.log("wrote", target, data.length, "bytes");
