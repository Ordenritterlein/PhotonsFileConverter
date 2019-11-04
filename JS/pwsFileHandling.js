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

function savePwsFile(file){

    layerData = encodeLayerData(file, "pws");

    console.log(layerData);


    newFileArrayBuffer = new ArrayBuffer(layerData.lengthFileData + (32*file.settings.numberOfLayers) + 75456);
    newFile = new DataView(newFileArrayBuffer);

    newFile.setUint32(0, 1129926209, true); //"ANYCUBIC"
    newFile.setUint32(4, 1128874581, true);
    newFile.setUint32(48, 1145128264, true); //"HEADER"
    newFile.setUint32(52, 21061, true);
    newFile.setUint32(144, 1447383632, true); //"PREVIEW"
    newFile.setUint32(248, 5719369, true);
    newFile.setUint32(75436, 1163477324, true); //"LAYERDEF"
    newFile.setUint32(75440, 1178944594, true);

    // ANYCUBIC section
    newFile.setUint32(12, 1, true); // version Number
    newFile.setUint32(16, 4, true); // Area Number (?)
    newFile.setUint32(20, 48, true); // HEADER address
    newFile.setUint32(28, 144, true); // PREVIEW address
    newFile.setUint32(36, 75436, true); // LAYERDEF address
    newFile.setUint32(44, 75456 + (32*file.settings.numberOfLayers), true); // Layer Data address

    //HEADER section
    newFile.setUint32(48 + 12, 80, true);
    newFile.setFloat32(48 + 16, file.settings.physicalPixelSize, true);
    newFile.setFloat32(48 + 20, file.settings.globalLayerHeight, true);
    newFile.setFloat32(48 + 24, file.settings.globalExposureTime, true);
    newFile.setFloat32(48 + 28, file.settings.globalLightOffTime, true);
    newFile.setFloat32(48 + 32, file.settings.globalBottomExposureTime, true);
    newFile.setUint32(48 + 36, file.settings.globalNumberOfBottomLayers, true);
    newFile.setFloat32(48 + 40, file.settings.peelDistance, true);
    newFile.setFloat32(48 + 44, file.settings.peelSpeed, true);
    newFile.setFloat32(48 + 48, file.settings.peelReturnSpeed, true);
    //newFile.setFloat32(48 + 52, 69420, true); //volume
    newFile.setUint32(48 + 56, file.settings.globalNumberOfSublayers, true);
    newFile.setUint32(48 + 60, 1440, true);
    newFile.setUint32(48 + 64, 2560, true);
    //newFile.setFloat32(48 + 68, 69420, true); //weight
    //newFile.setFloat32(48 + 72, 69420, true); //price
    //newFile.setUint32(48 + 76, 69420, true); //resin Type
    newFile.setUint32(48 + 80, 1, true); //use Individual Parameters? (1/0)

    //PREVIEW section
    newFile.setUint32(144 + 12, 75276, true); // preview data length
    newFile.setUint32(144 + 16, 224, true);
    newFile.setUint32(144 + 20, 42, true); // the answer to everything aparrently
    newFile.setUint32(144 + 24, 168, true);

    //////////////////////////////////////////////////////////////////////////

    for(i = 0; i < (sThumb_string.length/2); i++){
      index = i*2;
      newFile.setUint8(172 + i, parseInt("0x" + sThumb_string.charAt(index) + sThumb_string.charAt(index+1)));
    }

    //////////////////////////////////////////////////////////////////////////

    newFile.setUint32(75452, file.settings.numberOfLayers, true);

    currentLayerOffset = 75456 + (file.settings.numberOfLayers * 32); //+20 LAYERDEF size and numLayers already added
    layerHeadersOffset = 75456;

    for(i = 0; i < file.settings.numberOfLayers; i++){
        let offset = layerHeadersOffset + (32 * i);
        newFile.setUint32(offset, currentLayerOffset, true); //address
        newFile.setUint32(offset+4, layerData.layers[i].lengthLayerData, true); //dataLength

        for(j = 0; j < file.settings.globalNumberOfSublayers; j++){
          let currLayer = layerData.layers[i].sublayers[j].data;
          for(run = 0; run < currLayer.length; run++){
              newFile.setUint8(currentLayerOffset + run, currLayer[run]);
          }
          currentLayerOffset += layerData.layers[i].sublayers[j].lengthSublayerData;
        }

        newFile.setFloat32(offset+8, file.settings.peelDistance, true);
        newFile.setFloat32(offset+12, file.settings.peelSpeed, true);
        newFile.setUint32(offset+16, file.layers[i].exposureTime, true);
        newFile.setUint32(offset+20, file.layers[i].layerheight, true);
    }

    saveByteArray(newFileArrayBuffer, file.settings.name + "_converted", ".pws");
}
