import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";


// ========================================
// ÜLKE SINIR VERİSİ
// ========================================

let countriesData = null;

fetch("https://raw.githubusercontent.com/johan/world.geo.json/master/countries.geo.json")
    .then((response) => response.json())
    .then((data) => {

        countriesData = data;

        console.log("Ülke sınır verisi yüklendi:", countriesData.features.length, "ülke");

    })
    .catch((error) => {

        console.error("Ülke verisi yüklenemedi:", error);

    });


// ========================================
// BAŞKENT VERİSİ
// ========================================

const capitalByName = new Map();

function normalizeName(str) {

    return str
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/^the /, "")
        .trim();

}

fetch("https://gist.githubusercontent.com/pamelafox/53b55973292537fe764599c2d319b336/raw/80206c5e8b744bc06afe0bce66ca3111c0d953c1/country_capitals.json")
    .then((response) => response.json())
    .then((data) => {

        for (const c of data) {

            const info = {
                name: c.capital,
                lat: c.lat,
                lon: c.lng
            };

            capitalByName.set(normalizeName(c.country), info);

        }

        console.log("Başkent verisi yüklendi:", capitalByName.size, "ülke");

    })
    .catch((error) => {

        console.error("Başkent verisi yüklenemedi:", error);

    });


function getCapitalInfo(country) {

    const name = normalizeName(country.properties.name || "");

    if (capitalByName.has(name)) {

        return capitalByName.get(name);

    }

    return null;

}


// ========================================
// HTML
// ========================================

const container = document.getElementById("earth");
const countryLabel = document.getElementById("countryLabel");


// ========================================
// SAHNE
// ========================================

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);


// ========================================
// KAMERA
// ========================================

const camera = new THREE.PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
);

camera.position.z = 7.5;


// ========================================
// RENDERER
// ========================================

const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true
});

renderer.setSize(
    window.innerWidth,
    window.innerHeight
);

renderer.setPixelRatio(
    Math.min(window.devicePixelRatio, 2)
);

container.appendChild(renderer.domElement);


// ========================================
// YILDIZLAR (UZAY ARKA PLANI)
// ========================================

function createStars() {

    const starCount = 6000;

    const starGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(starCount * 3);
    const sizes = new Float32Array(starCount);

    for (let i = 0; i < starCount; i++) {

        const radius = 60 + Math.random() * 140;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos((Math.random() * 2) - 1);

        const x = radius * Math.sin(phi) * Math.cos(theta);
        const y = radius * Math.sin(phi) * Math.sin(theta);
        const z = radius * Math.cos(phi);

        positions[i * 3] = x;
        positions[i * 3 + 1] = y;
        positions[i * 3 + 2] = z;

        sizes[i] = Math.random() * 1.5 + 0.3;

    }

    starGeometry.setAttribute(
        "position",
        new THREE.BufferAttribute(positions, 3)
    );

    starGeometry.setAttribute(
        "size",
        new THREE.BufferAttribute(sizes, 1)
    );

    const starMaterial = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.6,
        sizeAttenuation: true,
        transparent: true,
        opacity: 0.9
    });

    const stars = new THREE.Points(starGeometry, starMaterial);

    scene.add(stars);

    return stars;

}

const stars = createStars();


// ========================================
// DÜNYA
// ========================================

const geometry = new THREE.SphereGeometry(
    1.6,
    128,
    128
);


// ========================================
// TEXTURE
// ========================================

const textureLoader = new THREE.TextureLoader();

const earthTexture = textureLoader.load(
    "./flag.jpg.png"
);

earthTexture.colorSpace = THREE.SRGBColorSpace;


// ========================================
// DÜNYA MATERYALİ
// ========================================

const material = new THREE.MeshPhongMaterial({

    map: earthTexture,

    color: 0xffffff,

    shininess: 35,

    specular: 0x555555,

    emissive: 0x112244,
    emissiveIntensity: 0.15

});


const earth = new THREE.Mesh(
    geometry,
    material
);

scene.add(earth);


// ========================================
// ATMOSFER
// ========================================

const atmosphereGeometry = new THREE.SphereGeometry(
    1.615,
    128,
    128
);

const atmosphereMaterial = new THREE.MeshBasicMaterial({

    color: 0x33e5ff,

    transparent: true,

    opacity: 0.85,

    side: THREE.BackSide,

    blending: THREE.AdditiveBlending

});

