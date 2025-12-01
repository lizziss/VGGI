'use strict';

let gl;
let surface;
let lightSphere;
let pivotSphere;    
let texPivotSphere; 
let shProgram;
let spaceball;
let zoom = 80.0;
let uMaxMultiplier = 2.5; 
let uSteps = 100; 
let vSteps = 20;
let renderMode = "fill";

let diffuseTexture = null;
let specularTexture = null;
let normalTexture = null;

let useDiffuseMap = true;
let useSpecularMap = true;
let useNormalMap = true;

let controlMode = "mesh"; 

let meshAngleX = 0.0;
let meshAngleY = 0.0;
let meshAngleZ = 0.0;
let selectedAxis = 'z'; 
let meshPivotU = 1.0; 
let meshPivotV = 0.0; 

let texRotationAngle = 0.0;
let texCenterU = 0.5;
let texCenterV = 0.5;

function deg2rad(angle) { return angle * Math.PI / 180; }

function calculateSurfacePoint(u, v, r, c, d, theta0) {
    let x = r * Math.cos(u) -
            (r * (theta0 - u) + v * Math.cos(theta0) - c * Math.sin(d * v) * Math.sin(theta0)) * Math.sin(u);
    let y = r * Math.sin(u) +
            (r * (theta0 - u) + v * Math.cos(theta0) - c * Math.sin(d * v) * Math.sin(theta0)) * Math.cos(u);
    let z = v * Math.sin(theta0) + c * Math.sin(d * v) * Math.cos(theta0);
    return [x, y, z];
}

function Model(name) {
    this.name = name;
    this.iVertexBuffer = gl.createBuffer();
    this.iNormalBuffer = gl.createBuffer();
    this.iIndexBuffer = gl.createBuffer();
    this.iWireIndexBuffer = gl.createBuffer();
    this.iTexCoordBuffer = gl.createBuffer();
    this.iTangentBuffer = gl.createBuffer();
    this.iBitangentBuffer = gl.createBuffer();
    this.indexCount = 0;
    this.primitive = gl.TRIANGLES;

    this.BufferData = function(vertices, indices, wireIndices, normals, texcoords, tangents, bitangents) {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STREAM_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.iNormalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STREAM_DRAW);
        if (texcoords && texcoords.length > 0) {
            gl.bindBuffer(gl.ARRAY_BUFFER, this.iTexCoordBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texcoords), gl.STATIC_DRAW);
        }
        if (tangents && tangents.length > 0) {
            gl.bindBuffer(gl.ARRAY_BUFFER, this.iTangentBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(tangents), gl.STATIC_DRAW);
        }
        if (bitangents && bitangents.length > 0) {
            gl.bindBuffer(gl.ARRAY_BUFFER, this.iBitangentBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(bitangents), gl.STATIC_DRAW);
        }
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.iIndexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STREAM_DRAW);
        this.fillIndexCount = indices.length;
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.iWireIndexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(wireIndices), gl.STREAM_DRAW);
        this.wireIndexCount = wireIndices.length;
    }

    this.Draw = function() {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
        if (shProgram.iAttribVertex !== -1) {
            gl.enableVertexAttribArray(shProgram.iAttribVertex);
            gl.vertexAttribPointer(shProgram.iAttribVertex, 3, gl.FLOAT, false, 0, 0);
        }
        gl.bindBuffer(gl.ARRAY_BUFFER, this.iNormalBuffer);
        if (shProgram.iAttribNormal !== -1) {
            gl.enableVertexAttribArray(shProgram.iAttribNormal);
            gl.vertexAttribPointer(shProgram.iAttribNormal, 3, gl.FLOAT, false, 0, 0);
        }
        if (this.iTexCoordBuffer && shProgram.iAttribTexCoord !== -1) {
            gl.bindBuffer(gl.ARRAY_BUFFER, this.iTexCoordBuffer);
            gl.enableVertexAttribArray(shProgram.iAttribTexCoord);
            gl.vertexAttribPointer(shProgram.iAttribTexCoord, 2, gl.FLOAT, false, 0, 0);
        }
        if (this.iTangentBuffer && shProgram.iAttribTangent !== -1) {
            gl.bindBuffer(gl.ARRAY_BUFFER, this.iTangentBuffer);
            gl.enableVertexAttribArray(shProgram.iAttribTangent);
            gl.vertexAttribPointer(shProgram.iAttribTangent, 3, gl.FLOAT, false, 0, 0);
        }
        if (this.iBitangentBuffer && shProgram.iAttribBitangent !== -1) {
            gl.bindBuffer(gl.ARRAY_BUFFER, this.iBitangentBuffer);
            gl.enableVertexAttribArray(shProgram.iAttribBitangent);
            gl.vertexAttribPointer(shProgram.iAttribBitangent, 3, gl.FLOAT, false, 0, 0);
        }
        if (renderMode === "fill") {
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.iIndexBuffer);
            gl.drawElements(gl.TRIANGLES, this.fillIndexCount, gl.UNSIGNED_SHORT, 0);
        } else {
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.iWireIndexBuffer);
            gl.drawElements(gl.LINES, this.wireIndexCount, gl.UNSIGNED_SHORT, 0);
        }
        if (shProgram.iAttribVertex !== -1) gl.disableVertexAttribArray(shProgram.iAttribVertex);
        if (shProgram.iAttribNormal !== -1) gl.disableVertexAttribArray(shProgram.iAttribNormal);
        if (shProgram.iAttribTexCoord !== -1) gl.disableVertexAttribArray(shProgram.iAttribTexCoord);
        if (shProgram.iAttribTangent !== -1) gl.disableVertexAttribArray(shProgram.iAttribTangent);
        if (shProgram.iAttribBitangent !== -1) gl.disableVertexAttribArray(shProgram.iAttribBitangent);
    }
}

