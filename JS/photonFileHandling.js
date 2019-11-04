function readPhotonFile(file){

  let flags = {
    srcUsesGlobalExposureTime : false,
    srcUsesGlobalLightOffTime : false,
    srcUsesGlobalLayerHeight : true,
    srcUsesGlobalBottomLayerSettings : true,
    srcUsesGlobalSublayerCount : true,
    srcUsesEvenSubLayerExposure : true,
    isPreviewImageEmpty : true
  };

  let settings = {
    numberOfLayers : file.getUint32(68, true),
    resolutionX : file.getUint32(52, true),
    resolutionY : file.getUint32(56, true),
    buildVolumeX : file.getFloat32(8, true),
    buildVolumeY : file.getFloat32(12, true),
    buildVolumeZ : file.getFloat32(16, true),
    physicalPixelSize : 47.25,
    globalLayerHeight : file.getFloat32(32, true),
    globalExposureTime : file.getFloat32(36, true),
    globalNumberOfBottomLayers : file.getUint32(48, true),
    globalBottomExposureTime : file.getFloat32(40, true),
    globalNumberOfSublayers : file.getUint32(92, true),
    globalLightOffTime : file.getFloat32(44, true),
    peelDistance : 6,
    peelLiftSpeed : 3,
    peelReturnSpeed : 3
  };

  let previewImage = {
    resolutionX : 640,
    resolutionY : 480,
    imageData : {}
  };

  //////////////////////////////////////////////////////////////////////////////

  let layers = [];
  let layerHeadersOffset = file.getUint32(64, true);

  for (let currentLayerIndex = 0; currentLayerIndex < settings.numberOfLayers; currentLayerIndex++) {

    sublayers = [];

    o = layerHeadersOffset + currentLayerIndex * 36;
    sublayerBlockLength = settings.numberOfLayers * 36;

    for(let currentSublayerIndex = 0; currentSublayerIndex < settings.globalNumberOfSublayers; currentSublayerIndex++){
      sublayerOffset = o + sublayerBlockLength * currentSublayerIndex;

      sublayerDataPosition = file.getUint32(sublayerOffset + 12, true);
      sublayerDataSize = file.getUint32(sublayerOffset + 16, true);

      let sublayer = {
        exposureTime : file.getFloat32(sublayerOffset + 4, true),
        layerData : photonSubLayerDataToBitArray(file, sublayerDataPosition, sublayerDataSize, settings.resolutionX * settings.resolutionY)
      }
      sublayers.push(sublayer);
    }

    let layer = { // numOfSublayers = AA number
      numberOfSublayers : settings.globalNumberOfSublayers,
      exposureTime : file.getFloat32(o + 4, true),
      lightOffTime: file.getFloat32(o + 8, true),
      layerHeight : settings.globalLayerHeight,
      positionZ : file.getFloat32(o + 0, true),
      subLayers : sublayers
    };

    layers.push(layer);
  }

  //////////////////////////////////////////////////////////////////////////////

  let loadedFile = {
    flags : flags,
    settings : settings,
    previewImage : previewImage,
    layers : layers
  }

  return loadedFile;
}

