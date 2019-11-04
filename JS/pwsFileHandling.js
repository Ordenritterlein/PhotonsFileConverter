function readPwsFile(file){

  let flags = {
    srcUsesGlobalExposureTime : false,
    srcUsesGlobalLightOffTime : false,
    srcUsesGlobalLayerHeight : false,
    srcUsesGlobalBottomLayerSettings : true,
    srcUsesGlobalSublayerCount : true,
    srcUsesEvenSubLayerExposure : true,
    isPreviewImageEmpty : true
  };

  let layerHeadersOffset = file.getUint32(36, true) + 20; // number of layers, a human readble identifier and the byte length of the layer headers block is stored in the first 20 bytes

  let settings = {
    name: "",
    numberOfLayers : file.getUint32(layerHeadersOffset - 4, true),
    resolutionX : file.getUint32(108, true),
    resolutionY : file.getUint32(112, true),
    buildVolumeX : 68.04,
    buildVolumeY : 120.96,
    buildVolumeZ : 160.0,
    physicalPixelSize : file.getFloat32(64, true),
    globalLayerHeight : file.getFloat32(68, true),
    globalExposureTime : file.getFloat32(72, true),
    globalNumberOfBottomLayers : file.getUint32(84, true),
    globalBottomExposureTime : file.getFloat32(80, true),
    globalNumberOfSublayers : file.getUint32(104, true),
    globalLightOffTime : file.getFloat32(76, true),
    peelDistance : file.getFloat32(88, true),
    peelLiftSpeed : file.getFloat32(92, true),
    peelReturnSpeed : file.getFloat32(96, true)
  };

  let previewImage = {
    resolutionX : 224,
    resolutionY : 168,
    imageData : {}
  };

  //////////////////////////////////////////////////////////////////////////////

  let layers = [];
  let currentLayerZPos = 0;

  for (let currentLayerIndex = 0; currentLayerIndex < settings.numberOfLayers; currentLayerIndex++) {

    o = layerHeadersOffset + currentLayerIndex * 32;
    layerDataOffset = file.getUint32(o, true);

    sublayers = [];

    for(let currentSublayerIndex = 0; currentSublayerIndex < settings.globalNumberOfSublayers; currentSublayerIndex++){

      let numPixelsInLayer = settings.resolutionX * settings.resolutionY;
      let currLayerArray = new BitArray(numPixelsInLayer);
      let pixelPos = 0;
      while(pixelPos < numPixelsInLayer){
          let run = file.getInt8(layerDataOffset++);
          let col = false
          if (run < 0){run = 128 + run; col = true;}
          for(j = 0; j < run; j++){
            currLayerArray.set(pixelPos+j, col);
          }
          pixelPos+=run;
      }

      let sublayer = {
        exposureTime : settings.globalExposureTime,
        layerData: currLayerArray
      }

      sublayers.push(sublayer);
    }

    let layer = {
      numberOfSublayers : settings.globalNumberOfSublayers,
      exposureTime : file.getFloat32(o + 16, true),
      lightOffTime: settings.globalLightOffTime,
      layerHeight : file.getFloat32(o + 20, true),
      positionZ : currentLayerZPos,
      subLayers : sublayers
    };

    currentLayerZPos += layer.layerHeight;
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

//////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////

function savePwsFile(file){

    layerData = encodeLayerData(file, "pws");

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

    saveByteArray(newFileArrayBuffer, file.settings.name + "_converted", ".pws");
}
