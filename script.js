const containerEl = document.querySelector('.cropper-container');
const maskPictureEl = document.querySelector('.cropper-mask');
const cropViewEl = document.querySelector('.cropper-view');
const renderAreaEl = document.querySelector('.cropper-render');

const zoomContainerEl = document.querySelector('.zoom-container');
const zoomCircleEl = document.querySelector('.zoom-circle');

const imageSrcInputEl = document.getElementById('img-source-input');
const imageSrcButtonEl = document.getElementById('change-img-btn');
const cropButtonEl = document.getElementById('get-crop-data-btn');
const downloadButtonEl = document.getElementById('download-img-btn');

const propWidthInputEl = document.getElementById('prop-width-input');
const propAspectRatioInputEl = document.getElementById('prop-asratio-input');
const propChangeBtnEl = document.getElementById('change-props-btn');

const originalMaskSize = [0, 0];

let croppedImageBase64 = '';

// --- Utils ---
function parseTransformValues(element) {
  const transformValue = element.style.transform;
  if (!transformValue) return [0, 0, 0];
  return transformValue
    .replace(/(translate|3d|px|\(|\)|\s)/g, '')
    .split(',')
    .map((n) => Number(n));
}

function clampMaskPicturePosition(value, direction) {
  const maskWidth = maskPictureEl.clientWidth;
  const maskHeight = maskPictureEl.clientHeight;

  const moveLimit = {
    x: (maskWidth - cropViewEl.clientWidth) / 2,
    y: (maskHeight - cropViewEl.clientHeight) / 2,
  };

  const limitValue = moveLimit[direction];

  if (Math.abs(value) >= limitValue) {
    return limitValue * (value > 0 ? 1 : -1);
  }
  return value;
}

function renderMaskPicture() {
  renderCropView();

  const { naturalWidth, naturalHeight } = maskPictureEl;
  const aspectRatio = naturalWidth / naturalHeight;
  const widthRatio = cropViewEl.clientWidth / naturalWidth;
  const heightRatio = cropViewEl.clientHeight / naturalHeight;

  let renderWidth = naturalWidth * widthRatio;
  let renderHeight = 'auto';

  const estimatedRenderHeight = renderWidth / aspectRatio;
  if (estimatedRenderHeight < cropViewEl.clientHeight) {
    renderWidth = 'auto';
    renderHeight = naturalHeight * heightRatio;
  }

  const parseDimension = (value) => {
    return typeof value === 'string' ? value : value + 'px';
  };

  maskPictureEl.style.width = parseDimension(renderWidth);
  maskPictureEl.style.height = parseDimension(renderHeight);

  originalMaskSize[0] = maskPictureEl.clientWidth;
  originalMaskSize[1] = maskPictureEl.clientHeight;
  Cropper.resetCropper();
}

function renderCropView() {
  cropViewEl.style.width = propWidthInputEl.value;
  cropViewEl.style.aspectRatio = propAspectRatioInputEl.value;
}

// --- Cropper ---
function initCropper() {
  let canMove = false;
  let startPositions = [0, 0];
  let lastPositions = [0, 0];

  function resetCropper() {
    startPositions = [0, 0];
    lastPositions = [0, 0];
    canMove = false;
    maskPictureEl.style.transform = `translate3d(0, 0, 0)`;
  }

  function updateLastPositions(x, y) {
    console.log('updated last position', x, y);
    lastPositions = [x, y];
  }

  function startMove(e) {
    e.stopPropagation();
    canMove = true;
    startPositions = [e.offsetX, e.offsetY];
  }

  function cancelMove(e) {
    e.stopPropagation();
    canMove = false;
    startPositions = [0, 0];
    const [xValue, yValue] = parseTransformValues(maskPictureEl);
    lastPositions[0] = xValue;
    lastPositions[1] = yValue;
  }

  function mouseMove(e) {
    const { offsetX, offsetY } = e;

    if (canMove) {
      let movedX = lastPositions[0] + (offsetX - startPositions[0]);
      let movedY = lastPositions[1] + (offsetY - startPositions[1]);
      const translateX = clampMaskPicturePosition(movedX, 'x');
      const translateY = clampMaskPicturePosition(movedY, 'y');
      maskPictureEl.style.transform = `translate3d(${translateX}px, ${translateY}px, 0)`;
    }
  }

  containerEl.addEventListener('pointerdown', startMove);
  containerEl.addEventListener('pointermove', mouseMove);
  containerEl.addEventListener('pointerup', cancelMove);
  containerEl.addEventListener('pointerleave', cancelMove);

  return { resetCropper, updateLastPositions };
}
const Cropper = initCropper();

