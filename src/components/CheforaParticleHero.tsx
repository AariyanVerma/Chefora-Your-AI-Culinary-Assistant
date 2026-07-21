"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import gsap from "gsap";

const BASE_PARTICLE_COUNT = 30000; 
const EXTRA_PARTICLE_COUNT = 40000; 
const PARTICLE_COUNT = BASE_PARTICLE_COUNT + EXTRA_PARTICLE_COUNT;

const SPHERE_RADIUS = 7.0;

const CORE_COLLAPSE_DURATION = 1.0; 
const INFALL_DURATION = 2.2; 
const EXTRA_WAIT_BEFORE_EXPLOSION = 2.0; 

const LOGO_IMAGE_URL = "/assets/Chefora-logo-particles.png";

const LOGO_FRACTION = 0.22;
const TITLE_FRACTION = 0.28;
const SUBTITLE_FRACTION = 0.18;

async function createLogoTargets(
  url: string,
  count: number,
  options: { scale: number; yOffset: number; zOffset?: number }
): Promise<Float32Array> {
  const { scale, yOffset, zOffset = 0 } = options;

  const img = new Image();
  img.src = url;
  img.crossOrigin = "anonymous";

  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = (e) => {
      console.error(`Failed to load logo image from ${url}:`, e);
      reject(new Error(`Failed to load image: ${url}`));
    };
  });

  const canvas = document.createElement("canvas");
  const maxDim = 260;
  const aspect = img.width / img.height;

  if (aspect >= 1) {
    canvas.width = maxDim;
    canvas.height = maxDim / aspect;
  } else {
    canvas.height = maxDim;
    canvas.width = maxDim * aspect;
  }

  const ctx = canvas.getContext("2d");
  if (!ctx) return new Float32Array(count * 3);

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imgData.data;

  const samples: number[] = [];
  const step = 2;

  for (let y = 0; y < canvas.height; y += step) {
    for (let x = 0; x < canvas.width; x += step) {
      const idx = (y * canvas.width + x) * 4;
      const alpha = data[idx + 3];
      if (alpha > 60) {
        const nx = (x / canvas.width - 0.5) * scale;
        const ny = (0.5 - y / canvas.height) * scale + yOffset;
        samples.push(nx, ny, zOffset + (Math.random() - 0.5) * 0.15);
      }
    }
  }

  const result = new Float32Array(count * 3);
  if (samples.length === 0) return result;

  for (let i = 0; i < count; i++) {
    const sIdx = (i % (samples.length / 3)) * 3;
    const i3 = i * 3;
    result[i3] = samples[sIdx];
    result[i3 + 1] = samples[sIdx + 1];
    result[i3 + 2] = samples[sIdx + 2];
  }

  return result;
}

function createTextTargets(
  text: string,
  count: number,
  options: {
    font: string;
    scale: number;
    yOffset: number;
    zOffset?: number;
    scaleX?: number;
    scaleY?: number;
  }
): Float32Array {
  const { font, scale, yOffset, zOffset = 0, scaleX, scaleY } = options;

  const canvas = document.createElement("canvas");
  canvas.width = 900;
  canvas.height = 220;

  const ctx = canvas.getContext("2d");
  if (!ctx) return new Float32Array(count * 3);

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = font;
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);

  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imgData.data;

  const samples: number[] = [];
  const step = 3;

  const sx = scaleX ?? scale * 1.25; 
  const sy = scaleY ?? scale * 0.65; 

  for (let y = 0; y < canvas.height; y += step) {
    for (let x = 0; x < canvas.width; x += step) {
      const idx = (y * canvas.width + x) * 4;
      const alpha = data[idx + 3];
      if (alpha > 80) {
        const nx = (x / canvas.width - 0.5) * sx;
        const ny = (0.5 - y / canvas.height) * sy + yOffset;
        samples.push(nx, ny, zOffset + (Math.random() - 0.5) * 0.2);
      }
    }
  }

  const result = new Float32Array(count * 3);
  if (samples.length === 0) return result;

  for (let i = 0; i < count; i++) {
    const sIdx = (i % (samples.length / 3)) * 3;
    const i3 = i * 3;
    result[i3] = samples[sIdx];
    result[i3 + 1] = samples[sIdx + 1];
    result[i3 + 2] = samples[sIdx + 2];
  }

  return result;
}

