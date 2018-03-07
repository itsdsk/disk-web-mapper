var keystone = require('keystone');
const ipc = require('node-ipc');

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
		}).populate('author categories');

		q.exec(function (err, result) {
			locals.data.sketch = result;
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

	// Forward instruction to display selected sketch
	view.on('get', {
		display: 'on'
	}, function (next) {

		var sketchPath = 'file:///' + locals.data.sketch.localPath + 'index.html';
		ipc.of.dplayeripc.emit('message', sketchPath);
		req.flash('success', 'Sketch queued for display.')
		return next();
	});

	// update ipns
	view.on('get', {
		update: 'ipns'
	}, function (next) {

		var fs = require('fs');
		var path = require('path');

		var sketchPath = locals.data.sketch.localPath;
		// const sketchHash = locals.data.sketch.ipnsHash;
		// console.log(sketchHash);
		//var addr = '/ipfs/QmXb44wak42nvBeuyPXDHQSapXnKNJV9WYLDA5a5GnNP8t'

		// locals.ipfs.files.get(addr, function (err, files) {
		// 	console.log('hereyt')
		// 	if (err) {
		// 		console.log('not workng')
		// 		console.log(err)
		// 	} else {
		// 		console.log('workng')
		// 		files.forEach((file) => {
		// 			console.log(file.path);
		// 			//var filePath = sketchPath
		// 			//fs.writeFile()
		// 		});
		// 	}
		// });

		var ipnsURI = '/ipns/'+locals.data.sketch.ipnsHash;//QmZXWHxvnAPdX1PEc7dZHTSoycksUE7guLAih8z3b43UmU'
		locals.ipfs.name.resolve(ipnsURI, function(err, ipfsHash) {
			if (err) {
				console.log(err);
			} else {
				console.log('Resolved name:');
				console.log(ipfsHash);
				var ipfsURI = '/ipfs/QmXb44wak42nvBeuyPXDHQSapXnKNJV9WYLDA5a5GnNP8t'//'/ipfs/' + ipfsHash;
				locals.ipfs.files.get(ipfsURI, function (err, files) {
					if (err) {
						console.log('not workng')
						console.log(err)
					} else {
						console.log('workng')
						files.forEach((file) => {
							//console.log(file.path);
							var fileName = file.path.slice(33); // trim ipfs hash
							var filePath = sketchPath + path.dirname(fileName); // full directory
							if(!fs.existsSync(filePath)){
								fs.mkdirSync(filePath); // create directory if missing
							}
							var fileURI = sketchPath + filename;
							console.log(fileURI);
							fs.writeFile(fileURI, file.content, 'binary', (err)=>{
								if(err) console.log(err)
								else console.log('File saved')
							 });
						});
					}
				});
		
			}
		});
		req.flash('success', 'Handled.');
		return next();
	});

	// Render the view
	view.render('sketch');
};