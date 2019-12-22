function convertToPhotonS(photonFile, config) {
    function convertToRuns(idx) {
        let long_colors = [];
        let long_lengths = [];
        let layer = photonFile.layers[idx];
        let o = isPhotonS ? layer.layerDataPosition : layer.dataOffset;
        let posPixels = 0;
        numWhitePxInLayer = 0;

        firstPix = photonFile.fileDataView.getInt8(o);
        currCol = firstPix < 0 ? 1 : 0;
        currRun = 0;

        while (posPixels < photonFile.header.resX * photonFile.header.resY) {

            let b = photonFile.fileDataView.getInt8(o++);
            let pixelCount = b;
            let oldCol = currCol;

            if (pixelCount < 0) {
                pixelCount = 128 + pixelCount;
                currCol = 1;
                numWhitePxInLayer += pixelCount;
            } else {
                currCol = 0;
            }

            if (currCol == oldCol) currRun += pixelCount;
            else {
                long_colors.push(oldCol);
                long_lengths.push(currRun);
                currRun = pixelCount;
            }

            posPixels += pixelCount;

        }

        long_colors.push(currCol);
        long_lengths.push(currRun);

        let short_colors = [];
        let short_lengths = [];

        for (i = 0; i < long_lengths.length; i++) {
            col = long_colors[i];
            len = long_lengths[i];
            numRuns = Math.floor(len / 128);
            remainder = len % 128;
            for (j = 0; j < numRuns; j++) {
                short_colors.push(col);
                short_lengths.push(128);
            }
            if (remainder > 0) {
                short_colors.push(col);
                short_lengths.push(remainder);
            }
        }

        let return_layer = {
            colors: short_colors,
            lengths: short_lengths,
            whitePx: numWhitePxInLayer
        };

        return return_layer;

    }

    let layers = [];
    let bytesLayers = 0;
    let allWhitePx = 0;
    //let h = photonFile.header;
    let numLayers = photonFile.header.layers;

    for (k = 0; k < numLayers; k++) { // layers here refers to the number of layers, the layer data itself is in photonFile.layers.
        layers[k] = convertToRuns(k);
        bytesLayers += layers[k].lengths.length;
        allWhitePx += layers[k].whitePx;
    }

    newFileArrayBuffer = new ArrayBuffer(75366 + bytesLayers + 28 * layers.length);
    newFile = new DataView(newFileArrayBuffer);
    currPos = 0;

    newFile.setUint32(0, 2, false);
    newFile.setUint32(4, 3227560, false);
    newFile.setUint32(8, 824633720, false);
    newFile.setUint16(12, 10, false);

    newFile.setFloat64(14, config.layerHeight, false);
    newFile.setFloat64(22, config.exposure, false);
    newFile.setFloat64(30, config.offTime, false);
    newFile.setFloat64(38, config.bottomExposure, false);
    newFile.setUint32(46, config.bottomLayers, false);
    newFile.setFloat64(50, config.peelDistance, false);
    newFile.setFloat64(58, config.peelSpeedUp, false);
    newFile.setFloat64(66, config.peelSpeedDown, false);
    newFile.setFloat64(74, allWhitePx * 0.04725 * 0.04725 * 0.001 * config.layerHeight, false);
    newFile.setUint32(82, 224, false);
    newFile.setUint32(86, 42, false);
    newFile.setUint32(90, 168, false);
    newFile.setUint32(94, 10, false);
    // preview image goes here, but I'm just not gonna scale it for now
    for (i = 0; i < (sThumb_string.length / 2); i++) {
        index = i * 2;
        newFile.setUint8(98 + i, parseInt("0x" + sThumb_string.charAt(index) + sThumb_string.charAt(index + 1)));
    }
    //
    newFile.setUint32(75362, numLayers, false);
    // new Layers
    currPos = 75366;
    for (i = 0; i < numLayers; i++) {
        numbytes = layers[i].lengths.length;
        newFile.setUint32(currPos, layers[i].whitePx, false);
        newFile.setFloat64(currPos + 4, 0);
        newFile.setUint32(currPos + 12, 1440, false);
        newFile.setUint32(currPos + 16, 2560, false);
        newFile.setUint32(currPos + 20, numbytes * 8 + 32, false);
        newFile.setUint32(currPos + 24, 2684702720, false);
        currPos += 28;
        lens = layers[i].lengths;
        cols = layers[i].colors;

        for (j = 0; j < numbytes; j++) {
            val = lens[j] - 1;
            col = cols[j];

            encodedNum =
                (val & 1 ? 128 : 0) |
                (val & 2 ? 64 : 0) |
                (val & 4 ? 32 : 0) |
                (val & 8 ? 16 : 0) |
                (val & 16 ? 8 : 0) |
                (val & 32 ? 4 : 0) |
                (val & 64 ? 2 : 0) | col;

            newFile.setUint8(currPos + j, encodedNum);
        }

        currPos += numbytes;

    }

    return newFileArrayBuffer;
}

