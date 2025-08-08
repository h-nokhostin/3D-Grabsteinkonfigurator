// script.js
// Diese Datei initialisiert den 3D‑Konfigurator und behandelt die Benutzerinteraktion.

// Globale Variablen für Three.js Szene
let scene, camera, renderer, controls;
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

// Mapping für externe 3D‑Modelle (GLB). Wenn ein Modell hier gelistet ist,
// wird die zugehörige Datei geladen und als Geometrie verwendet.
const modelFiles = {
    'M001': 'models/M001.glb'
};

// GLTF‑Loader zum Laden von .glb‑Dateien (wird in initScene initialisiert)
let gltfLoader;

/*
 * Erstellt ein oder mehrere 2D‑Shapes für das angegebene Modell. Die Shapes
 * beschreiben die Silhouette des Grabsteins in der XY‑Ebene. Sie werden
 * anschließend per ExtrudeGeometry in die Tiefe extrudiert. Die Maße sind
 * normiert auf eine Breite von ca. 2 Einheiten und eine Höhe von ca. 3–3.5
 * Einheiten. Die Definitionen sind einfache Annäherungen basierend auf
 * den Modellskizzen aus dem Katalog (Seiten 21 & 22).
 * @param {string} modelName Modellbezeichnung (z. B. 'M001')
 * @returns {THREE.Shape[]} Liste von Shapes (kann mehrere enthalten)
 */
