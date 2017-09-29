const { MongoClient } = require('mongodb');
let db;

MongoClient.connect('mongodb://localhost:27017/exapp', function(err, dblink) {
  if (err) {
    console.error(err);
  }
  db = dblink;
});

module.exports.addSensors = (data) => {
  db.collection('sensors').insertOne(data);
}
/*
module.exports.stream = {
  date: (devid, date) => {
    db.collection('stream').updateOne(
      { devid },
      { $set: { date } },
      { upsert: true }
    )
  },
  live: (devid, live) => {
    db.collection('stream').updateOne(
      { devid },
      { $set: { live } },
      { upsert: true }
    );
  }
}

module.exports.resetLive = (devs) => {
  for (let dev of devs) {
    module.exports.stream.live(dev, false);
  }
}
*/