function ShaderProgram(name, program) {
    this.name = name;
    this.prog = program;
    this.iAttribVertex = -1; this.iAttribNormal = -1; 
    this.iProjectionMatrix = -1; this.iModelViewMatrix = -1; this.iNormalMatrix = -1;        
    this.iLightPosition = -1; this.iWireframeColor = -1; this.iRenderMode = -1;    

    this.uMeshAngles = -1; 
    this.uMeshCenterPoint = -1;
    this.uTexRotationAngle = -1;
    this.uTexCenterPoint = -1;

    this.Use = function() { gl.useProgram(this.prog); }
}

function draw() {
    requestAnimationFrame(draw);
    resizeCanvasToDisplaySize(gl.canvas);
    gl.clearColor(0.1, 0.1, 0.1, 1); 
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);

    let projection = m4.perspective(Math.PI / 8, gl.canvas.clientWidth / gl.canvas.clientHeight, 5, 2000);
    gl.uniformMatrix4fv(shProgram.iProjectionMatrix, false, projection);
    
    let viewMatrix = spaceball.getViewMatrix();
    let rotateToVertical = m4.axisRotation([1, 0, 0], Math.PI / 2);
    viewMatrix = m4.multiply(rotateToVertical, viewMatrix);
    let rotateToPointZero = m4.axisRotation([0.707, 0.707, 0], 0.7);
    let translateToPointZero = m4.translation(0, 0, -zoom);
    viewMatrix = m4.multiply(rotateToPointZero, viewMatrix);
    viewMatrix = m4.multiply(translateToPointZero, viewMatrix);

    const time = performance.now() * 0.0005;
    const lightRadius = 10.0;
    const worldLightPos = [Math.cos(time) * lightRadius, Math.sin(time) * lightRadius, -10.0];
    const viewLightPos = m4.transformPoint(viewMatrix, worldLightPos);
    gl.uniform3fv(shProgram.iLightPosition, viewLightPos);
    
    gl.uniform1i(shProgram.iRenderMode, renderMode === "fill" ? 0 : 1);
    gl.uniform4fv(shProgram.iWireframeColor, [0.0, 0.0, 1.0, 1.0]); 
    
    gl.uniformMatrix4fv(shProgram.iModelViewMatrix, false, viewMatrix);
    let surfaceNormalMatrix = m4.transpose(m4.inverse(viewMatrix));
    gl.uniformMatrix4fv(shProgram.iNormalMatrix, false, surfaceNormalMatrix);

    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, (useDiffuseMap && shProgram.diffuseTexture) ? shProgram.diffuseTexture : shProgram.whiteTexture); gl.uniform1i(shProgram.uDiffuseTex, 0);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, (useSpecularMap && shProgram.specularTexture) ? shProgram.specularTexture : shProgram.whiteTexture); gl.uniform1i(shProgram.uSpecularTex, 1);
    gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, (useNormalMap && shProgram.normalTexture) ? shProgram.normalTexture : shProgram.neutralNormalTexture); gl.uniform1i(shProgram.uNormalTex, 2);

    let r = parseFloat(document.getElementById("rVal").value);
    let c = parseFloat(document.getElementById("cVal").value);
    let d = parseFloat(document.getElementById("dVal").value);
    let theta0 = parseFloat(document.getElementById("theta0Val").value);
    let uMax = uMaxMultiplier * Math.PI;
    let vMin = -2*Math.PI;
    let vMax = 2*Math.PI;

    let pivotPoint3D = calculateSurfacePoint(meshPivotU, meshPivotV, r, c, d, theta0);
    let texSurfaceU = texCenterU * uMax; 
    let texSurfaceV = vMin + texCenterV * (vMax - vMin);
    let texPivot3D = calculateSurfacePoint(texSurfaceU, texSurfaceV, r, c, d, theta0);

    gl.uniform3f(shProgram.uMeshAngles, meshAngleX, meshAngleY, meshAngleZ); 
    gl.uniform2f(shProgram.uMeshCenterPoint, pivotPoint3D[0], pivotPoint3D[1]);

    gl.uniform1f(shProgram.uTexRotationAngle, texRotationAngle);
    gl.uniform2f(shProgram.uTexCenterPoint, texCenterU, texCenterV);

    surface.Draw();

    gl.uniform1i(shProgram.iRenderMode, 2);
    const sphereScale = 0.8; 
    let pivotModelMatrix = m4.translation(pivotPoint3D[0], pivotPoint3D[1], pivotPoint3D[2]);
    pivotModelMatrix = m4.scale(pivotModelMatrix, sphereScale, sphereScale, sphereScale);
    gl.uniformMatrix4fv(shProgram.iModelViewMatrix, false, m4.multiply(viewMatrix, pivotModelMatrix));
    gl.uniform4fv(shProgram.iWireframeColor, [0.0, 0.0, 1.0, 1.0]); 
    pivotSphere.Draw();

    let texPivotMatrix = m4.translation(texPivot3D[0], texPivot3D[1], texPivot3D[2]);
    texPivotMatrix = m4.scale(texPivotMatrix, sphereScale, sphereScale, sphereScale);
    gl.uniformMatrix4fv(shProgram.iModelViewMatrix, false, m4.multiply(viewMatrix, texPivotMatrix));
    gl.uniform4fv(shProgram.iWireframeColor, [0.0, 1.0, 0.0, 1.0]); 
    texPivotSphere.Draw();

    let sphereModelMatrix = m4.translation(worldLightPos[0], worldLightPos[1], worldLightPos[2]);
    gl.uniformMatrix4fv(shProgram.iModelViewMatrix, false, m4.multiply(viewMatrix, sphereModelMatrix));
    gl.uniform4fv(shProgram.iWireframeColor, [1.0, 1.0, 0.8, 1.0]); 
    lightSphere.Draw();
}

