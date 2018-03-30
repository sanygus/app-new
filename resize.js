/* делает превью всем изображениям в определённой директории.
Использовалось, когда нужно было сделать превью уже имеющимся фоткам. */
const fs = require('fs');
const sharp = require('sharp');
const dir = '../app-new-web/static/photos/4/';

const resizePhoto = (file) => {
  return new Promise((resolve, reject) => {
    sharp(dir + file).resize(80).toFile(dir + `thumb/` + file, (err) => {
      if (err) { reject(err) } else { resolve() }
    });
  })
}

const main = () => {
  fs.readdir(dir, (err, filesarr) => {
    if (filesarr) { filesarr = filesarr.sort().filter(f => f.indexOf('.jpg') > 0) }
    (async () => {
      for (let file of filesarr) {
        try {
          await resizePhoto(file);
          console.log('ok ' + file);
        } catch (e) { console.log('NOT ' + file) }
      }
    })()
  });
}

main();
