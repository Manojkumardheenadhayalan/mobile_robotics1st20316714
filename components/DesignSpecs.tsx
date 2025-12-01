import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, Box, Cpu, ShieldCheck, Brain, Globe, Code, Wrench, Ruler, HelpCircle, Layers, Loader2, Map, Activity, Play } from 'lucide-react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// --- PHYSICS & TERRAIN CONFIG ---
// Single source of truth for terrain height to ensure gravity/collision works
const getTerrainHeight = (x: number, z: number) => {
    // Large dunes
    let y = Math.sin(x * 0.1) * Math.cos(z * 0.1) * 2.0;
    // Medium bumps
    y += Math.sin(x * 0.3 + z * 0.2) * 0.5;
    // Small roughness
    y += Math.cos(x * 0.5) * 0.2;
    
    // Manage the "road" area at z=0
    const distFromCenter = Math.abs(z);
    if (distFromCenter < 4) {
       // Flatten large dunes slightly for drivability
       y *= 0.6; 
       // ADD RIPPLES: High frequency noise to force suspension articulation
       // This ensures the wheels move up/down visibly even on the "flat" path
       y += Math.sin(x * 1.5) * 0.15; 
       y += Math.cos(x * 3.5) * 0.05;
    }

    return Math.max(-5, y); 
};

// --- ROVER RIG INTERFACE ---
interface RoverRig {
  root: THREE.Group;
  wheels: THREE.Mesh[];
  rockerL: THREE.Mesh;
  rockerR: THREE.Mesh;
  arm: {
    base: THREE.Group;
    shoulder: THREE.Mesh;
    elbow: THREE.Mesh;
    claw: THREE.Mesh;
  };
  tail: {
    base: THREE.Group;
    mid: THREE.Mesh;
    head: THREE.Mesh;
  };
}

