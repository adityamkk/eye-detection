"use strict";

// CONSTANTS

const video = document.getElementById('video');
const canvas = document.getElementById('overlay');
const width = (canvas.width = window.innerWidth); // width of the window
const height = (canvas.height = window.innerHeight); // height of the window
const ctx = canvas.getContext('2d');
const eyes = [];

const videoWidth = 720;
const videoHeight = 560;

function renderBackground() {
    ctx.fillStyle = 'rgb(0,0,0)';
    ctx.fillRect(0, 0, width, height);
}

class Eye {
    constructor(x, y, width, height) {
        this.x = x;
        this.y = y;
        this.pupilX = x + 20;
        this.pupilY = y;
        this.pupilXVel = 0;
        this.pupilYVel = 0;
        this.width = width;
        this.height = height;
        this.pupilRadius = 3*Math.min(this.width, this.height)/4;
        this.detectedCooldown = 0;
        this.pupilColor = 'rgb(205, 0,  255)';
    }

    render() {
        this.renderEyeWhite();
        this.renderPupil();
    }

    update(detected, x, y) {
        // Move sinusoidally if no detection
        if(this.detectedCooldown <= 0 && !detected) {
            this.pupilColor = 'rgb(205, 0, 255)';
            this.pupilRadius = 3*Math.min(this.width, this.height)/4;
            const xDisp = this.pupilX - this.x;
            const yDisp = this.pupilY - this.y;
            this.pupilXVel += -1*xDisp/20;
            this.pupilYVel += -1*yDisp/20;
            this.movePupil(this.pupilXVel, this.pupilYVel);
        } else if (this.detectedCooldown > 0 && !detected) {
            this.pupilColor = `rgb(${205 + this.detectedCooldown}, 0, ${255 - this.detectedCooldown*255/50})`;
            this.pupilRadius = (2+(50-this.detectedCooldown)/50)*Math.min(this.width, this.height)/4;
            this.detectedCooldown--;
            if(this.detectedCooldown <= 0) {
                this.setPupil(this.x + 20, this.y);
                this.pupilXVel = 0;
                this.pupilYVel = 0;
                const xDisp = this.pupilX - this.x;
                const yDisp = this.pupilY - this.y;
                this.pupilXVel += -1*xDisp/20;
                this.pupilYVel += -1*yDisp/20;
                this.movePupil(this.pupilXVel, this.pupilYVel);
            }
        } else {
            this.detectedCooldown = 50;
            this.pupilColor = 'rgb(255, 0, 0)';
            this.pupilRadius = Math.min(this.width, this.height)/2;
            const eyeBox = Math.min(this.width, this.height)*1.5;
            this.setPupil(this.x - (x - (videoWidth/2))/videoWidth*eyeBox, this.y + (y-(videoHeight/2))/videoHeight*eyeBox);
        }
        this.detected = detected;
    }

    renderEyeWhite() {
        ctx.fillStyle = 'rgb(255,255,255)';
        ctx.beginPath();
        ctx.ellipse(this.x, this.y, this.width, this.height, 0, 0, 2*Math.PI, false);
        ctx.fill();
    }

    renderPupil() {
        ctx.fillStyle = this.pupilColor;
        ctx.beginPath();
        ctx.ellipse(this.pupilX, this.pupilY, this.pupilRadius, this.pupilRadius, 0, 0, 2*Math.PI, false);
        ctx.fill();
    }

    setPupil(x, y) {
        this.pupilX = x;
        this.pupilY = y;
    }

    movePupil(xOffset, yOffset) {
        this.pupilX += xOffset;
        this.pupilY += yOffset;
    }
}


async function startVideo() {
    const stream = await navigator.mediaDevices.getUserMedia({ video: {} });
    video.srcObject = stream;
}

async function onPlay() {
    const detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
    .withFaceLandmarks(true);

    //ctx.clearRect(0, 0, canvas.width, canvas.height);

    const eyeXCoords = [];
    const eyeYCoords = [];

    detections.forEach(det => {
        const landmarks = det.landmarks;
        const leftEye = landmarks.getLeftEye();
        const rightEye = landmarks.getRightEye();

        [leftEye, rightEye].forEach(eye => {
            /*
            ctx.beginPath();
            eye.forEach((pt, i) => {
            if (i === 0) {
                ctx.moveTo(pt.x, pt.y);
            } else {
                ctx.lineTo(pt.x, pt.y);
            }
            });
            ctx.closePath();
            ctx.strokeStyle = 'blue';
            ctx.stroke();
            */

            // Log coordinates
            console.log('Eye coordinates:', eye.map(pt => ({ x: pt.x, y: pt.y })));
            eyeXCoords.push(eye[0].x); eyeXCoords.push(eye[1].x);
            eyeYCoords.push(eye[0].y); eyeYCoords.push(eye[1].y);
        });
    });

    let eyeX = 0; let eyeY = 0;
    for(const xCoord of eyeXCoords) {
        eyeX += xCoord;
    }
    for(const yCoord of eyeYCoords) {
        eyeY += yCoord;
    }
    eyeX /= (eyeXCoords.length != 0 ? eyeXCoords.length : 1);
    eyeY /= (eyeYCoords.length != 0 ? eyeYCoords.length : 1);

    // RENDERING
    
    renderBackground();
    for(const eye of eyes) {
        eye.render();
        eye.update((eyeXCoords.length != 0 ? true : false), eyeX, eyeY);
    }
    requestAnimationFrame(onPlay);
}

async function init() {
    await faceapi.nets.tinyFaceDetector.loadFromUri('https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/');
    await faceapi.nets.faceLandmark68TinyNet.loadFromUri('https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/');
    await startVideo();
    video.addEventListener('playing', onPlay);

    // Add eyes
    eyes.push(new Eye(width/4, height/2, width/20, height/4));
    eyes.push(new Eye(3*width/4, height/2, width/20, height/4));
    eyes.push(new Eye(width/8, height/3, width/40, height/8));
    eyes.push(new Eye(7*width/8, height/3, width/40, height/8));
}

init();