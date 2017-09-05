//Intial function
"Use strict";

$(document).ready(function() {
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
    getMutableDataHandle("getVideoCards");
  });

  //initialises and authorises with the network
  var app = {
    name: "Vidy",
    id: "joe",
    version: "1",
    vendor: "joe",
  };


  window.safeApp.initialise(app)
    .then((appHandle) => {
      console.log("Initialise Token: " + appHandle);
      window.safeApp.connect(appHandle)
        .then((appHandle) => {
          //returns app token
          auth = appHandle;
          authorised = false;
          Materialize.toast(" App Token: " + auth, 3000, 'rounded');
          getMutableDataHandle("getVideoCards");
        });
    }, (err) => {
      console.error(err);
    });
});

function getMutableDataHandle(invokeFun, mdNameToSave, fileName) {
  var name = "vidy";
  window.safeCrypto.sha3Hash(auth, name)
    .then((hash) =>
      window.safeMutableData.newPublic(auth, hash, 54321))
    .then((mdHandle) => {
      vidyHandle = mdHandle;
      if (invokeFun === "getVideoCards") {
        getVideoCards();
      } else if (invokeFun === "uploadVideoCard") {
        uploadVideoCard(mdNameToSave, fileName);
      }
    });
}

function loading(on, place) {
  if (place === "main") {
    if (on === true) {
      mainLoading.innerHTML = '<div class="preloader-wrapper big active"><div class="spinner-layer spinner-yellow-only"><div class="circle-clipper left"><div class="circle"></div></div><div class="gap-patch"><div class="circle"></div></div><div class="circle-clipper right"><div class="circle"></div></div></div></div>';
    } else {
      mainLoading.innerHTML = '';
    }
  } else {
    if (on === true) {
      modalLoading.innerHTML = '<center><div class="preloader-wrapper big active"><div class="spinner-layer spinner-yellow-only"><div class="circle-clipper left"><div class="circle"></div></div><div class="gap-patch"><div class="circle"></div></div><div class="circle-clipper right"><div class="circle"></div></div></div></div></center>';
    } else {
      modalLoading.innerHTML = '';
    }
  }
}

function getVideoCards() {
  window.safeMutableData.getEntries(vidyHandle)
    .then((entriesHandle) => {
      videoCards.innerHTML = "";
      loading(true, "main");
      var date = new Date();
      var time = date.getTime();
      window.safeMutableDataEntries.forEach(entriesHandle,
          (key, value) => {

            if (
              parseInt(uintToString(key)) < time &&
              parseInt(uintToString(key)).toString().length === 13 &&
              uintToString(key).length === 13) {
              var videoCardItems = JSON.parse(uintToString(value.buf));
              var videoMdName = videoCardItems.videoMDHandle.data;

              var title = videoCardItems.title
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#039;");

              var description = videoCardItems.description
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#039;");

              var keys = Object.keys(videoCardItems);
              if (
                keys.length === 4 &&
                keys[0] === "title" &&
                keys[1] === "description" &&
                keys[2] === "videoMDHandle" &&
                keys[3] === "filename"
              ) {

                if (
                  title.length !== 0 &&
                  title.length < 51 &&
                  typeof title === "string" &&

                  description.length !== 0 &&
                  description.length < 300 &&
                  typeof description === "string" &&

                  videoCardItems.filename.length !== 0 &&
                  typeof videoCardItems.filename === "string" &&

                  //videoMdName.type === "Buffer" &&
                  videoMdName.length === 32 &&
                  typeof videoMdName === "object"
                ) {

                  console.log('Key: ', uintToString(key));
                  console.log('Value: ', videoCardItems);
                  getVideos(title, description, videoMdName, videoCardItems.filename);
                }
              }
            }
          })
        .then(_ => {
          window.safeMutableDataEntries.free(entriesHandle);
          window.safeMutableData.free(vidyHandle);
        });
    }, (err) => {
      console.error(err);
    });
}

function uintToString(uintArray) {
  return new TextDecoder("utf-8").decode(uintArray);
}

