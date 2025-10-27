'use strict';

let gl;
let surface;
let shProgram;
let spaceball;
let zoom = 80.0;
let uMaxMultiplier = 2.5; 
let uSteps = 100; 
let vSteps = 20;


function deg2rad(angle) { return angle * Math.PI / 180; }


function Model(name) {
    this.name = name;
    this.iVertexBuffer = gl.createBuffer();
    this.count = 0;
    this.primitive = gl.LINES;

    this.BufferData = function(vertices, primitiveType) {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STREAM_DRAW);
        this.count = vertices.length / 3;
        if (primitiveType !== undefined) this.primitive = primitiveType;
    }

    this.Draw = function() {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
        gl.vertexAttribPointer(shProgram.iAttribVertex, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shProgram.iAttribVertex);
        gl.drawArrays(this.primitive, 0, this.count);
    }
}


function ShaderProgram(name, program) {
    this.name = name;
    this.prog = program;
    this.iAttribVertex = -1;
    this.iColor = -1;
    this.iModelViewProjectionMatrix = -1;
    this.Use = function() { gl.useProgram(this.prog); }
}


function draw() {
    gl.clearColor(0,0,0,1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    let projection = m4.perspective(Math.PI/8, 1, 1, 100);
    let modelView = spaceball.getViewMatrix();
    let rotateToVertical = m4.axisRotation([1, 0, 0], Math.PI / 2);
    modelView = m4.multiply(rotateToVertical, modelView);

    let rotateToPointZero = m4.axisRotation([0.707,0.707,0], 0.7);
    let translateToPointZero = m4.translation(0,0,-zoom);

    let matAccum0 = m4.multiply(rotateToPointZero, modelView);
    let matAccum1 = m4.multiply(translateToPointZero, matAccum0);
    let modelViewProjection = m4.multiply(projection, matAccum1);

    gl.uniformMatrix4fv(shProgram.iModelViewProjectionMatrix, false, modelViewProjection);
    gl.uniform4fv(shProgram.iColor, [0.4, 0.8, 1.0, 1]);
    surface.Draw();
}


function CreateSurfaceData() {
    let vertexList = [];

    let r = parseFloat(document.getElementById("rVal").value);
    let c = parseFloat(document.getElementById("cVal").value);
    let d = parseFloat(document.getElementById("dVal").value);
    let theta0 = parseFloat(document.getElementById("theta0Val").value);

    
    let uMax = uMaxMultiplier * Math.PI;
    let vMin = -2*Math.PI;
    let vMax = 2*Math.PI;

    function P(u, v) {
        let x = r * Math.cos(u) -
                (r * (theta0 - u) + v * Math.cos(theta0) - c * Math.sin(d * v) * Math.sin(theta0)) * Math.sin(u);
        let y = r * Math.sin(u) +
                (r * (theta0 - u) + v * Math.cos(theta0) - c * Math.sin(d * v) * Math.sin(theta0)) * Math.cos(u);
        let z = v * Math.sin(theta0) + c * Math.sin(d * v) * Math.cos(theta0);
        return [x, y, z];
    }


    for (let i = 0; i < uSteps; i++) {
        let u = i * uMax / uSteps;
        for (let j = 0; j < vSteps; j++) {
            let v = vMin + j * (vMax - vMin) / vSteps;
            let vNext = vMin + (j + 1) * (vMax - vMin) / vSteps;
            let p0 = P(u, v);
            let p1 = P(u, vNext);
            vertexList.push(...p0, ...p1);
        }
    }


    for (let j = 0; j <= vSteps; j++) {
        let v = vMin + j * (vMax - vMin) / vSteps;
        for (let i = 0; i < uSteps; i++) {
            let u = i * uMax / uSteps;
            let uNext = (i + 1) * uMax / uSteps;
            let p0 = P(u, v);
            let p1 = P(uNext, v);
            vertexList.push(...p0, ...p1);
        }
    }

    return vertexList;
}

function updateUmax(value) {
    uMaxMultiplier = parseFloat(value);
    document.getElementById("uMaxValue").textContent = value + "π";
    updateSurface(); 
}

function updateUSteps(value) {
    uSteps = parseInt(value);
    document.getElementById('uSliderValue').textContent = value;
    updateSurface();
}

function updateVSteps(value) {
    vSteps = parseInt(value);
    document.getElementById('vSliderValue').textContent = value;
    updateSurface();
}

function updateSurface() {
    surface.BufferData(CreateSurfaceData(), gl.LINES);
    draw();
}


function initGL() {
    let prog = createProgram(gl, vertexShaderSource, fragmentShaderSource);
    shProgram = new ShaderProgram('Basic', prog);
    shProgram.Use();

    shProgram.iAttribVertex = gl.getAttribLocation(prog, "vertex");
    shProgram.iModelViewProjectionMatrix = gl.getUniformLocation(prog, "ModelViewProjectionMatrix");
    shProgram.iColor = gl.getUniformLocation(prog, "color");

    surface = new Model('Surface');
    surface.BufferData(CreateSurfaceData(), gl.LINES);
    gl.enable(gl.DEPTH_TEST);
    
}

function resizeCanvasToDisplaySize(canvas) {
    const displayWidth  = canvas.clientWidth * window.devicePixelRatio;
    const displayHeight = canvas.clientHeight * window.devicePixelRatio;

    if (canvas.width  !== displayWidth || canvas.height !== displayHeight) {
        canvas.width  = displayWidth;
        canvas.height = displayHeight;
        gl.viewport(0, 0, canvas.width, canvas.height);
    }
}



function createProgram(gl, vShader, fShader) {
    let vsh = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vsh,vShader);
    gl.compileShader(vsh);
    if (!gl.getShaderParameter(vsh, gl.COMPILE_STATUS)) {
        throw new Error("Vertex shader error: " + gl.getShaderInfoLog(vsh));
    }
    let fsh = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fsh,fShader);
    gl.compileShader(fsh);
    if (!gl.getShaderParameter(fsh, gl.COMPILE_STATUS)) {
        throw new Error("Fragment shader error: " + gl.getShaderInfoLog(fsh));
    }
    let prog = gl.createProgram();
    gl.attachShader(prog,vsh);
    gl.attachShader(prog,fsh);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        throw new Error("Program link error: " + gl.getProgramInfoLog(prog));
    }
    return prog;
}


function init() {
    let canvas = document.getElementById("webglcanvas");
    gl = canvas.getContext("webgl");
    if (!gl) {
        alert("WebGL not supported");
        return;
    }

    initGL();


    spaceball = new TrackballRotator(canvas, draw, 0);

   
    canvas.addEventListener("wheel", (event) => {
        zoom += event.deltaY * 0.02;
        if (zoom < 4) zoom = 4;
        if (zoom > 80) zoom = 80;
        draw();
        event.preventDefault();
    });
    resizeCanvasToDisplaySize(canvas);
    draw();
}
