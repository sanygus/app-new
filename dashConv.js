const { spawn } = require('child_process');
const log = require('./log');
const db = require('./db');
const streamDir = "../app-new-web/static/stream";

const processes = {};
spawn('pkill', ['ffmpeg']);

const start = (devid) => {
	const p = spawn('ffmpeg', [
		'-i',
		'rtsp://172.30.0.3' + devid.substring(6) + ':8554/unicast',
		'-f',
		'segment',
		'-map',
		'0:0',
		'-vcodec',
		'copy',
		'-reset_timestamps',
		'1',
		'-f',
		'dash',
		'manifest.mpd',
		'-strftime',
		'1',
		'-vf',
		'fps=1/600',
		`../../photos/${devid}/%F-%H-%M-%S.png`,
	], {
		cwd: `${streamDir}/${devid}`
	});
	/*p.stdout.on('data', (data) => {
	  console.log(`stdout: ${data}`);
	});
	p.stderr.on('data', (data) => {
	  console.log(`stderr: ${data}`);
	});*/
	p.on('error', (err) => {
	  log(`Failed to start subprocess ${err}`);//log
	  processes[devid] = null;
	});

	p.on('exit', (code/*, signal*/) => {
		switch(code) {
			case 0:
				log(`stream stopped on ${devid}`); break;
			case 1:
				log(`stream not exist on ${devid}`); break;
			case 255:
				log(`stream from ${devid} killed`); break;
			default:
				log(`conv exit with code ${code}`); break;
		}
		processes[devid] = null;
		db.stream.live(devid, false);
	});

	processes[devid] = p;
	db.stream.date(devid, new Date().toJSON());
	db.stream.live(devid, true);
}

const stop = (devid) => {
	if (processes[devid]) { processes[devid].kill("SIGINT"); }
}

const started = (devid) => {
	return (processes[devid] && !processes[devid].killed) ? true: false;
}

const restart = (devid) => {
	if (started(devid)) {
		stop(devid);
		setTimeout(() => {
			start(devid);
		}, 1000);
	}
}

setInterval(() => {
	for (let dev in processes) {
		restart(dev);
	}
}, 1800 * 1000);//1/2 hours

module.exports = { start, stop, started };
