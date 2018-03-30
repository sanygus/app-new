const request = require('request');
const app = require('express')();
const wakeState = {};

/* принимает webhook запрос, когда включилось нужное устройство */
app.get('/waked/:id', (req, res) => {
  wakeState[req.params.id] = true;
  console.log(`waked ${req.params.id}`);
  res.end();
});

/* возвращает Promise.
Отправляет запрос на включение устройства, затем ждёт (проверяем каждую секунду) прилетел ли запрос webhook (сообщающий о включении нужного устройства).
Когда устройство проснулось, вызывает resolve.
Если не проснулось (не прилетел запрос webhook) в течении 300 сек (5 мин), вызывает reject.*/
module.exports = (id) => {
  return new Promise((resolve, reject) => {
    wakeState[id] = false;
    let TOcount = 0;
    request(`http://geoworks.pro:3000/${id}/wakeup`, (error, resp, body) => {
      if (JSON.parse(body).ok) {
        console.log('body ok');
        let tmr = setInterval(() => {
          TOcount++;
          console.log(`wait wake ${id} ${TOcount}`);
          if (TOcount > 300) {
            clearInterval(tmr);
            reject(new Error(`wakeup ${id} timeout`));
          } else if (wakeState[id]) {
            clearInterval(tmr);
            wakeState[id] = false;
            resolve();
          }
        }, 1000);
      } else {
        reject(new Error(`wakeup ${id} error`));
      }
    });
  });
}

app.listen(5001);
