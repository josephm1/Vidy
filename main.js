(async function() {
	try {
		$('#fileuploadmodal').modal();
		$('.dropdown').dropdown();
		$('#feedbackmodal').modal();
		$('#aboutmodal').modal();
		$('#settingsmodal').modal();

		$('#authorise').click(function() {
			authorise();
		});
		$('#refresh').click(function() {
			getVideoCards();
		});
		$('#feedback').click(function() {
			$('#feedbackmodal').modal('open');
		});
		$('#about').click(function() {
			$('#aboutmodal').modal('open');
		});
		$('#settings').click(function() {
			$('#settingsmodal').modal('open');
		});

		$('#submit-feedback').click(function() {
			sendFeedback();
		});
		$('#upload').click(function() {
			checkForms();
		});
		$('#edit-config').click(function() {
			editConfig();
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
		getVideoCards();
	} catch (err) {
		console.error(err);
	} finally {
		authorised = false;
	}
})();

async function getVideoCards() {
	try {
		let vidyHash = await window.safeCrypto.sha3Hash(auth, 'vidy');
		let vidyHandle = await window.safeMutableData.newPublic(auth, vidyHash, 54321);
		let entriesHandle = await window.safeMutableData.getEntries(vidyHandle);

		videoCards.innerHTML = '';
		mainLoading.innerHTML =
			'<div class="preloader-wrapper big active"><div class="spinner-layer spinner-colour"><div class="circle-clipper left"><div class="circle"></div></div><div class="gap-patch"><div class="circle"></div></div><div class="circle-clipper right"><div class="circle"></div></div></div></div>';
		let time = new Date().getTime();
		let videoMaps = [];

		function checkVideos(item) {
			if (item == this) {
				return false;
			} else {
				return true;
			}
		}

		window.safeMutableDataEntries
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
		console.error(err);
	}
}

async function getVideos(title, description, mdName, fileName) {
	try {
		let mdHandle = await window.safeMutableData.newPublic(auth, mdName, 54321);
		let nfsHandle = await window.safeMutableData.emulateAs(mdHandle, 'NFS');
		let fileHandle = await window.safeNfs.fetch(nfsHandle, fileName);
		let size = await window.safeNfsFile.size(fileHandle);

		if (size !== 0 && size < 80000000) {
			let fileContentHandle = window.safeNfs.open(nfsHandle, fileHandle, 4);
			let fileMetaData = await window.safeNfsFile.metadata(fileHandle);
			let data = await window.safeNfsFile.read(fileContentHandle, 0, 0);

			console.log(data);
			mainLoading.innerHTML = '';
			let file = new File([data], fileName);
			let url = window.URL.createObjectURL(file);
			let fileReader = new FileReader();
			fileReader.onload = function(event) {
				$('#videoCards').append(
					'<div class="row"><div class="card-panel accent-colour"><video controls><source src="' +
						url +
						'" type="video/mp4"></video><h5 align="left" class="primary-text-colour">' +
						title +
						'</h5><p align="left" class="primary-text-colour">' +
						description +
						'</p></div></div>'
				);
			};
			fileReader.readAsDataURL(file);
			window.safeNfsFile.free(fileContentHandle);
			window.safeNfs.free(fileHandle);
			window.safeMutableData.free(mdHandle);
		}
	} catch (err) {
		console.error(err);
	}
}

async function authorise() {
	try {
		if (authorised !== true) {
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
			getConfig();
			return auth;
		}
	} catch (err) {
		console.error(err);
	}
}

async function checkForms() {
	if (authorised !== true) {
		const auth = await authorise();
	}
	if (
		title.value.length !== 0 &&
		title.value.length < 51 &&
		description.value.length !== 0 &&
		description.value.length < 301 &&
		document.getElementById('upload-video').files[0] !== undefined
	) {
		blobtobuffer();
	} else {
		Materialize.toast("Make sure all fields are filled and don't exceed limits ", 3000, 'rounded');
	}
}

//old

// function blobtobuffer() {
// 	let video = document.getElementById('upload-video');
// 	let reader = new FileReader();
// 	reader.readAsArrayBuffer(video.files[0]);
// 	reader.onload = function(event) {
// 		let content = new Buffer(event.target.result.byteLength);
// 		let view = new Uint8Array(event.target.result);
// 		for (let i = 0; i < content.length; ++i) {
// 			content[i] = view[i];
// 		}
// 		if (content.length < 80000000) {
// 			uploadVideo(content);
// 		} else {
// 			Materialize.toast('Video is too big!', 3000, 'rounded');
// 		}
// 	};
// }

function blobtobuffer() {
	let video = document.getElementById('upload-video');
	var arrayBuffer;
	var fileReader = new FileReader();
	fileReader.onload = function(event) {
		arrayBuffer = event.target.result;
	};
	fileReader.readAsArrayBuffer(video.files[0]);
	if (content.length < 80000000) {
		uploadVideo(content);
	} else {
		Materialize.toast('Video is too big!', 3000, 'rounded');
	}
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
			'<center><div class="preloader-wrapper big active"><div class="spinner-layer spinner-colour"><div class="circle-clipper left"><div class="circle"></div></div><div class="gap-patch"><div class="circle"></div></div><div class="circle-clipper right"><div class="circle"></div></div></div></div></center>';

		window.safeMutableData.quickSetup(mdHandle, null);
		let nfsHandle = await window.safeMutableData.emulateAs(mdHandle, 'NFS');
		let fileHandle = await window.safeNfs.create(nfsHandle, content);
		window.safeNfs.insert(nfsHandle, fileHandle, fileName);
		window.safeNfs.free(nfsHandle);
		window.safeMutableData.free(mdHandle);

		modalLoading.innerHTML = '';
		uploadVideoCard(mdNameToSave, fileName);
	} catch (err) {
		console.error(err);
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

		let vidyHash = await window.safeCrypto.sha3Hash(auth, 'vidy');
		let vidyHandle = await window.safeMutableData.newPublic(auth, vidyHash, 54321);
		let mutationHandle = await window.safeMutableData.newMutation(auth);
		window.safeMutableDataMutation.insert(mutationHandle, time.toString(), JSON.stringify(videoCard));
		window.safeMutableData.applyEntriesMutation(vidyHandle, mutationHandle);
		window.safeMutableDataMutation.free(mutationHandle);
		window.safeMutableData.free(vidyHandle);
	} catch (err) {
		console.error(err);
	} finally {
		uploadMessage.innerHTML = '';
		$('#fileuploadmodal').modal('close');
		Materialize.toast('Video has been uploaded to the network', 3000, 'rounded');
		setTimeout(function() {
			getVideoCards();
		}, 2000);
	}
}

async function getConfig() {
	try {
		let ownContainerHandle = await window.safeApp.getOwnContainer(auth);
		try {
			let value = await window.safeMutableData.get(ownContainerHandle, 'custom-colours');
			let colours = JSON.parse(value.buf.toString());

			document.documentElement.style.setProperty('--primaryColor', colours.primaryColor);
			document.documentElement.style.setProperty('--accentColor', colours.accentColor);
			document.documentElement.style.setProperty('--darkPrimaryColor', colours.darkPrimaryColor);
		} catch (err) {
			let colorsConfig = {
				primaryColor: '#448aff',
				accentColor: '#ffea00',
				darkPrimaryColor: '#1565c0'
			};

			let mutationHandle = await window.safeMutableData.newMutation(auth);
			window.safeMutableDataMutation.insert(mutationHandle, 'custom-colours', JSON.stringify(colorsConfig));
			window.safeMutableData.applyEntriesMutation(ownContainerHandle, mutationHandle);
			window.safeMutableDataMutation.free(mutationHandle);
			window.safeMutableData.free(ownContainerHandle);
		}
	} catch (err) {
		console.error(err);
	} finally {
		getVideoCards();
	}
}

async function editConfig() {
	try {
		if (authorised !== true) {
			const auth = await authorise();
		}

		let primary = document.getElementById('user-primary-colour').value;
		let dark = document.getElementById('user-dark-primary-colour').value;
		let accent = document.getElementById('user-accent-colour').value;

		let colorsConfig = {
			primaryColor: primary,
			accentColor: accent,
			darkPrimaryColor: dark
		};

		let ownContainerHandle = await window.safeApp.getOwnContainer(auth);
		let mutationHandle = await window.safeMutableData.newMutation(auth);
		let value = await window.safeMutableData.get(ownContainerHandle, 'custom-colours');
		window.safeMutableDataMutation.update(
			mutationHandle,
			'custom-colours',
			JSON.stringify(colorsConfig),
			value.version + 1
		);
		window.safeMutableData.applyEntriesMutation(ownContainerHandle, mutationHandle);
		window.safeMutableDataMutation.free(mutationHandle);
		window.safeMutableData.free(ownContainerHandle);

		setTimeout(function() {
			getConfig();
		}, 1500);
	} catch (err) {
		console.error(err);
	} finally {
		$('#settingsmodal').modal('close');
	}
}

async function sendFeedback() {
	try {
		if (authorised !== true) {
			const auth = await authorise();
		}

		let time = new Date().getTime().toString();
		let feedback = 'Vidy Feedback: ' + feedbackarea.value + '/ Score: ' + vidyscore.value.toString() + '/10';

		let feedbackHash = await window.safeCrypto.sha3Hash(auth, 'feedy');
		let feedbackHandle = await window.safeMutableData.newPublic(auth, feedbackHash, 54321);
		let mutationHandle = await window.safeMutableData.newMutation(auth);
		window.safeMutableDataMutation.insert(mutationHandle, time, feedback);
		window.safeMutableData.applyEntriesMutation(feedbackHandle, mutationHandle);
		window.safeMutableDataMutation.free(mutationHandle);
		window.safeMutableData.free(feedbackHandle);
	} catch (err) {
		console.error(err);
	} finally {
		$('#feedbackmodal').modal('close');
		Materialize.toast('Thanks for your feedback!', 3000, 'rounded');
	}
}

function uintToString(uintArray) {
	return new TextDecoder('utf-8').decode(uintArray);
}
