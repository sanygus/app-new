const request = require('request');
const fs = require('fs');
const db = require('./db');
const log = require('./log');
const dashConv = require('./dashConv');

let lastCollectAll = null;

const main = async () => {
  setTimeout(main, 300 * 1000);
  if ((new Date().getHours() >= 9) && (new Date().getHours() <= 17)) {
    if ((new Date() - lastCollectAll) > 3600 * 1000) { collectAll(); }
    getSensors('infDev3');
    getSensors('infDev2');
    getSensors('infDev4');
    log('main func if work time');
  }
}

const collectAll = async () => {
  lastCollectAll = new Date();
  log('start collectAll');
  try {
    const devices = await getState();
    for (let device of devices) {
      if (device.status.event === 'sleep') {
        try {
          await wakeUp(device.iddev);
          setTimeout(() => {
            collectData(device.iddev);
            setTimeout(() => {
              checkStream(device.iddev);
            }, 10000);
          }, 180 * 1000);
        } catch (err) {
          log(err);
        }
      } else if (device.status.event === 'wakeup') {
        collectData(device.iddev);
        setTimeout(() => {
          checkStream(device.iddev);
        }, 10000);
      } else {
        log('unknown state');
      }
    }
  } catch (err) {
    log(err);
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

const getStateDev = (devid) => {
  return new Promise((resolve, reject) => {
    request(`http://geoworks.pro:3000/${devid}/diag`, (error, resp, body) => {
      if (resp && resp.statusCode === 200) {
        resolve(JSON.parse(body));
      } else {
        reject(new Error('no valid answer'));
      }
    });
  });
}


const wakeUp = (deviceID) => {
  return new Promise((resolve, reject) => {
    request(`http://geoworks.pro:3000/${deviceID}/wakeup`, (error, resp, body) => {
      if (JSON.parse(body).ok) {
        resolve();
      } else {
        reject(new Error(`wakeup ${deviceID} error`));
      }
    });
  });
}

const getPhoto = (deviceID) => {
  return new Promise((resolve, reject) => {
    request(`http://geoworks.pro:3000/${deviceID}/photo`, {encoding: 'binary'}, (error, resp, body) => {
      if (resp.headers['content-type'] === 'image/jpeg') {
        fs.writeFile(`${__dirname}/photos/${deviceID}/${new Date().toJSON()}.jpg`, body, 'binary', (err) => {
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

const collectData = async (deviceID) => {
  try {
    sensors = await getSensors(deviceID);
    sensors.dev = deviceID;
    sensors.resDate = new Date().toJSON();
    db.addSensors(sensors);
  } catch (err) {
    log(err);
  }
  try {
    await getPhoto(deviceID);
  } catch (err) {
    log(err);
  }
}

const checkStream = async (deviceID) => {
  try {
    const { state } = await getStateDev(deviceID);
    log(`checking stream ${deviceID}`);
    if (state === "wait") {
      log(`starting stream ${deviceID}`);
      request(`http://geoworks.pro:3000/${deviceID}/stream/start`, (error, resp, body) => {
        if ((JSON.parse(body).ok) && (!dashConv.started(deviceID))) {
          dashConv.start(deviceID);
        }
      });
    } else if ((state === "streaming Video") && (!dashConv.started(deviceID))) {
      dashConv.start(deviceID);
    }
  } catch (err) {
    log(err);
  }
}

const onStart = async () => {
  const devices = await getState();
  const devidarr = [];
  for (let device of devices) {
    if (device.iddev) {
      devidarr.push(device.iddev);
    }
  }
  db.resetLive(devidarr);
  main();
}

onStart();
