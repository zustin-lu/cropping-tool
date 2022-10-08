const containerEl = document.querySelector('.cropper-container');
const maskEl = document.querySelector('.cropper-mask');
const cropEl = document.querySelector('.cropper-view');
const renderBoxEl = document.querySelector('.cropper-render');

const originalMaskSize = [0, 0];
const originalTransform = [0, 0];

const props = {
  cropWidth: '45%',
  cropAspectRatio: '9 / 16',
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
  const maskWidth = maskEl.clientWidth;
  const maskHeight = maskEl.clientHeight;

  const moveLimit = {
    x: (maskWidth - cropEl.clientWidth) / 2,
    y: (maskHeight - cropEl.clientHeight) / 2,
  };

  const limitValue = moveLimit[direction];

  if (Math.abs(value) >= limitValue) {
    return limitValue * (value > 0 ? 1 : -1);
  }
  return value;
}

// -- setup --
function prepareUI() {
  cropEl.style.width = props.cropWidth;

  if (props.cropHeight) {
    cropEl.style.height = props.cropHeight;
  } else {
    cropEl.style.aspectRatio = props.cropAspectRatio;
  }

  const isMaskLandscape = maskEl.naturalWidth > maskEl.naturalHeight;
  const isCropLandscape = cropEl.clientWidth > cropEl.clientHeight;
  const widthScaleRatio = cropEl.clientWidth / maskEl.naturalWidth;
  const heightScaleRatio = cropEl.clientHeight / maskEl.naturalHeight;

  if (
    (isMaskLandscape && isCropLandscape) ||
    (!isMaskLandscape && isCropLandscape)
  ) {
    maskEl.style.height = 'auto';
    maskEl.style.width = `${maskEl.naturalWidth * widthScaleRatio}px`;
  }

  if (
    (isMaskLandscape && !isCropLandscape) ||
    (!isMaskLandscape && !isCropLandscape)
  ) {
    maskEl.style.width = 'auto';
    maskEl.style.height = `${maskEl.naturalHeight * heightScaleRatio}px`;
  }

  originalMaskSize[0] = maskEl.clientWidth;
  originalMaskSize[1] = maskEl.clientHeight;
}
prepareUI();

// --- Cropper core ---
function initCropper() {
  let canMove = false;
  let startPositions = [0, 0];
  let lastPositions = [0, 0];

  function startMove(e) {
    e.stopPropagation();
    canMove = true;
    startPositions = [e.offsetX, e.offsetY];
  }

  function cancelMove(e) {
    e.stopPropagation();
    canMove = false;
    startPositions = [0, 0];
    const [xValue, yValue] = parseTransformValues(maskEl);
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
      maskEl.style.transform = `translate3d(${translateX}px, ${translateY}px, 0)`;
    }
  }

  containerEl.addEventListener('pointerdown', startMove);
  containerEl.addEventListener('pointermove', mouseMove);
  containerEl.addEventListener('pointerup', cancelMove);
  containerEl.addEventListener('pointerleave', cancelMove);
}
initCropper();

// --- Others ---
const cropButton = document.getElementById('get-crop-data-btn');

cropButton.addEventListener('click', function () {
  const rawImage = new Image();
  rawImage.src = maskEl.getAttribute('src');
  rawImage.crossOrigin = 'anonymous';

  rawImage.addEventListener('load', function () {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    const { clientWidth, clientHeight } = maskEl;
    const [translatedX, translatedY] = parseTransformValues(maskEl);

    const xScaleRatio = this.naturalWidth / clientWidth;
    const yScaleRatio = this.naturalHeight / clientHeight;

    const cropWidth = cropEl.clientWidth;
    const cropHeight = cropEl.clientHeight;
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

    const endImage = new Image(cropWidth, cropHeight);
    endImage.src = canvas.toDataURL('image/jpeg');
    renderBoxEl.innerHTML = '';
    renderBoxEl.appendChild(endImage);
  });
});

// --- Zoom handler ---
const zoomContainerEl = document.querySelector('.zoom-container');
const zoomCircleEl = document.querySelector('.zoom-circle');

function initZoom() {
  let canMove = false;

  function updateAnchorPosition(e) {
    const circleRadius = zoomCircleEl.clientWidth / 2;
    const containerWidth = zoomContainerEl.clientWidth;

    if (e.offsetX <= circleRadius) {
      zoomCircleEl.style.left = 0;
      return;
    }

    if (e.offsetX >= containerWidth - circleRadius) {
      const maxLeft = containerWidth - zoomCircleEl.clientWidth;
      zoomCircleEl.style.left = `${maxLeft}px`;
      return;
    }

    zoomCircleEl.style.left = `${e.offsetX - circleRadius}px`;
  }

  function scaleCropPicture(e) {
    const zoomPercentage = (e.offsetX * 100) / zoomContainerEl.clientWidth;
    if (zoomPercentage <= 0 || zoomPercentage >= 100) return;
    const scaledWidth = (originalMaskSize[0] * zoomPercentage) / 100;
    const scaledHeight = (originalMaskSize[1] * zoomPercentage) / 100;
    maskEl.style.width = `${originalMaskSize[0] + scaledWidth}px`;
    maskEl.style.height = `${originalMaskSize[1] + scaledHeight}px`;
    scaleTransform(zoomPercentage);
  }

  function scaleTransform(percentage) {
    // const [x, y] = parseTransformValues(maskEl);
    const scaledX = (originalTransform[0] * percentage) / 100;
    const scaledY = (originalTransform[1] * percentage) / 100;
    const translateX = getMoveLimit(originalTransform[0] + scaledX, 'x');
    const translateY = getMoveLimit(originalTransform[1] + scaledY, 'y');
    maskEl.style.transform = `translate3d(${translateX}px, ${translateY}px, 0)`;
  }

  function startMove(e) {
    e.stopPropagation();
    canMove = true;
    updateAnchorPosition(e);
    scaleCropPicture(e);
  }

  function onMove(e) {
    e.stopPropagation();
    if (!canMove) return;
    updateAnchorPosition(e);
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
