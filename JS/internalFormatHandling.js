/* description

SlicedFile
  Flags
    Source Data uses Global Exposure Time
    Source Data uses Global Layer Height
    Source Data uses Global Bottom Layer Settings
    Source Data uses Global Sublayer Count
    Source Data uses Evenly Divided SubLayer Exposure

  File Settings
    Number of Layers
    Resolution X
    Resolution Y
    Build Volume X
    Build Volume Y
    Build Volume Z
    Physical Pixel Size
    Global Layer Height
    Global Exposure Time
    Global Number of Bottom Layers
    Global Bottom Exposure Time
    Global Sublayer Count
    Light Off Time
    Lift Distance
    Lift Speed
    Return Speed

  Preview Image
    Resolution X
    Resolution Y

  Layer Data [
    Layer 1
      Number of Sublayers
      Exposure Time
      Layer Height
      Sublayers [
        Sublayer 1 // full exposure
          ExposureTime
          Data
        Sublayer 2
        Sublayer 3
        .
        .
        .
        Sublayer N // 1/n exposure
      ]
    Layer 2
    Layer 3
    .
    .
    .
    Layer N
  ]
*/
/* basic implementation
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
  numberOfLayers : 1,
  resolutionX : 1440,
  resolutionY : 2560,
  buildVolumeX : 68.04,
  buildVolumeY : 120.96,
  buildVolumeZ : 160.0,
  physicalPixelSize : 47.25,
  globalLayerHeight : 0.05,
  globalExposureTime : 8.0,
  globalNumberOfBottomLayers : 8,
  globalBottomExposureTime : 60.0,
  globalNumberOfSublayers : 1,
  globalLightOffTime : 1.0,
  peelDistance : 6.0,
  peelLiftSpeed : 3,
  peelReturnSpeed : 3
};

let previewImage = {
  resolutionX : 640,
  resolutionY : 480,
  imageData : {}
};

let sublayer = {
  exposureTime : 0.05,
  layerData : {}
};

let sublayers = [sublayer];

let layer = {
  numberOfSublayers : 1,
  exposureTime : 8.0,
  lightOffTime: 1.0,
  layerHeight : 0.05,
  positionZ : 0,
  subLayers : sublayers
};

let layers = [layer];

let loadedFile = {
  flags : flags,
  settings : settings,
  previewImage : previewImage,
  layers : layers
} */

function encodeLayerData(file, type){ // type specifies the file type
  encodedLayers = []
  lengthFileData = 0;
  for(currentLayerIndex = 0; currentLayerIndex < file.settings.numberOfLayers; currentLayerIndex++){
    encodedSublayers = []
    lengthLayerData = 0;
    for(currentSublayerIndex = 0; currentSublayerIndex < file.settings.globalNumberOfSublayers; currentSublayerIndex++){
      data = file.layers[currentLayerIndex].subLayers[currentSublayerIndex].layerData;
      convertedData = convertToRuns(data, type);
      let encodedSublayer = {
        lengthSublayerData: convertedData.length,
        data: convertedData
      }
      lengthLayerData += convertedData.length;
      encodedSublayers.push(encodedSublayer);
      if(type == "photons") currentSublayerIndex = file.settings.globalNumberOfSublayers;
    }
    let encodedLayer = {
      lengthLayerData: lengthLayerData,
      sublayers: encodedSublayers
    }
    lengthFileData += lengthLayerData;
    encodedLayers.push(encodedLayer)
  }
  let encodedFile = {
    lengthFileData: lengthFileData,
    layers: encodedLayers
  }
  return encodedFile
}

logs = 0;

function convertToRuns(data, type){
  maxRunLength = 125;
  if(type == 'photons') maxRunLength = 128;
  convertedData = [];
  currentRunColor = data.get(0);
  currentRunLength = 1;
  for(pixel = 1; pixel < 3686400; pixel++){
    newColor = data.get(pixel);
    if(newColor != currentRunColor){
        convertedData.push(runToByte(currentRunColor, currentRunLength, type));
        currentRunColor = newColor;
        currentRunLength = 1;
    }else{
      if(currentRunLength == maxRunLength){
        convertedData.push(runToByte(currentRunColor, currentRunLength, type));
        currentRunLength = 1;
      }else{
        currentRunLength++;
      }
    }
  }
  if(currentRunLength > 0){
    convertedData.push(runToByte(currentRunColor, currentRunLength, type));
  }
  return convertedData;
}

function runToByte(color, length, type){
  switch(type){
    case 'pws': case 'photon':
      return length | (color * 128);
    break;
    case 'photons':
      length--;
      out = (length & 1 ? 128 : 0) |
            (length & 2 ? 64 : 0) |
            (length & 4 ? 32 : 0) |
            (length & 8 ? 16 : 0) |
            (length & 16 ? 8 : 0) |
            (length & 32 ? 4 : 0) |
            (length & 64 ? 2 : 0) | color ;
      return out;
    break;
  }
}