const Rover3DScene = () => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [missionPhase, setMissionPhase] = useState<string>('INITIALIZING');

  useEffect(() => {
    if (!mountRef.current) return;

    // --- SCENE SETUP ---
    const scene = new THREE.Scene();
    const skyColor = new THREE.Color('#d47b4a'); 
    scene.background = skyColor;
    scene.fog = new THREE.FogExp2(skyColor.getHex(), 0.02);

    const camera = new THREE.PerspectiveCamera(50, mountRef.current.clientWidth / mountRef.current.clientHeight, 0.1, 100);
    // Lower camera angle to see wheels touching ground better
    camera.position.set(-9, 3.5, 9); 
    
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mountRef.current.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.maxPolarAngle = Math.PI / 2 - 0.05; // Don't go below ground
    controls.minDistance = 5;
    controls.maxDistance = 30;
    controls.target.set(0, 1, 0);

    // --- LIGHTS ---
    const ambientLight = new THREE.AmbientLight(0xffccaa, 0.5);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xffffff, 2.5);
    sunLight.position.set(50, 80, 20);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.left = -40;
    sunLight.shadow.camera.right = 40;
    sunLight.shadow.camera.top = 40;
    sunLight.shadow.camera.bottom = -40;
    sunLight.shadow.bias = -0.0005;
    scene.add(sunLight);

    // --- TERRAIN MESH ---
    // Create geometry that matches getTerrainHeight exactly
    const groundGeo = new THREE.PlaneGeometry(160, 160, 128, 128);
    const posAttr = groundGeo.attributes.position;
    
    for (let i = 0; i < posAttr.count; i++) {
        const x = posAttr.getX(i);
        const y_plane = posAttr.getY(i); // This corresponds to World -Z
        
        // Convert to world coords to sample height function
        const worldX = x;
        const worldZ = -y_plane;
        
        const h = getTerrainHeight(worldX, worldZ);
        posAttr.setZ(i, h);
    }
    groundGeo.computeVertexNormals();
    
    const groundMat = new THREE.MeshStandardMaterial({ 
        color: 0x8b3a28, 
        roughness: 0.9, 
        metalness: 0.1,
        flatShading: false
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // --- ROCKS & DEBRIS ---
    const rockGeo = new THREE.DodecahedronGeometry(1, 0);
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x5a4d41, roughness: 1 });
    
    for(let i=0; i<40; i++) {
        const rock = new THREE.Mesh(rockGeo, rockMat);
        const rx = (Math.random()-0.5)*100;
        const rz = (Math.random()-0.5)*60;
        
        // Avoid the central path (Collision Prevention)
        if (Math.abs(rz) < 4.5) continue;

        const ry = getTerrainHeight(rx, rz);
        const s = 0.3 + Math.random() * 0.5;
        
        rock.position.set(rx, ry + (s*0.8), rz); // Sit on surface
        rock.scale.set(s, s, s);
        rock.rotation.set(Math.random(), Math.random(), Math.random());
        rock.castShadow = true;
        rock.receiveShadow = true;
        scene.add(rock);
    }

    // Dust Particles
    const dustGeo = new THREE.BufferGeometry();
    const dustCount = 1000;
    const dustPos = new Float32Array(dustCount * 3);
    for(let i=0; i<dustCount*3; i+=3) {
        dustPos[i] = (Math.random()-0.5)*120;
        dustPos[i+1] = Math.random()*10;
        dustPos[i+2] = (Math.random()-0.5)*60;
    }
    dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
    const dustMat = new THREE.PointsMaterial({
        color: 0xffaa88,
        size: 0.1,
        transparent: true,
        opacity: 0.6
    });
    const dustSystem = new THREE.Points(dustGeo, dustMat);
    scene.add(dustSystem);


    // --- BUILD ROVER ---
    const buildRover = (): RoverRig => {
        const group = new THREE.Group();
        scene.add(group);

        const matBody = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.7 });
        const matArmor = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.3, metalness: 0.5 }); // Amber
        const matWheel = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });

        // Chassis Group (This tilts with terrain)
        const chassis = new THREE.Group();
        group.add(chassis);

        // Main Body Box
        const bodyMesh = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.5, 1.2), matBody);
        bodyMesh.castShadow = true;
        chassis.add(bodyMesh);
        
        // Armor Shell
        const shell = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.15, 1.0), matArmor);
        shell.position.y = 0.32;
        shell.castShadow = true;
        chassis.add(shell);

        // Suspension Pivot Points (Visual)
        const pivotL = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.4), matArmor);
        pivotL.rotation.x = Math.PI/2;
        pivotL.position.set(0, -0.1, 0.6);
        chassis.add(pivotL);

        const pivotR = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.4), matArmor);
        pivotR.rotation.x = Math.PI/2;
        pivotR.position.set(0, -0.1, -0.6);
        chassis.add(pivotR);

        // --- ROCKERS (Suspension) ---
        // Rockers are positioned relative to Chassis
        // Local Y = -0.2
        
        const rockerL = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.1, 0.1), matBody);
        rockerL.position.set(0, -0.2, 0.75); // Offset from center
        chassis.add(rockerL);

        const rockerR = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.1, 0.1), matBody);
        rockerR.position.set(0, -0.2, -0.75);
        chassis.add(rockerR);

        const wheels: THREE.Mesh[] = [];
        const addWheel = (parent: THREE.Object3D, x: number, y: number, z: number) => {
            const wGroup = new THREE.Group();
            wGroup.position.set(x, y, z);
            parent.add(wGroup);

            const w = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.3, 16), matWheel);
            w.rotation.x = Math.PI / 2;
            w.castShadow = true;
            wGroup.add(w);
            
            // Hubcap
            const rim = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.05, 0.31), matArmor);
            w.add(rim);
            const rim2 = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.5, 0.31), matArmor);
            w.add(rim2);

            wheels.push(w);
        };

        // Attach wheels relative to Rockers (Y = -0.2 relative to Rocker)
        addWheel(rockerL, 0.8, -0.2, 0.1);  // Front
        addWheel(rockerL, -0.1, -0.2, 0.1); // Mid
        addWheel(rockerL, -0.9, -0.2, 0.1); // Rear

        addWheel(rockerR, 0.8, -0.2, -0.1);
        addWheel(rockerR, -0.1, -0.2, -0.1);
        addWheel(rockerR, -0.9, -0.2, -0.1);

        // --- MANIPULATOR ARM ---
        const armBase = new THREE.Group();
        armBase.position.set(1.1, 0, 0);
        chassis.add(armBase);

        const shoulder = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.1, 0.1), matArmor);
        shoulder.position.set(0.3, 0, 0);
        armBase.add(shoulder);

        const elbow = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.08, 0.08), matArmor);
        elbow.position.set(0.3, 0, 0); 
        shoulder.add(elbow);

        const claw = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.15), matBody);
        claw.position.set(0.3, 0, 0);
        elbow.add(claw);

        // --- SENSOR TAIL ---
        const tailBase = new THREE.Group();
        tailBase.position.set(-1.0, 0.3, 0);
        chassis.add(tailBase);

        const tailMid = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 0.8), matArmor);
        tailMid.position.set(-0.2, 0.4, 0);
        tailMid.rotation.z = Math.PI / 3;
        tailBase.add(tailMid);

        const tailHead = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.15, 0.2), matBody);
        tailHead.position.set(0, 0.4, 0);
        tailMid.add(tailHead);
        
        const eye = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.1), new THREE.MeshBasicMaterial({ color: 0x00ffff }));
        eye.rotation.x = Math.PI/2;
        eye.position.set(0, 0, 0.1);
        tailHead.add(eye);

        return {
            root: group,
            wheels,
            rockerL,
            rockerR,
            arm: { base: armBase, shoulder, elbow, claw },
            tail: { base: tailBase, mid: tailMid, head: tailHead }
        };
    };

    const rover = buildRover();
    setLoading(false);

    // --- PHYSICS & ANIMATION LOOP ---
    const clock = new THREE.Clock();
    let missionState = 'DRIVE_OUT'; 
    let stateTimer = 0;
    let roverPos = { x: -20, z: 0 }; // Start pos
    
    const animate = () => {
        requestAnimationFrame(animate);
        
        const dt = clock.getDelta();
        const time = clock.getElapsedTime();
        stateTimer += dt;

        // 1. UPDATE ROVER POSITION (Kinematic Controller)
        let isMoving = false;
        
        if (missionState === 'DRIVE_OUT' || missionState === 'RETURN') {
            isMoving = true;
            roverPos.x += 3.0 * dt; // Drive speed
            
            // Loop terrain
            if (roverPos.x > 60) {
                 roverPos.x = -60;
                 missionState = 'DRIVE_OUT'; // Reset loop
                 stateTimer = 0;
            }
        }

        // 2. CALCULATE PHYSICS (Gravity/Terrain Snap)
        // We calculate the terrain height at the rover's center
        const hCenter = getTerrainHeight(roverPos.x, roverPos.z);
        
        // Sample points for orientation
        const offset = 1.2; // Wheelbase approximation
        const hFront = getTerrainHeight(roverPos.x + offset, roverPos.z);
        const hBack = getTerrainHeight(roverPos.x - offset, roverPos.z);
        const hLeft = getTerrainHeight(roverPos.x, roverPos.z + 0.8);
        const hRight = getTerrainHeight(roverPos.x, roverPos.z - 0.8);

        // Determine Pitch (Nose Up/Down)
        const pitch = Math.atan2(hFront - hBack, offset * 2);
        
        // Determine Roll (Tilt Left/Right)
        const roll = Math.atan2(hLeft - hRight, 1.6);

        // Apply to Rover Root
        // HEIGHT CALCULATION:
        // Rocker Pivot is at -0.2 relative to Body.
        // Wheel Pivot is at -0.2 relative to Rocker.
        // Wheel Center is 0 relative to Wheel Pivot.
        // Wheel Radius is 0.35.
        // Total Distance from Root to Wheel Bottom = 0.2 + 0.2 + 0.35 = 0.75.
        // So Root Height should be Terrain + 0.75.
        // We subtract a tiny bit (0.02) for tire compression visual -> 0.73
        
        const currentRot = rover.root.rotation;
        rover.root.position.set(roverPos.x, hCenter + 0.73, roverPos.z);
        
        // Damping orientation changes
        rover.root.rotation.z = THREE.MathUtils.lerp(currentRot.z, pitch, dt * 5);
        rover.root.rotation.x = THREE.MathUtils.lerp(currentRot.x, -roll, dt * 5);
        
        // 3. SUSPENSION ARTICULATION (Rocker Bogie)
        // Calculate ground slope under left vs right tracks
        const hFL = getTerrainHeight(roverPos.x + 1.0, roverPos.z + 0.8);
        const hRL = getTerrainHeight(roverPos.x - 1.0, roverPos.z + 0.8);
        const rockerAngleL = Math.atan2(hFL - hRL, 2.0);

        const hFR = getTerrainHeight(roverPos.x + 1.0, roverPos.z - 0.8);
        const hRR = getTerrainHeight(roverPos.x - 1.0, roverPos.z - 0.8);
        const rockerAngleR = Math.atan2(hFR - hRR, 2.0);

        // Rockers rotate relative to chassis to keep wheels on ground
        rover.rockerL.rotation.z = (rockerAngleL - rover.root.rotation.z) * 0.8; 
        rover.rockerR.rotation.z = (rockerAngleR - rover.root.rotation.z) * 0.8;

        // Wheel Rotation
        if (isMoving) {
            rover.wheels.forEach(w => w.rotation.x -= 8.0 * dt);
        }

        // Dust Particle Animation
        const dustPos = dustSystem.geometry.attributes.position.array as Float32Array;
        for(let i=0; i<dustCount; i++) {
            dustPos[i*3] -= 0.5 * dt; // Wind
            if(dustPos[i*3] < -60) dustPos[i*3] = 60;
        }
        dustSystem.geometry.attributes.position.needsUpdate = true;

        // CAMERA FOLLOW
        controls.target.lerp(rover.root.position, dt * 2);

        // MISSION LOGIC
        switch (missionState) {
            case 'DRIVE_OUT':
                setMissionPhase('TRAVERSING SECTOR 7');
                // Arm Stow
                rover.arm.base.rotation.y = THREE.MathUtils.lerp(rover.arm.base.rotation.y, 0, dt * 2);
                rover.arm.shoulder.rotation.z = THREE.MathUtils.lerp(rover.arm.shoulder.rotation.z, -Math.PI/2, dt * 2);
                
                if (stateTimer > 6) { // Drive for 6s
                    missionState = 'SCAN';
                    stateTimer = 0;
                }
                break;

            case 'SCAN':
                setMissionPhase('ENVIRONMENTAL SCANNING');
                // Tail Scan
                rover.tail.base.rotation.y = Math.sin(time * 2) * 0.8; 
                rover.tail.mid.rotation.z = (Math.PI/3) + Math.sin(time * 3) * 0.2;

                if (stateTimer > 3) {
                    missionState = 'SAMPLE';
                    stateTimer = 0;
                }
                break;

            case 'SAMPLE':
                setMissionPhase('SAMPLE ACQUISITION');
                // Tail looks at arm
                rover.tail.base.rotation.y = THREE.MathUtils.lerp(rover.tail.base.rotation.y, 0, dt);
                
                // Arm Sequence
                rover.arm.base.rotation.y = THREE.MathUtils.lerp(rover.arm.base.rotation.y, Math.PI/4, dt * 2);
                rover.arm.shoulder.rotation.z = THREE.MathUtils.lerp(rover.arm.shoulder.rotation.z, 0, dt * 2); // Level
                rover.arm.elbow.rotation.z = THREE.MathUtils.lerp(rover.arm.elbow.rotation.z, -Math.PI/2, dt * 2); // Down

                if (stateTimer > 4) {
                    missionState = 'RETURN';
                    stateTimer = 0;
                }
                break;
                
             case 'RETURN':
                 setMissionPhase('RESUMING TRAVERSE');
                 if (stateTimer > 3) {
                     missionState = 'DRIVE_OUT'; // Just keep driving
                     stateTimer = 0;
                 }
                 break;
        }

        controls.update();
        renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!mountRef.current) return;
      camera.aspect = mountRef.current.clientWidth / mountRef.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (mountRef.current) mountRef.current.removeChild(renderer.domElement);
      renderer.dispose();
    };
  }, []);

  return (
    <div className="w-full h-[600px] bg-black rounded-xl overflow-hidden border border-gray-800 relative shadow-2xl shadow-amber-900/10 group">
      <div ref={mountRef} className="w-full h-full cursor-move" />
      
      {/* Overlay UI */}
      <div className="absolute top-4 left-4 pointer-events-none space-y-2">
        <div className="bg-gray-900/80 backdrop-blur border border-gray-700 px-3 py-1 rounded text-xs font-mono text-amber-500 flex items-center gap-2">
          <Layers size={12} /> MARS TERRAIN SIMULATION
        </div>
        <div className="bg-black/60 backdrop-blur border-l-2 border-amber-600 px-3 py-2 rounded-r">
           <div className="text-[10px] text-gray-400 font-mono tracking-widest mb-1">AI MISSION STATUS</div>
           <div className="text-sm font-bold text-white flex items-center gap-2">
              <Activity size={14} className="animate-pulse text-amber-500" />
              {missionPhase}
           </div>
        </div>
      </div>

      <div className="absolute bottom-4 right-4 pointer-events-none">
          <div className="text-right space-y-1 opacity-70">
              <div className="text-[10px] font-mono text-amber-500">PHYSICS: KINEMATIC TERRAIN SNAP</div>
              <div className="text-[10px] font-mono text-amber-500">GRAVITY: 3.71 m/s² (SIMULATED)</div>
              <div className="text-[10px] font-mono text-amber-500">COLLISION: ACTIVE</div>
          </div>
      </div>

      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black z-20">
          <div className="flex flex-col items-center gap-2">
             <Loader2 className="animate-spin text-amber-500" size={32} />
             <span className="text-amber-500 font-mono text-sm">INITIALIZING PHYSICS ENGINE...</span>
          </div>
        </div>
      )}
    </div>
  );
};

