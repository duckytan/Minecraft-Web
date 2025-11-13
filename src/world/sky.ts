import * as THREE from 'three';

export interface SkySystemConfig {
  enableSun?: boolean;
  enableClouds?: boolean;
  cloudCount?: number;
  cloudSpeed?: number;
}

export class SkySystem {
  private scene: THREE.Scene;
  private sun: THREE.Mesh | null = null;
  private clouds: THREE.Mesh[] = [];
  private cloudSpeed: number;
  private sunLight: THREE.DirectionalLight | null = null;

  constructor(scene: THREE.Scene, config: SkySystemConfig = {}) {
    this.scene = scene;
    this.cloudSpeed = config.cloudSpeed || 0.5;

    this.initSkybox();

    if (config.enableSun !== false) {
      this.createSun();
    }

    if (config.enableClouds !== false) {
      this.createClouds(config.cloudCount || 15);
    }
  }

  private initSkybox(): void {
    const skyColor = new THREE.Color(0x87ceeb);
    const horizonColor = new THREE.Color(0xb0d4f1);
    
    const vertexShader = `
      varying vec3 vWorldPosition;
      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;

    const fragmentShader = `
      uniform vec3 topColor;
      uniform vec3 bottomColor;
      uniform float offset;
      uniform float exponent;
      varying vec3 vWorldPosition;
      
      void main() {
        float h = normalize(vWorldPosition + offset).y;
        gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
      }
    `;

    const uniforms = {
      topColor: { value: skyColor },
      bottomColor: { value: horizonColor },
      offset: { value: 33.0 },
      exponent: { value: 0.6 }
    };

    const skyGeo = new THREE.SphereGeometry(1000, 32, 15);
    const skyMat = new THREE.ShaderMaterial({
      uniforms,
      vertexShader,
      fragmentShader,
      side: THREE.BackSide
    });

    const sky = new THREE.Mesh(skyGeo, skyMat);
    sky.name = 'Sky';
    this.scene.add(sky);
  }

  private createSun(): void {
    const sunGeometry = new THREE.SphereGeometry(40, 32, 32);
    const sunMaterial = new THREE.MeshBasicMaterial({
      color: 0xffff00,
      emissive: 0xffff00,
      emissiveIntensity: 1
    });

    this.sun = new THREE.Mesh(sunGeometry, sunMaterial);
    this.sun.position.set(300, 400, -200);
    this.sun.name = 'Sun';
    this.scene.add(this.sun);

    this.sunLight = new THREE.DirectionalLight(0xffffff, 0.3);
    this.sunLight.position.copy(this.sun.position);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.camera.left = -100;
    this.sunLight.shadow.camera.right = 100;
    this.sunLight.shadow.camera.top = 100;
    this.sunLight.shadow.camera.bottom = -100;
    this.scene.add(this.sunLight);
  }

  private createClouds(count: number): void {
    const cloudMaterial = new THREE.MeshLambertMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.7
    });

    for (let i = 0; i < count; i++) {
      const cloudGroup = new THREE.Group();

      const puffCount = Math.floor(Math.random() * 3) + 3;
      for (let j = 0; j < puffCount; j++) {
        const puffSize = Math.random() * 15 + 10;
        const puffGeometry = new THREE.SphereGeometry(puffSize, 8, 8);
        const puff = new THREE.Mesh(puffGeometry, cloudMaterial);
        
        puff.position.set(
          (Math.random() - 0.5) * 40,
          (Math.random() - 0.5) * 10,
          (Math.random() - 0.5) * 20
        );
        
        puff.scale.set(
          1 + Math.random() * 0.5,
          0.6 + Math.random() * 0.3,
          1 + Math.random() * 0.5
        );

        cloudGroup.add(puff);
      }

      cloudGroup.position.set(
        (Math.random() - 0.5) * 800,
        150 + Math.random() * 100,
        (Math.random() - 0.5) * 800
      );

      cloudGroup.userData = {
        speedX: (Math.random() - 0.5) * this.cloudSpeed,
        speedZ: (Math.random() - 0.5) * this.cloudSpeed,
        initialX: cloudGroup.position.x,
        initialZ: cloudGroup.position.z
      };

      this.clouds.push(cloudGroup);
      this.scene.add(cloudGroup);
    }
  }

  update(deltaTime: number): void {
    if (this.sun) {
      const time = Date.now() * 0.0001;
      this.sun.position.y = 400 + Math.sin(time) * 50;
      
      if (this.sunLight) {
        this.sunLight.position.copy(this.sun.position);
      }
    }

    this.clouds.forEach((cloud) => {
      const userData = cloud.userData;
      cloud.position.x += userData.speedX * deltaTime;
      cloud.position.z += userData.speedZ * deltaTime;

      if (Math.abs(cloud.position.x - userData.initialX) > 400) {
        cloud.position.x = userData.initialX;
      }
      if (Math.abs(cloud.position.z - userData.initialZ) > 400) {
        cloud.position.z = userData.initialZ;
      }
    });
  }

  dispose(): void {
    if (this.sun) {
      this.scene.remove(this.sun);
      this.sun.geometry.dispose();
      (this.sun.material as THREE.Material).dispose();
    }

    if (this.sunLight) {
      this.scene.remove(this.sunLight);
    }

    this.clouds.forEach((cloud) => {
      this.scene.remove(cloud);
      cloud.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach((mat) => mat.dispose());
          } else {
            child.material.dispose();
          }
        }
      });
    });

    this.clouds = [];
  }
}