const atmosphere = new THREE.Mesh(
    atmosphereGeometry,
    atmosphereMaterial
);

scene.add(atmosphere);


// Dış parlama (glow) katmanı
const glowGeometry = new THREE.SphereGeometry(
    1.7,
    128,
    128
);

const glowMaterial = new THREE.MeshBasicMaterial({

    color: 0x00aaff,

    transparent: true,

    opacity: 0.08,

    side: THREE.BackSide,

    blending: THREE.AdditiveBlending

});

const glow = new THREE.Mesh(
    glowGeometry,
    glowMaterial
);

scene.add(glow);


// ========================================
// IŞIKLAR
// ========================================

const ambientLight = new THREE.AmbientLight(
    0xffffff,
    0.5
);

scene.add(ambientLight);


const sunLight = new THREE.DirectionalLight(
    0xffffff,
    3.5
);

sunLight.position.set(
    5,
    3,
    5
);

scene.add(sunLight);


const blueLight = new THREE.PointLight(
    0x3388ff,
    1.5,
    12
);

blueLight.position.set(
    -4,
    2,
    4
);

scene.add(blueLight);


// ========================================
// ORTAK DURUM DEĞİŞKENLERİ
// ========================================

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

let isDragging = false;
let didDrag = false;

let previousX = 0;
let previousY = 0;

let startX = 0;
let startY = 0;

const dragThreshold = 5;

let isFocused = false;
let focusedCountryName = null;

let startQuaternion = new THREE.Quaternion();
let targetQuaternion = new THREE.Quaternion();
let preFocusQuaternion = new THREE.Quaternion();

let focusStartTime = 0;
let focusProgress = 1;
const focusDuration = 1000;

let cameraAnimStartZ = camera.position.z;
let cameraTargetZ = camera.position.z;

const defaultZoom = 7.5;
const focusZoom = 3.6;

let hoveredCountryName = null;
let hoverBorderGroup = null;
let hoverThrottle = false;

let focusedBorderGroup = null;
let capitalPinGroup = null;

const minZoom = 3;
const maxZoom = 15;

let previousPinchDistance = null;


// ========================================
// YARDIMCI FONKSİYONLAR
// ========================================

function easeInOutCubic(t) {

    return t < 0.5
        ? 4 * t * t * t
        : 1 - Math.pow(-2 * t + 2, 3) / 2;

}


function computeFocusQuaternion(forward) {

    let worldUp = new THREE.Vector3(0, 1, 0);

    if (Math.abs(forward.dot(worldUp)) > 0.999) {

        worldUp = new THREE.Vector3(0, 0, 1);

    }

    const right = new THREE.Vector3()
        .crossVectors(worldUp, forward)
        .normalize();

    const up = new THREE.Vector3()
        .crossVectors(forward, right)
        .normalize();

    const basisMatrix = new THREE.Matrix4().makeBasis(right, up, forward);

    const quaternion = new THREE.Quaternion()
        .setFromRotationMatrix(basisMatrix)
        .invert();

    return quaternion;

}


function latLonToVector3(lat, lon, radius) {

    const u = (lon + 180) / 360;
    const vParam = (90 - lat) / 180;

    const phi = u * Math.PI * 2;
    const theta = vParam * Math.PI;

    const x = -radius * Math.cos(phi) * Math.sin(theta);
    const y = radius * Math.cos(theta);
    const z = radius * Math.sin(phi) * Math.sin(theta);

    return new THREE.Vector3(x, y, z);

}


// Bir ülkenin sınırını parlak (neon) bir çizgi grubu olarak oluşturur.
function createCountryBorderGroup(country, color, coreOpacity, glowOpacity) {

    const group = new THREE.Group();

    const geo = country.geometry;

    const polygons = geo.type === "Polygon"
        ? [geo.coordinates]
        : geo.coordinates;

    const innerRadius = 1.607;
    const outerRadius = 1.612;

    for (const polygon of polygons) {

        for (const ring of polygon) {

            const innerPoints = ring.map(([lon, lat]) =>
                latLonToVector3(lat, lon, innerRadius)
            );

            const outerPoints = ring.map(([lon, lat]) =>
                latLonToVector3(lat, lon, outerRadius)
            );

            const glowGeom = new THREE.BufferGeometry().setFromPoints(outerPoints);

            const glowMat = new THREE.LineBasicMaterial({
                color: color,
                transparent: true,
                opacity: glowOpacity,
                blending: THREE.AdditiveBlending
            });

            group.add(new THREE.LineLoop(glowGeom, glowMat));

            const coreGeom = new THREE.BufferGeometry().setFromPoints(innerPoints);

            const coreMat = new THREE.LineBasicMaterial({
                color: color,
                transparent: true,
                opacity: coreOpacity,
                blending: THREE.AdditiveBlending
            });

            group.add(new THREE.LineLoop(coreGeom, coreMat));

        }

    }

    return group;

}


