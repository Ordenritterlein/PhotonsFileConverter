let photonFile = null;

function toggleOverwrite() {
    updateSubmitButton();
    document.getElementById("overwriteInputs").style = "display:" + (document.getElementById("overwriteValues").checked ? "block" : "none");
}

function checkInput(src) {
    switch (src) {
        case 0:
            el = document.getElementById("input_zDist");
            if (el.value > 20) el.value = 20;
            if (el.value < 0) el.value = 0;
            break;
        case 1: case 2:
            el = src == 1 ? document.getElementById("input_zSpeed") : document.getElementById("input_zRetract");
            if (el.value > 8) el.value = 8;
            if (el.value < 0) el.value = 0;
            break;

        case 3:
            el = document.getElementById("input_layerHeight");
            if (el.value > 2) el.value = 2;
            if (el.value < 0.00) el.value = 0.00;
            break;
    }
}

function updateSubmitButton(isPhotonS) {
    console.log("updateSubmit");
    if (isPhotonS) document.getElementById("submit_Button").innerHTML = "update file";
    else {
        if (document.getElementById("overwriteValues").checked) document.getElementById("submit_Button").innerHTML = "convert and update file";
        else document.getElementById("submit_Button").innerHTML = "convert file";
    }

    document.getElementById("submit_Button").style = "display:block;";
}

function updateInputs(photonFile, fname) {
    console.log("updateInputs", photonFile);
    let h = photonFile.header;
    document.getElementById("input_newName").value = fname.slice(0, fname.lastIndexOf("."));

    document.getElementById("input_layerHeight").value = h.layerThickness;
    document.getElementById("input_exposure").value = h.exposureTime;
    document.getElementById("input_offTime").value = h.offTime;
    document.getElementById("input_bottomExposure").value = h.bottomExposureTime;
    document.getElementById("input_numBottomLayers").value = h.bottomLayers;

    if (isPhotonS) {
        document.getElementById("input_zDist").value = h.zLift;
        document.getElementById("input_zSpeed").value = h.zRetract;
        document.getElementById("input_zRetract").value = h.zSpeed;
    }
}

function submit() {

    if (document.getElementById("output_fileFormat").value == "ps") {
        // save photon S file
        saveByteArray(convertToPhotonS(photonFile, {
            layerHeight: document.getElementById("input_layerHeight").value,
            exposure: document.getElementById("input_exposure").value,
            offTime: document.getElementById("input_offTime").value,
            bottomExposure: document.getElementById("input_bottomExposure").value,
            bottomLayers: document.getElementById("input_numBottomLayers").value,
            peelDistance: document.getElementById("input_zDist").value,
            peelSpeedUp: document.getElementById("input_zSpeed").value,
            peelSpeedDown: document.getElementById("input_zRetract").value,

        }), document.getElementById("input_newName").value);
    }
    else {

        // save photon file
        saveByteArray(convertToPhotonClassic(photonFile, {
            layerHeight: document.getElementById("input_layerHeight").value,
            exposure: document.getElementById("input_exposure").value,
            bottomExposure: document.getElementById("input_bottomExposure").value,
            offTime: document.getElementById("input_offTime").value,
            numBottomLayers: document.getElementById("input_numBottomLayers").value,
            bigThumb: bigThumb_string,
            smallThumb: smallThumb_string
        }), document.getElementById("input_newName").value, ".photon");
    }

}

function loadFile(source, isPhotonS, fname) {

    if (isPhotonS) {
        // .Photons
        console.log("file is photonS");
        photonFile = readPhotonS(source);
    } else {
        // .Photon
        console.log("file is photon");
        photonFile = readPhoton(source);
    }

    updateInputs(photonFile, fname);

}

function onFileSelected(evt) {
    console.log("file selected");
    let files = evt.target.files;

    if (files.length == 1) {
        let fname = evt.target.files[0].name;
        isPhotonS = fname.slice((fname.lastIndexOf(".") - 1 >>> 0) + 2) == "photons";

        let fileReader = new FileReader();

        fileReader.onload = function (event) {
            console.log("file loaded");
            source = new DataView(event.target.result);
            loadFile(source, isPhotonS, fname);
            //renderThumbnail(loadImage(photonFile.header.smallThumbOffset, d, isPhotonS), document.getElementById('thumb-small'));
        };

        fileReader.readAsArrayBuffer(files[0]);
        updateSubmitButton(isPhotonS);
    }

}

function saveByteArray(array, name, ending = ".photons") {
    console.log("saveByteArray", { name, ending });
    link = document.createElement('a');
    link.style.display = 'none';
    document.body.appendChild(link);
    blob = new Blob([array], { type: 'application/octet-binary' });
    link.href = URL.createObjectURL(blob);
    link.download = name + ending;
    link.click();
}