function fillSphereTargets(targetArray: Float32Array, radius: number) {
  const count = targetArray.length / 3;
  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    const theta = Math.acos(2 * Math.random() - 1);
    const phi = 2 * Math.PI * Math.random();
    const r = radius * (0.65 + 0.35 * Math.random());
    targetArray[i3] = r * Math.sin(theta) * Math.cos(phi);
    targetArray[i3 + 1] = r * Math.cos(theta);
    targetArray[i3 + 2] = r * Math.sin(theta) * Math.sin(phi);
  }
}

export default function CheforaParticleHero() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    canvas.style.width = "100%";
    canvas.style.height = "100%";

    const rect = canvas.getBoundingClientRect();
    const initialWidth = rect.width || window.innerWidth;
    const initialHeight = rect.height || window.innerHeight;
    const isNarrow = initialWidth < 768;

    renderer.setSize(initialWidth, initialHeight, false);
    renderer.setClearColor(0x000000, 1);

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(
      isNarrow ? 50 : 45,
      initialWidth / initialHeight,
      0.1,
      200
    );
    camera.position.set(0, 0, isNarrow ? 42 : 36);
    scene.add(camera);

    const initialCameraZ = camera.position.z;
    const cameraTarget = {
      x: camera.position.x,
      y: camera.position.y,
      z: camera.position.z,
    };
    let cameraTimeline: gsap.core.Timeline | null = null;

    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color: 0xc9c9ff,
      size: 0.08,
      sizeAttenuation: true,
      transparent: true,
      opacity: 1,
      depthWrite: false,
    });

    const baseColor = new THREE.Color(0xc9c9ff);
    const bigBangColor = new THREE.Color(0xffe9a3);
    material.color.copy(baseColor);

    const points = new THREE.Points(geometry, material);
    scene.add(points);

    const logoCount = Math.floor(BASE_PARTICLE_COUNT * LOGO_FRACTION);
    const titleCount = Math.floor(BASE_PARTICLE_COUNT * TITLE_FRACTION);
    const subtitleCount = Math.floor(BASE_PARTICLE_COUNT * SUBTITLE_FRACTION);
    const bgCount =
      BASE_PARTICLE_COUNT - logoCount - titleCount - subtitleCount;

    const sphereTargets = new Float32Array(BASE_PARTICLE_COUNT * 3);
    const logoTargets = new Float32Array(logoCount * 3);
    const titleTargets = new Float32Array(titleCount * 3);
    const subtitleTargets = new Float32Array(subtitleCount * 3);
    const bgTargets = new Float32Array(bgCount * 3);

    const explosionVelocities = new Float32Array(PARTICLE_COUNT * 3);

    fillSphereTargets(sphereTargets, SPHERE_RADIUS);

    (function fillBackground() {
      const spreadX = 50;
      const spreadY = 30;

      for (let i = 0; i < bgCount; i++) {
        const i3 = i * 3;
        let x: number;
        let y: number;
        do {
          x = (Math.random() - 0.5) * spreadX;
          y = (Math.random() - 0.5) * spreadY;
        } while (Math.abs(x) < 9 && Math.abs(y) < 6);

        bgTargets[i3] = x;
        bgTargets[i3 + 1] = y;
        bgTargets[i3 + 2] = (Math.random() - 0.5) * 16;
      }
    })();

    const logoTextTargetsFull = new Float32Array(BASE_PARTICLE_COUNT * 3);
    const sphereTargetsFull = new Float32Array(BASE_PARTICLE_COUNT * 3);
    sphereTargetsFull.set(sphereTargets);

    const smallSphereTargetsFull = new Float32Array(BASE_PARTICLE_COUNT * 3);
    for (let i = 0; i < BASE_PARTICLE_COUNT; i++) {
      const i3 = i * 3;
      smallSphereTargetsFull[i3] = sphereTargetsFull[i3] * 0.28;
      smallSphereTargetsFull[i3 + 1] = sphereTargetsFull[i3 + 1] * 0.28;
      smallSphereTargetsFull[i3 + 2] = sphereTargetsFull[i3 + 2] * 0.28;
    }

    async function buildLogoAndTextTargets() {
      const scaleFactor = isNarrow ? 0.7 : 1;
      const yFactor = isNarrow ? 0.8 : 1;

      const logo = await createLogoTargets(LOGO_IMAGE_URL, logoCount, {
        scale: 11.0 * scaleFactor,
        yOffset: 2.0 * yFactor,
        zOffset: 1.0,
      });
      logoTargets.set(logo);

      const title = createTextTargets("Chefora", titleCount, {
        font: "bold 120px system-ui",
        scale: 13 * scaleFactor,
        yOffset: -5.0 * yFactor,
        zOffset: 0.1,
        scaleX: 26 * scaleFactor,
        scaleY: 7 * scaleFactor,
      });
      titleTargets.set(title);

      const subtitle = createTextTargets(
        "Your Personal AI Culinary Assistant",
        subtitleCount,
        {
          font: "600 44px system-ui",
          scale: 9.4 * scaleFactor,
          yOffset: -7.6 * yFactor,
          zOffset: 0,
          scaleX: 20.0 * scaleFactor,
          scaleY: 5.5 * scaleFactor,
        }
      );
      subtitleTargets.set(subtitle);

      logoTextTargetsFull.set(logoTargets, 0);
      logoTextTargetsFull.set(titleTargets, logoTargets.length);
      logoTextTargetsFull.set(
        subtitleTargets,
        logoTargets.length + titleTargets.length
      );
      logoTextTargetsFull.set(
        bgTargets,
        logoTargets.length + titleTargets.length + subtitleTargets.length
      );
    }

    const clock = new THREE.Clock();

    type Mode =
      | "sphere"
      | "logoText"
      | "blackholeCollapse"
      | "blackholeSpin"
      | "explode";
    let mode: Mode = "sphere";

    let loopTimeline: gsap.core.Timeline | null = null;
    let hasClicked = false;

    let isIdleSphere = true;

    let mouseX = 0;
    let mouseY = 0;
    let lastPointerMove = 0;
    let explosionClock = 0;
    let cursorEnergy = 0;

    let scrollRotationVel = 0;
    let mouseRotVelX = 0;
    let mouseRotVelY = 0;

    let isPulsing = false;
    let isCorePhase = false;

    let collapseClock = 0;
    let spinClock = 0;
    let spinInitialized = false;
    const ringRadius = new Float32Array(PARTICLE_COUNT);
    const ringAngle = new Float32Array(PARTICLE_COUNT);
    const ringBand = new Float32Array(PARTICLE_COUNT); 

    function onPointerMove(e: PointerEvent) {
      const c = canvasRef.current;
      if (!c) return;

      const r = c.getBoundingClientRect();
      const xNorm = (e.clientX - r.left) / r.width;
      const yNorm = (e.clientY - r.top) / r.height;

      const newMouseX = (xNorm - 0.5) * 2;
      const newMouseY = (0.5 - yNorm) * 2;

      const dx = newMouseX - mouseX;
      const dy = newMouseY - mouseY;

      mouseX = newMouseX;
      mouseY = newMouseY;

      mouseRotVelY += dx * 0.6;
      mouseRotVelX += -dy * 0.6;

      lastPointerMove = clock.getElapsedTime();
      cursorEnergy = 1;
    }

    function onWheel(e: WheelEvent) {
      if (mode === "explode") return;

      e.preventDefault();

      const delta = e.deltaY;
      if (delta === 0) return;

      const direction = delta < 0 ? 1 : -1;
      const magnitude = Math.min(Math.abs(delta) / 400, 0.35);

      scrollRotationVel += direction * magnitude;
    }

    const preventTouchScroll = (e: TouchEvent) => {
      e.preventDefault();
    };

    function applyMorph(from: Float32Array, to: Float32Array, t: number) {
      const posAttr = geometry.attributes.position as THREE.BufferAttribute;
      const posArray = posAttr.array as Float32Array;
      const invT = 1 - t;

      for (let i = 0; i < BASE_PARTICLE_COUNT; i++) {
        const i3 = i * 3;
        posArray[i3] = from[i3] * invT + to[i3] * t;
        posArray[i3 + 1] = from[i3 + 1] * invT + to[i3 + 1] * t;
        posArray[i3 + 2] = from[i3 + 2] * invT + to[i3 + 2] * t;
      }

      posAttr.needsUpdate = true;
    }

    function prepareExplosionFromCenter() {
      const posAttr = geometry.attributes.position as THREE.BufferAttribute;
      const pos = posAttr.array as Float32Array;

      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const i3 = i * 3;

        const theta = Math.acos(2 * Math.random() - 1);
        const phi = 2 * Math.PI * Math.random();
        const r = 0.4 + Math.random() * 0.4;

        const x = r * Math.sin(theta) * Math.cos(phi);
        const y = r * Math.cos(theta);
        const z = r * Math.sin(theta) * Math.sin(phi);

        pos[i3] = x;
        pos[i3 + 1] = y;
        pos[i3 + 2] = z;

        const len = Math.sqrt(x * x + y * y + z * z) || 1;
        const speed = 12 + Math.random() * 10;
        explosionVelocities[i3] = (x / len) * speed;
        explosionVelocities[i3 + 1] = (y / len) * speed;
        explosionVelocities[i3 + 2] = (z / len) * speed;
      }

      posAttr.needsUpdate = true;
      explosionClock = 0;
      material.opacity = 1;
      material.color.copy(bigBangColor);

      cameraTimeline?.kill();
      cameraTimeline = gsap.timeline();
      cameraTimeline.to(cameraTarget, {
        z: initialCameraZ + 8,
        y: 0,
        duration: 1.8,
        ease: "power2.out",
      });
    }

    function startBlackHoleSequence() {
      loopTimeline?.kill();
      loopTimeline = null;

      collapseClock = 0;
      spinClock = 0;
      spinInitialized = false;

      mode = "blackholeCollapse";
      points.visible = true;
      isIdleSphere = false;

      gsap.to(material.color, {
        r: 1,
        g: 0.86,
        b: 0.55,
        duration: 0.8,
        ease: "power2.out",
      });

      cameraTimeline?.kill();
      cameraTarget.x = camera.position.x;
      cameraTarget.y = camera.position.y;
      cameraTarget.z = camera.position.z;

      cameraTimeline = gsap.timeline();
      cameraTimeline.to(cameraTarget, {
        z: initialCameraZ - 8,
        duration: 1.4,
        ease: "power2.inOut",
      });
      cameraTimeline.to(
        cameraTarget,
        {
          z: initialCameraZ - 12,
          y: 2.0,
          duration: 2.0,
          ease: "power1.inOut",
        },
        "-=0.2"
      );
      cameraTimeline.to(cameraTarget, {
        z: initialCameraZ - 10,
        y: 0.8,
        duration: 1.4,
        ease: "sine.inOut",
      });
    }

    function onClick() {
      if (hasClicked) return;
      hasClicked = true;
      startBlackHoleSequence();
    }

    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("click", onClick);
    canvas.addEventListener("wheel", onWheel, { passive: false });
    canvas.addEventListener("touchmove", preventTouchScroll, {
      passive: false,
    });

    function startMorphLoop() {
      loopTimeline?.kill();

      const helper = { t: 0 };
      const tl = gsap.timeline({
        repeat: -1,
        repeatDelay: 2,
      });
      loopTimeline = tl;

      const toLogo = {
        t: 1,
        duration: 5,
        ease: "power2.inOut",
        onStart: () => {
          isIdleSphere = false;
        },
        onUpdate: () => {
          applyMorph(sphereTargetsFull, logoTextTargetsFull, helper.t);
          points.rotation.y += (0 - points.rotation.y) * 0.25;
          points.rotation.x += (0 - points.rotation.x) * 0.25;
        },
        onComplete: () => {
          mode = "logoText";
          points.rotation.set(0, 0, 0);
          points.position.set(0, 0, 0);
        },
      };

      const toSphere = {
        t: 0,
        duration: 5,
        ease: "power2.inOut",
        onStart: () => {
          mode = "sphere";
          isIdleSphere = false;
        },
        onUpdate: () => {
          applyMorph(sphereTargetsFull, logoTextTargetsFull, helper.t);
          points.rotation.y += (0 - points.rotation.y) * 0.2;
          points.rotation.x += (0 - points.rotation.x) * 0.2;
        },
        onComplete: () => {
          mode = "sphere";
          isIdleSphere = true;
        },
      };

      tl.to(helper, toLogo, 0);
      tl.to(
        {},
        {
          duration: 6,
          onStart: () => {
            mode = "logoText";
          },
        }
      );
      tl.to(helper, toSphere);
      tl.to({}, { duration: 6 });
    }

    (function initSpherePositions() {
      const pos = geometry.attributes.position.array as Float32Array;
      const from = sphereTargetsFull;

      for (let i = 0; i < BASE_PARTICLE_COUNT; i++) {
        const i3 = i * 3;
        pos[i3] = from[i3] + (Math.random() - 0.5) * 0.5;
        pos[i3 + 1] = from[i3 + 1] + (Math.random() - 0.5) * 0.5;
        pos[i3 + 2] = from[i3 + 2] + (Math.random() - 0.5) * 0.5;
        ringBand[i] = (Math.random() - 0.5) * 0.8;
      }

      for (let i = BASE_PARTICLE_COUNT; i < PARTICLE_COUNT; i++) {
        const i3 = i * 3;
        const theta = Math.acos(2 * Math.random() - 1);
        const phi = 2 * Math.PI * Math.random();
        const r = 60 + Math.random() * 40; 

        pos[i3] = r * Math.sin(theta) * Math.cos(phi);
        pos[i3 + 1] = r * Math.cos(theta);
        pos[i3 + 2] = r * Math.sin(theta) * Math.sin(phi);
      }

      geometry.attributes.position.needsUpdate = true;
    })();

    let rafId: number;

    function animate() {
      rafId = requestAnimationFrame(animate);

      const dt = clock.getDelta();
      const elapsed = clock.getElapsedTime();

      const isBlackholePhase =
        mode === "blackholeCollapse" ||
        mode === "blackholeSpin" ||
        mode === "explode";

      if (isBlackholePhase) {
        
        camera.position.x += (cameraTarget.x - camera.position.x) * 0.08;
        camera.position.y += (cameraTarget.y - camera.position.y) * 0.08;
        camera.position.z += (cameraTarget.z - camera.position.z) * 0.08;

        points.position.x += (0 - points.position.x) * 0.25;
        points.position.y += (0 - points.position.y) * 0.25;
      } else {
        
        cursorEnergy = Math.max(0, cursorEnergy - dt * 0.6);
        const waveStrength = 0.4 + cursorEnergy * 0.8;
        const wobbleX = Math.sin(elapsed * 1.8) * waveStrength;
        const wobbleY = Math.cos(elapsed * 1.4) * waveStrength * 0.7;

        const cTargetX = mouseX * 4 + wobbleX * 0.2;
        const cTargetY = mouseY * 3 + wobbleY * 0.2;

        camera.position.x += (cTargetX - camera.position.x) * 0.06;
        camera.position.y += (cTargetY - camera.position.y) * 0.06;

        const pTargetX = mouseX * 1.0 + wobbleX * 0.15;
        const pTargetY = mouseY * 0.8 + wobbleY * 0.15;
        points.position.x += (pTargetX - points.position.x) * 0.12;
        points.position.y += (pTargetY - points.position.y) * 0.12;

        const depthBreath =
          Math.sin(elapsed * 1.2 + mouseX * 1.5 + mouseY) *
          (0.6 + cursorEnergy * 0.6);
        points.position.z += (depthBreath - points.position.z) * 0.08;

        camera.lookAt(0, 0, 0);
      }

      if (mode === "sphere" && !isPulsing && !isCorePhase) {
        const breath = 1 + Math.sin(elapsed * 0.9) * 0.12;
        points.scale.set(breath, breath, breath);
      } else if (mode !== "explode" && !isPulsing && !isCorePhase) {
        points.scale.x += (1 - points.scale.x) * 0.1;
        points.scale.y += (1 - points.scale.y) * 0.1;
        points.scale.z += (1 - points.scale.z) * 0.1;
      }

      scrollRotationVel *= 0.9;
      mouseRotVelX *= 0.9;
      mouseRotVelY *= 0.9;

      if (mode === "sphere") {
        const idleRotate =
          !isCorePhase && isIdleSphere && elapsed - lastPointerMove > 1.2
            ? 0.0024
            : !isCorePhase && isIdleSphere
            ? 0.0012
            : 0;

        const extraY = isCorePhase ? 0 : scrollRotationVel + mouseRotVelY;
        const extraX = isCorePhase ? 0 : mouseRotVelX * 0.9;

        points.rotation.y += idleRotate + extraY;
        points.rotation.x += extraX;
        points.rotation.z = 0;
      } else if (mode === "logoText") {
        points.rotation.y += (0 - points.rotation.y) * 0.3;
        points.rotation.x += (0 - points.rotation.x) * 0.3;
        points.rotation.z += (0 - points.rotation.z) * 0.3;
      }

      if (mode === "blackholeCollapse") {
        collapseClock += dt;

        const posAttr = geometry.attributes.position as THREE.BufferAttribute;
        const pos = posAttr.array as Float32Array;

        const collapsePhase = Math.min(
          collapseClock / CORE_COLLAPSE_DURATION,
          1
        );
        const coreRadius = 0.6;

        for (let i = 0; i < BASE_PARTICLE_COUNT; i++) {
          const i3 = i * 3;
          let x = pos[i3];
          let y = pos[i3 + 1];
          let z = pos[i3 + 2];

          const r3d = Math.sqrt(x * x + y * y + z * z) + 0.0001;

          const pullStrength = 12;
          const tCollapse = pullStrength * dt * (1 + 4 / (r3d + 0.5));

          const rx = -x / r3d;
          const ry = -y / r3d;
          const rz = -z / r3d;

          x += rx * tCollapse;
          y += ry * tCollapse;
          z += rz * tCollapse;

          if (collapsePhase > 0.5) {
            const diskFactor = (collapsePhase - 0.5) * 2; 

            z *= 1 - 0.9 * diskFactor;

            const r2d = Math.sqrt(x * x + y * y) + 0.0001;

            if (r2d < coreRadius * (0.4 + diskFactor * 0.8)) {
              const bandNoise = ringBand[i] || 0;
              const baseR = coreRadius * (0.9 + diskFactor * 0.5);
              const noisyR =
                baseR +
                bandNoise * coreRadius * (0.3 + diskFactor * 0.4);
              const targetR = Math.max(coreRadius * 0.7, noisyR);
              const scale = targetR / r2d;
              x *= scale;
              y *= scale;
            }

            const swirl =
              12 * dt * diskFactor * (1 + 1.5 / (r2d + 0.4));
            const tx = -y / r2d;
            const ty = x / r2d;

            x += tx * swirl;
            y += ty * swirl;
          }

          pos[i3] = x;
          pos[i3 + 1] = y;
          pos[i3 + 2] = z;
        }

        posAttr.needsUpdate = true;

        const shrink = 1 - Math.min(collapseClock / 2.0, 0.3);
        points.scale.set(shrink, shrink, shrink);

        if (collapseClock > CORE_COLLAPSE_DURATION + 0.4) {
          mode = "blackholeSpin";
          spinClock = 0;
          spinInitialized = false;
        }
      }

      if (mode === "blackholeSpin") {
        spinClock += dt;

        const posAttr = geometry.attributes.position as THREE.BufferAttribute;
        const pos = posAttr.array as Float32Array;

        const infallPhase = Math.min(spinClock / INFALL_DURATION, 1);

        if (!spinInitialized) {
          spinInitialized = true;

          for (let i = BASE_PARTICLE_COUNT; i < PARTICLE_COUNT; i++) {
            const i3 = i * 3;
            const x = pos[i3];
            const y = pos[i3 + 1];
            const r2d = Math.sqrt(x * x + y * y) || 1;

            ringRadius[i] = Math.max(r2d, 6);
            ringAngle[i] = Math.atan2(y, x);
            ringBand[i] = (Math.random() - 0.5) * 1.2;
          }
        }

        for (let i = 0; i < BASE_PARTICLE_COUNT; i++) {
          const i3 = i * 3;
          let x = pos[i3];
          let y = pos[i3 + 1];
          let z = pos[i3 + 2];

          const r2d = Math.sqrt(x * x + y * y) || 1;
          const swirl = 4 * dt * (1 + 0.5 / (r2d + 0.2));

          const tx = -y / r2d;
          const ty = x / r2d;

          x += tx * swirl;
          y += ty * swirl;
          z *= 0.96;

          pos[i3] = x;
          pos[i3 + 1] = y;
          pos[i3 + 2] = z;
        }

        for (let i = BASE_PARTICLE_COUNT; i < PARTICLE_COUNT; i++) {
          const i3 = i * 3;
          let radius = ringRadius[i];
          let angle = ringAngle[i];

          const targetRadius = 3.0;

          if (radius > targetRadius) {
            const fallSpeed =
              22 *
              dt *
              (1 + 4 / (radius + 4)) *
              (0.6 + 0.4 * infallPhase);
            radius = Math.max(targetRadius, radius - fallSpeed);
            ringRadius[i] = radius;
          }

          const spinSpeed = 3.0 + (5.0 - radius) * 0.4;
          angle += spinSpeed * dt;
          ringAngle[i] = angle;

          const radialNoise = ringBand[i] || 0;
          const noisyRadius =
            radius + radialNoise * (0.4 + 0.6 * infallPhase);

          const x = noisyRadius * Math.cos(angle);
          let y = noisyRadius * Math.sin(angle);
          let z = 0;

          y *= 0.35;

          z += Math.sin(angle * 2.7) * 0.12;

          pos[i3] = x;
          pos[i3 + 1] = y;
          pos[i3 + 2] = z;
        }

        posAttr.needsUpdate = true;

        const ringPulse = 1 + Math.sin(spinClock * 5) * 0.05;
        points.scale.set(ringPulse, ringPulse, ringPulse);

        if (spinClock > INFALL_DURATION + EXTRA_WAIT_BEFORE_EXPLOSION) {
          prepareExplosionFromCenter();
          mode = "explode";

          gsap.to(material.color, {
            r: 1,
            g: 0.98,
            b: 0.94,
            duration: 0.5,
          });
        }
      }

      if (mode === "explode") {
        explosionClock += dt;
        const pos = geometry.attributes.position.array as Float32Array;

        for (let i = 0; i < PARTICLE_COUNT; i++) {
          const i3 = i * 3;
          pos[i3] += explosionVelocities[i3] * dt;
          pos[i3 + 1] += explosionVelocities[i3 + 1] * dt;
          pos[i3 + 2] += explosionVelocities[i3 + 2] * dt;
        }

        geometry.attributes.position.needsUpdate = true;

        const fade = Math.max(0, 1 - explosionClock / 3.0);
        material.opacity = fade;

        if (explosionClock >= 3.0) {
          cancelAnimationFrame(rafId);
          setVisible(false);
          cleanup();
          return;
        }
      }

      renderer.render(scene, camera);
    }

    function onResize() {
      if (!renderer || !camera) return;

      const c = canvasRef.current;
      const r = c?.getBoundingClientRect();
      const width = r?.width || window.innerWidth;
      const height = r?.height || window.innerHeight;
      const narrowNow = width < 768;

      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.fov = narrowNow ? 50 : 45;
      camera.position.z = narrowNow ? 42 : 36;
      camera.updateProjectionMatrix();
    }

    window.addEventListener("resize", onResize);
    onResize();

    function cleanup() {
      const c = canvasRef.current;
      if (c) {
        c.removeEventListener("pointermove", onPointerMove);
        c.removeEventListener("click", onClick);
        c.removeEventListener("wheel", onWheel);
        c.removeEventListener("touchmove", preventTouchScroll);
      }
      window.removeEventListener("resize", onResize);

      loopTimeline?.kill();
      cameraTimeline?.kill();
      geometry.dispose();
      material.dispose();
      renderer.dispose();

      document.body.style.overflow = previousBodyOverflow;
    }

    (async () => {
      try {
        await buildLogoAndTextTargets();
        startMorphLoop();
        animate();
      } catch (error) {
        console.error("Error initializing CheforaParticleHero:", error);
        setVisible(false);
      }
    })();

    return () => {
      cancelAnimationFrame(rafId);
      cleanup();
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      className="chefora-hero-root"
      style={{
        width: "100%",
        height: "100vh",
        position: "fixed",
        top: 0,
        left: 0,
        zIndex: 2500,
        overflow: "hidden",
      }}
    >
      <canvas
        ref={canvasRef}
        className="chefora-hero-canvas"
        style={{ display: "block", width: "100%", height: "100%" }}
      />
    </div>
  );
}