function CreateSurfaceData() {
    let positions = []; let indices = []; let wireIndices = []; let normals = []; let texcoords = []; let tangents = []; let bitangents = [];
    let r = parseFloat(document.getElementById("rVal").value);
    let c = parseFloat(document.getElementById("cVal").value);
    let d = parseFloat(document.getElementById("dVal").value);
    let theta0 = parseFloat(document.getElementById("theta0Val").value);
    let uMax = uMaxMultiplier * Math.PI; let vMin = -2*Math.PI; let vMax = 2*Math.PI;
    let grid = [];
    for (let i=0;i<=uSteps;i++){
        let u = i * uMax / uSteps; let row = [];
        for (let j=0;j<=vSteps;j++){
            let v = vMin + j * (vMax - vMin) / vSteps;
            let p = calculateSurfacePoint(u, v, r, c, d, theta0);
            row.push({p: p, u: u, v: v, ui: i, vj: j});
            positions.push(...p); texcoords.push(i / uSteps, j / vSteps);
        } grid.push(row);
    }
    const numVertsV = vSteps + 1;
    for (let i = 0; i < uSteps; i++) {
        for (let j = 0; j < vSteps; j++) {
            let v00 = i * numVertsV + j; let v01 = i * numVertsV + (j + 1);
            let v10 = (i + 1) * numVertsV + j; let v11 = (i + 1) * numVertsV + (j + 1);
            indices.push(v00, v10, v01); indices.push(v01, v10, v11);
            wireIndices.push(v00, v10, v10, v11, v11, v01, v01, v00);
        }
    }
    let numVertices = positions.length/3; let tempNormals = new Array(numVertices);
    for (let i=0;i<numVertices;i++) tempNormals[i] = [0,0,0];
    const getAngle = (a, b) => { const dot = m4.dot(m4.normalize(a), m4.normalize(b)); return Math.acos(Math.max(-1, Math.min(1, dot))); };
    for (let i=0;i<indices.length;i+=3){
        const i0 = indices[i], i1 = indices[i+1], i2 = indices[i+2];
        const p0 = [positions[i0*3], positions[i0*3+1], positions[i0*3+2]];
        const p1 = [positions[i1*3], positions[i1*3+1], positions[i1*3+2]];
        const p2 = [positions[i2*3], positions[i2*3+1], positions[i2*3+2]];
        const e1 = m4.subtractVectors(p1,p0); const e2 = m4.subtractVectors(p2,p0);
        const facetNormal = m4.normalize(m4.cross(e1,e2));
        const e3 = m4.subtractVectors(p0,p1); const e4 = m4.subtractVectors(p2,p1);
        const e5 = m4.subtractVectors(p0,p2); const e6 = m4.subtractVectors(p1,p2);
        const angle0 = getAngle(e1,e2); const angle1 = getAngle(e3,e4); const angle2 = getAngle(e5,e6);
        tempNormals[i0] = m4.addVectors(tempNormals[i0], m4.scaleVector(facetNormal, angle0));
        tempNormals[i1] = m4.addVectors(tempNormals[i1], m4.scaleVector(facetNormal, angle1));
        tempNormals[i2] = m4.addVectors(tempNormals[i2], m4.scaleVector(facetNormal, angle2));
    }
    for (let i=0;i<numVertices;i++){ normals.push(...m4.normalize(tempNormals[i])); }
    for (let i=0;i<=uSteps;i++){
        for (let j=0;j<=vSteps;j++){
            let p = grid[i][j].p;
            let pu = (i < uSteps) ? grid[i+1][j].p : grid[i-1][j].p;
            let pv = (j < vSteps) ? grid[i][j+1].p : grid[i][j-1].p;
            let T = m4.normalize(m4.subtractVectors(pu, p));
            let B = m4.normalize(m4.subtractVectors(pv, p));
            tangents.push(...T); bitangents.push(...B);
        }
    }
    return { vertices: positions, indices: indices, wireIndices: wireIndices, normals: normals, texcoords: texcoords, tangents: tangents, bitangents: bitangents };
}
function CreateSphereData(radius, latBands, longBands) {
    let vertices = []; let indices = []; let normals = [];
    for (let lat = 0; lat <= latBands; lat++) {
        let theta = lat * Math.PI / latBands;
        let sinTheta = Math.sin(theta); let cosTheta = Math.cos(theta);
        for (let long = 0; long <= longBands; long++) {
            let phi = long * 2 * Math.PI / longBands;
            let sinPhi = Math.sin(phi); let cosPhi = Math.cos(phi);
            let x = cosPhi * sinTheta; let y = cosTheta; let z = sinPhi * sinTheta;
            normals.push(x, y, z); vertices.push(radius * x, radius * y, radius * z);
        }
    }
    for (let lat = 0; lat < latBands; lat++) {
        for (let long = 0; long < longBands; long++) {
            let first = (lat * (longBands + 1)) + long; let second = first + longBands + 1;
            indices.push(first); indices.push(second); indices.push(first + 1);
            indices.push(second); indices.push(second + 1); indices.push(first + 1);
        }
    }
    return { vertices: vertices, indices: indices, normals: normals, wireIndices: indices };
}
function updateUmax(value) { uMaxMultiplier = parseFloat(value); document.getElementById("uMaxValue").textContent = value + "π"; updateSurface(); }
function updateUSteps(value) { uSteps = parseInt(value); document.getElementById('uSliderValue').textContent = value; updateSurface(); }
function updateVSteps(value) { vSteps = parseInt(value); document.getElementById('vSliderValue').textContent = value; updateSurface(); }
function setRenderMode(value) { renderMode = value; draw(); }
function updateSurface() { let data = CreateSurfaceData(); surface.BufferData(data.vertices, data.indices, data.wireIndices, data.normals, data.texcoords, data.tangents, data.bitangents); }
function resizeCanvasToDisplaySize(canvas) {
    const displayWidth  = canvas.clientWidth * window.devicePixelRatio;
    const displayHeight = canvas.clientHeight * window.devicePixelRatio;
    if (canvas.width  !== displayWidth || canvas.height !== displayHeight) {
        canvas.width  = displayWidth; canvas.height = displayHeight; gl.viewport(0, 0, canvas.width, canvas.height);
    }
}
function createProgram(gl, vShader, fShader) {
    let vsh = gl.createShader(gl.VERTEX_SHADER); gl.shaderSource(vsh,vShader); gl.compileShader(vsh);
    if (!gl.getShaderParameter(vsh, gl.COMPILE_STATUS)) throw new Error("Vertex shader error: " + gl.getShaderInfoLog(vsh));
    let fsh = gl.createShader(gl.FRAGMENT_SHADER); gl.shaderSource(fsh,fShader); gl.compileShader(fsh);
    if (!gl.getShaderParameter(fsh, gl.COMPILE_STATUS)) throw new Error("Fragment shader error: " + gl.getShaderInfoLog(fsh));
    let prog = gl.createProgram(); gl.attachShader(prog,vsh); gl.attachShader(prog,fsh); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error("Program link error: " + gl.getProgramInfoLog(prog));
    return prog;
}
function init() {
    let canvas = document.getElementById("webglcanvas"); gl = canvas.getContext("webgl");
    if (!gl) { alert("WebGL not supported"); return; }
    initGL();
    spaceball = new TrackballRotator(canvas, () => {}, 0); 
    canvas.addEventListener("wheel", (event) => {
        zoom += event.deltaY * 0.02; if (zoom < 4) zoom = 4; if (zoom > 80) zoom = 80; event.preventDefault();
    });
    window.addEventListener('resize', () => {});
    requestAnimationFrame(draw);
}
function LoadTexture(gl, url) {
    const texture = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([255, 255, 255, 255]));
    const image = new Image();
    image.onload = function () {
        gl.bindTexture(gl.TEXTURE_2D, texture); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image); gl.generateMipmap(gl.TEXTURE_2D);
    };
    image.src = url; return texture;
}

