import * as Comlink from 'comlink';
import { ImageBitmapLoader} from 'three';

const bitmapLoader = new ImageBitmapLoader();
bitmapLoader.setOptions({ imageOrientation: 'flipY' });


function getNearestPowerOfTwo(value: number) {
  return Math.pow(2, Math.round(Math.log2(value)));
}

const obj = {
  async loadTexture(url: string) {
    const image = await bitmapLoader.loadAsync(url);

    const width = getNearestPowerOfTwo(image.width);
    const height = getNearestPowerOfTwo(image.height);

    const offscreenCanvas = new OffscreenCanvas(width, height);

    const ctx = offscreenCanvas.getContext('2d');
    ctx?.drawImage(image, 0, 0, width, height);

    const blob = await offscreenCanvas.convertToBlob();
    const bitmap = await createImageBitmap(blob);
    return bitmap;
  },
};

Comlink.expose(obj);