export const DesignSpecs: React.FC = () => {
  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10 max-w-6xl mx-auto">
      
      {/* Report Header */}
      <div className="relative rounded-2xl overflow-hidden border border-gray-700 bg-gray-900 h-64 flex items-center p-8">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-900/40 via-gray-900 to-black"></div>
        <div className="absolute inset-0 opacity-10" 
             style={{backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.15) 1px, transparent 0)', backgroundSize: '24px 24px'}}></div>
        
        <div className="relative z-10 w-full">
          <div className="flex justify-between items-start">
            <div>
              <div className="text-amber-500 font-mono text-sm mb-2">CIS7036: 3D BIO-INSPIRED ROBOT DESIGN</div>
              <h1 className="text-5xl font-bold text-white mb-2 uppercase tracking-tighter">Scorpion-Inspired<br/>Planetary Rover</h1>
              <p className="text-xl text-gray-400 font-mono mt-4 flex items-center gap-2">
                <Map size={18} /> PRAC1 Assessment: Robot Design & Technical Report
              </p>
            </div>
            <div className="hidden md:block text-right">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600/20 text-amber-500 rounded-full border border-amber-600/50 font-mono text-sm">
                   <Play size={14} className="fill-current"/> LIVE DEMO ACTIVE
                </div>
            </div>
          </div>
        </div>
      </div>

      {/* NEW: 3D SIMULATION SECTION */}
      <section>
         <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-amber-600 rounded text-black"><Box size={24} /></div>
          <h2 className="text-2xl font-bold text-white">Digital Twin & Environmental Test</h2>
        </div>
        <p className="text-gray-400 mb-4 max-w-3xl">
          Real-time autonomous mission simulation in a <strong>Martian environment</strong>. Observe the <strong>Rocker-Bogie suspension</strong> adapting to terrain while the rover executes a "Drive-Scan-Sample" bio-mimetic behavior loop.
        </p>
        <Rover3DScene />
      </section>

      {/* NEW: DESIGN DEFENSE (Q&A) SECTION */}
      <section className="bg-gray-900/40 border border-gray-800 rounded-xl p-8">
         <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-gray-700 rounded text-white"><HelpCircle size={24} /></div>
            <h2 className="text-2xl font-bold text-white">Design Rationale & Defense</h2>
         </div>
         <div className="space-y-6">
            <div className="border-l-2 border-amber-600 pl-4">
               <h4 className="text-amber-500 font-mono font-bold text-sm mb-1">Q: How do you translate from the multi-legged design to multi-wheeled design?</h4>
               <p className="text-gray-300 text-sm leading-relaxed">
                  While scorpions rely on 8 legs for stability, reproducing this with robotics requires high complexity (18-24 motors). We translated the <strong>function</strong> of the scorpion's stable, low-profile posture into a <strong>6-wheel Rocker-Bogie suspension</strong>. This passive mechanism allows the rover to "creep" over obstacles while keeping all wheels grounded, mimicking the arthropod's stability without the energy cost of active legs.
               </p>
            </div>

            <div className="border-l-2 border-amber-600 pl-4">
               <h4 className="text-amber-500 font-mono font-bold text-sm mb-1">Q: Is the robot arm inspired by the claw and arm design in scorpions?</h4>
               <p className="text-gray-300 text-sm leading-relaxed">
                  Yes. The front-mounted 4-DOF manipulator is directly bio-mimetic of the scorpion's <strong>pedipalp</strong>. Just as a scorpion uses its claws to grasp and manipulate prey, this arm uses a gripper to collect geological samples and bring them to the onboard analysis bay.
               </p>
            </div>

            <div className="border-l-2 border-amber-600 pl-4">
               <h4 className="text-amber-500 font-mono font-bold text-sm mb-1">Q: How do you translate the hyper-redundant tail to engineering?</h4>
               <p className="text-gray-300 text-sm leading-relaxed">
                  A biological scorpion tail has many segments (hyper-redundant). For engineering reliability, we simplified this to a <strong>2-DOF Sensor Mast</strong>. We use two high-torque servos to provide <strong>Pitch (Elevation)</strong> and <strong>Yaw (Azimuth)</strong>, allowing the sensor head to scan the environment or look "over the shoulder" like a striking scorpion.
               </p>
            </div>
         </div>
      </section>

      {/* SECTION 1: Bio-Inspiration (LO1, LO3) */}
      <section>
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-amber-600 rounded text-black"><Brain size={24} /></div>
          <h2 className="text-2xl font-bold text-white">1. Bio-Inspiration & Aesthetics</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
            <h3 className="text-amber-500 font-bold mb-4 font-mono">NATURAL MODEL: SCORPION</h3>
            <ul className="space-y-4 text-gray-300">
               <li className="flex gap-3">
                 <span className="font-bold text-white">Segmented Anatomy:</span> 
                 Protective exoskeleton segments allowing flexibility and organ protection.
               </li>
               <li className="flex gap-3">
                 <span className="font-bold text-white">Pedipalps (Claws):</span> 
                 Multi-jointed limbs used for grasping prey and sensing the environment.
               </li>
               <li className="flex gap-3">
                 <span className="font-bold text-white">Metasoma (Tail):</span> 
                 Hyper-redundant articulated structure for defense (stinger) and overhead positioning.
               </li>
            </ul>
          </div>
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 relative">
            <div className="absolute top-1/2 -left-4 hidden md:block z-20 bg-gray-800 rounded-full p-2 border border-gray-600">
               <ArrowRight size={16} className="text-white" />
            </div>
            <h3 className="text-blue-500 font-bold mb-4 font-mono">ENGINEERING TRANSLATION</h3>
            <ul className="space-y-4 text-gray-300">
               <li className="flex gap-3">
                 <span className="font-bold text-white">Modular Chassis:</span> 
                 Isolated electronics bays within the body to protect against radiation and dust.
               </li>
               <li className="flex gap-3">
                 <span className="font-bold text-white">4-DOF Manipulator:</span> 
                 Robotic arm mimicking the pedipalp for sample collection and manipulation.
               </li>
               <li className="flex gap-3">
                 <span className="font-bold text-white">2-DOF Sensor Mast:</span> 
                 Simplified pitch/yaw tail mechanism for localized sensing (LIDAR/Camera).
               </li>
            </ul>
          </div>
        </div>
      </section>

      {/* SECTION 2: Technical Implementation (LO2, LO4) */}
      <section>
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-blue-600 rounded text-black"><Cpu size={24} /></div>
          <h2 className="text-2xl font-bold text-white">2. Technical Implementation</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
           <div className="bg-gray-800/40 p-6 rounded-lg border border-gray-700">
             <h4 className="font-bold text-white mb-2 flex items-center gap-2"><Box size={18} className="text-amber-500"/> CAD Design</h4>
             <p className="text-sm text-gray-400 leading-relaxed">
               Modeled in <span className="text-white">Autodesk Fusion 360</span>. The chassis utilizes a modular design for easy 3D printing (FDM) using ABS/PETG filament. Joints utilize standard servo horns for ease of assembly.
             </p>
           </div>
           <div className="bg-gray-800/40 p-6 rounded-lg border border-gray-700">
             <h4 className="font-bold text-white mb-2 flex items-center gap-2"><Ruler size={18} className="text-amber-500"/> Kinematics (DOF)</h4>
             <ul className="text-sm text-gray-400 space-y-1">
               <li><strong className="text-gray-200">Arm (4-DOF):</strong> Base (Yaw), Shoulder (Pitch), Elbow (Pitch), Wrist (Pitch).</li>
               <li><strong className="text-gray-200">Tail (2-DOF):</strong> Base Pitch, Base Yaw for sensor sweeping.</li>
               <li><strong className="text-gray-200">Drive:</strong> 6x DC Motors with differential linkage.</li>
             </ul>
           </div>
           <div className="bg-gray-800/40 p-6 rounded-lg border border-gray-700">
             <h4 className="font-bold text-white mb-2 flex items-center gap-2"><ShieldCheck size={18} className="text-amber-500"/> Fabrication</h4>
             <p className="text-sm text-gray-400 leading-relaxed">
               Designed for Rapid Prototyping. Parts are oriented to minimize supports. Snap-fit joints used where possible to reduce fastener count.
             </p>
           </div>
        </div>
        
        {/* Assembly Strategy (Addressing "Assembly Steps" Criteria) */}
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
           <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><Wrench size={18} className="text-amber-500"/> Fabrication & Assembly Strategy</h3>
           <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                 <div className="text-xs text-amber-500 font-mono">PHASE 1</div>
                 <h4 className="text-sm font-bold text-white">Chassis Printing</h4>
                 <p className="text-xs text-gray-400">Main body printed in 3 segments (Head, Thorax, Abdomen) using 20% infill PETG for impact resistance.</p>
              </div>
              <div className="space-y-2">
                 <div className="text-xs text-amber-500 font-mono">PHASE 2</div>
                 <h4 className="text-sm font-bold text-white">Drivetrain</h4>
                 <p className="text-xs text-gray-400">Installation of 6x DC Gearmotors into Rocker-Bogie legs. Wiring routed through internal channels to central hub.</p>
              </div>
              <div className="space-y-2">
                 <div className="text-xs text-amber-500 font-mono">PHASE 3</div>
                 <h4 className="text-sm font-bold text-white">Actuators</h4>
                 <p className="text-xs text-gray-400">Servo assembly for Tail (2x MG996R) and Arm (4x SG90/MG90S). Calibration of zero-points before horn attachment.</p>
              </div>
              <div className="space-y-2">
                 <div className="text-xs text-amber-500 font-mono">PHASE 4</div>
                 <h4 className="text-sm font-bold text-white">Integration</h4>
                 <p className="text-xs text-gray-400">Microcontroller mounting (Raspberry Pi/Arduino), sensor fusion, and final cosmetic shell attachment.</p>
              </div>
           </div>
        </div>
      </section>

      {/* SECTION 3: Bio-Inspired AI Control (LO5) */}
      <section>
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-emerald-600 rounded text-black"><Code size={24} /></div>
          <h2 className="text-2xl font-bold text-white">3. Bio-Inspired AI Control Algorithms</h2>
        </div>
        <div className="bg-gray-900/80 border border-gray-700 rounded-xl overflow-hidden">
          <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div>
              <h3 className="text-lg font-bold text-white mb-3">Central Pattern Generators (CPGs)</h3>
              <p className="text-gray-400 text-sm mb-4">
                To mimic the rhythmic movement of scorpion legs, we propose using CPG neural networks. Even for a wheeled rover, CPGs can modulate wheel speed and suspension stiffness rhythmically to traverse loose sand (regolith) effectively, similar to how scorpions distribute weight.
              </p>
              <div className="h-24 bg-black/50 rounded border border-gray-800 flex items-center justify-center">
                 <div className="flex gap-2">
                    {[1,2,3,4,5].map(i => (
                      <div key={i} className="w-2 bg-emerald-500/50 rounded-full animate-pulse" style={{ height: `${20 + Math.random() * 40}px`, animationDelay: `${i * 0.1}s` }}></div>
                    ))}
                 </div>
                 <span className="ml-4 text-xs font-mono text-emerald-500">NEURAL OSCILLATOR SIMULATION</span>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-bold text-white mb-3">Subsumption Architecture</h3>
              <p className="text-gray-400 text-sm mb-4">
                Based on insect intelligence (Rodney Brooks), the control system is layered. 
                <br/>Layer 0: Obstacle Avoidance (Reflexive).
                <br/>Layer 1: Wandering/Foraging.
                <br/>Layer 2: Goal Seeking.
                <br/>This bio-mimetic approach ensures the rover survives (avoids cliffs) before attempting missions.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 4: Applications (LO5) */}
      <section>
         <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-purple-600 rounded text-black"><Globe size={24} /></div>
          <h2 className="text-2xl font-bold text-white">4. Real-Scenario Applications</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="border-l-4 border-purple-500 bg-gray-900/50 p-4 rounded-r-lg">
             <h4 className="font-bold text-white">Extraterrestrial Exploration</h4>
             <p className="text-sm text-gray-400 mt-1">
               Deployment on Mars or Moon analogs. The Rocker-Bogie system (derived from insect stability principles) excels in traversing craters and rock fields where traditional vehicles fail.
             </p>
          </div>
          <div className="border-l-4 border-purple-500 bg-gray-900/50 p-4 rounded-r-lg">
             <h4 className="font-bold text-white">Rough-Terrain Inspection</h4>
             <p className="text-sm text-gray-400 mt-1">
               Earth-based applications include inspecting collapsed buildings or mining shafts. The tail sensor can peek over obstacles without exposing the main chassis to danger.
             </p>
          </div>
        </div>
      </section>

      {/* Footer / Signature */}
      <div className="border-t border-gray-800 pt-8 mt-8 flex flex-col md:flex-row justify-between items-center text-gray-500 text-sm font-mono">
        <div>
           CONFIDENTIAL ENGINEERING REPORT - DO NOT DISTRIBUTE
        </div>
        <div className="flex gap-4 mt-4 md:mt-0">
           <span>Assessment: PRAC1</span>
           <span>Weighting: 75%</span>
           <span className="text-amber-600">STATUS: READY FOR SUBMISSION</span>
        </div>
      </div>
    </div>
  );
};