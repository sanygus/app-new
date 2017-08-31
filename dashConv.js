const { spawn } = require('child_process');
const log = require('./log');
const db = require('./db');
const streamDir = "../app-new-web/static/stream";

const processes = {};
spawn('pkill', ['ffmpeg']);

module.exports.start = (devid) => {
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
		'manifest.mpd'
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
				log(`stream killed from ${devid}`); break;
			default:
				log(`conv exit with code ${code}`); break;
		}
		processes[devid] = null;
	});

	processes[devid] = p;
	db.stream(devid, new Date().toJSON());
}

module.exports.stop = (devid) => {
	if (processes[devid]) { processes[devid].kill("SIGINT"); }
}

module.exports.started = (devid) => {
	return (processes[devid] && !processes[devid].killed) ? true: false;
}
