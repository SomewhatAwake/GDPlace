// ==UserScript==
// @name         Mogul Mosaic template script
// @namespace    http://tampermonkey.net/
// @version      0.7
// @description  try to take over the canvas!
// @author       LittleEndu
// @match        https://mosaic.ludwig.gg/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=ludwig.gg
// @grant        none
// ==/UserScript==


window.addEventListener('load', function () {
    let currentJson = []

    const currentTime = () => Date.now() / 1000

    const updateImage = (imageObject) => {
        if (imageObject.imageLoader === undefined) {
            // we haven't loaded the image yet
            imageObject.imageLoader = document.createElement('img')
            imageObject.imageLoader.src = imageObject.url
            imageObject.imageLoader.crossOrigin = 'Anonymous'
            imageObject.imageLoader.style = `
                position: absolute; 
                top: 0; 
                left: 0; 
                width: 1px; 
                height: 1px; 
                opacity: ${Number.MIN_VALUE}; 
                pointer-events: none;
            `;
            imageObject.imageLoader.onload = () => {
                imageObject.frameWidth = imageObject.frameWidth || imageObject.imageLoader.naturalWidth
                imageObject.atlasSize = Math.round(imageObject.imageLoader.naturalWidth / imageObject.frameWidth)
                imageObject.frameHeight = imageObject.frameHeight || Math.round(imageObject.imageLoader.naturalHeight / imageObject.atlasSize)
                imageObject.frameCount = imageObject.frameCount || 1
                imageObject.frameRate = imageObject.frameRate || 1
                imageObject.startTime = imageObject.startTime || Math.floor(currentTime())

                imageObject.templateElement = document.createElement('img')
                document.querySelectorAll('canvas')[0].parentNode.appendChild(imageObject.templateElement)
                imageObject.templateElement.style = `
                    position: absolute;
                    top: ${imageObject.y}px;
                    left: ${imageObject.x}px;
                    width: ${imageObject.frameWidth}px;
                    height: ${imageObject.frameHeight}px;
                    pointer-events: none;
                    image-rendering: pixelated;
                `;
                updateImage(imageObject)
            }
            document.body.appendChild(imageObject.imageLoader) // firefox would otherwise not load the image
        }

        if (imageObject.templateElement !== undefined) {
            // image has been loaded
            let currentFrameIndex = Math.floor((currentTime() - imageObject.startTime) / imageObject.frameRate)
            let currentFrame = (currentFrameIndex % imageObject.frameCount + imageObject.frameCount) % imageObject.frameCount
            if (imageObject.lastFrame === undefined || currentFrame !== imageObject.lastFrame) {
                imageObject.lastFrame = currentFrame

                let frameX = currentFrame % imageObject.atlasSize;
                let frameY = Math.floor(currentFrame / imageObject.atlasSize);

                let tempCanvas = document.createElement('canvas')
                tempCanvas.width = imageObject.frameWidth
                tempCanvas.height = imageObject.frameHeight
                let tempContext = tempCanvas.getContext('2d')
                // draw the frame
                tempContext.drawImage(
                    imageObject.imageLoader,
                    frameX * imageObject.frameWidth, frameY * imageObject.frameHeight,
                    imageObject.frameWidth, imageObject.frameHeight,
                    0, 0,
                    imageObject.frameWidth, imageObject.frameHeight
                )

                // dither the frame
                let data = tempContext.getImageData(0, 0, imageObject.frameWidth, imageObject.frameHeight)
                let ditheredData = new ImageData(imageObject.frameWidth * 3, imageObject.frameHeight * 3)
                for (let y = 0; y < imageObject.frameHeight; y++) {
                    for (let x = 0; x < imageObject.frameWidth; x++) {
                        let index = (y * imageObject.frameWidth + x) * 4
                        let topLeftIndex = (y * 3 * ditheredData.width + x * 3) * 4;
                        let bottomRightIndex = ((y * 3 + 2) * ditheredData.width + x * 3 + 2) * 4;
                        ditheredData.data[topLeftIndex] = data.data[index];
                        ditheredData.data[topLeftIndex + 1] = data.data[index + 1];
                        ditheredData.data[topLeftIndex + 2] = data.data[index + 2];
                        ditheredData.data[topLeftIndex + 3] = data.data[index + 3];
                        ditheredData.data[bottomRightIndex] = data.data[index];
                        ditheredData.data[bottomRightIndex + 1] = data.data[index + 1];
                        ditheredData.data[bottomRightIndex + 2] = data.data[index + 2];
                        ditheredData.data[bottomRightIndex + 3] = data.data[index + 3];
                    }
                }

                // convert to data url
                let ditheredCanvas = document.createElement('canvas')
                ditheredCanvas.width = ditheredData.width
                ditheredCanvas.height = ditheredData.height
                let ditheredContext = ditheredCanvas.getContext('2d')
                ditheredContext.putImageData(ditheredData, 0, 0)
                imageObject.templateElement.src = ditheredCanvas.toDataURL()

                console.log(`updated ${imageObject.url} to frame ${currentFrame}/${imageObject.frameCount}`)
            }
        }
    }
    const updateAllImages = () => {
        currentJson.forEach(updateImage)
    }
    const randomString = () => (Math.random() + 1).toString(36).substring(7)
    const readJsonUrl = (url) => {
        if (url.includes("https://gist.github.com/") || url.includes("https://gist.githubusercontent.com/")) {
            url = `${url}?${randomString()}=${randomString()}`
        }
        fetch(url).then(res => {
            res.json().then(json => {
                currentJson = json
            })
        })
    }

    console.log('running Mogul Mosaic template script');
    const urlSearchParams = new URLSearchParams(window.location.search);
    const params = Object.fromEntries(urlSearchParams.entries());
    if (params.template === undefined) {
        console.log('no template specified, using default');
        readJsonUrl("https://gist.githubusercontent.com/SomewhatAwake/80b265c901b36a20f13362ea5f3569e2/raw/gdplace.json")
    } else {
        console.log(`found template: ${params.template}`);
        readJsonUrl(params.template)
    }
    setInterval(updateAllImages, 100)
})