// Küçük, parlak bir metin sprite'ı oluşturur (başkent ismi için)
function createTextSprite(text, colorHex) {

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    const fontSize = 64;

    ctx.font = "bold " + fontSize + "px Arial";

    const textWidth = ctx.measureText(text).width;

    canvas.width = textWidth + 40;
    canvas.height = fontSize + 40;

    // Canvas boyutu değişince context sıfırlanır, fontu tekrar ayarla
    ctx.font = "bold " + fontSize + "px Arial";
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";

    ctx.shadowColor = colorHex;
    ctx.shadowBlur = 20;
    ctx.fillStyle = colorHex;

    ctx.fillText(text, canvas.width / 2, canvas.height / 2);
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;

    const spriteMaterial = new THREE.SpriteMaterial({
        map: texture,
        transparent: true
    });

    const sprite = new THREE.Sprite(spriteMaterial);

    const aspect = canvas.width / canvas.height;
    const spriteHeight = 0.16;

    sprite.scale.set(spriteHeight * aspect, spriteHeight, 1);

    return sprite;

}


// Başkent konumunda parlayan bir iğne + isim etiketi oluşturur
function createCapitalPin(lat, lon, labelText) {

    const group = new THREE.Group();

    const baseRadius = 1.605;
    const tipRadius = 1.78;

    const basePoint = latLonToVector3(lat, lon, baseRadius);
    const tipPoint = latLonToVector3(lat, lon, tipRadius);

    const stemGeom = new THREE.BufferGeometry().setFromPoints([basePoint, tipPoint]);

    const stemMat = new THREE.LineBasicMaterial({
        color: 0xffee55,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending
    });

    group.add(new THREE.Line(stemGeom, stemMat));

    const headGeom = new THREE.SphereGeometry(0.025, 16, 16);

    const headMat = new THREE.MeshBasicMaterial({
        color: 0xffee55
    });

    const head = new THREE.Mesh(headGeom, headMat);
    head.position.copy(tipPoint);

    group.add(head);

    const glowGeom = new THREE.SphereGeometry(0.05, 16, 16);

    const glowMat = new THREE.MeshBasicMaterial({
        color: 0xffee55,
        transparent: true,
        opacity: 0.35,
        blending: THREE.AdditiveBlending
    });

    const glowHead = new THREE.Mesh(glowGeom, glowMat);
    glowHead.position.copy(tipPoint);

    group.add(glowHead);

    const label = createTextSprite(labelText, "#black");

    const labelPos = latLonToVector3(lat, lon, tipRadius + 0.15);
    label.position.copy(labelPos);

    group.add(label);

    return group;

}


function clearCapitalPin() {

    if (capitalPinGroup) {

        earth.remove(capitalPinGroup);
        capitalPinGroup = null;

    }

}


function findCountryAt(lat, lon) {

    for (const feature of countriesData.features) {

        const geo = feature.geometry;

        if (!geo) continue;

        if (geo.type === "Polygon") {

            if (isPointInPolygon(lon, lat, geo.coordinates)) {

                return feature;

            }

        } else if (geo.type === "MultiPolygon") {

            for (const polygon of geo.coordinates) {

                if (isPointInPolygon(lon, lat, polygon)) {

                    return feature;

                }

            }

        }

    }

    return null;

}


function isPointInPolygon(lon, lat, polygon) {

    const outerRing = polygon[0];

    if (!isInRing(lon, lat, outerRing)) return false;

    for (let i = 1; i < polygon.length; i++) {

        if (isInRing(lon, lat, polygon[i])) {

            return false;

        }

    }

    return true;

}


function isInRing(lon, lat, ring) {

    let inside = false;

    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {

        const xi = ring[i][0], yi = ring[i][1];
        const xj = ring[j][0], yj = ring[j][1];

        const intersect =
            ((yi > lat) !== (yj > lat)) &&
            (lon < (xj - xi) * (lat - yi) / (yj - yi) + xi);

        if (intersect) inside = !inside;

    }

    return inside;

}


