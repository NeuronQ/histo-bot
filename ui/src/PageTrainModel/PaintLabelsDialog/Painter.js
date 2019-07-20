export default class Painter {
  constructor({canvas, container, dx, dy, url, setDirty, getBrushMode, getBrushColor}) {
    this.canvas = canvas;
    this.container = container;
    this.dx = dx;
    this.dy = dy;
    this.setDirty = setDirty;
    this.getBrushMode = getBrushMode;
    this.getBrushColor = getBrushColor;

    this._cx = this.canvas.getContext("2d");
    this._isPaint = false;
    this._lastX = null;
    this._lastY = null;

    if (url) this._loadAndDrawImage(url);

    this._cx.imageSmoothingEnabled = false;
    this._cx.lineJoin = "round";
    this._cx.lineWidth = 4;
    this._cx.globalCompositeOperation = "source-over";

    this.canvas.addEventListener("mousedown", ev => this._onBrushDown(ev), false);
    this.canvas.addEventListener("touchstart", ev => this._onBrushDown(ev, true), false);

    this.canvas.addEventListener("mousemove", ev => this._onBrushMove(ev), false);
    this.canvas.addEventListener("touchmove", ev => this._onBrushMove(ev, true), false);

    this.canvas.addEventListener("mouseup", this._onBrushUp, false);
    this.canvas.addEventListener("touchend", this._onBrushUp, false);
  }

  removePixels = (removeRGB, keepRGBs) => {
    const imdata = this._cx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    const pxs = imdata.data;

    let r, g, b, a, rgb, isMatchedRGB;
    for (let i = 0, n = pxs.length; i < n; i += 4) {
      [r, g, b, a] = [pxs[i], pxs[i + 1], pxs[i + 2], pxs[i + 3]];

      // clean up semitransparent pixels
      if (a !== 255) {
        pxs[i] = pxs[i + 1] = pxs[i + 2] = pxs[i + 3] = 0;
        continue;
      }

      // clean up removed segment pixels
      if (r === removeRGB[0] && g === removeRGB[1] && b === removeRGB[2]) {
        pxs[i] = pxs[i + 1] = pxs[i + 2] = pxs[i + 3] = 0;
        continue;
      }

      // clean up pixels that match no known segments
      isMatchedRGB = false;
      for (let j = 0, nj = keepRGBs.length; j < nj; j++) {
        rgb = keepRGBs[j];
        if (rgb[0] === r && rgb[1] === g && rgb[2] === b) {
          isMatchedRGB = true;
        }
      }
      if (!isMatchedRGB) {
        pxs[i] = pxs[i + 1] = pxs[i + 2] = pxs[i + 3] = 0;
      }
    }
    this._cx.putImageData(imdata, 0, 0);

    this.setDirty(true);
  };

  getDataURL = () => this.canvas.toDataURL();

  _loadAndDrawImage(url) {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      this._cx.drawImage(img, 0, 0);
    };
    img.src = url;
  }

  _onBrushDown = (ev, isTouch) => {
    this.setDirty(true);
    this._isPaint = true;

    this._cx.strokeStyle = this.getBrushColor();

    const [bx, by] = this.constructor.getBrushPos(ev, isTouch);

    const rx = bx + this.container.scrollLeft + this.dx;
    const ry = by + this.container.scrollTop + this.dy;

    this._cx.beginPath();
    this._cx.moveTo(rx, ry);
    this._cx.lineTo(rx + 1, ry + 1);
    this._cx.closePath();
    this._cx.stroke();

    this._lastX = rx;
    this._lastY = ry + 1;
  };

  _onBrushMove = (ev, isTouch) => {
    if (!this._isPaint) return;

    const [bx, by] = this.constructor.getBrushPos(ev, isTouch);

    const brushMode = this.getBrushMode();
    if (brushMode === "draw") {
      this._cx.globalCompositeOperation = "source-over";
    } else if (brushMode === "erase") {
      this._cx.globalCompositeOperation = "destination-out";
    }

    const rx = bx + this.container.scrollLeft + this.dx;
    const ry = by + this.container.scrollTop + this.dy;

    this._cx.beginPath();
    this._cx.moveTo(this._lastX, this._lastY);
    this._cx.lineTo(rx, ry);
    this._cx.closePath();
    this._cx.stroke();

    this._lastX = rx;
    this._lastY = ry;
  };

  _onBrushUp = () => (this._isPaint = false);

  static getBrushPos = (event, isTouch) => {
    if (!isTouch) {
      return [event.clientX, event.clientY];
    } else {
      return [event.touches[0].clientX, event.touches[0].clientY];
    }
  };
}
