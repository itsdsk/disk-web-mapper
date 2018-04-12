var keystone = require('keystone');
const ipc = require('node-ipc');
var fs = require('fs');
var path = require('path');

exports = module.exports = function (req, res) {

	var view = new keystone.View(req, res);
	var locals = res.locals;

	// Set locals
	locals.section = 'browse';
	locals.filters = {
		sketch: req.params.sketch,
	};
	locals.data = {
		sketches: [],
	};

	// Load the current sketch
	view.on('init', function (next) {

		var q = keystone.list('Sketch').model.findOne({
			state: 'published',
			slug: locals.filters.sketch,
		}).populate('author channels');

		q.exec(function (err, result) {
			locals.data.sketch = result;
			next(err);
		});

	});

	// Loads sketch screenshots
	view.on('init', function (next) {
		// 
		var sketchPath = res.locals.staticPath+locals.data.sketch.localDir;
		// make path absolute
		var resolvedPath = path.resolve(__dirname+'./../../', sketchPath);
		console.log('searching for files in: '+resolvedPath);
		var targetFiles;
		fs.readdir(resolvedPath, function(err, files){
			if(err){
				console.log('error getting files: '+err);
			}
			targetFiles = files.filter(function(file) {
				return path.extname(file).toLowerCase() === '.png';
			});
			console.log('targetfiles: '+targetFiles);
			locals.data.thumbnails = targetFiles;
			console.log('thumbs: '+locals.data.thumbnails);
			next(err);
		});
	});

	// Load other sketches
	view.on('init', function (next) {

		var q = keystone.list('Sketch').model.find().where('state', 'published').sort('-publishedDate').populate('author').limit('4');

		q.exec(function (err, results) {
			locals.data.sketches = results;
			next(err);
		});

	});

	// screenshot
	view.on('get', {
		screenshot: 'true'
	}, function (next) {
		var sys = require('sys');
		var exec = require('child_process').exec;
		var uploadPath = res.locals.staticPath+locals.data.sketch.localDir+'/screenshot_'+(Math.random().toString(36).substr(2, 6))+'.png';
		var execCommand = 'import -window root -display :0.0 '+uploadPath;
		console.log('saving screenshot to: ' + uploadPath);
		// save screenshot
		function puts(error, stdout, stderr) {
			sys.puts(stdout);
		}
		// "import -window root -display :0.0 /tmp/screen.png"
		exec(execCommand, function (err, stdout, stderr) {
			console.log(stdout);
			next(err);
		});
		// upload screenshot from file
		// locals.data.sketch._.image.upload({
		// 	path: '/tmp/screen.png'
		// }, (err) => { console.log('done done done') });

		//return next();
	});

	// // Forward instruction to display selected sketch
	// view.on('get', {
	// 	display: 'on'
	// }, function (next) {

	// 	// // if image does not exist
	// 	// if (locals.data.sketch.image.exists) {
	// 	// 	console.log('going to try ')
	// 	// 	//var fs = require('fs');
	// 	// 	var sys = require('sys')
	// 	// 	var exec = require('child_process').exec;
	// 	// 	// save screenshot
	// 	// 	function puts(error, stdout, stderr) {
	// 	// 		sys.puts(stdout)
	// 	// 	}
	// 	// 	exec("sleep 7 && import -window root -display :0.0 /tmp/screen.png", function (err, stdout, stderr) {
	// 	// 		console.log(stdout);
	// 	// 	});
	// 	// 	// upload screenshot from file
	// 	// 	locals.data.sketch._.image.upload({
	// 	// 		path: '/tmp/screen.png',
	// 	// 	}, (err) => { console.log('done done done') });
	// 	// }

	// 	var sketchPath = 'file:///' + locals.data.sketch.localPath + 'index.html';
	// 	//ipc.of.dplayeripc.emit('message', sketchPath);
	// 	req.flash('success', 'Sketch queued for display.')
	// 	return next();
	// });

	// // update ipns
	// view.on('get', {
	// 	update: 'ipns'
	// }, function (next) {

	// 	var fs = require('fs');
	// 	var path = require('path');

	// 	var sketchPath = '/data/content/view-static/' + locals.data.sketch.localDir;
	// 	var ipnsURI = '/ipns/' + locals.data.sketch.ipnsHash; //QmZXWHxvnAPdX1PEc7dZHTSoycksUE7guLAih8z3b43UmU'
	// 	locals.ipfs.name.resolve(ipnsURI, function (err, ipfsHash) {
	// 		if (err) {
	// 			console.log(err);
	// 		} else {
	// 			console.log('Resolved name:');
	// 			console.log(ipfsHash);
	// 			var ipfsURI = '/ipfs/QmXb44wak42nvBeuyPXDHQSapXnKNJV9WYLDA5a5GnNP8t' //'/ipfs/' + ipfsHash;
	// 			locals.ipfs.files.get(ipfsURI, function (err, files) {
	// 				if (err) {
	// 					//console.log('not workng')
	// 					console.log(err)
	// 				} else {
	// 					//console.log('workng')
	// 					files.forEach((file) => {
	// 						if (file.content) {

	// 							//console.log(file.path);
	// 							var fileName = file.path.slice(46); // trim ipfs hash
	// 							var fileDir = path.dirname(fileName);
	// 							//var filePath = sketchPath + fileDir; // full directory
	// 							fileDir
	// 								.split(path.sep)
	// 								.reduce((currentPath, folder) => {
	// 									currentPath += folder + path.sep;
	// 									if (!fs.existsSync(path.join(sketchPath, currentPath))) {
	// 										try {
	// 											fs.mkdirSync(path.join(sketchPath, currentPath));
	// 										} catch (fserr) {
	// 											if (fserr.code !== 'EEXIST') {
	// 												throw fserr;
	// 											}
	// 										}
	// 									}
	// 									return currentPath;
	// 								}, '');
	// 							var fileURI = sketchPath + fileName;
	// 							//console.log(fileURI);
	// 							fs.writeFile(fileURI, file.content, 'binary', (err) => {
	// 								if (err) console.log(err)
	// 								//else console.log('File saved')
	// 							});
	// 						}
	// 					});
	// 				}
	// 			});

	// 		}
	// 	});
	// 	req.flash('success', 'Handled.');
	// 	return next();
	// });

	// Render the view
	view.render('sketch');
};