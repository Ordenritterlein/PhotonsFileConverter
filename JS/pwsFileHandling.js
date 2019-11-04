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

function savePwsFile(data){

}
