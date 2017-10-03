const request = require('request');
const fs = require('fs');
const db = require('./db');
const log = require('./log');
const wake = require('./wake');
const dashConv = require('./dashConv');
const moment = require('moment');

let lastCollectAll = null;
const lastQueryDev = {};

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
  if ((dev.charge >= 0.8) || (new Date() - lastQueryDev[dev.devid] >= 1800000)) {
    if (dev.up === null) {
      console.log('uncertain state');
    } else if (dev.up) {
      getData(dev.devid);
    } else {
      try {
        await wake(dev.devid);
        getData(dev.devid);
      } catch (err) { log(err); }
    }
    lastQueryDev[dev.devid] = new Date();
  }
}



const getState = () => {
  return new Promise((resolve, reject) => {
    request('http://geoworks.pro:3000/state', (error, resp, body) => {
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
  console.log('try get data');
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
}

const getPhoto = (deviceID) => {
  return new Promise((resolve, reject) => {
    request(`http://geoworks.pro:3000/${deviceID}/photo`, {encoding: 'binary'}, (error, resp, body) => {
      if (resp.headers['content-type'] === 'image/jpeg') {
        fs.writeFile(`${__dirname}/../app-new-web/static/photos/${deviceID}/${moment().format('YYYY-MM-DDTHH:mm:ss')}.jpg`, body, 'binary', (err) => {
          //if (err && err.code === 'ENOENT') { }
          resolve();
        });
      } else {
        reject(JSON.parse(body).error);
      }
    });
  });
}

const getSensors = (deviceID) => {
  return new Promise((resolve, reject) => {
    request(`http://geoworks.pro:3000/${deviceID}/sensors`, (error, resp, body) => {
      try {
        const respObj = JSON.parse(body);
        if (respObj.ok && respObj.sensors) {
          respObj.sensors.devid = deviceID;
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
    request(`http://geoworks.pro:3000/${devid}/nosleep`, (error, resp, body) => {
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