function convertToPhotonClassic(photonFile, config) {
    function convertLayersToBitArrays() {
        let layers = [];
        let numPixelsInLayer = 2560 * 1440;
        for (i = 0; i < photonFile.header.layers; i++) {

            let currLayerArray = new BitArray(numPixelsInLayer);
            let layer = photonFile.layers[i];
            let o = layer.dataOffset;
            let pixelPos = 0;
            while (pixelPos < numPixelsInLayer) {
                let run = photonFile.fileDataView.getInt8(o++);
                let col = false
                if (run < 0) { run = 128 + run; col = true; }
                for (j = 0; j < run; j++) {
                    currLayerArray.set(pixelPos + j, col);
                }
                pixelPos += run;
            }
            layers.push(currLayerArray);
        }
        return layers;
    }

    function bitArraysToRuns(inLayers) {
        let layers = [];
        for (i = 0; i < inLayers.length; i++) {
            let inLayer = inLayers[i];
            let layer = []
            let currRun = 0;
            let currRunCol = inLayer.get(0);
            for (pixelPos = 0; pixelPos < (2560 * 1440); pixelPos++) {
                if (inLayer.get(pixelPos) == currRunCol && currRun < 125) {
                    currRun++;
                } else {
                    layer.push(currRun | (currRunCol ? 0x80 : 0));
                    currRunCol = inLayer.get(pixelPos);
                    currRun = 1;
                }
            }
            if (currRun > 0) {
                layer.push(currRun | (currRunCol ? 0x80 : 0));
            }
            layers.push(layer);
        }
        return layers;
    }

    // layers is supplied as an array of npm bit-arrays representing each layer.
    let inLayers = convertLayersToBitArrays();
    let photonLayers = bitArraysToRuns(inLayers);
    let numBytesLayers = 0;
    for (i = 0; i < photonLayers.length; i++) {
        numBytesLayers += photonLayers[i].length;
    }
    let bigThumbByteLength = config.bigThumb.length / 2;
    let smallThumbByteLength = config.smallThumb.length / 2;
    newFileArrayBuffer = new ArrayBuffer(64 + 108 + numBytesLayers + 36 * inLayers.length + bigThumbByteLength + smallThumbByteLength);
    newFile = new DataView(newFileArrayBuffer);
    currPos = 0;

    //newFile.setUint32(0, 318570521, true); // I'm copying from the original photon files from photon workshop here, but It doesn't match?
    //newFile.setUint32(4, 1, true);

    newFile.setFloat32(8, 68.04, true);
    newFile.setFloat32(12, 120.96, true);
    newFile.setFloat32(16, 150.0, true);
    newFile.setFloat32(32, config.layerHeight, true);
    newFile.setFloat32(36, config.exposure, true);
    newFile.setFloat32(40, config.bottomExposure, true);
    newFile.setFloat32(44, config.offTime, true);
    newFile.setUint32(48, config.bottomLayers, true);
    newFile.setUint32(52, 1440, true);
    newFile.setUint32(56, 2560, true);

    newFile.setUint32(60, 108, true); // big thumbnail Offset
    newFile.setUint32(68, photonLayers.length, true);

    // header big thumb
    newFile.setUint32(108, 640, true);
    newFile.setUint32(108 + 4, 480, true);
    newFile.setUint32(108 + 8, 140, true);
    for (i = 0; i < bigThumbByteLength; i++) {
        index = i * 2;
        newFile.setUint8(140 + i, parseInt("0x" + config.bigThumb.charAt(index) + config.bigThumb.charAt(index + 1)));
    }
    newFile.setUint32(108 + 12, bigThumbByteLength, true);

    // header small thumb
    let smallThumbOffset = 140 + bigThumbByteLength
    newFile.setUint32(72, smallThumbOffset, true); // small thumbnail Offset

    newFile.setUint32(smallThumbOffset, 320, true);
    newFile.setUint32(smallThumbOffset + 4, 240, true);
    newFile.setUint32(smallThumbOffset + 8, smallThumbOffset + 32, true);
    for (i = 0; i < smallThumbByteLength; i++) {
        index = i * 2;
        newFile.setUint8(smallThumbOffset + 32 + i, parseInt("0x" + config.smallThumb.charAt(index) + config.smallThumb.charAt(index + 1)));
    }
    newFile.setUint32(smallThumbOffset + 12, smallThumbByteLength, true);

    // layer headers
    let layerOffsets = [];
    currLayerOffset = smallThumbOffset + 32 + smallThumbByteLength + (photonLayers.length * 36);

    newFile.setUint32(64, smallThumbOffset + 32 + smallThumbByteLength, true); // layer headers Offset

    for (i = 0; i < photonLayers.length; i++) {
        let offset = smallThumbOffset + 32 + smallThumbByteLength + (36 * i);
        newFile.setFloat32(offset, config.layerHeight * i, true);
        newFile.setFloat32(offset + 4, i < config.bottomLayers ? config.bottomExposure : config.exposure, true);
        newFile.setFloat32(offset + 8, config.offTime, true);
        newFile.setUint32(offset + 12, currLayerOffset, true);
        layerOffsets.push(currLayerOffset);
        newFile.setUint32(offset + 16, photonLayers[i].length, true); // error is here!
        currLayerOffset += photonLayers[i].length;
    }

    for (i = 0; i < photonLayers.length; i++) {
        let offset = layerOffsets[i];
        let currLayer = photonLayers[i];
        for (run = 0; run < currLayer.length; run++) {
            newFile.setUint8(offset + run, currLayer[run]);
        }
    }

    return newFileArrayBuffer;

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

function readPhotonS(source) {
    console.log("readPhotonS");
    let header = {
        bedSizeX: 68.04,
        bedSizeY: 120.96,
        bedSizeZ: 160.0,
        layerThickness: source.getFloat64(14, false), // Big endian!
        exposureTime: source.getFloat64(22, false),
        bottomExposureTime: source.getFloat64(38, false),
        offTime: source.getFloat64(30, false),
        bottomLayers: source.getUint32(46, false),
        resX: 1440, //is now for some reason per layer so also hardcode.
        resY: 2560,
        layers: source.getUint32(75362, false), // preview Image size and position is hardcoded now
        zLift: source.getFloat64(50, false),
        zRetract: source.getFloat64(58, false),
        zSpeed: source.getFloat64(66, false)
    };

    let layers = [];

    currentLayerOffset = 75366;  // layers always start after the hardcoded Preview image, so, also hardcoded.
    currentLayerZPos = header.layerThickness;

    for (let i = 0; i < header.layers; ++i) {

        let layer = {
            position: currentLayerZPos,
            layerDataPosition: currentLayerOffset + 28,
            dataSize: source.getUint32(currentLayerOffset + 20, false) / 8
        };

        currentLayerOffset += layer.dataSize + 24;
        currentLayerZPos += header.layerThickness;

        layers.push(layer);
    }

    return {
        fileDataView: source,
        header: header,
        layers: layers
    };
}

function readPhoton(source) {
    console.log("readPhoton");
    let header = {
        bedSizeX: source.getFloat32(8, true),
        bedSizeY: source.getFloat32(12, true),
        bedSizeZ: source.getFloat32(16, true),
        layerThickness: source.getFloat32(32, true),
        exposureTime: source.getFloat32(36, true),
        bottomExposureTime: source.getFloat32(40, true),
        offTime: source.getFloat32(44, true),
        bottomLayers: source.getUint32(48, true),
        resX: source.getUint32(52, true),
        resY: source.getUint32(56, true),
        bigThumbOffset: source.getUint32(60, true),
        layersOffset: source.getUint32(64, true),
        layers: source.getUint32(68, true),
        smallThumbOffset: source.getUint32(72, true)
    };

    let layers = [];

    for (let i = 0; i < header.layers; ++i) {
        let offset = header.layersOffset + i * 36;

        let layer = {
            position: source.getFloat32(offset + 0, true),
            exposureTime: source.getFloat32(offset + 4, true),
            offTime: source.getFloat32(offset + 8, true),
            dataOffset: source.getUint32(offset + 12, true),
            dataSize: source.getUint32(offset + 16, true)
        };

        layers.push(layer);
    }

    return {
        fileDataView: source,
        header: header,
        layers: layers
    };
}