// ========================================
// HOVER (ÜZERİNE GELİNCE SOLUK PARLAMA)
// ========================================

function handleHover(event) {

    if (isFocused) return;

    if (hoverThrottle) return;

    hoverThrottle = true;

    requestAnimationFrame(() => {

        hoverThrottle = false;

    });

    const rect = container.getBoundingClientRect();

    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(pointer, camera);

    const intersects = raycaster.intersectObject(earth, false);

    if (intersects.length === 0 || !countriesData) {

        clearHoverHighlight();
        return;

    }

    const uv = intersects[0].uv;

    const lon = uv.x * 360 - 180;
    const lat = uv.y * 180 - 90;

    const country = findCountryAt(lat, lon);

    if (!country) {

        clearHoverHighlight();
        return;

    }

    const name = country.properties.name;

    if (name === hoveredCountryName) return;

    hoveredCountryName = name;

    if (hoverBorderGroup) {

        earth.remove(hoverBorderGroup);
        hoverBorderGroup = null;

    }

    hoverBorderGroup = createCountryBorderGroup(country, 0x33e5ff, 0.55, 0.2);

    earth.add(hoverBorderGroup);

    container.style.cursor = "default";

}


function clearHoverHighlight() {

    if (hoveredCountryName === null) return;

    hoveredCountryName = null;

    if (hoverBorderGroup) {

        earth.remove(hoverBorderGroup);
        hoverBorderGroup = null;

    }

    container.style.cursor = "default";

}


function clearFocusBorder() {

    if (focusedBorderGroup) {

        earth.remove(focusedBorderGroup);
        focusedBorderGroup = null;

    }

}


// ========================================
// TIKLAMA (ODAKLANMA)
// ========================================

function handleClick(event) {

    const rect = container.getBoundingClientRect();

    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(pointer, camera);

    const intersects = raycaster.intersectObject(earth, false);

    if (intersects.length === 0) return;

    const uv = intersects[0].uv;

    const lon = uv.x * 360 - 180;
    const lat = uv.y * 180 - 90;

    console.log("Tıklanan konum -> lat:", lat.toFixed(2), "lon:", lon.toFixed(2));

    if (!countriesData) {

        console.warn("Ülke verisi henüz yüklenmedi.");
        return;

    }

    const country = findCountryAt(lat, lon);

    if (!country) {

        console.log("Bu noktada bir ülke bulunamadı (okyanus olabilir).");
        return;

    }

    const name = country.properties.name;

    console.log("Tıklanan ülke:", name);


    // Zaten odaklanmış olduğumuz ülkeye tekrar tıklandıysa -> eski konuma dön
    if (isFocused && focusedCountryName === name) {

        startQuaternion.copy(earth.quaternion);
        targetQuaternion.copy(preFocusQuaternion);

        cameraAnimStartZ = camera.position.z;
        cameraTargetZ = defaultZoom;

        focusStartTime = performance.now();
        focusProgress = 0;

        isFocused = false;
        focusedCountryName = null;

        countryLabel.classList.remove("show");

        clearFocusBorder();
        clearCapitalPin();

        return;

    }


    // Yeni bir ülkeye odaklan (ilk kez ya da farklı bir ülkeye geçiş)
    clearHoverHighlight();

    if (!isFocused) {

        preFocusQuaternion.copy(earth.quaternion);

    }

    const localPoint = earth.worldToLocal(intersects[0].point.clone());
    const localDir = localPoint.clone().normalize();

    startQuaternion.copy(earth.quaternion);
    targetQuaternion.copy(computeFocusQuaternion(localDir));

    cameraAnimStartZ = camera.position.z;
    cameraTargetZ = focusZoom;

    focusStartTime = performance.now();
    focusProgress = 0;

    isFocused = true;
    focusedCountryName = name;

    countryLabel.textContent = name;
    countryLabel.classList.add("show");

    clearFocusBorder();

    focusedBorderGroup = createCountryBorderGroup(country, 0x66ffee, 1, 0.45);

    earth.add(focusedBorderGroup);


    clearCapitalPin();

    const capitalInfo = getCapitalInfo(country);

    if (capitalInfo) {

        capitalPinGroup = createCapitalPin(capitalInfo.lat, capitalInfo.lon, capitalInfo.name);

        earth.add(capitalPinGroup);

    } else {

        console.log("Başkent bilgisi bulunamadı:", name);

    }

}


