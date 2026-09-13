const fs = require('fs');
const path = require('path');
const dir = 'd:/proxi_proj/nysc/project/ncys-frontend/src/pages';
const files = fs.readdirSync(dir);
files.forEach(file => {
  if (file.endsWith('.jsx')) {
    const filePath = path.join(dir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    let newContent = content.replace(/className="bg-atmosphere min-h-screen py-16 px-6"/g, 'className="bg-atmosphere min-h-screen pt-8 pb-16 px-6"');
    newContent = newContent.replace(/className="pt-24 pb-16 px-4/g, 'className="pt-12 pb-16 px-4');
    newContent = newContent.replace(/className="bg-atmosphere min-h-screen py-10 px-6"/g, 'className="bg-atmosphere min-h-screen pt-8 pb-10 px-6"'); // for Schedule.jsx
    if (content !== newContent) {
      fs.writeFileSync(filePath, newContent);
      console.log('Updated padding in', file);
    }
  }
});
