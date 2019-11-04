function readPhotonFile(file){

  console.log("watthefucck");

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
    name: "",
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
    globalNumberOfSublayers : Math.max(1,file.getUint32(92, true)),
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

      /*let loggedSublayer = {
        exposureTime: file.getFloat32(sublayerOffset + 4, true),
        sublayerDataSize: file.getUint32(sublayerOffset + 16, true),
        sublayerDataPosition: file.getUint32(sublayerOffset + 12, true),
        lightOffTime: file.getFloat32(o + 8, true),
        positionZ : file.getFloat32(o + 0, true)
      }
      console.log(loggedSublayer);*/

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

function savePhotonFile(file){

    layerData = encodeLayerData(file, "photon");

    console.log(layerData);

    let bigThumbByteLength = bigThumb_string.length/2;
    let smallThumbByteLength = smallThumb_string.length/2;
    newFileArrayBuffer = new ArrayBuffer(64 + 112 + layerData.lengthFileData + ((36*file.settings.numberOfLayers) * file.settings.globalNumberOfSublayers) + bigThumbByteLength + smallThumbByteLength);
    newFile = new DataView(newFileArrayBuffer);

    newFile.setFloat32(8, 68.04, true);
    newFile.setFloat32(12, 120.96, true);
    newFile.setFloat32(16, 150.0, true);
    newFile.setFloat32(32, file.settings.globalLayerHeight, true);
    newFile.setFloat32(36, file.settings.globalExposureTime, true);
    newFile.setFloat32(40, file.settings.globalBottomExposureTime, true);
    newFile.setFloat32(44, file.settings.globalLightOffTime, true);
    newFile.setUint32(48, file.settings.globalNumberOfBottomLayers, true);
    newFile.setUint32(92, file.settings.globalNumberOfSublayers, true);
    newFile.setUint32(52, 1440, true);
    newFile.setUint32(56, 2560, true);

    newFile.setUint32(60, 112, true); // big thumbnail Offset
    newFile.setUint32(68, file.settings.numberOfLayers, true);

    // header big thumb
    newFile.setUint32(112, 640, true);
    newFile.setUint32(112+4, 480, true);
    newFile.setUint32(112+8, 144, true);
    for(i = 0; i < bigThumbByteLength; i++){
      index = i*2;
      newFile.setUint8(144 + i, parseInt("0x" + bigThumb_string.charAt(index) + bigThumb_string.charAt(index+1)));
    }
    newFile.setUint32(112+12, bigThumbByteLength, true);

    // header small thumb
    let smallThumbOffset = 144 + bigThumbByteLength
    newFile.setUint32(72, smallThumbOffset, true); // small thumbnail Offset

    newFile.setUint32(smallThumbOffset, 320, true);
    newFile.setUint32(smallThumbOffset+4, 240, true);
    newFile.setUint32(smallThumbOffset+8, smallThumbOffset+32, true);
    for(i = 0; i < smallThumbByteLength; i++){
      index = i*2;
      newFile.setUint8(smallThumbOffset + 32 + i, parseInt("0x" + smallThumb_string.charAt(index) + smallThumb_string.charAt(index+1)));
    }
    newFile.setUint32(smallThumbOffset+12, smallThumbByteLength, true);

    //////////////////////////////////////////////////////////////////////////

    currentLayerOffset = smallThumbOffset + 32 + smallThumbByteLength + ((file.settings.numberOfLayers * 36) * file.settings.globalNumberOfSublayers);
    layerHeadersOffset = smallThumbOffset + 32 + smallThumbByteLength;
    newFile.setUint32(64, layerHeadersOffset, true); // layer headers Offset
    sublayerHeadersBlockSize = 36 * file.settings.numberOfLayers;

    for(j = 0; j < file.settings.globalNumberOfSublayers; j++){
      for(i = 0; i < file.settings.numberOfLayers; i++){
          let offset = layerHeadersOffset + (36 * i) + (sublayerHeadersBlockSize * j);
          newFile.setFloat32(offset, file.layers[i].positionZ, true);
          newFile.setFloat32(offset+4, file.layers[i].exposureTime, true);
          newFile.setFloat32(offset+8, file.layers[i].lightOffTime, true);
          newFile.setUint32(offset+16, layerData.layers[i].sublayers[j].lengthSublayerData, true);
      }
    }

    for(i = 0; i < file.settings.numberOfLayers; i++){
      for(j = 0; j < file.settings.globalNumberOfSublayers; j++){
        let currLayer = layerData.layers[i].sublayers[j].data;
        for(run = 0; run < currLayer.length; run++){
            newFile.setUint8(currentLayerOffset + run, currLayer[run]);
        }
        newFile.setUint32(layerHeadersOffset + (36 * i) + (sublayerHeadersBlockSize * j) +12, currentLayerOffset, true);
        currentLayerOffset += layerData.layers[i].sublayers[j].lengthSublayerData;
      }
    }

    saveByteArray(newFileArrayBuffer, file.settings.name + "_converted", ".photon");
}