// ========================================
// MOUSE / TOUCH
// ========================================

container.addEventListener(
    "pointerdown",
    (event) => {

        clearHoverHighlight();

        isDragging = true;
        didDrag = false;

        previousX = event.clientX;
        previousY = event.clientY;

        startX = event.clientX;
        startY = event.clientY;

    }
);


container.addEventListener(
    "pointermove",
    (event) => {

        if (!isDragging) {

            handleHover(event);
            return;

        }

        const deltaX =
            event.clientX - previousX;

        const deltaY =
            event.clientY - previousY;


        const totalDeltaX = event.clientX - startX;
        const totalDeltaY = event.clientY - startY;

        const totalDistance = Math.sqrt(
            totalDeltaX * totalDeltaX +
            totalDeltaY * totalDeltaY
        );

        if (totalDistance > dragThreshold) {

            didDrag = true;

        }


        const rotationSpeed = 0.005;

        const quatY = new THREE.Quaternion().setFromAxisAngle(
            new THREE.Vector3(0, 1, 0),
            deltaX * rotationSpeed
        );

        const quatX = new THREE.Quaternion().setFromAxisAngle(
            new THREE.Vector3(1, 0, 0),
            deltaY * rotationSpeed
        );

        earth.quaternion.premultiply(quatY);
        earth.quaternion.premultiply(quatX);


        previousX = event.clientX;
        previousY = event.clientY;

    }
);


container.addEventListener(
    "pointerup",
    (event) => {

        isDragging = false;

        if (!didDrag) {

            handleClick(event);

        }

    }
);


container.addEventListener(
    "pointerleave",
    () => {

        isDragging = false;
        clearHoverHighlight();

    }
);


// ========================================
// ZOOM (MOUSE WHEEL)
// ========================================

container.addEventListener(
    "wheel",
    (event) => {

        event.preventDefault();

        camera.position.z += event.deltaY * 0.01;

        camera.position.z = Math.max(
            minZoom,
            Math.min(maxZoom, camera.position.z)
        );

    },
    { passive: false }
);


// ========================================
// ZOOM (PINCH - TOUCH)
// ========================================

function getPinchDistance(touches) {

    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;

    return Math.sqrt(dx * dx + dy * dy);

}

container.addEventListener(
    "touchstart",
    (event) => {

        if (event.touches.length === 2) {

            previousPinchDistance = getPinchDistance(event.touches);

        }

    },
    { passive: false }
);

container.addEventListener(
    "touchmove",
    (event) => {

        if (event.touches.length === 2) {

            event.preventDefault();

            const currentDistance = getPinchDistance(event.touches);

            if (previousPinchDistance !== null) {

                const delta = currentDistance - previousPinchDistance;

                camera.position.z -= delta * 0.02;

                camera.position.z = Math.max(
                    minZoom,
                    Math.min(maxZoom, camera.position.z)
                );

            }

            previousPinchDistance = currentDistance;

        }

    },
    { passive: false }
);

container.addEventListener(
    "touchend",
    () => {

        previousPinchDistance = null;

    }
);


// ========================================
// ANİMASYON
// ========================================

function animate() {

    requestAnimationFrame(animate);

    if (!isDragging && !isFocused) {

        const autoRotateQuat = new THREE.Quaternion().setFromAxisAngle(
            new THREE.Vector3(0, 1, 0),
            0.0015
        );

        earth.quaternion.premultiply(autoRotateQuat);

    }

    if (focusProgress < 1) {

        const elapsed = performance.now() - focusStartTime;

        focusProgress = Math.min(elapsed / focusDuration, 1);

        const eased = easeInOutCubic(focusProgress);

        earth.quaternion.slerpQuaternions(
            startQuaternion,
            targetQuaternion,
            eased
        );

        camera.position.z = THREE.MathUtils.lerp(
            cameraAnimStartZ,
            cameraTargetZ,
            eased
        );

    }

    atmosphere.quaternion.copy(earth.quaternion);
    glow.quaternion.copy(earth.quaternion);

    stars.rotation.y += 0.00005;

    renderer.render(
        scene,
        camera
    );

}


animate();


// ========================================
// EKRAN BOYUTU
// ========================================

window.addEventListener(
    "resize",
    () => {

        camera.aspect =
            window.innerWidth /
            window.innerHeight;

        camera.updateProjectionMatrix();


        renderer.setSize(
            window.innerWidth,
            window.innerHeight
        );

    }
);