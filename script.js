const containerEl = document.querySelector('.cropper-container');
const maskPictureEl = document.querySelector('.cropper-mask');
const cropViewEl = document.querySelector('.cropper-view');
const renderBoxEl = document.querySelector('.cropper-render');

const zoomContainerEl = document.querySelector('.zoom-container');
const zoomCircleEl = document.querySelector('.zoom-circle');

const imageSrcInputEl = document.getElementById('img-source-input');
const imageSrcButtonEl = document.getElementById('change-img-btn');
const cropButtonEl = document.getElementById('get-crop-data-btn');
const downloadButtonEl = document.getElementById('download-img-btn');

const originalMaskSize = [0, 0];
const originalTransform = [0, 0];

let downloadHref = '';

const props = {
  cropWidth: '98%',
  cropAspectRatio: '16 / 9',
  // cropHeight: '50px',
};

// --- Utils ---
function parseTransformValues(element) {
  const transformValue = element.style.transform;
  if (!transformValue) {
    return [0, 0, 0];
  }
  const values = transformValue
    .replace(/(translate|3d|px|\(|\)|\s)/g, '')
    .split(',');
  return values.map((n) => Number(n));
}

function getMoveLimit(value, direction) {
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

function setupCropImage() {
  cropViewEl.style.width = props.cropWidth;

  if (props.cropHeight) {
    cropViewEl.style.height = props.cropHeight;
  } else {
    cropViewEl.style.aspectRatio = props.cropAspectRatio;
  }

  const isMaskLandscape =
    maskPictureEl.naturalWidth > maskPictureEl.naturalHeight;
  const isCropLandscape = cropViewEl.clientWidth > cropViewEl.clientHeight;
  const widthScaleRatio = cropViewEl.clientWidth / maskPictureEl.naturalWidth;
  const heightScaleRatio =
    cropViewEl.clientHeight / maskPictureEl.naturalHeight;

  if (
    (isMaskLandscape && isCropLandscape) ||
    (!isMaskLandscape && isCropLandscape)
  ) {
    maskPictureEl.style.height = 'auto';
    maskPictureEl.style.width = `${
      maskPictureEl.naturalWidth * widthScaleRatio
    }px`;
  }

  if (
    (isMaskLandscape && !isCropLandscape) ||
    (!isMaskLandscape && !isCropLandscape)
  ) {
    maskPictureEl.style.width = 'auto';
    maskPictureEl.style.height = `${
      maskPictureEl.naturalHeight * heightScaleRatio
    }px`;
  }

  originalMaskSize[0] = maskPictureEl.clientWidth;
  originalMaskSize[1] = maskPictureEl.clientHeight;
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
      const translateX = getMoveLimit(movedX, 'x');
      const translateY = getMoveLimit(movedY, 'y');
      originalTransform[0] = translateX;
      originalTransform[1] = translateY;
      maskPictureEl.style.transform = `translate3d(${translateX}px, ${translateY}px, 0)`;
    }
  }

  containerEl.addEventListener('pointerdown', startMove);
  containerEl.addEventListener('pointermove', mouseMove);
  containerEl.addEventListener('pointerup', cancelMove);
  containerEl.addEventListener('pointerleave', cancelMove);

  return { resetCropper };
}
const Cropper = initCropper();

// --- Zoom handler ---
function updateZoomAnchorPosition(offsetX) {
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

function initZoom() {
  let canMove = false;

  function scaleCropPicture(e) {
    const zoomPercentage = (e.offsetX * 100) / zoomContainerEl.clientWidth;
    if (zoomPercentage <= 0 || zoomPercentage >= 100) return;
    const scaledWidth = (originalMaskSize[0] * zoomPercentage) / 100;
    const scaledHeight = (originalMaskSize[1] * zoomPercentage) / 100;
    maskPictureEl.style.width = `${originalMaskSize[0] + scaledWidth}px`;
    maskPictureEl.style.height = `${originalMaskSize[1] + scaledHeight}px`;
    scaleTransform(zoomPercentage);
  }

  function scaleTransform(percentage) {
    const scaledX = (originalTransform[0] * percentage) / 100;
    const scaledY = (originalTransform[1] * percentage) / 100;
    const translateX = getMoveLimit(originalTransform[0] + scaledX, 'x');
    const translateY = getMoveLimit(originalTransform[1] + scaledY, 'y');
    maskPictureEl.style.transform = `translate3d(${translateX}px, ${translateY}px, 0)`;
  }

  function startMove(e) {
    e.stopPropagation();
    canMove = true;
    updateZoomAnchorPosition(e.offsetX);
    scaleCropPicture(e);
  }

  function onMove(e) {
    e.stopPropagation();
    if (!canMove) return;
    updateZoomAnchorPosition(e.offsetX);
    scaleCropPicture(e);
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

  rawImage.addEventListener('load', function () {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

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

    canvas.width = scaledCropWidth;
    canvas.height = scaledCropHeight;

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

    const imageSrc = canvas.toDataURL('image/jpeg');
    downloadHref = imageSrc;
    canvas.remove();

    const endImage = new Image(cropWidth, cropHeight);
    endImage.src = imageSrc;
    renderBoxEl.innerHTML = '';
    renderBoxEl.appendChild(endImage);
  });
}

function downloadCroppedImage() {
  if (!downloadHref) return;
  const tempLink = document.createElement('a');
  const fileName = 'cropped-image';
  tempLink.download = `${fileName}-${Date.now()}.jpg`;
  tempLink.href = downloadHref;
  tempLink.click();
}

// --- unrelated parts ---
function updateCropImageSrc() {
  const value = imageSrcInputEl.value;
  maskPictureEl.src = value;
  updateZoomAnchorPosition(0);
  Cropper.resetCropper();
}

updateCropImageSrc();

cropButtonEl.addEventListener('click', renderCroppedImage);
imageSrcButtonEl.addEventListener('click', updateCropImageSrc);
maskPictureEl.addEventListener('load', setupCropImage);
downloadButtonEl.addEventListener('click', downloadCroppedImage);
