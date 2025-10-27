'use strict';

let gl;
let surface;
let shProgram;
let spaceball;
let zoom = 80.0;
let uMaxMultiplier = 2.5; 
let uSteps = 100; 
let vSteps = 20;
let renderMode = "fill";


function deg2rad(angle) { return angle * Math.PI / 180; }


function Model(name) {
    this.name = name;
    this.iVertexBuffer = gl.createBuffer();
    this.iIndexBuffer = gl.createBuffer(); 
    this.iWireIndexBuffer = gl.createBuffer();
    this.indexCount = 0;
    this.primitive = gl.TRIANGLES;

    this.BufferData = function(vertices, indices, wireIndices) {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STREAM_DRAW);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.iIndexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STREAM_DRAW);
        this.fillIndexCount = indices.length;

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.iWireIndexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(wireIndices), gl.STREAM_DRAW);
        this.wireIndexCount = wireIndices.length;
        
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
    }

    this.Draw = function() {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
        gl.vertexAttribPointer(shProgram.iAttribVertex, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shProgram.iAttribVertex);

        if (renderMode === "fill") {
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.iIndexBuffer);
            gl.drawElements(gl.TRIANGLES, this.fillIndexCount, gl.UNSIGNED_SHORT, 0);
        } else { 
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.iWireIndexBuffer);
            gl.drawElements(gl.LINES, this.wireIndexCount, gl.UNSIGNED_SHORT, 0);
        }
        
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
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
    let vertices = [];
    let indices = [];
    let wireIndices = [];

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


    for (let i = 0; i <= uSteps; i++) {
        let u = i * uMax / uSteps;
        for (let j = 0; j <= vSteps; j++) {
            let v = vMin + j * (vMax - vMin) / vSteps;
            vertices.push(...P(u, v));
        }
    }


    const numVertsV = vSteps + 1;
    for (let i = 0; i < uSteps; i++) {
        for (let j = 0; j < vSteps; j++) {
            let v00 = i * numVertsV + j;
            let v01 = i * numVertsV + (j + 1);
            let v10 = (i + 1) * numVertsV + j;
            let v11 = (i + 1) * numVertsV + (j + 1);

            indices.push(v00, v10, v01);
            indices.push(v01, v10, v11);

            wireIndices.push(v00, v10);
            wireIndices.push(v10, v11);
            wireIndices.push(v11, v01);
            wireIndices.push(v01, v00);
        }
    }

    return { vertices: vertices, indices: indices, wireIndices: wireIndices };
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

function setRenderMode(value) {
    renderMode = value;
    draw();
}

function updateSurface() {
    let data = CreateSurfaceData(); 
    surface.BufferData(data.vertices, data.indices, data.wireIndices);
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

    let data = CreateSurfaceData();
    surface.BufferData(data.vertices, data.indices,data.wireIndices);

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
