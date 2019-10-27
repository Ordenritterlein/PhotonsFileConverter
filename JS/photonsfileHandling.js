function readPhotonsFile(file){

  let header = {
    bedSizeX: 68.04,
    bedSizeY: 120.96,
    bedSizeZ: 160.0,
    layerThickness: d.getFloat64(14, false), // Big endian!
    exposureTime: d.getFloat64(22, false),
    bottomExposureTime: d.getFloat64(38, false),
    offTime: d.getFloat64(30, false),
    bottomLayers: d.getUint32(46, false),
    resX: 1440, //is now for some reason per layer so also hardcode.
    resY: 2560,
    numLayers: d.getUint32(75362, false), // preview Image size and position is hardcoded now

    AALevel : 1,
    AALowExposure: 0, //proposed min exposure term for calibrating AA better and for the Exposure Test to be more useful

    zLift: d.getFloat64(50, false),
    zRetract: d.getFloat64(58, false),
    zSpeed: d.getFloat64(66, false)
  };

  let layers = [];

  currentLayerOffset = 75366;  // layers always start after the hardcoded Preview image, so, also hardcoded.
  currentLayerZPos = header.layerThickness;

  for (let i = 0; i < header.numLayers; ++i) {

    let layer = {
      position: currentLayerZPos,
      layerDataPosition: currentLayerOffset + 28,
      dataSize: d.getUint32(currentLayerOffset + 20, false) /8
    };

    currentLayerOffset += layer.dataSize + 24;
    currentLayerZPos += header.layerThickness;

    layers.push(layer);
  }

  fileData = {
    fileDataView: d,
    header: header,
    layers: layers
  };

  return fileData;
}

function savePhotonsFile(data){

}