function initGL() {
    let prog = createProgram(gl, vertexShaderSource, fragmentShaderSource);
    shProgram = new ShaderProgram('Basic', prog);
    shProgram.Use();

    shProgram.iAttribVertex = gl.getAttribLocation(prog, "a_position");
    shProgram.iAttribNormal = gl.getAttribLocation(prog, "a_normal");
    shProgram.iAttribTexCoord  = gl.getAttribLocation(prog, "a_texcoord");
    shProgram.iAttribTangent   = gl.getAttribLocation(prog, "a_tangent");
    shProgram.iAttribBitangent = gl.getAttribLocation(prog, "a_bitangent");

    shProgram.uDiffuseTex  = gl.getUniformLocation(prog, "u_diffuseTex");
    shProgram.uSpecularTex = gl.getUniformLocation(prog, "u_specularTex");
    shProgram.uNormalTex   = gl.getUniformLocation(prog, "u_normalTex");
    shProgram.uUseDiffuse = gl.getUniformLocation(prog, "u_useDiffuse");
    shProgram.uUseSpecular = gl.getUniformLocation(prog, "u_useSpecular");
    shProgram.uUseNormal   = gl.getUniformLocation(prog, "u_useNormal");

    shProgram.uMeshAngles = gl.getUniformLocation(prog, "u_meshAngles"); // vec3
    shProgram.uMeshCenterPoint = gl.getUniformLocation(prog, "u_meshCenterPoint");
    shProgram.uTexRotationAngle = gl.getUniformLocation(prog, "u_texRotationAngle");
    shProgram.uTexCenterPoint = gl.getUniformLocation(prog, "u_texCenterPoint");

    const createSolidTexture = (r, g, b, a = 255) => {
        const tex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, tex);
        const data = new Uint8Array([r, g, b, a]);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1,1,0, gl.RGBA, gl.UNSIGNED_BYTE, data);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        return tex;
    };

    shProgram.whiteTexture = createSolidTexture(255,255,255,255); 
    shProgram.neutralNormalTexture = createSolidTexture(128,128,255,255);
    shProgram.iProjectionMatrix = gl.getUniformLocation(prog, "u_projectionMatrix");
    shProgram.iModelViewMatrix = gl.getUniformLocation(prog, "u_modelViewMatrix");
    shProgram.iNormalMatrix = gl.getUniformLocation(prog, "u_normalMatrix");
    shProgram.iLightPosition = gl.getUniformLocation(prog, "u_lightPosition");
    shProgram.iWireframeColor = gl.getUniformLocation(prog, "u_wireframeColor");
    shProgram.iRenderMode = gl.getUniformLocation(prog, "u_renderMode"); 

    shProgram.diffuseTexture = LoadTexture(gl, "./texture/Alien_Muscle_001_DIFFUSE.jpg");
    shProgram.specularTexture = LoadTexture(gl, "./texture/Alien_Muscle_001_SPEC.jpg");
    shProgram.normalTexture   = LoadTexture(gl, "./texture/Alien_Muscle_001_NORM.jpg");

    gl.uniform1i(shProgram.uUseDiffuse, 1);
    gl.uniform1i(shProgram.uUseSpecular, 1);
    gl.uniform1i(shProgram.uUseNormal, 1);

    surface = new Model('Surface');
    let surfaceData = CreateSurfaceData();
    surface.BufferData(surfaceData.vertices, surfaceData.indices, surfaceData.wireIndices, surfaceData.normals, surfaceData.texcoords, surfaceData.tangents, surfaceData.bitangents);

    lightSphere = new Model('LightSphere');
    let sphereData = CreateSphereData(0.25, 20, 20); 
    lightSphere.BufferData(sphereData.vertices, sphereData.indices, sphereData.wireIndices, sphereData.normals);

    pivotSphere = new Model('PivotSphere');
    pivotSphere.BufferData(sphereData.vertices, sphereData.indices, sphereData.wireIndices, sphereData.normals);

    texPivotSphere = new Model('TexPivotSphere');
    texPivotSphere.BufferData(sphereData.vertices, sphereData.indices, sphereData.wireIndices, sphereData.normals);
}