function createModelShapes(modelName) {
    const shapes = [];
    switch (modelName) {
        case 'M001': {
            /**
             * Modell M001 (angepasst an bereitgestelltes Bild):
             * Die Silhouette ist trapezförmig – die Basis ist etwas schmaler als
             * die Breite oben. Links steigt der Stein leicht nach außen an. Im
             * oberen Bereich bildet sich ein kleiner "Buckel" oder Höcker leicht
             * links der Mitte, bevor die Oberkante sanft nach rechts abfällt. Die
             * rechte Seite verläuft dezent nach innen zum unteren Ende.
             */
            const s = new THREE.Shape();
            // Startpunkt unten links (etwas schmalere Basis)
            s.moveTo(-0.9, 0.0);
            // linke Seitenkante: leicht nach außen geneigt
            s.lineTo(-1.0, 3.0);
            // kleiner Höcker kurz nach der linken Ecke
            s.quadraticCurveTo(-0.8, 3.6, -0.6, 3.4);
            // sanft abfallende Oberkante nach rechts
            s.quadraticCurveTo(0.2, 3.2, 1.0, 2.9);
            // rechte Kante: leicht nach innen geneigt zur Basis
            s.lineTo(0.9, 0.0);
            // Boden abschließen
            s.lineTo(-0.9, 0.0);
            shapes.push(s);
            break;
        }
        case 'M002': {
            // Zweifacher Wellenbogen
            const s = new THREE.Shape();
            s.moveTo(-1.0, 0.0);
            s.lineTo(-1.0, 2.5);
            s.bezierCurveTo(-0.6, 3.2, -0.3, 3.4, 0.0, 2.9);
            s.bezierCurveTo(0.3, 3.4, 0.6, 3.2, 1.0, 2.5);
            s.lineTo(1.0, 0.0);
            s.lineTo(-1.0, 0.0);
            shapes.push(s);
            break;
        }
        case 'M003': {
            // Modell M003: schräges Dach, rechts deutlich höher als links
            const s = new THREE.Shape();
            s.moveTo(-1.0, 0.0);
            // linke Seitenkante
            s.lineTo(-1.0, 2.4);
            // Linie zum Übergangspunkt der Schräge
            s.lineTo(-0.3, 3.0);
            // Spitze rechts oben
            s.lineTo(1.0, 3.6);
            // rechte Seitenkante
            s.lineTo(1.0, 0.0);
            // zurück
            s.lineTo(-1.0, 0.0);
            shapes.push(s);
            break;
        }
        case 'M004': {
            // Sanfter Bogen
            const s = new THREE.Shape();
            s.moveTo(-1.0, 0.0);
            s.lineTo(-1.0, 2.7);
            s.quadraticCurveTo(0.0, 3.2, 1.0, 2.7);
            s.lineTo(1.0, 0.0);
            s.lineTo(-1.0, 0.0);
            shapes.push(s);
            break;
        }
        case 'M005': {
            // Rundes Dach (Halbkreis)
            const s = new THREE.Shape();
            s.moveTo(-1.0, 0.0);
            s.lineTo(-1.0, 2.7);
            s.bezierCurveTo(-0.5, 3.5, 0.5, 3.5, 1.0, 2.7);
            s.lineTo(1.0, 0.0);
            s.lineTo(-1.0, 0.0);
            shapes.push(s);
            break;
        }
        case 'M006': {
            // Modell M006: spiegelbildlich zu M001 – der Einschnitt befindet sich oben rechts,
            // während der höchste Punkt eher links liegt. Die Oberkante fällt nach links ab.
            const s = new THREE.Shape();
            s.moveTo(-1.0, 0.0);
            // linke Kante gerade nach oben
            s.lineTo(-1.0, 2.8);
            // Anstieg zum höchsten Punkt etwas links der Mitte
            s.quadraticCurveTo(-0.6, 3.4, -0.3, 3.5);
            // sanfter Übergang zur rechten Seite mit Einschnitt
            s.quadraticCurveTo(0.2, 3.3, 0.6, 3.0);
            s.quadraticCurveTo(0.9, 2.7, 1.0, 2.4);
            // rechte Kante nach unten
            s.lineTo(1.0, 0.0);
            // zurück zum Start
            s.lineTo(-1.0, 0.0);
            shapes.push(s);
            break;
        }
        case 'M007': {
            // Rechteckiger Stein
            const s = new THREE.Shape();
            s.moveTo(-1.0, 0.0);
            s.lineTo(-1.0, 3.0);
            s.lineTo(1.0, 3.0);
            s.lineTo(1.0, 0.0);
            s.lineTo(-1.0, 0.0);
            shapes.push(s);
            break;
        }
        case 'M008': {
            // Doppelwelle mit V-förmiger Mitte
            const s = new THREE.Shape();
            s.moveTo(-1.0, 0.0);
            s.lineTo(-1.0, 2.7);
            s.bezierCurveTo(-0.6, 3.4, -0.3, 3.5, 0.0, 2.9);
            s.bezierCurveTo(0.3, 3.5, 0.6, 3.4, 1.0, 2.7);
            s.lineTo(1.0, 0.0);
            s.lineTo(-1.0, 0.0);
            shapes.push(s);
            break;
        }
        case 'M009': {
            // Sanfte Rundung ähnlich M004
            const s = new THREE.Shape();
            s.moveTo(-1.0, 0.0);
            s.lineTo(-1.0, 2.8);
            s.quadraticCurveTo(0.0, 3.3, 1.0, 2.8);
            s.lineTo(1.0, 0.0);
            s.lineTo(-1.0, 0.0);
            shapes.push(s);
            break;
        }
        case 'M010': {
            // Modell M010: schlanke Figur mit sanft geschwungenen Flanken und einer asymmetrischen
            // Oberkante mit leichtem Knick auf der linken Seite.
            const s = new THREE.Shape();
            s.moveTo(-1.0, 0.0);
            // linke Flanke: sanft nach oben schwingend
            s.bezierCurveTo(-0.8, 1.4, -0.8, 2.6, -0.6, 3.2);
            // oberer Mittelbereich: markante Spitze in der Mitte
            s.lineTo(0.0, 3.6);
            s.lineTo(0.6, 3.2);
            // rechte Flanke: symmetrisch hinab
            s.bezierCurveTo(0.8, 2.6, 0.8, 1.4, 1.0, 0.0);
            // Unterkante schließen
            s.lineTo(-1.0, 0.0);
            shapes.push(s);
            break;
        }
        case 'M011': {
            // Modell M011: zwei separate Stelen mit gegensätzlicher Schräge. Zwischen den
            // Stelen bleibt ein freier Spalt.
            const left = new THREE.Shape();
            left.moveTo(-1.0, 0.0);
            left.lineTo(-1.0, 2.6);
            left.lineTo(-0.6, 3.2);
            left.lineTo(-0.2, 2.8);
            left.lineTo(-0.2, 0.0);
            left.lineTo(-1.0, 0.0);
            const right = new THREE.Shape();
            right.moveTo(0.2, 0.0);
            right.lineTo(0.2, 2.8);
            right.lineTo(0.6, 3.2);
            right.lineTo(1.0, 2.6);
            right.lineTo(1.0, 0.0);
            right.lineTo(0.2, 0.0);
            shapes.push(left, right);
            break;
        }
        case 'M012': {
            // Modell M012: gebrochene Spitze mit zwei deutlichen Zacken
            const s = new THREE.Shape();
            s.moveTo(-1.0, 0.0);
            // linke Kante
            s.lineTo(-1.0, 2.8);
            // erster hoher Zacken links
            s.lineTo(-0.6, 3.7);
            // Einbuchtung zwischen den Zacken
            s.lineTo(-0.2, 3.2);
            // zweiter hoher Zacken in der Mitte
            s.lineTo(0.2, 3.8);
            // Abfall zur rechten Seite
            s.lineTo(0.7, 3.4);
            s.lineTo(1.0, 2.9);
            // rechte Kante nach unten
            s.lineTo(1.0, 0.0);
            // schließe zurück zum Start
            s.lineTo(-1.0, 0.0);
            shapes.push(s);
            break;
        }
        case 'M013': {
            // Modell M013: elegante, schlanke Silhouette mit zwei sanften Erhebungen
            // im oberen Bereich (symmetrischer Doppelbogen). Die Flanken sind weich geschwungen.
            const s = new THREE.Shape();
            s.moveTo(-1.0, 0.0);
            // linke Flanke
            s.bezierCurveTo(-0.9, 1.6, -0.9, 2.5, -0.8, 3.4);
            // erste Erhebung links
            s.quadraticCurveTo(-0.4, 3.8, 0.0, 3.5);
            // zweite Erhebung rechts
            s.quadraticCurveTo(0.4, 3.8, 0.8, 3.4);
            // rechte Flanke
            s.bezierCurveTo(0.9, 2.5, 0.9, 1.6, 1.0, 0.0);
            // zurück
            s.lineTo(-1.0, 0.0);
            shapes.push(s);
            break;
        }
        case 'M014': {
            // Modell M014: breite, geschwungene Form mit betontem Bauch
            const s = new THREE.Shape();
            s.moveTo(-1.0, 0.0);
            s.lineTo(-1.0, 1.9);
            // linke Bauchkurve
            s.bezierCurveTo(-0.9, 3.2, -0.3, 3.8, 0.0, 3.4);
            // rechte Bauchkurve
            s.bezierCurveTo(0.3, 3.8, 0.9, 3.2, 1.0, 1.9);
            s.lineTo(1.0, 0.0);
            s.lineTo(-1.0, 0.0);
            shapes.push(s);
            break;
        }
        case 'M015': {
            // Modell M015: schlanke, asymmetrische Wellenform mit leichtem Schwung
            const s = new THREE.Shape();
            s.moveTo(-1.0, 0.0);
            s.lineTo(-1.0, 2.2);
            // linke Kurve
            s.bezierCurveTo(-0.8, 3.4, -0.4, 3.8, 0.0, 3.2);
            // rechte Kurve etwas niedriger
            s.bezierCurveTo(0.5, 3.6, 0.8, 3.2, 1.0, 2.0);
            s.lineTo(1.0, 0.0);
            s.lineTo(-1.0, 0.0);
            shapes.push(s);
            break;
        }
        case 'M016': {
            // Modell M016: rechte Seite bildet einen großen Halbkreis, linke Seite gerade
            const s = new THREE.Shape();
            s.moveTo(-1.0, 0.0);
            s.lineTo(-1.0, 2.6);
            // Übergang zum runden rechten Teil
            s.quadraticCurveTo(-0.5, 3.3, 0.2, 3.6);
            s.quadraticCurveTo(1.4, 3.6, 1.1, 2.4);
            s.lineTo(1.0, 0.0);
            s.lineTo(-1.0, 0.0);
            shapes.push(s);
            break;
        }
        case 'M017': {
            // Modell M017: reich verzierter Kopf mit mehreren stufigen Erhebungen (kronenähnlich).
            // Die Form besteht aus einer Reihe von aufsteigenden Stufen hin zur mittleren Spitze
            // und spiegelt sich dann symmetrisch.
            const s = new THREE.Shape();
            s.moveTo(-1.0, 0.0);
            s.lineTo(-1.0, 2.0);
            // erste Stufe links
            s.lineTo(-0.9, 2.4);
            // zweite Stufe links
            s.lineTo(-0.7, 2.7);
            // dritte Stufe links
            s.lineTo(-0.4, 3.0);
            // mittlere Spitze
            s.lineTo(0.0, 3.3);
            // Spiegelung zur rechten Seite
            s.lineTo(0.4, 3.0);
            s.lineTo(0.7, 2.7);
            s.lineTo(0.9, 2.4);
            s.lineTo(1.0, 2.0);
            // rechte Kante nach unten
            s.lineTo(1.0, 0.0);
            // zurück zum Anfang
            s.lineTo(-1.0, 0.0);
            shapes.push(s);
            break;
        }
        case 'M018': {
            // Modell M018: asymmetrische Doppelwelle – links niedriger, rechts höher
            const s = new THREE.Shape();
            s.moveTo(-1.0, 0.0);
            s.lineTo(-1.0, 2.3);
            // linke Welle (niedriger)
            s.quadraticCurveTo(-0.6, 3.0, -0.2, 3.2);
            // Übergang zur hohen Welle
            s.quadraticCurveTo(0.3, 3.6, 0.6, 3.7);
            s.quadraticCurveTo(0.9, 3.5, 1.0, 2.9);
            s.lineTo(1.0, 0.0);
            s.lineTo(-1.0, 0.0);
            shapes.push(s);
            break;
        }
        case 'M019': {
            // Modell M019: dynamische, wellige Silhouette mit ausgeprägter Rundung rechts
            const s = new THREE.Shape();
            s.moveTo(-1.2, 0.0);
            s.lineTo(-1.2, 2.0);
            // mehrfache Wellen links (gestaffelte Höhen)
            s.bezierCurveTo(-1.0, 3.0, -0.8, 3.8, -0.4, 3.6);
            // höchste Erhebung in der Mitte
            s.bezierCurveTo(0.1, 4.0, 0.5, 3.8, 0.7, 3.2);
            // rechte Rundung mit tieferem Endpunkt
            s.bezierCurveTo(1.2, 2.6, 1.3, 2.2, 1.2, 1.6);
            s.lineTo(1.2, 0.0);
            s.lineTo(-1.2, 0.0);
            shapes.push(s);
            break;
        }
        case 'M020': {
            // Modell M020: breites, leicht geschwungenes Dach
            const s = new THREE.Shape();
            s.moveTo(-1.2, 0.0);
            s.lineTo(-1.2, 2.1);
            s.quadraticCurveTo(-0.4, 2.8, 0.0, 2.7);
            s.quadraticCurveTo(0.4, 2.8, 1.2, 2.1);
            s.lineTo(1.2, 0.0);
            s.lineTo(-1.2, 0.0);
            shapes.push(s);
            break;
        }
        case 'M021': {
            // Modell M021: rechteckig mit leicht rundem oberen Abschluss
            const s = new THREE.Shape();
            s.moveTo(-1.1, 0.0);
            s.lineTo(-1.1, 2.7);
            s.quadraticCurveTo(-1.1, 3.2, -0.8, 3.2);
            s.lineTo(0.8, 3.2);
            s.quadraticCurveTo(1.1, 3.2, 1.1, 2.7);
            s.lineTo(1.1, 0.0);
            s.lineTo(-1.1, 0.0);
            shapes.push(s);
            break;
        }
        case 'M022': {
            // Modell M022: zwei schmale Stelen mit schräg zulaufenden Köpfen und Zwischenraum
            const left = new THREE.Shape();
            // linker Pfosten
            left.moveTo(-1.0, 0.0);
            left.lineTo(-1.0, 2.2);
            left.lineTo(-0.6, 3.0);
            left.lineTo(-0.3, 3.0);
            left.lineTo(-0.3, 0.0);
            left.lineTo(-1.0, 0.0);
            const right = new THREE.Shape();
            // rechter Pfosten
            right.moveTo(0.3, 0.0);
            right.lineTo(0.3, 3.0);
            right.lineTo(0.6, 3.0);
            right.lineTo(1.0, 2.2);
            right.lineTo(1.0, 0.0);
            right.lineTo(0.3, 0.0);
            // Mittelstück: rechteckige Verbindung zwischen den Pfosten im unteren Bereich
            const connector = new THREE.Shape();
            connector.moveTo(-0.3, 0.0);
            connector.lineTo(-0.3, 1.2);
            connector.lineTo(0.3, 1.2);
            connector.lineTo(0.3, 0.0);
            connector.lineTo(-0.3, 0.0);
            shapes.push(left, right, connector);
            break;
        }
        case 'M023': {
            // Modell M023: asymmetrischer Stein mit herzförmigem Ausschnitt
            const s = new THREE.Shape();
            s.moveTo(-1.0, 0.0);
            s.lineTo(-1.0, 2.5);
            // linke Schulter
            s.lineTo(-0.6, 3.2);
            // mittlere Erhebung
            s.lineTo(-0.2, 3.5);
            // rechter Übergang mit sanfter Schräge
            s.lineTo(0.5, 3.0);
            s.lineTo(1.0, 2.4);
            s.lineTo(1.0, 0.0);
            s.lineTo(-1.0, 0.0);
            // Herz/Loch in der oberen rechten Hälfte
            const hole = new THREE.Path();
            hole.moveTo(0.3, 2.5);
            hole.quadraticCurveTo(0.1, 2.3, 0.0, 2.5);
            hole.quadraticCurveTo(0.2, 2.8, 0.3, 2.5);
            s.holes.push(hole);
            shapes.push(s);
            break;
        }
        case 'M024': {
            // Modell M024: großes Grabmal mit zwei Türmchen und geschwungenem Mittelteil
            const s = new THREE.Shape();
            s.moveTo(-1.5, 0.0);
            // linker Turm
            s.lineTo(-1.5, 3.0);
            s.lineTo(-1.4, 3.8);
            s.lineTo(-1.3, 4.2);
            s.lineTo(-1.2, 3.8);
            s.lineTo(-1.1, 3.0);
            // linker Übergang zum Mittelteil
            s.lineTo(-0.7, 2.6);
            s.lineTo(-0.5, 3.2);
            s.lineTo(0.0, 3.5);
            s.lineTo(0.5, 3.2);
            s.lineTo(0.7, 2.6);
            // rechter Turm
            s.lineTo(1.1, 3.0);
            s.lineTo(1.2, 3.8);
            s.lineTo(1.3, 4.2);
            s.lineTo(1.4, 3.8);
            s.lineTo(1.5, 3.0);
            s.lineTo(1.5, 0.0);
            s.lineTo(-1.5, 0.0);
            shapes.push(s);
            break;
        }
        case 'M025': {
            // Modell M025: breit mit Türmchen und Kuppel sowie Torbogen unten
            const s = new THREE.Shape();
            s.moveTo(-1.6, 0.0);
            // linkes Torsegment
            s.lineTo(-1.6, 2.3);
            s.lineTo(-1.4, 3.4);
            // linke Kuppel
            s.quadraticCurveTo(-1.2, 3.8, -0.9, 3.6);
            s.quadraticCurveTo(-0.6, 3.4, -0.4, 2.8);
            // oberer Mittelbereich
            s.lineTo(-0.4, 3.2);
            s.quadraticCurveTo(0.0, 3.8, 0.4, 3.2);
            // rechte Kuppel
            s.lineTo(0.4, 2.8);
            s.quadraticCurveTo(0.6, 3.4, 0.9, 3.6);
            s.quadraticCurveTo(1.2, 3.8, 1.4, 3.4);
            s.lineTo(1.6, 2.3);
            s.lineTo(1.6, 0.0);
            s.lineTo(-1.6, 0.0);
            // Torbogen (Loch) unten in der Mitte
            const arch = new THREE.Path();
            arch.moveTo(-0.4, 0.0);
            arch.lineTo(-0.4, 0.6);
            arch.quadraticCurveTo(0.0, 1.0, 0.4, 0.6);
            arch.lineTo(0.4, 0.0);
            arch.lineTo(-0.4, 0.0);
            s.holes.push(arch);
            shapes.push(s);
            break;
        }
        default: {
            // Fallback: rechteck
            const s = new THREE.Shape();
            s.moveTo(-1, 0);
            s.lineTo(-1, 3);
            s.lineTo(1, 3);
            s.lineTo(1, 0);
            s.lineTo(-1, 0);
            shapes.push(s);
            break;
        }
    }
    return shapes;
}

