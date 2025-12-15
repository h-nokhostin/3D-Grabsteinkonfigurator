// script.js
// Diese Datei initialisiert den 3D‑Konfigurator und behandelt die Benutzerinteraktion.

// Globale Variablen für Three.js Szene
let scene, camera, renderer, controls;
let ambientLight, directionalLight;
let baseMesh, headstoneMesh, inscriptionPlane;

// Inscription drawing
const inscriptionCanvas = document.createElement('canvas');
inscriptionCanvas.width = 512;
inscriptionCanvas.height = 1024;
const inscriptionCtx = inscriptionCanvas.getContext('2d');
let inscriptionTexture;

// Materialfarben aus dem Katalog (vereinfachte Farbwerte)
const materialColors = {
    'Imperial Red': '#9b2d30',
    'Emerald Pearl': '#3f5451',
    'Impala': '#4e4f52',
    'Indian Black': '#1a1a1a',
    'Star Galaxy': '#2b2d42',
    'Aruba': '#8c4f27',
    'Multicolor': '#6f302f',
    'Blue Pearl': '#395082',
    'Viscount White': '#d9d9d9',
    'MP White': '#e0e1e6',
    'Blues in the Night': '#1c284a',
    'Ocean Beige': '#c8b299',
    'Orion': '#5e546d',
    'Orion Hell': '#d1cdd8',
    'Olive Green': '#5f6e4a',
    'Marmor White': '#f6f7f7',
    'Atlantis': '#4a7c59',
    'Marmor Black': '#2e2e2e'
};

// Einfache Würfelabmessungen für das sichtbare Modell
const cubeSize = { width: 2, height: 3, depth: 1 };

// Erzeugt ein einfaches Box-Objekt für das einzige Modell.
function createCubeObject() {
    const geom = new THREE.BoxGeometry(cubeSize.width, cubeSize.height, cubeSize.depth);
    return new THREE.Mesh(geom, null);
}


// Aktuell ausgewählte Optionen
let currentColor = materialColors['Indian Black'];
let currentColorName = 'Indian Black';
// Standardmodell zu Beginn (erstes aus der Liste)
let currentShape = 'M001';
let backgroundColor = '#f4f7fb';

/**
 * Initialisiert die Three.js Szene, den Renderer und das Steuerungssystem.
 */
function initScene() {
    const canvas = document.getElementById('three-canvas');
    // Renderer
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setClearColor(new THREE.Color(backgroundColor));

    // Szene
    scene = new THREE.Scene();

    // Kamera
    camera = new THREE.PerspectiveCamera(45, canvas.clientWidth / canvas.clientHeight, 0.1, 100);
    camera.position.set(5, 5, 8);

    // Beleuchtung
    ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    directionalLight = new THREE.DirectionalLight(0xffffff, 0.7);
    directionalLight.position.set(5, 10, 3);
    scene.add(directionalLight);

    // Orbit Controls
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.1;
    controls.maxPolarAngle = Math.PI / 2;
    controls.minDistance = 5;
    controls.maxDistance = 20;

    // Boden / Podest
    const baseGeometry = new THREE.BoxGeometry(6, 0.5, 3);
    const baseMaterial = new THREE.MeshStandardMaterial({ color: 0x8b8b8b });
    baseMesh = new THREE.Mesh(baseGeometry, baseMaterial);
    baseMesh.position.set(0, 0, 0);
    baseMesh.receiveShadow = false;
    scene.add(baseMesh);

    // Headstone und Inschrift erstellen
    updateHeadstone();

    // Render‑Loop
    function animate() {
        requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
    }
    animate();

    // Handle Resize
    window.addEventListener('resize', onWindowResize);
}

function onWindowResize() {
    const canvas = document.getElementById('three-canvas');
    camera.aspect = canvas.clientWidth / canvas.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
}

/**
 * Erstellt das Mesh für den aktuell verwendeten Würfel-Grabstein.
 * @returns {THREE.Object3D}
 */
function createHeadstoneObject() {
    return createCubeObject();
}

/**
 * Erstellt bzw. aktualisiert den Grabstein und die Inschrift mit aktuellen Optionen.
 */
