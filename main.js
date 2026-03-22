// Scene Setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xfbf8f1); // Warm off-white custom background

// Camera Setup
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 4.5;
camera.position.y = 1; // Look slightly down at the notebook
camera.lookAt(0, 0, 0);

// Renderer Setup
const canvasContainer = document.getElementById('canvas-container');
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true; // Enable shadow maps
renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Soft shadows
canvasContainer.appendChild(renderer.domElement);

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(5, 10, 5); // Angle light nicely to cast shadows
directionalLight.castShadow = true; // Enable light to cast shadow
// Fine-tune shadow properties
directionalLight.shadow.mapSize.width = 1024;
directionalLight.shadow.mapSize.height = 1024;
directionalLight.shadow.camera.near = 0.5;
directionalLight.shadow.camera.far = 50;
scene.add(directionalLight);

// Create a 3D Object (Notebook Shape)
const geometry = new THREE.BoxGeometry(1.4, 2, 0.15); // Width, Height, Depth to look like a literal standing notebook
// Set up materials for all 6 faces: Right, Left, Top, Bottom, Front, Back
const materials = [
    new THREE.MeshStandardMaterial({ color: 0xeeeeee }), // Right (pages)
    new THREE.MeshStandardMaterial({ color: 0xffffff }), // Left (spine)
    new THREE.MeshStandardMaterial({ color: 0xeeeeee }), // Top (pages)
    new THREE.MeshStandardMaterial({ color: 0xeeeeee }), // Bottom (pages)
    new THREE.MeshStandardMaterial({ color: 0xffffff }), // Front (cover) - will be updated
    new THREE.MeshStandardMaterial({ color: 0xffffff }), // Back (cover)
];
const notebook = new THREE.Mesh(geometry, materials);
notebook.castShadow = true; // Object casts shadows
notebook.receiveShadow = true; // Object can receive shadows
scene.add(notebook);

// Add warm accent grid to the floor
const size = 60;
const divisions = 60;
const gridColor = new THREE.Color(0xe0b9a8); // Soft earthy orange
const gridHelper = new THREE.GridHelper(size, divisions, gridColor, gridColor);
gridHelper.position.y = -1; // Place exactly below the notebook
scene.add(gridHelper);

// Add OrbitControls for manual rotation
const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; // Adds smooth inertia to rotation
controls.dampingFactor = 0.05;

// Animation Loop
function animate() {
    requestAnimationFrame(animate);

    // Update controls for damping
    controls.update();

    renderer.render(scene, camera);
}
animate();

// Handle Window Resize
window.addEventListener('resize', () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
});

// Handle Image Upload and Server Synchronization
const imageUpload = document.getElementById('image-upload');
const gallery = document.getElementById('gallery');
const textureLoader = new THREE.TextureLoader();

// Store created textures so we don't recreate them every click
const cachedTextures = {};

// Fetch and load existing images from server on startup
fetch('/images')
    .then(res => res.json())
    .then(files => {
        files.forEach(file => {
            addImageToGallery(`/uploads/${file}`);
        });
    })
    .catch(err => console.log('Error loading images! Make sure you are running the Node.js server.', err));

// Helper function to apply texture
function applyTextureToNotebook(texture, imageElement) {
    const newMaterials = [...notebook.material];
    newMaterials[4] = new THREE.MeshStandardMaterial({ map: texture });
    notebook.material = newMaterials;

    // Highlight the active thumbnail
    document.querySelectorAll('.thumbnail').forEach(t => t.classList.remove('active'));
    if (imageElement) imageElement.classList.add('active');
}

// Helper function to append to gallery visually
function addImageToGallery(imageUrl) {
    const img = document.createElement('img');
    img.src = imageUrl;
    img.className = 'thumbnail';
    
    img.addEventListener('click', function() {
        if (cachedTextures[imageUrl]) {
            applyTextureToNotebook(cachedTextures[imageUrl], img);
        } else {
            textureLoader.load(imageUrl, function(texture) {
                cachedTextures[imageUrl] = texture;
                applyTextureToNotebook(texture, img);
            });
        }
    });
    
    gallery.appendChild(img);

    // Auto-apply if it's the very first one being added
    if (Object.keys(cachedTextures).length === 0 && gallery.children.length === 1) {
        img.click();
    }
}

imageUpload.addEventListener('change', function(event) {
    const files = event.target.files;
    
    if (files.length > 0) {
        const formData = new FormData();
        // Append all selected files to our form payload
        for (let i = 0; i < files.length; i++) {
            formData.append('images', files[i]);
        }

        // Send files to the backend server to save them permanently
        fetch('/upload', {
            method: 'POST',
            body: formData
        })
        .then(res => res.json())
        .then(data => {
            // Once saved, add the returned permanent file paths to our gallery
            data.files.forEach(filePath => {
                addImageToGallery(filePath);
            });
        })
        .catch(err => {
            console.error('Upload failed. Please ensure the local server is running.', err);
        });
        
        // Reset the input so the same files can be selected again if needed
        imageUpload.value = '';
    }
});