// Aktuell ausgewählte Optionen
let currentColor = materialColors['Indian Black'];
// Standardmodell zu Beginn (erstes aus der Liste)
let currentShape = 'M001';

/**
 * Initialisiert die Three.js Szene, den Renderer und das Steuerungssystem.
 */
function initScene() {
    const canvas = document.getElementById('three-canvas');
    // Renderer
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);

    // Szene
    scene = new THREE.Scene();

    // Kamera
    camera = new THREE.PerspectiveCamera(45, canvas.clientWidth / canvas.clientHeight, 0.1, 100);
    camera.position.set(5, 5, 8);

    // Beleuchtung
    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambient);
    const directional = new THREE.DirectionalLight(0xffffff, 0.7);
    directional.position.set(5, 10, 3);
    scene.add(directional);

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

    // GLTF‑Loader initialisieren (nur einmal)
    gltfLoader = new THREE.GLTFLoader();

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
 * Erstellt eine Headstone‑Geometrie basierend auf der gewählten Form.
 * @param {string} shapeName Name der Form ('rect', 'arch', 'slanted')
 * @returns {THREE.BufferGeometry}
 */
/**
 * Erstellt ein dreidimensionales Objekt (Mesh oder Gruppe) für das angegebene Modell.
 * Dabei werden eine oder mehrere Shapes generiert und als ExtrudeGeometry in die Tiefe extrudiert.
 * Für einfache Formen wird ein einzelnes Mesh zurückgegeben, für komplexere Modelle ein Group.
 * @param {string} modelName Name des Modells (z. B. 'M001').
 * @returns {THREE.Object3D}
 */
