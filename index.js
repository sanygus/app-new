const request = require('request');
const fs = require('fs');
const db = require('./db');
const log = require('./log');
const wake = require('./wake');
const dashConv = require('./dashConv');
const moment = require('moment');
const sharp = require('sharp');

const protocol = "https://";
const host = "geoworks.pro:3004";

let lastCollectAll = null;
const lastQueryDev = {};
const intervals = { 2: [6, 0], 3: [6, 0], 4: [0, 0] }

const main = async () => {
  try {
    const devices = await getState();
    for (let device of devices) {
      mainDev(device);
    }
  } catch (err) {
    log(err);
  }
}

const mainDev = async (dev) => {
  if (lastQueryDev[dev.devid] === undefined) { lastQueryDev[dev.devid] = null }
  const r = getRarity(dev.devid);
  if ((dev.charge >= 0.9) || ((r !== null) && (new Date() - lastQueryDev[dev.devid] >= (3600000 * r)))) {
    if (dev.up === null) {
      console.log(`${new Date().toJSON()} uncertain state ${dev.devid}`);
    } else if (dev.up) {
      getData(dev.devid);
    } else {
      try {
        await wake(dev.devid);
        getData(dev.devid);
      } catch (err) { log(err); }
    }
    if (dev.charge >= 0.8) {
      setTimeout(() => {
        console.log(`sending NOSLEEP for ${dev.devid}`);
        sendNoSleepSig(dev.devid);
      }, 240000);
    }
  }
}

const getRarity = (devid) => {
  let night = 0;
  const h = new Date().getHours();
  if ((h > 19) || (h < 7)) { night = 1; }
  return intervals[devid] && intervals[devid][night] ? intervals[devid][night] : null;
}

const getState = () => {
  return new Promise((resolve, reject) => {
    request('${protocol}${host}/state', (error, resp, body) => {
      if (resp && resp.statusCode === 200) {
        const devices = [];
        try {
          devices.push(...JSON.parse(body));
        } catch(e) {}
        resolve(devices);
      } else {
        reject(new Error('no valid answer'));
      }
    });
  });
}

const getData = async (id) => {
  console.log(`${new Date().toJSON()} try get data ${id}`);
  try {
    await getPhoto(id);
  } catch (e) {
    log(e);
  }
  try {
    db.addSensors(await getSensors(id));
  } catch (e) {
    log(e);
  }
  lastQueryDev[id] = new Date();
}

const getPhoto = (deviceID) => {
  return new Promise((resolve, reject) => {
    request(`${protocol}${host}/${deviceID}/photo`, {encoding: 'binary'}, (error, resp, body) => {
      if (error) { reject(error) }
      else if (resp.headers['content-type'] === 'image/jpeg') {
        const photoName = moment().utc().format('YYYY-MM-DDTHH:mm:ss');
        const photoPath = `${__dirname}/photos/${deviceID}/${photoName}.jpg`;
        const thumbPath = `${__dirname}/photos/${deviceID}/thumb/${photoName}.jpg`;
        fs.writeFile(photoPath, body, 'binary', (err) => {
          if (err) { reject(err) } else {
            sharp(photoPath).resize(80).toFile(thumbPath, (err) => {
              if (err) { reject(err) } else { resolve() }
            });
          }
        });
      } else {
        reject(JSON.parse(body).error);
      }
    });
  });
}

const getSensors = (deviceID) => {
  return new Promise((resolve, reject) => {
    request(`${protocol}${host}/${deviceID}/sensors`, (error, resp, body) => {
      try {
        const respObj = JSON.parse(body);
        if (respObj.ok && respObj.sensors) {
          respObj.sensors.devid = deviceID;
          if (respObj.sensors.date) {
            respObj.sensors.origDate = respObj.sensors.date;
            respObj.sensors.date = moment().utc().toJSON();
          }
          resolve(respObj.sensors);
        } else {
          reject(new Error(`sensors ${deviceID} failure`));
        }
      } catch (e) {
        reject(new Error('no valid answer'));
      }
    });
  });
}

const sendNoSleepSig = (devid) => {
  return new Promise((resolve, reject) => {
    request(`${protocol}${host}/${devid}/nosleep`, (error, resp, body) => {
      if (resp && resp.statusCode === 200) {
        resolve();
      } else {
        reject(new Error(`can't send nsoleep sig for ${devid}`));
      }
    });
  });
}

const onStart = async () => {
  main();
  setInterval(main, 300 * 1000);
}

onStart();
