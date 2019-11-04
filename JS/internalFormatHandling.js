/*

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
}