function createHeadstoneObject(modelName) {
    const shapes = createModelShapes(modelName);
    const depth = 0.5;
    const extrudeSettings = { depth: depth, bevelEnabled: false, steps: 1 };
    if (shapes.length === 1) {
        const geom = new THREE.ExtrudeGeometry(shapes[0], extrudeSettings);
        return new THREE.Mesh(geom, null);
    }
    // Mehrere Shapes: erstelle separate Meshes und füge sie zu einer Gruppe zusammen
    const group = new THREE.Group();
    shapes.forEach((shp) => {
        const geom = new THREE.ExtrudeGeometry(shp, extrudeSettings);
        const mesh = new THREE.Mesh(geom, null);
        group.add(mesh);
    });
    return group;
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
        div.addEventListener('click', () => {
            currentColor = color;
            updateSelectedSwatch(div);
            updateHeadstone();
        });
        container.appendChild(div);
    });
    // Markiere die erste als ausgewählt
    if (container.firstChild) {
        updateSelectedSwatch(container.firstChild);
    }
}

function updateSelectedSwatch(selectedDiv) {
    document.querySelectorAll('.swatch').forEach(el => el.classList.remove('selected'));
    selectedDiv.classList.add('selected');
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
        document.getElementById(id).addEventListener('input', () => updateInscriptionCanvas());
    });
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
});