function setControlMode(value) {
    controlMode = value;
    document.getElementById("meshControls").style.opacity = (value === 'mesh') ? "1.0" : "0.5";
    document.getElementById("texControls").style.opacity = (value === 'texture') ? "1.0" : "0.5";
}

function setRotationAxis(axis) {
    selectedAxis = axis;
    let currentAngle = 0;
    if (axis === 'x') currentAngle = meshAngleX;
    else if (axis === 'y') currentAngle = meshAngleY;
    else if (axis === 'z') currentAngle = meshAngleZ;
    document.getElementById("meshAngle").value = currentAngle;
}

function updateRotations() {
    let val = parseFloat(document.getElementById("meshAngle").value);
    if (selectedAxis === 'x') meshAngleX = val;
    else if (selectedAxis === 'y') meshAngleY = val;
    else if (selectedAxis === 'z') meshAngleZ = val;

    texRotationAngle = parseFloat(document.getElementById("texAngle").value);
}

window.addEventListener("keydown", function(event) {
    if(["KeyW","KeyS","KeyA","KeyD"].indexOf(event.code) === -1) return;
    event.preventDefault(); 

    const stepUV = 0.05; 
    const stepTex = 0.01; 

    if (controlMode === 'mesh') {
        if (event.code === "KeyA") meshPivotU -= stepUV;
        if (event.code === "KeyD") meshPivotU += stepUV;
        if (event.code === "KeyW") meshPivotV += stepUV;
        if (event.code === "KeyS") meshPivotV -= stepUV;
        document.getElementById("meshCenterDisp").innerText = `U: ${meshPivotU.toFixed(2)}, V: ${meshPivotV.toFixed(2)}`;
    } else if (controlMode === 'texture') {
        if (event.code === "KeyA") texCenterU -= stepTex;
        if (event.code === "KeyD") texCenterU += stepTex;
        if (event.code === "KeyW") texCenterV += stepTex;
        if (event.code === "KeyS") texCenterV -= stepTex;
        document.getElementById("texCenterDisp").innerText = `${texCenterU.toFixed(2)}, ${texCenterV.toFixed(2)}`;
    }
});