function readPhotonsFile(file){

  let flags = {
    srcUsesGlobalExposureTime : true,
    srcUsesGlobalLightOffTime : true,
    srcUsesGlobalLayerHeight : true,
    srcUsesGlobalBottomLayerSettings : true,
    srcUsesGlobalSublayerCount : true,
    srcUsesEvenSubLayerExposure : true,
    isPreviewImageEmpty : true
  };

  let settings = {
    name: "",
    numberOfLayers : file.getUint32(75362, false), // false because "old" photonS files are  BigEndian
    resolutionX : 1440,
    resolutionY : 2560,
    buildVolumeX : 68.04,
    buildVolumeY : 120.96,
    buildVolumeZ : 160.0,
    physicalPixelSize : 47.25,
    globalLayerHeight : file.getFloat64(14, false),
    globalExposureTime : file.getFloat64(22, false),
    globalNumberOfBottomLayers : file.getUint32(46, false),
    globalBottomExposureTime : file.getFloat64(38, false),
    globalNumberOfSublayers : 1, // generalized AA layers.
    globalLightOffTime : file.getFloat64(30, false),
    peelDistance : file.getFloat64(50, false), // referred to in the slicer as zLift(peel distance), zSpeed(peelSpeed) and zRetract(peelReturnSpeed)
    peelLiftSpeed : file.getFloat64(66, false),
    peelReturnSpeed : file.getFloat64(58, false)
  };

  let previewImage = { // left empty until i have the nerve to implement png conversion
    resolutionX : 224,
    resolutionY : 168,
    imageData : {}
  };

  //////////////////////////////////////////////////////////////////////////////

  let layers = [];  //array of layers

  currentLayerOffset = 75366;  // layers always start after the hardcoded Preview image, so, also hardcoded.
  currentLayerZPos = 0;

  for (let currentLayerIndex = 0; currentLayerIndex < settings.numberOfLayers; currentLayerIndex++) {

    let sublayers = []; // sublayers generalize AA

    layerDataPosition = currentLayerOffset + 28; // layer header is 8 bytes long
    dataSize = (file.getUint32(currentLayerOffset + 20, false) / 8) - 4; //value is stored in bits, so divide by 8. there's also 4 leading bytes included.

    let sublayer = { // sublayers could ideally have per-sublayer exposure time settings
      exposureTime : settings.globalExposureTime,
      layerData : photonsSubLayerDataToBitArray(file, layerDataPosition, dataSize, settings.resolutionX * settings.resolutionY)
    }

    sublayers.push(sublayer);

    let layer = { // numOfSublayers = AA number,
      numberOfSublayers : 1,
      exposureTime : (currentLayerIndex < settings.globalNumberOfBottomLayers ? settings.globalBottomExposureTime : settings.globalExposureTime), // photonS doesn't have per-layer exposure time, so just assign based on if bottom layer or not
      lightOffTime: settings.globalLightOffTime,
      layerHeight : settings.globalLayerHeight, //no per-layer layerheight
      positionZ : currentLayerZPos,
      subLayers : sublayers
    };

    currentLayerOffset += dataSize + 28;
    currentLayerZPos += settings.globalLayerHeight;

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

function photonsSubLayerDataToBitArray(file, dataOffset, dataSize, numPixelsInLayer){
  currLayerArray = new BitArray(numPixelsInLayer);
  o = dataOffset;
  pixelPos = 0;
  while(o - dataOffset < dataSize){
      run = file.getInt8(o++);
      col = run & 1;
      numPixelxInRun =
      ((run & 128 ? 1 : 0) |
      (run & 64 ? 2 : 0) |
      (run & 32 ? 4 : 0) |
      (run & 16 ? 8 : 0) |
      (run & 8 ? 16 : 0) |
      (run & 4 ? 32 : 0) |
      (run & 2 ? 64 : 0)) + 1 ;
      for(j = 0; j < numPixelxInRun; j++){
        currLayerArray.set(pixelPos+j, col);
      }
      pixelPos+=numPixelxInRun;
  }
  return currLayerArray;
}

////////////////////////////////////////////////////////////////////////////////

function savePhotonsFile(file){

  layerData = encodeLayerData(file, "photons");
  console.log(layerData);

  newFileArrayBuffer = new ArrayBuffer(75366 + layerData.lengthFileData + 28*file.settings.numberOfLayers);
  newFile = new DataView(newFileArrayBuffer);
  currPos = 0;

  newFile.setUint32(0, 2, false);
  newFile.setUint32(4, 3227560, false);
  newFile.setUint32(8, 824633720, false);
  newFile.setUint16(12, 10, false);

  newFile.setFloat64(14, file.settings.globalLayerHeight, false);
  newFile.setFloat64(22, file.settings.globalExposureTime, false);
  newFile.setFloat64(30, file.settings.globalLightOffTime, false);
  newFile.setFloat64(38, file.settings.globalBottomExposureTime, false);
  newFile.setUint32(46, file.settings.globalNumberOfBottomLayers, false);
  newFile.setFloat64(50, file.settings.peelDistance, false);
  newFile.setFloat64(58, file.settings.peelLiftSpeed, false);
  newFile.setFloat64(66, file.settings.peelReturnSpeed, false);
  newFile.setFloat64(74, 69420, false); // allWhitePx * 0.04725 * 0.04725 * 0.001 * document.getElementById("input_layerHeight").value // no easy way to calculate without iterating over the whole thing or changing the internal format
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
  newFile.setUint32(75362, file.settings.numberOfLayers, false);
  // new Layers
  //console.log(layerData.layers[50].sublayers[0].data);
  currPos = 75366;
  for(i = 0; i < file.settings.numberOfLayers; i++){
    numbytes = layerData.layers[i].sublayers[0].lengthSublayerData;
    newFile.setUint32(currPos, 69420, false); // again, not easily calculable without larger modifications
    newFile.setFloat64(currPos + 4, 0);
    newFile.setUint32(currPos + 12, 1440, false);
    newFile.setUint32(currPos + 16, 2560, false);
    newFile.setUint32(currPos + 20, numbytes*8 + 32, false);
    newFile.setUint32(currPos + 24, 2684702720, false);
    currPos += 28;
    for(j = 0; j < numbytes; j++){
      newFile.setUint8(currPos + j, layerData.layers[i].sublayers[0].data[j]);
    }
    currPos += numbytes;
  }

  saveByteArray(newFileArrayBuffer, file.settings.name + "_converted", ".photons");
}