function getVideos(title, description, mdName, fileName) {
  window.safeMutableData.newPublic(auth, mdName, 54321)
    .then((mdHandle) => {
      window.safeMutableData.emulateAs(mdHandle, 'NFS')
        .then((nfsHandle) => {
          window.safeNfs.fetch(nfsHandle, fileName)
            .then((fileHandle) => {
              window.safeNfsFile.size(fileHandle)
                .then((size) => {
                  console.log(size);
                  if (size !== 0 &&
                    size < 80000000) {
                    window.safeNfs.open(nfsHandle, fileHandle, 4)
                      .then((fileContentHandle) => {
                        window.safeNfsFile.metadata(fileHandle)
                          .then((fileMetaData) => {
                            console.log(fileMetaData);
                            window.safeNfsFile.read(fileContentHandle, 0, 0)
                              .then((data) => {
                                console.log(data);
                                loading(false, "main");
                                var file = new File([data], fileName);
                                var url = window.URL.createObjectURL(file);
                                var fileReader = new FileReader();
                                fileReader.onload = function(event) {
                                  $("#videoCards").append('<div class="row"><div class="card-panel yellow videocard"><video controls><source src="' +
                                    url + '" type="video/mp4"></video><h5 align="left" class="blue-text title">' +
                                    title + '</h5><p align="left" class="blue-text description">' +
                                    description + '</p></div></div>');
                                };
                                fileReader.readAsDataURL(file);
                                window.safeNfsFile.free(fileContentHandle);
                                window.safeNfs.free(fileHandle);
                                window.safeMutableData.free(mdHandle);
                              });
                          });
                      });
                  }
                });
            });
        });
    }, (err) => {
      console.error(err);
    });
}

function checkForms() {
  if (title.value.length !== 0 &&
    title.value.length < 51 &&

    description.value.length !== 0 &&
    description.value.length < 301 &&

    document.getElementById("upload-video").files[0] !== undefined
  ) {
    authorise();
  } else {
    Materialize.toast("Make sure all fields are filled and don't exceed limits ", 3000, 'rounded');
  }
}

function authorise() {
  if (authorised === false) {
    window.safeMutableData.free(vidyHandle);
    window.safeApp.free(auth);
    auth = "";
    var app = {
      name: "Vidy",
      id: "joe",
      version: "1",
      vendor: "joe",
    };

    var permissions = {
      '_public': ['Read']
    };

    window.safeApp.initialise(app)
      .then((appHandle) => {
        window.safeApp.authorise(appHandle, permissions)
          .then((authURI) => {
            window.safeApp.connectAuthorised(appHandle, authURI)
              .then((authorisedAppHandle) => {
                auth = authorisedAppHandle;
                authorised = true;
                Materialize.toast("Authorised App Token: " + auth, 3000, 'rounded');
                blobtobuffer();
              });
          });
      }, (err) => {
        console.error(err);
      });
  } else {
    blobtobuffer();
  }
}

function blobtobuffer() {
  var video = document.getElementById("upload-video");
  var reader = new FileReader();
  reader.readAsArrayBuffer(video.files[0]);
  reader.onload = function(event) {
    var content = new Buffer(event.target.result.byteLength);
    var view = new Uint8Array(event.target.result);
    for (var i = 0; i < content.length; ++i) {
      content[i] = view[i];
    }
    if (content.length < 80000000) {
      uploadVideo(content);
    } else {
      Materialize.toast('Video is too big!', 3000, 'rounded');
    }
  };
}

function uploadVideo(content) {
  window.safeMutableData.newRandomPublic(auth, 54321)
    .then((mdHandle) => {
      window.safeMutableData.quickSetup(mdHandle, null);
      window.safeMutableData.getNameAndTag(mdHandle)
        .then((mdData) => {
          var video = document.getElementById("upload-video");
          var fileName = video.files[0].name;
          var mdNameToSave = mdData.name.buffer;
          window.safeMutableData.emulateAs(mdHandle, 'NFS')
            .then((nfsHandle) => {
              console.log("Uploading video now this can take some time...");
              uploadMessage.innerHTML = "Uploading video now this can take some time...";
              loading(true, "modal");
              window.safeNfs.create(nfsHandle, content)
                .then((fileHandle) => {
                  window.safeNfs.insert(nfsHandle, fileHandle, fileName)
                    .then(_ => {
                      window.safeNfs.free(nfsHandle);
                      window.safeMutableData.free(mdHandle);
                      loading(false, "modal");
                      getMutableDataHandle("uploadVideoCard", mdNameToSave, fileName);
                    });
                });
            });
        });
    }, (err) => {
      console.error(err);
    });
}

function uploadVideoCard(mdName, fileName) {
  window.safeMutableData.newMutation(auth)
    .then((mutationHandle) => {
      var date = new Date();
      var time = date.getTime();
      var videoCard = {
        "title": title.value,
        "description": description.value,
        "videoMDHandle": mdName,
        "filename": fileName
      };
      console.log("Your upload card: " + videoCard);
      window.safeMutableDataMutation.insert(mutationHandle, time.toString(), JSON.stringify(videoCard))
        .then(_ =>
          window.safeMutableData.applyEntriesMutation(vidyHandle, mutationHandle))
        .then(_ => {
          uploadMessage.innerHTML = "";
          $('#fileuploadmodal').modal('close');
          Materialize.toast('Video has been uploaded to the network', 3000, 'rounded');
          window.safeMutableDataMutation.free(mutationHandle);
          window.safeMutableData.free(vidyHandle);
          getMutableDataHandle("getVideoCards");
        });
    }, (err) => {
      console.error(err);
    });
}
