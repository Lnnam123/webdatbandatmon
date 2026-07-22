const fs = require('fs');

function fix(file) {
  let content = fs.readFileSync(file, 'utf8');
  let lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    // Skip lines that have showToast or are inside showToast
    if (lines[i].includes('alert(msg);') || lines[i].includes('function showToast')) continue;
    
    // Replace return alert(...) with return showToast(..., false)
    lines[i] = lines[i].replace(/return alert\((.*)\);/, (match, p1) => {
      return `return showToast(${p1}, false);`;
    });
    
    // Replace alert(...) with showToast(..., false)
    lines[i] = lines[i].replace(/alert\((.*)\);/, (match, p1) => {
      return `showToast(${p1}, false);`;
    });
  }
  fs.writeFileSync(file, lines.join('\n'));
  console.log(file + ' done');
}

fix('public/quan-ly.js');
fix('public/thu-ngan.js');