function updateHeadstone() {
    // Vorherigen Grabstein entfernen
    if (headstoneMesh) {
        // Entferne das bisherige Objekt aus der Szene
        scene.remove(headstoneMesh);
        // Entsorge Geometrien und Materialien korrekt sowohl für Einzel-Meshes als auch Gruppen
        if (headstoneMesh.isMesh) {
            headstoneMesh.geometry.dispose();
            if (headstoneMesh.material.map) headstoneMesh.material.map.dispose();
            headstoneMesh.material.dispose();
        } else {
            headstoneMesh.traverse((child) => {
                if (child.isMesh) {
                    child.geometry.dispose();
                    if (child.material.map) child.material.map.dispose();
                    child.material.dispose();
                }
            });
        }
    }
    if (inscriptionPlane) {
        headstoneMesh?.remove(inscriptionPlane);
        inscriptionPlane.geometry.dispose();
        inscriptionPlane.material.map.dispose();
        inscriptionPlane.material.dispose();
        inscriptionPlane = null;
    }

    // Prüfe, ob ein externes 3D‑Modell für die aktuelle Form vorliegt
    const glbPath = modelFiles[currentShape];
    if (glbPath) {
        // Lade das .glb‑Modell asynchron und erstelle den Stein daraus
        gltfLoader.load(glbPath, (gltf) => {
            const obj = gltf.scene.clone();
            // Weise allen Meshes das aktuell gewählte Material zu
            obj.traverse((child) => {
                if (child.isMesh) {
                    child.material = new THREE.MeshStandardMaterial({ color: new THREE.Color(currentColor) });
                }
            });
            // Skaliere das Modell auf eine Breite von ca. 2 und eine Höhe von ca. 3.5 Einheiten
            const bbox0 = new THREE.Box3().setFromObject(obj);
            const w0 = bbox0.max.x - bbox0.min.x;
            const h0 = bbox0.max.y - bbox0.min.y;
            const scaleX = 2.0 / w0;
            const scaleY = 3.5 / h0;
            const s = Math.min(scaleX, scaleY);
            obj.scale.set(s, s, s);
            // Berechne Bounding‑Box nach Skalierung
            const bbox = new THREE.Box3().setFromObject(obj);
            const width = bbox.max.x - bbox.min.x;
            const height = bbox.max.y - bbox.min.y;
            // Positioniere das Modell auf dem Podest (Boden y = 0.5)
            obj.position.set(0, 0.5 - bbox.min.y, 0);
            headstoneMesh = obj;
            scene.add(headstoneMesh);
            // Inschrift vorbereiten
            inscriptionTexture = new THREE.CanvasTexture(inscriptionCanvas);
            inscriptionTexture.encoding = THREE.sRGBEncoding;
            inscriptionTexture.minFilter = THREE.LinearFilter;
            const planeGeom = new THREE.PlaneGeometry(width, height);
            const planeMat = new THREE.MeshBasicMaterial({ map: inscriptionTexture, transparent: true });
            inscriptionPlane = new THREE.Mesh(planeGeom, planeMat);
            // Position der Inschrift: Mittelpunkt in XY, etwas vor Frontz
            const centerX = (bbox.min.x + bbox.max.x) / 2;
            const centerY = (bbox.min.y + bbox.max.y) / 2;
            // Ermittle die vordere Z‑Koordinate (nach Skalierung)
            const frontZ = bbox.max.z;
            inscriptionPlane.position.set(centerX, centerY, frontZ + 0.01);
            headstoneMesh.add(inscriptionPlane);
            updateInscriptionCanvas();
            refreshSummary();
        }, undefined, (error) => {
            console.error('Fehler beim Laden der GLB‑Datei', error);
        });
        return;
    }
    // Kein externes Modell: erstelle die Geometrie basierend auf dem aktuellen Shape
    const object = createHeadstoneObject(currentShape);
    // Durchlaufe alle Kind-Meshes, um ihnen das Material zuzuweisen
    const material = new THREE.MeshStandardMaterial({ color: new THREE.Color(currentColor) });
    if (object.isMesh) {
        object.material = material;
    } else {
        object.traverse((child) => {
            if (child.isMesh) child.material = material;
        });
    }
    headstoneMesh = object;
    headstoneMesh.castShadow = false;
    // Berechne die Bounding‑Box des Objekts (egal ob Mesh oder Gruppe)
    let bbox;
    if (headstoneMesh.isMesh) {
        headstoneMesh.geometry.computeBoundingBox();
        bbox = headstoneMesh.geometry.boundingBox.clone();
    } else {
        bbox = new THREE.Box3().setFromObject(headstoneMesh);
    }
    const height = bbox.max.y - bbox.min.y;
    const width = bbox.max.x - bbox.min.x;
    const depth = bbox.max.z - bbox.min.z;
    // Positionierung des Objekts auf dem Podest
    headstoneMesh.position.set(0, 0.5 - bbox.min.y, 0);
    scene.add(headstoneMesh);
    // Inschrift‑Textur anlegen
    inscriptionTexture = new THREE.CanvasTexture(inscriptionCanvas);
    inscriptionTexture.encoding = THREE.sRGBEncoding;
    inscriptionTexture.minFilter = THREE.LinearFilter;
    // Plane passend zur Größe des Steins
    const planeGeom = new THREE.PlaneGeometry(width, height);
    const planeMat = new THREE.MeshBasicMaterial({ map: inscriptionTexture, transparent: true });
    inscriptionPlane = new THREE.Mesh(planeGeom, planeMat);
    // Position: zentral in X/Y, leicht vor der Vorderseite
    const centerX = (bbox.min.x + bbox.max.x) / 2;
    const centerY = (bbox.min.y + bbox.max.y) / 2;
    const frontZ = bbox.max.z;
    inscriptionPlane.position.set(centerX, centerY, frontZ + 0.01);
    // Füge den Plane als Kind-Objekt hinzu
    headstoneMesh.add(inscriptionPlane);
    updateInscriptionCanvas();
    refreshSummary();
}

