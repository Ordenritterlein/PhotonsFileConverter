function convertLayersToBitArrays(){
    let layers = [];
    let numPixelsInLayer = 2560 * 1440;
    for(i = 0; i < photonFile.header.layers; i++){

        let currLayerArray = new BitArray(numPixelsInLayer);
        let layer = photonFile.layers[i];
        let o = layer.dataOffset;
        let pixelPos = 0;
        while(pixelPos < numPixelsInLayer){
            let run = photonFile.fileDataView.getInt8(o++);
            let col = false
            if (run < 0){run = 128 + run; col = true;}
            for(j = 0; j < run; j++){
              currLayerArray.set(pixelPos+j, col);
            }
            pixelPos+=run;
        }
        layers.push(currLayerArray);
    }
    return layers;
}

function bitArraysToRuns(inLayers){
  let layers = [];
  for(i = 0; i < inLayers.length; i++){
    let inLayer = inLayers[i];
    let layer = []
    let currRun = 0;
    let currRunCol = inLayer.get(0);
    for(pixelPos = 0; pixelPos < (2560 * 1440); pixelPos++){
      if(inLayer.get(pixelPos) == currRunCol && currRun < 125){
        currRun++;
      }else{
        layer.push(currRun | (currRunCol ? 0x80 : 0));
        currRunCol = inLayer.get(pixelPos);
        currRun = 1;
      }
    }
    if(currRun > 0){
      layer.push(currRun | (currRunCol ? 0x80 : 0));
    }
    layers.push(layer);
  }
  return layers;
}

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

    if (pixelCount < 0)
    {
      pixelCount = 128 + pixelCount;
      currCol = 1;
      numWhitePxInLayer += pixelCount;
    } else {
      currCol = 0;
    }

    if(currCol == oldCol) currRun += pixelCount;
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

  for(i = 0; i < long_lengths.length; i++){
    col = long_colors[i];
    len = long_lengths[i];
    numRuns = Math.floor(len/128);
    remainder = len%128;
    for(j = 0; j < numRuns; j++){
      short_colors.push(col);
      short_lengths.push(128);
    }
    if(remainder>0){
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

function checkArraysForCoverage(inList){ // checks if all pixels in an aa layer are correct. a pixel is invalid , if it's supposed to be  a 1/4th exposure, but only the 2nd, 3rd and 4th layers are set
  for(var i = 0; i < 3686400; i++){
    hasBeen0 = false;
    for(var j = 0; j < 8; j++){
        colPixel = inList[j].get(i);
        if(colPixel == 0) hasBeen0 = true;
        //if(hasBeen0 && colPixel == 1) console.log("pixel at " + i + " has an error");
    }
  }
  console.log("file has been checked");
}

function saveSublayer(startPos, numBytes, d){ // saves numBytes of a binary file d starting at start pos
  newFileArrayBuffer = new ArrayBuffer(numBytes);
  newFile = new DataView(newFileArrayBuffer);
  for(var i = 0; i < numBytes; i++){
      newFile.setUint8(i, d.getUint8(startPos+i));
  }
  saveByteArray(newFileArrayBuffer, "SLayer" + sublayer, ".sl");
}

function savePngLayers(inList){ // save bit array as png, supports AA as grayscale
  console.log("running");
  //for(var i = 0; i < 8; i++){
  AAMultiple = Math.min(Math.round(255 / inList.length),255);

  layerPixels = new Uint8Array(3686400*4);
  for(var j = 0; j < 3686400; j++){
    pixVal = 0
    hasBeen0 = false;
    pixError = false;
    for(var i = 0; i < inList.length; i++){
        subpixCol = inList[i].get(j);
        pixVal += subpixCol
        if(subpixCol == 0) hasBeen0 = true;
        if(hasBeen0 && subpixCol == 1) pixError = true;
    }
    pixCol = Math.min(pixVal*AAMultiple,255);
    layerPixels[j*4] = 255;
    layerPixels[(j*4)+3] = 255;
    if(!pixError){
      layerPixels[j*4] = pixCol;
      layerPixels[(j*4)+1] = pixCol;
      layerPixels[(j*4)+2] = pixCol;
    }
  }
  png = UPNG.encode([layerPixels.buffer], 1440, 2560, 0);
  saveByteArray(png, "Layer" + i, ".png");
  //}
}

function readPngLayer(layer){ // read png and save as encoded pws/photon layer only 1bit grayscale.
  var pngImport = UPNG.decode(layer);
  var pixelData = new DataView(UPNG.toRGBA8(pngImport)[0]);
  var outRunsArray = [];
  currentRun = 1;
  currentCol = Math.round(pixelData.getUint8(0)/255);
  for(var i = 1; i < 3686400; i++){
      col = Math.round(pixelData.getUint8(i*4)/255);
      if(currentCol == col){
        if(currentRun == 125){
          outRunsArray.push(currentRun | (col<<7));
          currentRun=0;
        }
        currentRun++;
      }else{
        outRunsArray.push(currentRun | (currentCol<<7));
        currentCol = col;
        currentRun = 1;
      }
  }

  if(currentRun > 0){
      outRun = (currentCol<<7) | currentRun;
      outRunsArray.push(outRun);
  }

  newFileArrayBuffer = new ArrayBuffer(outRunsArray.length);
  newFile = new DataView(newFileArrayBuffer);
  for(var i = 0; i < outRunsArray.length; i++){
      newFile.setUint8(i, outRunsArray[i]);
  }
  saveByteArray(newFileArrayBuffer, "layer", ".sl");
}

function outputLayerHeaderData(file){

  for (let currentLayerIndex = 0; currentLayerIndex < 24; currentLayerIndex++) {

    o = currentLayerIndex * 36;

    let oneHeader = {
      position: file.getFloat32(o + 0, true),
      exposureTime: file.getFloat32(o + 4, true),
      offTime: file.getFloat32(o + 8, true),
      dataOffset: file.getUint32(o + 12, true),
      dataSize: file.getUint32(o + 16, true)
    };

    console.log(oneHeader);
  }
}
