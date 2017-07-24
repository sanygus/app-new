const request = require('request');
const fs = require('fs');
const db = require('./db');
const log = require('./log');

const main = async () => {
  try {
    const devices = await getState();
    for (let device of devices) {
      if (device.status.event === 'sleep') {
        try {
          await wakeUp(device.iddev);
          setTimeout(() => {
            collectData(device.iddev);
          }, 300 * 1000);
        } catch (err) {
          log(err);
        }
      } else if (device.status.event === 'wakeup') {
        collectData(device.iddev);
      } else {
        log('unknown state');
      }
    }
    setTimeout(main, 3600 * 1000);
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

main();