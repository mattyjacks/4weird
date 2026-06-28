/**
 * Semester Survival - Three.js 3D WebGL Renderer
 * Renders curved track segments, voxel avatar, and procedurally generated campus buildings.
 */
(function() {
    'use strict';

    class CampusRenderer {
        constructor() {
            this.canvas = null;
            this.renderer = null;
            this.scene = null;
            this.camera = null;
            
            // Lanes coordinates (relative to the curved center line)
            this.laneX = [-2.0, 0.0, 2.0];
            this.trackLength = 110.0;
            this.segmentLength = 5.0;
            this.totalSegments = 22;
            
            // Track curve state
            this.curveSeed = 0;
            this.curveFrequency = 0.015;
            this.curveAmplitude = 3.5;
            
            // Animation state
            this.playerState = {
                lane: 1, // 0: Left, 1: Center, 2: Right
                x: 0,
                y: 0,
                z: 0.0,
                jumpTime: 0,
                isJumping: false,
                isSliding: false,
                slideTime: 0,
                shieldActive: false
            };

            this.roadSegments = []; // Array of segment groups
            this.entities = []; // { mesh, type, lane, z, bounds, hit }
            this.environmentProps = []; // Procedural buildings on sides
            this.particles = []; // Voxel shards
            
            // Theme colors per semester
            this.semesterThemes = [
                { ground: 0x111827, grid: 0x1e3a8a, fog: 0x050b18 }, // S1: Blue
                { ground: 0x0f172a, grid: 0x047857, fog: 0x022c22 }, // S2: Green
                { ground: 0x1e1b4b, grid: 0x7e22ce, fog: 0x120024 }, // S3: Purple
                { ground: 0x31102f, grid: 0xbe185d, fog: 0x1a0010 }, // S4: Magenta
                { ground: 0x1c1917, grid: 0xd97706, fog: 0x1c0c00 }, // S5: Amber
                { ground: 0x022c22, grid: 0x0e7490, fog: 0x00171f }, // S6: Cyan
                { ground: 0x1e293b, grid: 0x475569, fog: 0x0f172a }, // S7: Slate
                { ground: 0x111827, grid: 0xb91c1c, fog: 0x170000 }  // S8: Red
            ];
            
            this.targetPlayerX = 0;
            this.shieldMesh = null;
        }

        init() {
            this.canvas = document.getElementById('TEMPLATE-4weird-gameCanvas');
            if (!this.canvas) return;

            const rect = this.canvas.parentElement.getBoundingClientRect();
            
            // Initialize WebGL Renderer
            this.renderer = new THREE.WebGLRenderer({
                canvas: this.canvas,
                antialias: true,
                alpha: false
            });
            this.renderer.setSize(rect.width, rect.height);
            this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            this.renderer.shadowMap.enabled = true;

            // Scene setup
            this.scene = new THREE.Scene();
            
            // Switching to Linear Fog to make it less foggy in the foreground and clear up to the distance
            this.scene.fog = new THREE.Fog(0x050b18, 20, 100);
            this.renderer.setClearColor(0x050b18);

            // Camera Setup
            this.camera = new THREE.PerspectiveCamera(60, rect.width / rect.height, 0.1, 1000);
            this.camera.position.set(0, 3.8, 6.0);
            this.camera.lookAt(0, 1.3, -1.5);

            // Lighting Setup
            const ambient = new THREE.AmbientLight(0xffffff, 0.65);
            this.scene.add(ambient);

            const sun = new THREE.DirectionalLight(0xffffff, 0.85);
            sun.position.set(10, 20, 10);
            sun.castShadow = true;
            this.scene.add(sun);

            // Start random seed for curve
            this.regenerateTrackCurve();

            // Build Track and Ground
            this.buildTrack();

            // Build Student Avatar Mesh
            this.buildPlayerAvatar();

            // Handle Resize
            window.addEventListener('resize', () => this.onResize());
        }

        regenerateTrackCurve() {
            // Pick random seeds for curvature offset
            this.curveSeed = Math.random() * 100;
            this.curveAmplitude = 2.0 + Math.random() * 2.0; // Random amplitude
        }

        getTrackCurveX(z) {
            // Road remains straight close to the player (z > -15) for smooth gameplay start
            if (z > -15) return 0;
            return Math.sin((z + 15) * this.curveFrequency + this.curveSeed) * this.curveAmplitude;
        }

        onResize() {
            if (!this.canvas || !this.renderer) return;
            const rect = this.canvas.parentElement.getBoundingClientRect();
            this.camera.aspect = rect.width / rect.height;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(rect.width, rect.height);
        }

        buildTrack() {
            // Build the track segment by segment to follow the curve
            const roadMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.8 });
            const curbMat = new THREE.MeshStandardMaterial({ color: 0x374151 });
            const lineMat = new THREE.MeshBasicMaterial({ color: 0x1e3a8a });

            const segGeo = new THREE.BoxGeometry(8, 0.1, this.segmentLength);
            const curbGeo = new THREE.BoxGeometry(0.3, 0.25, this.segmentLength);
            const lineGeo = new THREE.BoxGeometry(0.08, 0.025, 2.5);

            for (let i = 0; i < this.totalSegments; i++) {
                const z = -i * this.segmentLength + 5;
                const x = this.getTrackCurveX(z);

                const segmentGroup = new THREE.Group();
                segmentGroup.position.set(x, -0.05, z);

                // Road base
                const road = new THREE.Mesh(segGeo, roadMat);
                road.receiveShadow = true;
                segmentGroup.add(road);

                // Curbs
                const leftCurb = new THREE.Mesh(curbGeo, curbMat);
                leftCurb.position.x = -4.15;
                leftCurb.position.y = 0.1;
                segmentGroup.add(leftCurb);

                const rightCurb = new THREE.Mesh(curbGeo, curbMat);
                rightCurb.position.x = 4.15;
                rightCurb.position.y = 0.1;
                segmentGroup.add(rightCurb);

                // Lane lines (only add to alternating segments for dashed look)
                if (i % 2 === 0) {
                    const lineL = new THREE.Mesh(lineGeo, lineMat);
                    lineL.position.set(-1.3, 0.06, 0);
                    segmentGroup.add(lineL);

                    const lineR = new THREE.Mesh(lineGeo, lineMat);
                    lineR.position.set(1.3, 0.06, 0);
                    segmentGroup.add(lineR);
                    
                    // Keep references to color themes
                    segmentGroup.userData = { lines: [lineL, lineR] };
                }

                this.scene.add(segmentGroup);
                this.roadSegments.push(segmentGroup);
            }

            // Spawn dynamic procedural university buildings along the track
            for (let z = 5; z > -this.trackLength; z -= 14) {
                this.spawnProceduralBuilding(z, 'left');
                this.spawnProceduralBuilding(z, 'right');
            }
        }

        // ====================================================
        // PROCEDURAL UNIVERSITY BUILDING GENERATION ALGORITHMS
        // ====================================================
        createLectureHall() {
            const group = new THREE.Group();
            
            // Sloped slatelike lecture theater
            const baseGeo = new THREE.BoxGeometry(4.0, 2.5, 5.0);
            const baseMat = new THREE.MeshStandardMaterial({ color: 0x475569 });
            const base = new THREE.Mesh(baseGeo, baseMat);
            base.position.y = 1.25;
            group.add(base);

            // Sloped slanting roof
            const roofGeo = new THREE.BoxGeometry(4.2, 0.3, 5.2);
            const roofMat = new THREE.MeshStandardMaterial({ color: 0x1e293b });
            const roof = new THREE.Mesh(roofGeo, roofMat);
            roof.position.set(0, 2.5, 0);
            roof.rotation.z = -0.15; // Sloped roof
            group.add(roof);

            // Front glass facade rows
            const glassGeo = new THREE.BoxGeometry(0.1, 1.2, 4.0);
            const glassMat = new THREE.MeshBasicMaterial({ color: 0x06b6d4, transparent: true, opacity: 0.6 });
            const glass = new THREE.Mesh(glassGeo, glassMat);
            glass.position.set(-2.0, 1.2, 0);
            glass.rotation.y = Math.PI / 2;
            group.add(glass);

            return group;
        }

        createLibraryTower() {
            const group = new THREE.Group();
            
            // Tall cylindrical towers
            const towerGeo = new THREE.CylinderGeometry(1.5, 1.7, 5.0, 8);
            const towerMat = new THREE.MeshStandardMaterial({ color: 0x64748b });
            const tower = new THREE.Mesh(towerGeo, towerMat);
            tower.position.y = 2.5;
            group.add(tower);

            // Second layer cap
            const capGeo = new THREE.CylinderGeometry(1.2, 1.2, 1.2, 8);
            const capMat = new THREE.MeshStandardMaterial({ color: 0x334155 });
            const cap = new THREE.Mesh(capGeo, capMat);
            cap.position.y = 5.2;
            group.add(cap);

            // Luminous research beacon sphere top
            const beaconGeo = new THREE.SphereGeometry(0.5, 8, 8);
            const beaconMat = new THREE.MeshBasicMaterial({ color: 0xeab308 });
            const beacon = new THREE.Mesh(beaconGeo, beaconMat);
            beacon.position.y = 6.2;
            group.add(beacon);

            return group;
        }

        createHostelBlock() {
            const group = new THREE.Group();
            
            // Layered residential cubes representing student hostels
            const blockGeo = new THREE.BoxGeometry(3.5, 4.0, 4.0);
            const blockMat = new THREE.MeshStandardMaterial({ color: 0x334155 });
            const block = new THREE.Mesh(blockGeo, blockMat);
            block.position.y = 2.0;
            group.add(block);

            // Windows voxel slots (small glowing cubes representing lit hostel rooms)
            const winGeo = new THREE.BoxGeometry(0.1, 0.4, 0.4);
            const winMat = new THREE.MeshBasicMaterial({ color: 0xfef08a }); // Lit window yellow
            
            for (let y = 0.8; y < 3.8; y += 1.0) {
                for (let z = -1.2; z <= 1.2; z += 1.2) {
                    const winL = new THREE.Mesh(winGeo, winMat);
                    winL.position.set(-1.76, y, z);
                    group.add(winL);

                    const winR = new THREE.Mesh(winGeo, winMat);
                    winR.position.set(1.76, y, z);
                    group.add(winR);
                }
            }

            return group;
        }

        createDepartmentArch() {
            const group = new THREE.Group();
            
            // Faculty pillars
            const pilGeo = new THREE.BoxGeometry(0.8, 3.2, 0.8);
            const pilMat = new THREE.MeshStandardMaterial({ color: 0x475569 });
            
            const pilL = new THREE.Mesh(pilGeo, pilMat);
            pilL.position.set(-1.8, 1.6, 0);
            group.add(pilL);

            const pilR = new THREE.Mesh(pilGeo, pilMat);
            pilR.position.set(1.8, 1.6, 0);
            group.add(pilR);

            // Department cross arch header
            const headerGeo = new THREE.BoxGeometry(4.4, 0.8, 1.0);
            const headerMat = new THREE.MeshStandardMaterial({ color: 0x1e293b });
            const header = new THREE.Mesh(headerGeo, headerMat);
            header.position.set(0, 3.6, 0);
            group.add(header);

            // Center glowing gate light
            const signGeo = new THREE.BoxGeometry(1.8, 0.3, 1.1);
            const signMat = new THREE.MeshBasicMaterial({ color: 0x10b981 });
            const sign = new THREE.Mesh(signGeo, signMat);
            sign.position.set(0, 3.6, 0);
            group.add(sign);

            return group;
        }

        spawnProceduralBuilding(z, side) {
            // Procedurally choose a building style program
            const rolls = [this.createLectureHall, this.createLibraryTower, this.createHostelBlock, this.createDepartmentArch];
            const generator = rolls[Math.floor(Math.random() * rolls.length)].bind(this);
            
            const buildingMesh = generator();
            const roadX = this.getTrackCurveX(z);
            const offset = side === 'left' ? -6.8 : 6.8;

            buildingMesh.position.set(roadX + offset, 0, z);
            this.scene.add(buildingMesh);

            this.environmentProps.push({
                mesh: buildingMesh,
                side: side,
                z: z
            });
        }

        buildPlayerAvatar() {
            this.playerGroup = new THREE.Group();
            this.playerGroup.position.set(0, 0, 0);

            // Student Voxel Head
            const headGeo = new THREE.BoxGeometry(0.6, 0.6, 0.6);
            const headMat = new THREE.MeshStandardMaterial({ color: 0xffdbac });
            this.head = new THREE.Mesh(headGeo, headMat);
            this.head.position.y = 1.45;
            this.head.castShadow = true;
            this.playerGroup.add(this.head);

            // Hair/Cap
            const hairGeo = new THREE.BoxGeometry(0.64, 0.2, 0.64);
            const hairMat = new THREE.MeshStandardMaterial({ color: 0x27272a });
            const hair = new THREE.Mesh(hairGeo, hairMat);
            hair.position.y = 1.7;
            this.playerGroup.add(hair);

            // Student Torso
            const bodyGeo = new THREE.BoxGeometry(0.7, 0.7, 0.45);
            this.bodyMat = new THREE.MeshStandardMaterial({ color: 0x1d4ed8 });
            this.body = new THREE.Mesh(bodyGeo, this.bodyMat);
            this.body.position.y = 0.85;
            this.body.castShadow = true;
            this.playerGroup.add(this.body);

            // Voxel Backpack
            const bagGeo = new THREE.BoxGeometry(0.5, 0.6, 0.25);
            const bagMat = new THREE.MeshStandardMaterial({ color: 0xd97706 });
            const bag = new THREE.Mesh(bagGeo, bagMat);
            bag.position.set(0, 0.85, 0.32);
            bag.castShadow = true;
            this.playerGroup.add(bag);

            // Legs
            const legGeo = new THREE.BoxGeometry(0.2, 0.5, 0.2);
            const legMat = new THREE.MeshStandardMaterial({ color: 0x1f2937 });
            this.leftLeg = new THREE.Mesh(legGeo, legMat);
            this.leftLeg.position.set(-0.2, 0.25, 0);
            this.leftLeg.castShadow = true;
            this.playerGroup.add(this.leftLeg);

            this.rightLeg = new THREE.Mesh(legGeo, legMat);
            this.rightLeg.position.set(0.2, 0.25, 0);
            this.rightLeg.castShadow = true;
            this.playerGroup.add(this.rightLeg);

            // Shield Mesh
            const shieldGeo = new THREE.SphereGeometry(1.2, 16, 16);
            const shieldMat = new THREE.MeshBasicMaterial({
                color: 0x06b6d4,
                transparent: true,
                opacity: 0.25,
                wireframe: true
            });
            this.shieldMesh = new THREE.Mesh(shieldGeo, shieldMat);
            this.shieldMesh.position.y = 0.85;
            this.shieldMesh.visible = false;
            this.playerGroup.add(this.shieldMesh);

            this.scene.add(this.playerGroup);
        }

        applySkin(skinKey) {
            const emojiColors = {
                fresher: { body: 0x1d4ed8 },
                serious: { body: 0x047857 },
                lastminute: { body: 0xbe185d },
                nightcoder: { body: 0x0f172a },
                groupleader: { body: 0x4338ca },
                classrep: { body: 0x0369a1 },
                genius: { body: 0x1e1b4b },
                memelord: { body: 0xeab308 },
                researcher: { body: 0x0f766e },
                graduate: { body: 0x111827 }
            };

            const theme = emojiColors[skinKey] || emojiColors.fresher;
            if (this.bodyMat) {
                this.bodyMat.color.setHex(theme.body);
            }
        }

        setTheme(semesterIndex) {
            const theme = this.semesterThemes[(semesterIndex - 1) % 8];
            if (!theme) return;
            
            // Linear fog colors update
            this.scene.fog.color.setHex(theme.fog);
            this.renderer.setClearColor(theme.fog);
            
            this.roadSegments.forEach(seg => {
                const lines = seg.userData.lines;
                if (lines) {
                    lines.forEach(line => line.material.color.setHex(theme.grid));
                }
            });
        }

        clearEntities() {
            this.entities.forEach(ent => this.scene.remove(ent.mesh));
            this.entities = [];
        }

        // Spawn 3D Obstacle at depth -this.trackLength offset by track curve
        spawnObstacle(type, lane, obstacleId) {
            const zSpawn = -this.trackLength + 10;
            const roadX = this.getTrackCurveX(zSpawn);
            const lanePositionX = roadX + this.laneX[lane];
            const meshGroup = new THREE.Group();

            let meshHeight = 1.0;
            let meshWidth = 1.2;
            let meshDepth = 0.5;
            let boundsHeight = 1.0;

            if (type === 'deadline') {
                const wallGeo = new THREE.BoxGeometry(2.2, 2.0, 0.4);
                const wallMat = new THREE.MeshStandardMaterial({
                    color: 0xef4444,
                    emissive: 0x991b1b,
                    transparent: true,
                    opacity: 0.8
                });
                const wall = new THREE.Mesh(wallGeo, wallMat);
                wall.position.y = 1.0;
                meshGroup.add(wall);
                meshWidth = 2.2;
                meshHeight = 2.0;
                boundsHeight = 2.0;
            } else if (type === 'paper') {
                const sheetGeo = new THREE.BoxGeometry(1.0, 0.05, 1.4);
                const sheetMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 });
                const sheet = new THREE.Mesh(sheetGeo, sheetMat);
                sheet.position.y = 0.7;
                sheet.rotation.y = Math.PI / 4;
                sheet.rotation.x = Math.PI / 6;
                meshGroup.add(sheet);
                meshHeight = 0.8;
                boundsHeight = 1.0;
            } else if (type === 'invigilator') {
                const invGeo = new THREE.BoxGeometry(1.2, 2.5, 0.8);
                const invMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.9 });
                const inv = new THREE.Mesh(invGeo, invMat);
                inv.position.y = 1.25;
                meshGroup.add(inv);
                meshWidth = 1.2;
                meshHeight = 2.5;
                boundsHeight = 2.5;
            } else {
                const barGeo = new THREE.BoxGeometry(1.6, 0.8, 0.3);
                const barMat = new THREE.MeshStandardMaterial({ color: 0xd97706 });
                const bar = new THREE.Mesh(barGeo, barMat);
                bar.position.y = 0.4;
                meshGroup.add(bar);
                meshWidth = 1.6;
                meshHeight = 0.8;
                boundsHeight = 0.8;
            }

            meshGroup.position.set(lanePositionX, 0, zSpawn);
            this.scene.add(meshGroup);

            this.entities.push({
                id: obstacleId,
                mesh: meshGroup,
                type: 'obstacle',
                obstacleType: type,
                lane: lane,
                z: zSpawn,
                hit: false,
                bounds: { w: meshWidth, h: boundsHeight, d: meshDepth }
            });
        }

        // Spawn 3D Collectible offset by track curve
        spawnCollectible(type, lane, collectibleId) {
            const zSpawn = -this.trackLength + 10;
            const roadX = this.getTrackCurveX(zSpawn);
            const lanePositionX = roadX + this.laneX[lane];
            const meshGroup = new THREE.Group();

            let boundsHeight = 0.8;

            if (type === 'coin') {
                const coinGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.06, 12);
                const coinMat = new THREE.MeshStandardMaterial({
                    color: 0xfbbf24,
                    metalness: 0.9,
                    roughness: 0.1
                });
                const coin = new THREE.Mesh(coinGeo, coinMat);
                coin.position.y = 0.6;
                coin.rotation.x = Math.PI / 2;
                meshGroup.add(coin);
            } else if (type === 'coffee') {
                const cupGeo = new THREE.CylinderGeometry(0.2, 0.15, 0.5, 8);
                const cupMat = new THREE.MeshStandardMaterial({ color: 0xef4444 });
                const cup = new THREE.Mesh(cupGeo, cupMat);
                cup.position.y = 0.55;
                meshGroup.add(cup);

                const lidGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.08, 8);
                const lidMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
                const lid = new THREE.Mesh(lidGeo, lidMat);
                lid.position.y = 0.8;
                meshGroup.add(lid);
            } else if (type === 'notes') {
                const bookGeo = new THREE.BoxGeometry(0.6, 0.1, 0.55);
                const bookMat = new THREE.MeshBasicMaterial({ color: 0x06b6d4 });
                const book = new THREE.Mesh(bookGeo, bookMat);
                book.position.y = 0.6;
                meshGroup.add(book);
            }

            meshGroup.position.set(lanePositionX, 0, zSpawn);
            this.scene.add(meshGroup);

            this.entities.push({
                id: collectibleId,
                mesh: meshGroup,
                type: 'collectible',
                collectibleType: type,
                lane: lane,
                z: zSpawn,
                hit: false,
                bounds: { w: 0.8, h: boundsHeight, d: 0.8 }
            });
        }

        spawnCollectParticles(x, y, z, colorHex) {
            const count = 8;
            const particleGeo = new THREE.BoxGeometry(0.08, 0.08, 0.08);
            const particleMat = new THREE.MeshBasicMaterial({ color: colorHex });

            for (let i = 0; i < count; i++) {
                const mesh = new THREE.Mesh(particleGeo, particleMat);
                mesh.position.set(
                    x + (Math.random() - 0.5) * 0.4,
                    y + (Math.random() - 0.5) * 0.4,
                    z + (Math.random() - 0.5) * 0.4
                );
                this.scene.add(mesh);

                this.particles.push({
                    mesh: mesh,
                    vx: (Math.random() - 0.5) * 4,
                    vy: Math.random() * 4 + 2,
                    vz: (Math.random() - 0.5) * 4,
                    life: 0.8
                });
            }
        }

        triggerJump() {
            if (this.playerState.isJumping || this.playerState.isSliding) return;
            this.playerState.isJumping = true;
            this.playerState.jumpTime = 0.0;
        }

        triggerSlide() {
            if (this.playerState.isJumping || this.playerState.isSliding) return;
            this.playerState.isSliding = true;
            this.playerState.slideTime = 0.0;
            this.body.scale.set(1.0, 0.4, 1.0);
            this.head.position.y = 0.95;
        }

        resetSlide() {
            this.playerState.isSliding = false;
            this.body.scale.set(1.0, 1.0, 1.0);
            this.head.position.y = 1.45;
        }

        setLane(lane) {
            this.playerState.lane = lane;
            // Target X position is relative to track curve center at z=0 (which is 0)
            this.targetPlayerX = this.laneX[lane];
        }

        setShield(active) {
            this.playerState.shieldActive = active;
            if (this.shieldMesh) {
                this.shieldMesh.visible = active;
            }
        }

        update(deltaTime, speed, onCollision) {
            // Apply curved tracks coordinate shifts
            const distZ = speed * deltaTime * 12;

            // 1. Move and loop curved road segments
            this.roadSegments.forEach(seg => {
                seg.position.z += distZ;
                
                // If segment goes behind the camera, recycle it to the back
                if (seg.position.z > 8.0) {
                    seg.position.z -= this.trackLength;
                }
                
                // Readjust its X offset relative to the curve at its new Z depth
                seg.position.x = this.getTrackCurveX(seg.position.z);
            });

            // 2. Move and recycle procedural buildings
            this.environmentProps.forEach(prop => {
                prop.mesh.position.z += distZ;
                
                if (prop.mesh.position.z > 8.0) {
                    prop.mesh.position.z -= this.trackLength;
                    
                    // Procedurally rebuild a different building style mesh on recycle!
                    this.scene.remove(prop.mesh);
                    
                    const rolls = [this.createLectureHall, this.createLibraryTower, this.createHostelBlock, this.createDepartmentArch];
                    const generator = rolls[Math.floor(Math.random() * rolls.length)].bind(this);
                    
                    const newMesh = generator();
                    newMesh.position.z = prop.mesh.position.z;
                    
                    this.scene.add(newMesh);
                    prop.mesh = newMesh;
                }
                
                // Shift building to stay on side of curved road
                const roadX = this.getTrackCurveX(prop.mesh.position.z);
                const offset = prop.side === 'left' ? -6.8 : 6.8;
                prop.mesh.position.x = roadX + offset;
            });

            // 3. Keep player centered on the curve at z=0 (getTrackCurveX(0) is always 0, but keep formula for safety)
            const roadXAtZero = this.getTrackCurveX(0);
            const absoluteTargetX = roadXAtZero + this.targetPlayerX;

            const diffX = absoluteTargetX - this.playerGroup.position.x;
            if (Math.abs(diffX) > 0.01) {
                this.playerGroup.position.x += diffX * 18.0 * deltaTime;
            } else {
                this.playerGroup.position.x = absoluteTargetX;
            }

            // 4. Handle Jumping
            if (this.playerState.isJumping) {
                this.playerState.jumpTime += deltaTime * 2.8;
                const jumpHeight = Math.sin(this.playerState.jumpTime * Math.PI) * 1.8;
                this.playerGroup.position.y = Math.max(0, jumpHeight);

                this.leftLeg.rotation.x = -Math.sin(this.playerState.jumpTime * Math.PI) * 0.5;
                this.rightLeg.rotation.x = Math.sin(this.playerState.jumpTime * Math.PI) * 0.5;

                if (this.playerState.jumpTime >= 1.0) {
                    this.playerState.isJumping = false;
                    this.playerGroup.position.y = 0;
                    this.leftLeg.rotation.x = 0;
                    this.rightLeg.rotation.x = 0;
                }
            }

            // 5. Handle Sliding
            if (this.playerState.isSliding) {
                this.playerState.slideTime += deltaTime;
                if (this.playerState.slideTime >= 0.75) {
                    this.resetSlide();
                }
            }

            // 6. Leg Swings
            if (!this.playerState.isJumping && !this.playerState.isSliding && speed > 0) {
                const legSwing = Math.sin(Date.now() * 0.015) * 0.6;
                this.leftLeg.rotation.x = legSwing;
                this.rightLeg.rotation.x = -legSwing;
            }

            // 7. Update Entities and check Collision triggers
            for (let i = this.entities.length - 1; i >= 0; i--) {
                const ent = this.entities[i];
                ent.mesh.position.z += distZ;
                
                // Shift entity along X axis to follow the road curve as it slides closer
                const currentRoadX = this.getTrackCurveX(ent.mesh.position.z);
                ent.mesh.position.x = currentRoadX + this.laneX[ent.lane];

                if (ent.type === 'collectible') {
                    ent.mesh.rotation.y += deltaTime * 3;
                }

                // Check collision bounds at z=0 (player position)
                const pX = this.playerGroup.position.x;
                const pY = this.playerGroup.position.y;
                const pZ = 0.0;

                const bounds = ent.bounds;
                const hitX = Math.abs(ent.mesh.position.x - pX) < (bounds.w / 2 + 0.4);
                const hitZ = Math.abs(ent.mesh.position.z - pZ) < (bounds.d / 2 + 0.4);
                
                let hitY = false;
                if (ent.type === 'obstacle') {
                    if (ent.obstacleType === 'paper') {
                        hitY = pY < (bounds.h + 0.3);
                    } else if (ent.obstacleType === 'deadline') {
                        hitY = pY < 1.6;
                    } else {
                        hitY = pY < (bounds.h + 0.2);
                    }
                    if (this.playerState.isSliding && ent.obstacleType !== 'paper') {
                        hitY = true;
                    }
                } else {
                    hitY = true;
                }

                if (hitX && hitZ && hitY && !ent.hit) {
                    ent.hit = true;
                    this.spawnCollectParticles(ent.mesh.position.x, ent.mesh.position.y + 0.5, ent.mesh.position.z, ent.type === 'collectible' ? 0xfbbf24 : 0xef4444);
                    
                    onCollision(ent);
                    this.scene.remove(ent.mesh);
                    this.entities.splice(i, 1);
                    continue;
                }

                // Remove out of bounds behind camera
                if (ent.mesh.position.z > 6.0) {
                    this.scene.remove(ent.mesh);
                    this.entities.splice(i, 1);
                }
            }

            // 8. Particle physics
            for (let i = this.particles.length - 1; i >= 0; i--) {
                const p = this.particles[i];
                p.mesh.position.x += p.vx * deltaTime;
                p.mesh.position.y += p.vy * deltaTime;
                p.mesh.position.z += p.vz * deltaTime;
                p.vy -= 9.8 * deltaTime;
                p.life -= deltaTime * 1.5;

                if (p.life <= 0) {
                    this.scene.remove(p.mesh);
                    this.particles.splice(i, 1);
                }
            }

            // 9. WebGL Render step
            if (this.renderer && this.scene && this.camera) {
                this.renderer.render(this.scene, this.camera);
            }
        }
    }

    // Expose renderer globally
    window.Campus3DRenderer = new CampusRenderer();
})();