/**
 * Zeichnet die Inschrift auf die Canvas und aktualisiert die Textur.
 */
function updateInscriptionCanvas() {
    // Textparameter lesen
    const firstName = document.getElementById('first-name').value;
    const lastName = document.getElementById('last-name').value;
    const birthDate = document.getElementById('birth-date').value;
    const deathDate = document.getElementById('death-date').value;
    const fontSize = parseFloat(document.getElementById('font-size').value) || 0.2;
    const fontColor = document.getElementById('inscription-color').value;
    // Schriftart aus Dropdown lesen und auf Canvas-Metadaten abbilden
    const fontKey = document.getElementById('font-select').value;
    let fontFamily;
    switch (fontKey) {
        case 'helvetiker':
            fontFamily = 'Helvetica, Arial, sans-serif';
            break;
        case 'optimer':
            fontFamily = 'Georgia, Times New Roman, serif';
            break;
        default:
            fontFamily = 'Helvetica, Arial, sans-serif';
    }

    // Hintergrund transparent machen
    inscriptionCtx.clearRect(0, 0, inscriptionCanvas.width, inscriptionCanvas.height);
    // Schrift konfigurieren; Größe skalieren: 0.2 entspricht ca. 64px
    const pxSize = Math.floor(fontSize * 300);
    inscriptionCtx.fillStyle = fontColor;
    inscriptionCtx.textAlign = 'center';
    inscriptionCtx.textBaseline = 'middle';
    inscriptionCtx.font = `${pxSize}px ${fontFamily}`;
    const centerX = inscriptionCanvas.width / 2;
    let currentY = inscriptionCanvas.height * 0.4;
    // Vorname
    inscriptionCtx.fillText(firstName, centerX, currentY);
    currentY += pxSize * 1.2;
    // Nachname
    inscriptionCtx.fillText(lastName, centerX, currentY);
    currentY += pxSize * 1.1;
    // Geburtsdatum (mit Stern)
    inscriptionCtx.fillText(`* ${birthDate}`, centerX, currentY);
    currentY += pxSize * 0.9;
    // Sterbedatum (mit Kreuz)
    inscriptionCtx.fillText(`† ${deathDate}`, centerX, currentY);
    // Textur aktualisieren
    if (inscriptionTexture) inscriptionTexture.needsUpdate = true;
    refreshSummary();
}

