const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else { 
      if (file.endsWith('.tsx')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walk(srcDir);
let changedFiles = 0;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let newContent = content;

  // Revert the whitespace-normal and break-words from td and th
  newContent = newContent.replace(/<td([^>]*className=["'])([^"']*)(["'])/g, (match, prefix, classNames, suffix) => {
    let classes = classNames.split(' ').map(c => c.trim()).filter(c => c);
    classes = classes.filter(c => c !== 'whitespace-normal' && c !== 'break-words');
    
    // To prevent horizontal scroll and vertical stretch, add truncate block and max-w-0 or similar?
    // Actually, adding whitespace-nowrap and truncate to the cell content is better, 
    // but applying it directly to td might not work unless max-w is set.
    // Let's just restore whitespace-nowrap.
    if (!classes.includes('whitespace-nowrap')) classes.push('whitespace-nowrap');
    
    return `<td${prefix}${classes.join(' ')}${suffix}`;
  });

  newContent = newContent.replace(/<th([^>]*className=["'])([^"']*)(["'])/g, (match, prefix, classNames, suffix) => {
    let classes = classNames.split(' ').map(c => c.trim()).filter(c => c);
    classes = classes.filter(c => c !== 'whitespace-normal' && c !== 'break-words');
    if (!classes.includes('whitespace-nowrap')) classes.push('whitespace-nowrap');
    return `<th${prefix}${classes.join(' ')}${suffix}`;
  });

  if (content !== newContent) {
    fs.writeFileSync(file, newContent, 'utf8');
    changedFiles++;
  }
});
console.log(`Reverted table cells in ${changedFiles} files.`);
