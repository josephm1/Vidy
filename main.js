(async function() {
	try {
		$('#fileuploadmodal').modal({
			dismissible: false
		});

		$('#upload').click(function() {
			checkForms();
		});

		$('#cancel').click(function() {
			$('#fileuploadmodal').modal('close');
		});

		$('#refresh').click(function() {
			getMutableDataHandle('getVideoCards');
		});

		const app = {
			name: 'Vidy',
			id: 'joe',
			version: '1',
			vendor: 'vidy.joe'
		};

		let appHandle = await window.safeApp.initialise(app);
		auth = await window.safeApp.connect(appHandle);

		Materialize.toast(' App Token: ' + auth, 3000, 'rounded');
		authorised = false;
		getVideoCards();
	} catch (err) {
		console.log(err);
	}
})();

async function getVideoCards() {
	try {
		let vidyHash = await window.safeCrypto.sha3Hash(auth, 'vidy');
		let vidyHandle = await window.safeMutableData.newPublic(auth, vidyHash, 54321);
		let entriesHandle = await window.safeMutableData.getEntries(vidyHandle);

		videoCards.innerHTML = '';
		mainLoading.innerHTML =
			'<div class="preloader-wrapper big active"><div class="spinner-layer spinner-yellow-only"><div class="circle-clipper left"><div class="circle"></div></div><div class="gap-patch"><div class="circle"></div></div><div class="circle-clipper right"><div class="circle"></div></div></div></div>';
		let time = new Date().getTime();
		let videoMaps = [];

		function checkVideos(item) {
			if (item == this) {
				return false;
			} else {
				return true;
			}
		}

		await window.safeMutableDataEntries
			.forEach(entriesHandle, (key, value) => {
				if (
					parseInt(uintToString(key)) < time &&
					parseInt(uintToString(key)).toString().length === 13 &&
					uintToString(key).length === 13
				) {
					let videoCardItems = JSON.parse(uintToString(value.buf));
					let videoMdName = videoCardItems.videoMDHandle.data;

					let title = videoCardItems.title
						.replace(/&/g, '&amp;')
						.replace(/</g, '&lt;')
						.replace(/>/g, '&gt;')
						.replace(/"/g, '&quot;')
						.replace(/'/g, '&#039;');

					let description = videoCardItems.description
						.replace(/&/g, '&amp;')
						.replace(/</g, '&lt;')
						.replace(/>/g, '&gt;')
						.replace(/"/g, '&quot;')
						.replace(/'/g, '&#039;');

					let keys = Object.keys(videoCardItems);
					if (
						keys.length === 4 &&
						keys[0] === 'title' &&
						keys[1] === 'description' &&
						keys[2] === 'videoMDHandle' &&
						keys[3] === 'filename' &&
						safeurls.every(checkUrls, [url]) === true
					) {
						videoMaps.push(videoMdName);

						if (
							title.length !== 0 &&
							title.length < 51 &&
							typeof title === 'string' &&
							description.length !== 0 &&
							description.length < 300 &&
							typeof description === 'string' &&
							videoCardItems.filename.length !== 0 &&
							typeof videoCardItems.filename === 'string' &&
							videoMdName.length === 32 &&
							typeof videoMdName === 'object'
						) {
							console.log('Key: ', uintToString(key));
							console.log('Value: ', videoCardItems);
							getVideos(title, description, videoMdName, videoCardItems.filename);
						}
					}
				}
			})
			.then(_ => {
				let videoMap = [];
				window.safeMutableDataEntries.free(entriesHandle);
				window.safeMutableData.free(vidyHandle);
			});
	} catch (err) {
		console.log(err);
	}
}

function uintToString(uintArray) {
	return new TextDecoder('utf-8').decode(uintArray);
}

async function getVideos(title, description, mdName, fileName) {
	try {
		let mdHandle = await window.safeMutableData.newPublic(auth, mdName, 54321);
		let nfsHandle = await window.safeMutableData.emulateAs(mdHandle, 'NFS');
		let fileHandle = await window.safeNfs.fetch(nfsHandle, fileName);
		let size = await window.safeNfsFile.size(fileHandle);

		if (size !== 0 && size < 80000000) {
			let fileContentHandle = window.safeNfs.open(nfsHandle, fileHandle, 4);

			window.safeNfsFile.metadata(fileHandle).then(fileMetaData => {
				window.safeNfsFile.read(fileContentHandle, 0, 0).then(data => {
					console.log(data);
					mainLoading.innerHTML = '';
					let file = new File([data], fileName);
					let url = window.URL.createObjectURL(file);
					let fileReader = new FileReader();
					fileReader.onload = function(event) {
						$('#videoCards').append(
							'<div class="row"><div class="card-panel yellow videocard"><video controls><source src="' +
								url +
								'" type="video/mp4"></video><h5 align="left" class="blue-text title">' +
								title +
								'</h5><p align="left" class="blue-text description">' +
								description +
								'</p></div></div>'
						);
					};
					fileReader.readAsDataURL(file);
					window.safeNfsFile.free(fileContentHandle);
					window.safeNfs.free(fileHandle);
					window.safeMutableData.free(mdHandle);
				});
			});
		}
	} catch (err) {
		console.log(err);
	}
}

function checkForms() {
	if (
		title.value.length !== 0 &&
		title.value.length < 51 &&
		description.value.length !== 0 &&
		description.value.length < 301 &&
		document.getElementById('upload-video').files[0] !== undefined
	) {
		authorise();
	} else {
		Materialize.toast("Make sure all fields are filled and don't exceed limits ", 3000, 'rounded');
	}
}

async function authorise() {
	try {
		if (authorised === false) {
			window.safeApp.free(auth);

			auth = '';
			const app = {
				name: 'Vidy',
				id: 'joe',
				version: '1',
				vendor: 'vidy.joe'
			};
			const permissions = {
				_public: ['Read']
			};

			let appHandle = await window.safeApp.initialise(app);
			let authURI = await window.safeApp.authorise(appHandle, permissions);
			let authorisedAppHandle = await window.safeApp.connectAuthorised(appHandle, authURI);

			auth = authorisedAppHandle;
			authorised = true;
			Materialize.toast('Authorised App Token: ' + auth, 3000, 'rounded');
			blobtobuffer();
		} else {
			blobtobuffer();
		}
	} catch (err) {
		console.log(err);
	}
}

function blobtobuffer() {
	let video = document.getElementById('upload-video');
	let reader = new FileReader();
	reader.readAsArrayBuffer(video.files[0]);
	reader.onload = function(event) {
		let content = new Buffer(event.target.result.byteLength);
		let view = new Uint8Array(event.target.result);
		for (let i = 0; i < content.length; ++i) {
			content[i] = view[i];
		}
		if (content.length < 80000000) {
			uploadVideo(content);
		} else {
			Materialize.toast('Video is too big!', 3000, 'rounded');
		}
	};
}

async function uploadVideo(content) {
	try {
		let mdHandle = await window.safeMutableData.newRandomPublic(auth, 54321);
		let mdData = await window.safeMutableData.getNameAndTag(mdHandle);

		let video = document.getElementById('upload-video');
		let fileName = video.files[0].name;
		let mdNameToSave = mdData.name.buffer;

		console.log('Uploading video now this can take some time...');
		uploadMessage.innerHTML = 'Uploading video now this can take some time...';
		modalLoading.innerHTML =
			'<center><div class="preloader-wrapper big active"><div class="spinner-layer spinner-yellow-only"><div class="circle-clipper left"><div class="circle"></div></div><div class="gap-patch"><div class="circle"></div></div><div class="circle-clipper right"><div class="circle"></div></div></div></div></center>';

		await window.safeMutableData.quickSetup(mdHandle, null);
		let nfsHandle = await window.safeMutableData.emulateAs(mdHandle, 'NFS');
		let fileHandle = await window.safeNfs.create(nfsHandle, content);
		await window.safeNfs.insert(nfsHandle, fileHandle, fileName);
		window.safeNfs.free(nfsHandle);
		window.safeMutableData.free(mdHandle);

		modalLoading.innerHTML = '';
		uploadVideoCard(mdNameToSave, fileName);
	} catch (err) {
		console.log(err);
	}
}

async function uploadVideoCard(mdName, fileName) {
	try {
		let time = new Date().getTime();
		let videoCard = {
			title: title.value,
			description: description.value,
			videoMDHandle: mdName,
			filename: fileName
		};

		let chatyHash = await window.safeCrypto.sha3Hash(auth, 'vidy');
		let vidyHandle = await window.safeMutableData.newPublic(auth, vidyHash, 54321);
		let mutationHandle = await window.safeMutableData.newMutation(auth);
		await window.safeMutableDataMutation.insert(mutationHandle, time.toString(), JSON.stringify(videoCard));
		await window.safeMutableData.applyEntriesMutation(vidyHandle, mutationHandle);

		uploadMessage.innerHTML = '';
		$('#fileuploadmodal').modal('close');
		Materialize.toast('Video has been uploaded to the network', 3000, 'rounded');

		window.safeMutableDataMutation.free(mutationHandle);
		window.safeMutableData.free(vidyHandle);
		getVideoCards();
	} catch (err) {
		console.log(err);
	}
}