/**
 * Erstellt die Farbswatches im Konfigurationspanel.
 */
function populateColorOptions() {
    const container = document.getElementById('color-options');
    container.innerHTML = '';
    Object.entries(materialColors).forEach(([name, color]) => {
        const div = document.createElement('div');
        div.className = 'swatch';
        div.title = name;
        div.style.backgroundColor = color;
        div.dataset.color = color;
        div.dataset.name = name;
        div.addEventListener('click', () => {
            currentColor = color;
            currentColorName = name;
            updateSelectedSwatch(div);
            updateHeadstone();
        });
        container.appendChild(div);
    });
    const defaultSwatch = Array.from(container.children).find((el) => el.dataset.color === currentColor);
    if (defaultSwatch) {
        updateSelectedSwatch(defaultSwatch);
    } else if (container.firstChild) {
        updateSelectedSwatch(container.firstChild);
        currentColor = container.firstChild.dataset.color;
        currentColorName = container.firstChild.dataset.name;
    }
}

function updateSelectedSwatch(selectedDiv) {
    document.querySelectorAll('.swatch').forEach(el => el.classList.remove('selected'));
    selectedDiv.classList.add('selected');
}

function refreshSummary() {
    const summary = document.getElementById('selection-summary');
    if (!summary) return;
    const firstName = document.getElementById('first-name').value;
    const lastName = document.getElementById('last-name').value;
    const birthDate = document.getElementById('birth-date').value;
    const deathDate = document.getElementById('death-date').value;
    const fontSize = document.getElementById('font-size').value;
    const inscriptionColor = document.getElementById('inscription-color').selectedOptions[0].textContent;

    summary.innerHTML = `
        <div class="summary-item">
            <p class="label">Modell</p>
            <p class="value">${currentShape}</p>
        </div>
        <div class="summary-item">
            <p class="label">Material</p>
            <p class="value">${currentColorName}</p>
        </div>
        <div class="summary-item">
            <p class="label">Inschrift</p>
            <p class="value">${firstName} ${lastName}</p>
        </div>
        <div class="summary-item">
            <p class="label">Daten</p>
            <p class="value">* ${birthDate} · † ${deathDate}</p>
        </div>
        <div class="summary-item">
            <p class="label">Schrift</p>
            <p class="value">${fontSize} | ${inscriptionColor}</p>
        </div>
    `;
}

function updateLightBadge(value) {
    const badge = document.getElementById('light-value');
    if (badge) badge.textContent = `${Math.round(value * 100)}%`;
}

function resetView() {
    if (!camera || !controls) return;
    camera.position.set(5, 5, 8);
    controls.target.set(0, 1.5, 0);
    controls.update();
}

/**
 * Bindet alle Eingabefelder, um Änderungen direkt zu übernehmen.
 */
function bindUI() {
    document.getElementById('shape-select').addEventListener('change', (e) => {
        currentShape = e.target.value;
        updateHeadstone();
    });
    ['first-name','last-name','birth-date','death-date','font-size','inscription-color','font-select'].forEach(id => {
        const el = document.getElementById(id);
        el.addEventListener('input', () => updateInscriptionCanvas());
        el.addEventListener('change', () => updateInscriptionCanvas());
    });
    document.getElementById('light-intensity').addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        if (directionalLight) directionalLight.intensity = val;
        updateLightBadge(val);
    });
    document.getElementById('bg-select').addEventListener('change', (e) => {
        backgroundColor = e.target.value;
        if (renderer) renderer.setClearColor(new THREE.Color(backgroundColor));
    });
    document.getElementById('reset-view').addEventListener('click', () => resetView());
    document.getElementById('download-btn').addEventListener('click', () => {
        // Bild aus Canvas extrahieren
        renderer.render(scene, camera);
        const dataURL = renderer.domElement.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = dataURL;
        link.download = 'grabstein-konfiguration.png';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });
}

// Initialisierung nach DOM‑Laden
window.addEventListener('DOMContentLoaded', () => {
    populateColorOptions();
    bindUI();
    initScene();
    updateLightBadge(parseFloat(document.getElementById('light-intensity').value));
    refreshSummary();
});