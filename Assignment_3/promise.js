const fs = require('fs').promises;

function readFileWithPromise() {
  fs.readFile('example.txt', 'utf8')
    .then(data => {
      console.log('File contents:', data);
    })
    .catch(err => {
      console.error('Error reading file:', err);
    });
}

readFileWithPromise();