// --- Zoom handler ---
function updateZoomAnchor(offsetX) {
  const circleRadius = zoomCircleEl.clientWidth / 2;
  const containerWidth = zoomContainerEl.clientWidth;

  if (offsetX <= circleRadius) {
    zoomCircleEl.style.left = 0;
    return;
  }

  if (offsetX >= containerWidth - circleRadius) {
    const maxLeft = containerWidth - zoomCircleEl.clientWidth;
    zoomCircleEl.style.left = `${maxLeft}px`;
    return;
  }

  zoomCircleEl.style.left = `${offsetX - circleRadius}px`;
}

function zoomMaskPicture(e) {
  const zoomPercentage = (e.offsetX * 100) / zoomContainerEl.clientWidth;
  if (zoomPercentage <= 0 || zoomPercentage >= 100) return;
  const scaledWidth = (originalMaskSize[0] * zoomPercentage) / 100;
  const scaledHeight = (originalMaskSize[1] * zoomPercentage) / 100;
  maskPictureEl.style.width = `${originalMaskSize[0] + scaledWidth}px`;
  maskPictureEl.style.height = `${originalMaskSize[1] + scaledHeight}px`;
  zoomTransform();
}

function zoomTransform() {
  const [x, y] = parseTransformValues(maskPictureEl);
  const translateX = clampMaskPicturePosition(x, 'x');
  const translateY = clampMaskPicturePosition(y, 'y');
  maskPictureEl.style.transform = `translate3d(${translateX}px, ${translateY}px, 0)`;
}

function initZoom() {
  let canMove = false;

  function startMove(e) {
    e.stopPropagation();
    canMove = true;
    updateZoomAnchor(e.offsetX);
    zoomMaskPicture(e);
  }

  function onMove(e) {
    e.stopPropagation();
    if (!canMove) return;
    updateZoomAnchor(e.offsetX);
    zoomMaskPicture(e);
  }

  function cancelMove(e) {
    e.stopPropagation();
    canMove = false;
  }

  zoomContainerEl.addEventListener('pointerdown', startMove);
  zoomContainerEl.addEventListener('pointermove', onMove);
  zoomContainerEl.addEventListener('pointerup', cancelMove);
  zoomContainerEl.addEventListener('pointerleave', cancelMove);
}

initZoom();

// --- Render & Downdload ---
function renderCroppedImage() {
  const rawImage = new Image();
  rawImage.src = maskPictureEl.getAttribute('src');
  rawImage.crossOrigin = 'anonymous';

  function onRawImageLoaded() {
    const tempCanvas = document.createElement('canvas');
    const ctx = tempCanvas.getContext('2d');

    const { clientWidth, clientHeight } = maskPictureEl;
    const [translatedX, translatedY] = parseTransformValues(maskPictureEl);

    const xScaleRatio = this.naturalWidth / clientWidth;
    const yScaleRatio = this.naturalHeight / clientHeight;

    const cropWidth = cropViewEl.clientWidth;
    const cropHeight = cropViewEl.clientHeight;
    const scaledCropWidth = cropWidth * xScaleRatio;
    const scaledCropHeight = cropHeight * yScaleRatio;

    const centerX = clientWidth / 2;
    const centerY = clientHeight / 2;
    const drawStartX = centerX - cropWidth / 2 - translatedX;
    const drawStartY = centerY - cropHeight / 2 - translatedY;

    tempCanvas.width = scaledCropWidth;
    tempCanvas.height = scaledCropHeight;

    ctx.drawImage(
      rawImage,
      drawStartX * xScaleRatio,
      drawStartY * yScaleRatio,
      scaledCropWidth,
      scaledCropHeight,
      0,
      0,
      scaledCropWidth,
      scaledCropHeight
    );

    const base64 = tempCanvas.toDataURL('image/jpeg');
    croppedImageBase64 = base64;
    tempCanvas.remove();

    const croppedImageEl = new Image(cropWidth, cropHeight);
    croppedImageEl.src = base64;
    renderAreaEl.innerHTML = '';
    renderAreaEl.appendChild(croppedImageEl);
  }

  rawImage.addEventListener('load', onRawImageLoaded);
}

function downloadCroppedImage() {
  if (!croppedImageBase64) return;
  const tempLink = document.createElement('a');
  const fileName = 'cropped-image';
  tempLink.download = `${fileName}-${Date.now()}.jpg`;
  tempLink.href = croppedImageBase64;
  tempLink.click();
  tempLink.remove();
}

// --- unrelated parts ---
function updateMaskPictureSrc() {
  const value = imageSrcInputEl.value;
  maskPictureEl.src = value;
  updateZoomAnchor(0);
  Cropper.resetCropper();
}

updateMaskPictureSrc();

cropButtonEl.addEventListener('click', renderCroppedImage);
imageSrcButtonEl.addEventListener('click', updateMaskPictureSrc);
downloadButtonEl.addEventListener('click', downloadCroppedImage);
maskPictureEl.addEventListener('load', renderMaskPicture);
propChangeBtnEl.addEventListener('click', renderMaskPicture);
