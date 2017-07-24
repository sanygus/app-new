const fs = require('fs');

module.exports = (obj) => {
  if (obj) {
    const prefix = (new Date()).toJSON() + '    ';
    let out = '';
    if (typeof obj === 'string') {
      out = obj.slice();
    } else if (typeof obj === 'object') {
      if (obj instanceof Error) {
        out = 'Error: ' + obj.message;
      } else {
        out = JSON.stringify(obj);
      }
    }
    fs.appendFile("log.log", prefix + out + '\n', (err) => {
      if (err) { console.log(err); }
    });
  }
}