function photonSubLayerDataToBitArray(file, dataOffset, dataSize, numPixelsInLayer){
  let currLayerArray = new BitArray(numPixelsInLayer);
  let o = dataOffset;
  let pixelPos = 0;
  while(pixelPos < numPixelsInLayer){
      let run = file.getInt8(o++);
      let col = false
      if (run < 0){run = 128 + run; col = true;}
      for(j = 0; j < run; j++){
        currLayerArray.set(pixelPos+j, col);
      }
      pixelPos+=run;
  }
  return currLayerArray;
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////


function savePhotonFile(data){
  /*
  if(document.getElementById("output_fileFormat").value == "ps"){

    ///////////////////////////////////////////////////////////////////////////// save photon S file

    let layers = [];
    bytesLayers = 0;
    allWhitePx = 0;
    h = photonFile.header;
    numLayers = photonFile.header.layers;

    for(k = 0; k < numLayers; k++){ // layers here refers to the number of layers, the layer data itself is in photonFile.layers.
      layers[k] = convertToRuns(k);
      bytesLayers += layers[k].lengths.length;
      allWhitePx += layers[k].whitePx;
    }

    newFileArrayBuffer = new ArrayBuffer(75366 + bytesLayers + 28*layers.length);
    newFile = new DataView(newFileArrayBuffer);
    currPos = 0;

    newFile.setUint32(0, 2, false);
    newFile.setUint32(4, 3227560, false);
    newFile.setUint32(8, 824633720, false);
    newFile.setUint16(12, 10, false);

    newFile.setFloat64(14, document.getElementById("input_layerHeight").value, false);
    newFile.setFloat64(22, document.getElementById("input_exposure").value, false);
    newFile.setFloat64(30, document.getElementById("input_offTime").value, false);
    newFile.setFloat64(38, document.getElementById("input_bottomExposure").value, false);
    newFile.setUint32(46, document.getElementById("input_numBottomLayers").value, false);
    newFile.setFloat64(50, document.getElementById("input_zDist").value, false);
    newFile.setFloat64(58, document.getElementById("input_zSpeed").value, false);
    newFile.setFloat64(66, document.getElementById("input_zRetract").value, false);
    newFile.setFloat64(74, allWhitePx * 0.04725 * 0.04725 * 0.001 * document.getElementById("input_layerHeight").value, false);
    newFile.setUint32(82, 224, false);
    newFile.setUint32(86, 42, false);
    newFile.setUint32(90, 168, false);
    newFile.setUint32(94, 10, false);
    // preview image goes here, but I'm just not gonna scale it for now
    for(i = 0; i < (sThumb_string.length/2); i++){
      index = i*2;
      newFile.setUint8(98 + i, parseInt("0x" + sThumb_string.charAt(index) + sThumb_string.charAt(index+1)));
    }
    //
    newFile.setUint32(75362, numLayers, false);
    // new Layers
    currPos = 75366;
    for(i = 0; i < numLayers; i++){
      numbytes = layers[i].lengths.length;
      newFile.setUint32(currPos, layers[i].whitePx, false);
      newFile.setFloat64(currPos + 4, 0);
      newFile.setUint32(currPos + 12, 1440, false);
      newFile.setUint32(currPos + 16, 2560, false);
      newFile.setUint32(currPos + 20, numbytes*8 + 32, false);
      newFile.setUint32(currPos + 24, 2684702720, false);
      currPos += 28;
      lens = layers[i].lengths;
      cols = layers[i].colors;

      for(j = 0; j < numbytes; j++){
        val = lens[j] - 1;
        col = cols[j];

        encodedNum =
          (val & 1 ? 128 : 0) |
          (val & 2 ? 64 : 0) |
          (val & 4 ? 32 : 0) |
          (val & 8 ? 16 : 0) |
          (val & 16 ? 8 : 0) |
          (val & 32 ? 4 : 0) |
          (val & 64 ? 2 : 0) | col ;

        newFile.setUint8(currPos + j, encodedNum);
      }

      currPos += numbytes;

    }

    saveByteArray(newFileArrayBuffer, document.getElementById("input_newName").value);
  }
  else {

    ///////////////////////////////////////////////////////////////////////////// save photon file
    let bitArrayLayers = convertLayersToBitArrays();
    savePhotonFile(bitArrayLayers,
      document.getElementById("input_layerHeight").value,
      document.getElementById("input_exposure").value,
      document.getElementById("input_bottomExposure").value,
      document.getElementById("input_offTime").value,
      document.getElementById("input_numBottomLayers").value
    );
  }
  */
}

/*function savePhotonFile(inLayers, layerHeight, expTime, bottomExpTime, offTime, numBottomLayers){
  // layers is supplied as an array of npm bit-arrays representing each layer.
  let photonLayers = bitArraysToRuns(inLayers);
  let numBytesLayers = 0;
  for(i = 0; i < photonLayers.length; i++){
    numBytesLayers += photonLayers[i].length;
  }
  let bigThumbByteLength = bigThumb_string.length/2;
  let smallThumbByteLength = smallThumb_string.length/2;
  newFileArrayBuffer = new ArrayBuffer(64 + 108 + numBytesLayers + 36*inLayers.length + bigThumbByteLength + smallThumbByteLength);
  newFile = new DataView(newFileArrayBuffer);
  currPos = 0;

  //newFile.setUint32(0, 318570521, true); // I'm copying from the original photon files from photon workshop here, but It doesn't match?
  //newFile.setUint32(4, 1, true);

  newFile.setFloat32(8, 68.04, true);
  newFile.setFloat32(12, 120.96, true);
  newFile.setFloat32(16, 150.0, true);
  newFile.setFloat32(32, layerHeight, true);
  newFile.setFloat32(36, expTime, true);
  newFile.setFloat32(40, bottomExpTime, true);
  newFile.setFloat32(44, offTime, true);
  newFile.setUint32(48, numBottomLayers, true);
  newFile.setUint32(52, 1440, true);
  newFile.setUint32(56, 2560, true);

  newFile.setUint32(60, 108, true); // big thumbnail Offset
  newFile.setUint32(68, photonLayers.length, true);

  // header big thumb
  newFile.setUint32(108, 640, true);
  newFile.setUint32(108+4, 480, true);
  newFile.setUint32(108+8, 140, true);
  for(i = 0; i < bigThumbByteLength; i++){
    index = i*2;
    newFile.setUint8(140 + i, parseInt("0x" + bigThumb_string.charAt(index) + bigThumb_string.charAt(index+1)));
  }
  newFile.setUint32(108+12, bigThumbByteLength, true);

  // header small thumb
  let smallThumbOffset = 140 + bigThumbByteLength
  newFile.setUint32(72, smallThumbOffset, true); // small thumbnail Offset

  newFile.setUint32(smallThumbOffset, 320, true);
  newFile.setUint32(smallThumbOffset+4, 240, true);
  newFile.setUint32(smallThumbOffset+8, smallThumbOffset+32, true);
  for(i = 0; i < smallThumbByteLength; i++){
    index = i*2;
    newFile.setUint8(smallThumbOffset + 32 + i, parseInt("0x" + smallThumb_string.charAt(index) + smallThumb_string.charAt(index+1)));
  }
  newFile.setUint32(smallThumbOffset+12, smallThumbByteLength, true);

  // layer headers
  let layerOffsets = [];
  currLayerOffset = smallThumbOffset + 32 + smallThumbByteLength + (photonLayers.length * 36);

  newFile.setUint32(64, smallThumbOffset + 32 + smallThumbByteLength, true); // layer headers Offset

  for(i = 0; i < photonLayers.length; i++){
      let offset = smallThumbOffset + 32 + smallThumbByteLength + (36 * i);
      newFile.setFloat32(offset, layerHeight*i, true);
      newFile.setFloat32(offset+4, i < numBottomLayers ? bottomExpTime : expTime, true);
      newFile.setFloat32(offset+8, offTime, true);
      newFile.setUint32(offset+12, currLayerOffset, true);
      layerOffsets.push(currLayerOffset);
      newFile.setUint32(offset+16, photonLayers[i].length, true); // error is here!
      currLayerOffset += photonLayers[i].length;
  }

  for(i = 0; i < photonLayers.length; i++){
    let offset = layerOffsets[i];
    let currLayer = photonLayers[i];
    for(run = 0; run < currLayer.length; run++){
        newFile.setUint8(offset + run, currLayer[run]);
    }
  }

  saveByteArray(newFileArrayBuffer, document.getElementById("input_newName").value, ".photon");

}*/
