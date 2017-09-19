const request = require('request');
const fs = require('fs');
const db = require('./db');
const log = require('./log');
const wake = require('./wake');
const dashConv = require('./dashConv');
const moment = require('moment');

let lastCollectAll = null;

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
  if (dev.up === null) {
    console.log('uncertain state');
  } else if (dev.up) {
    getData(dev.devid);
  } else {
    console.log('try wake');
    try {
      await wake(dev.devid);
      getData(dev.devid);
    } catch (err) {
      log(err);
    }
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
        fs.writeFile(`${__dirname}/../app-new-web/static/photos/${deviceID}/${moment().format('YYYY-MM-DD-HH-mm-ss')}.jpg`, body, 'binary', (err) => {
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

/*const collectData = async (deviceID) => {
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
}*/

const onStart = async () => {
  /*const devices = await getState();
  const devidarr = [];
  for (let device of devices) {
    if (device.iddev) {
      devidarr.push(device.iddev);
    }
  }
  db.resetLive(devidarr);*/
  main();
  setInterval(main, 3600 * 1000);
}

onStart();
