const { spawn } = require('child_process');
const log = require('./log');
const streamDir = "../app-new-web/static/stream";

const processes = {};

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
	});
	p.on('close', (code/*, signal*/) => {
	  if (code !== 0) {//no stream or kill
	  	log(`close with code: ${code}`);
	  }//else {} //stream end
	});
	processes[devid] = p;
}

module.exports.stop = (devid) => {
	processes[devid].kill();
}

module.exports.started = (devid) => {//killется ли после системного кила
	return (processes[devid] && !processes[devid].killed) ? true: false;
}
