import * as THREE from "/vendor/three.module.js";
import { groundHeight } from "/src/core/maps.mjs";
import { lanternAppearance, paletteFor } from "./presentation.mjs";
export { THREE };
export const colors = {
  sky: 0x0e1430,
  fog: 0x1b2350,
  grass: 0x2f5d50,
  sand: 0xc9b48a,
  wood: 0x6b4a2f,
  sea: 0x12384a,
  lit: 0xffb347,
  core: 0xffe9b0,
  off: 0x5b5f6e,
  mote: 0xfff6c2,
  glow: 0xffe58a,
  shade: 0x120a1a,
  rim: 0x7a3cff,
  stunned: 0x3a3450,
  shirt: 0xe8e2d0,
  red: 0xc8102e,
  gold: 0xf2c14e,
  drifter: 0x8fa3b8,
};
const material = (color, extra = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness: 0.85, ...extra });
function mesh(geo, mat, parent, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  parent.add(m);
  return m;
}
function dispose(group) {
  group.traverse((o) => {
    o.geometry?.dispose();
    if (o.material) for (const m of [].concat(o.material)) m.dispose();
  });
  group.removeFromParent();
}
export class View {
  constructor(canvas) {
    this.accessiblePalette = false;
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    this.renderer.setSize(innerWidth, innerHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(colors.sky);
    this.scene.fog = new THREE.FogExp2(colors.fog, 0.006);
    this.camera = new THREE.PerspectiveCamera(
      55,
      innerWidth / innerHeight,
      0.1,
      600,
    );
    this.ambient = new THREE.AmbientLight(0xffffff, 0.15);
    this.scene.add(this.ambient);
    const moonlight = new THREE.DirectionalLight(0x9aaad0, 1.1);
    moonlight.position.set(-40, 65, -30);
    this.scene.add(moonlight);
    const sea = mesh(
      new THREE.PlaneGeometry(1600, 1600),
      material(colors.sea),
      this.scene,
      0,
      -5,
      0,
    );
    sea.rotation.x = -Math.PI / 2;
    mesh(
      new THREE.SphereGeometry(5, 20, 12),
      new THREE.MeshBasicMaterial({ color: colors.core }),
      this.scene,
      -90,
      100,
      95,
    );
    const stars = new Float32Array(400 * 3);
    for (let i = 0; i < 400; i++) {
      const a = i * 2.39996,
        b = 0.1 + ((i % 79) / 79) * 1.4;
      stars[i * 3] = Math.cos(a) * Math.cos(b) * 230;
      stars[i * 3 + 1] = Math.sin(b) * 230;
      stars[i * 3 + 2] = Math.sin(a) * Math.cos(b) * 230;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(stars, 3));
    this.scene.add(
      new THREE.Points(
        geo,
        new THREE.PointsMaterial({ color: 0xc8dcff, size: 0.4 }),
      ),
    );
    for (let i = 0; i < 24; i++) {
      const a = i * 2.4,
        r = 55 + (i % 4) * 16;
      const cloud = mesh(
        new THREE.IcosahedronGeometry(4, 1),
        material(0x547884, {
          transparent: true,
          opacity: 0.16,
          depthWrite: false,
        }),
        this.scene,
        Math.cos(a) * r,
        -5 + (i % 3),
        Math.sin(a) * r,
      );
      cloud.scale.set(3, 0.5, 1.4);
    }
    this.player = this.makePlayer();
    this.scene.add(this.player);
    this.pulse = mesh(
      new THREE.RingGeometry(0.95, 1, 64),
      new THREE.MeshBasicMaterial({
        color: colors.core,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      }),
      this.scene,
    );
    this.pulse.rotation.x = -Math.PI / 2;
    this.pulseAge = 10;
    this.entities = new THREE.Group();
    this.terrain = new THREE.Group();
    this.scene.add(this.entities, this.terrain);
    this.lanterns = new Map();
    this.shades = new Map();
    this.drifters = new Map();
    this.charms = new Map();
    this.motes = new THREE.InstancedMesh(
      new THREE.OctahedronGeometry(0.12),
      material(colors.mote, { emissive: colors.glow, emissiveIntensity: 1.3 }),
      2048,
    );
    this.motes.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.motes.frustumCulled = false;
    this.scene.add(this.motes);
    this.dummy = new THREE.Object3D();
    this.leaves = new THREE.Group();
    for (let i = 0; i < 12; i++) {
      const leaf = mesh(
        new THREE.PlaneGeometry(0.25, 0.1),
        new THREE.MeshBasicMaterial({
          color: colors.gold,
          side: THREE.DoubleSide,
        }),
        this.leaves,
      );
      leaf.userData.index = i;
    }
    this.scene.add(this.leaves);
    addEventListener("resize", () => {
      this.camera.aspect = innerWidth / innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(innerWidth, innerHeight);
    });
  }
  makePlayer() {
    const g = new THREE.Group(),
      shirt = material(colors.shirt),
      wood = material(colors.wood),
      red = material(colors.red);
    mesh(new THREE.ConeGeometry(0.4, 0.9, 8), shirt, g, 0, 0.75, 0);
    mesh(
      new THREE.SphereGeometry(0.26, 12, 8),
      material(0xe0b08c),
      g,
      0,
      1.4,
      0,
    );
    mesh(
      new THREE.ConeGeometry(0.85, 0.45, 24),
      material(colors.sand),
      g,
      0,
      1.8,
      0,
    );
    mesh(
      new THREE.TorusGeometry(0.68, 0.035, 4, 24),
      red,
      g,
      0,
      1.6,
      0,
    ).rotation.x = Math.PI / 2;
    mesh(new THREE.BoxGeometry(0.15, 0.45, 0.12), red, g, 0, 0.9, -0.33);
    for (const x of [-0.18, 0.18])
      mesh(new THREE.CylinderGeometry(0.1, 0.09, 0.45, 6), wood, g, x, 0.23, 0);
    mesh(
      new THREE.CylinderGeometry(0.1, 0.1, 0.27, 8),
      material(colors.lit, { emissive: colors.lit, emissiveIntensity: 1.3 }),
      g,
      0.65,
      1.35,
      0,
    );
    mesh(
      new THREE.CylinderGeometry(0.015, 0.015, 0.2, 5),
      wood,
      g,
      0.65,
      1.59,
      0,
    );
    const light = new THREE.PointLight(colors.lit, 10, 9, 2);
    light.position.set(0, 1, 0);
    g.add(light);
    return g;
  }
  load(game) {
    dispose(this.terrain);
    dispose(this.entities);
    this.terrain = new THREE.Group();
    this.entities = new THREE.Group();
    this.scene.add(this.terrain, this.entities);
    for (const m of [this.lanterns, this.shades, this.drifters, this.charms])
      m.clear();
    this.pulseAge = 10;
    for (const island of game.map.islands) {
      mesh(
        new THREE.CylinderGeometry(island.r, island.r - 5, 7, 72),
        material(colors.sand),
        this.terrain,
        island.x,
        -3.6,
        island.z,
      );
      mesh(
        new THREE.CylinderGeometry(island.r, island.r, 0.2, 72),
        material(colors.grass),
        this.terrain,
        island.x,
        -0.1,
        island.z,
      );
      for (let i = 0; i < 18; i++) {
        const a = i * 2.39996,
          r = island.r - 4 - (i % 3) * 2,
          x = island.x + Math.cos(a) * r,
          z = island.z + Math.sin(a) * r,
          y = groundHeight(game.map, x, z) ?? 0;
        if (i % 3 === 0) {
          const rock = mesh(
            new THREE.DodecahedronGeometry(0.8),
            material(0x364354),
            this.terrain,
            x,
            y + 0.5,
            z,
          );
          rock.scale.set(1.3, 0.8, 1);
        } else {
          mesh(
            new THREE.CylinderGeometry(0.17, 0.3, 2.8, 6),
            material(colors.wood),
            this.terrain,
            x,
            y + 1.4,
            z,
          );
          for (let h = 0; h < 3; h++)
            mesh(
              new THREE.ConeGeometry(1.5 - h * 0.25, 2.1, 7),
              material(h % 2 ? 0x284e49 : 0x376758),
              this.terrain,
              x,
              y + 3 + h * 0.7,
              z,
            );
        }
      }
    }
    if (game.map.bridge) {
      mesh(
        new THREE.BoxGeometry(18, 0.25, 4),
        material(colors.wood),
        this.terrain,
        35,
        -0.125,
        0,
      );
      for (let x = 26; x < 44; x += 0.7)
        mesh(
          new THREE.BoxGeometry(0.06, 0.04, 4),
          material(colors.sand),
          this.terrain,
          x,
          0.02,
          0,
        );
    }
    if (game.night === 3) {
      const points = [];
      for (let i = 0; i < 48; i++) {
        const a = (i * Math.PI) / 48,
          b = ((i + 1) * Math.PI) / 48;
        const A = [12 * Math.cos(a), 3, 12 * Math.sin(a)],
          B = [24 * Math.cos(a), 3, 24 * Math.sin(a)],
          C = [12 * Math.cos(b), 3, 12 * Math.sin(b)],
          D = [24 * Math.cos(b), 3, 24 * Math.sin(b)];
        points.push(...A, ...C, ...B, ...B, ...C, ...D);
        for (const [u, v] of [
          [A, C],
          [B, D],
        ])
          points.push(
            ...u,
            ...v,
            u[0],
            0,
            u[2],
            ...v,
            v[0],
            0,
            v[2],
            u[0],
            0,
            u[2],
          );
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.Float32BufferAttribute(points, 3));
      geo.computeVertexNormals();
      mesh(
        geo,
        material(colors.grass, { side: THREE.DoubleSide }),
        this.terrain,
      );
      mesh(
        new THREE.CylinderGeometry(8, 8, 6, 48),
        material(colors.grass),
        this.terrain,
        0,
        3,
        0,
      );
      mesh(
        new THREE.CylinderGeometry(2, 2, 8, 24),
        material(colors.wood),
        this.terrain,
        0,
        10,
        0,
      );
      mesh(
        new THREE.ConeGeometry(3, 1.5, 16),
        material(colors.sand),
        this.terrain,
        0,
        14.75,
        0,
      );
      mesh(
        new THREE.SphereGeometry(0.8, 12, 8),
        material(colors.gold),
        this.terrain,
        0,
        13,
        0,
      );
      for (const deg of [30, 150]) {
        const a = (deg * Math.PI) / 180,
          dx = Math.cos(a),
          dz = Math.sin(a),
          px = -dz * 1.5,
          pz = dx * 1.5;
        const A = [30 * dx + px, 0, 30 * dz + pz],
          B = [30 * dx - px, 0, 30 * dz - pz],
          C = [24 * dx + px, 3, 24 * dz + pz],
          D = [24 * dx - px, 3, 24 * dz - pz];
        const g = new THREE.BufferGeometry();
        g.setAttribute(
          "position",
          new THREE.Float32BufferAttribute(
            [...A, ...B, ...C, ...B, ...D, ...C],
            3,
          ),
        );
        g.computeVertexNormals();
        mesh(
          g,
          material(colors.sand, { side: THREE.DoubleSide }),
          this.terrain,
        );
      }
    }
    for (const pad of game.map.pads) {
      mesh(
        new THREE.CylinderGeometry(1, 1, 0.08, 24),
        material(colors.red),
        this.terrain,
        pad.pos[0],
        pad.pos[1] + 0.04,
        pad.pos[2],
      );
      const ring = mesh(
        new THREE.TorusGeometry(0.8, 0.06, 6, 24),
        material(colors.gold, {
          emissive: colors.gold,
          emissiveIntensity: 0.4,
        }),
        this.terrain,
        pad.pos[0],
        pad.pos[1] + 0.1,
        pad.pos[2],
      );
      ring.rotation.x = Math.PI / 2;
    }
  }
  setAccessibility(enabled) {
    this.accessiblePalette = Boolean(enabled);
  }
  sync(game, time) {
    const theme = paletteFor(this.accessiblePalette);
    for (const l of game.lanterns) {
      let item = this.lanterns.get(l.id);
      if (!item) {
        const group = new THREE.Group();
        this.entities.add(group);
        mesh(
          new THREE.CylinderGeometry(0.12, 0.18, 3.5, 8),
          material(colors.wood),
          group,
          0,
          1.75,
          0,
        );
        const core = mesh(
          new THREE.CylinderGeometry(0.5, 0.42, 0.9, 8),
          material(colors.off),
          group,
          0,
          3.2,
          0,
        );
        const roof = mesh(
          new THREE.ConeGeometry(0.72, 0.35, 8),
          material(colors.wood),
          group,
          0,
          3.85,
          0,
        );
        const light = new THREE.PointLight(colors.lit, 0, 17, 2);
        light.position.y = 3.1;
        group.add(light);
        const base = mesh(
          new THREE.TorusGeometry(1.1, 0.045, 6, 32),
          material(colors.off),
          group,
          0,
          0.03,
          0,
        );
        base.rotation.x = Math.PI / 2;
        const tears = new THREE.Group();
        core.add(tears);
        const tearGeometry = new THREE.BufferGeometry();
        tearGeometry.setAttribute(
          "position",
          new THREE.Float32BufferAttribute(
            [
              -0.05, 0.38, 0.501, 0.07, 0.15, 0.501, -0.03, -0.02, 0.501, -0.03,
              -0.02, 0.501, 0.07, 0.15, 0.501, 0.06, -0.15, 0.501, -0.03, -0.02,
              0.501, 0.06, -0.15, 0.501, -0.08, -0.38, 0.501,
            ],
            3,
          ),
        );
        tearGeometry.computeVertexNormals();
        for (let i = 0; i < 3; i++) {
          const tear = mesh(
            tearGeometry.clone(),
            material(colors.shade, { side: THREE.DoubleSide }),
            tears,
          );
          tear.rotation.y = (i * Math.PI * 2) / 3;
        }
        tearGeometry.dispose();
        const fuelBar = new THREE.Group();
        fuelBar.position.y = 4.4;
        group.add(fuelBar);
        mesh(
          new THREE.PlaneGeometry(1.7, 0.2),
          new THREE.MeshBasicMaterial({ color: colors.shade }),
          fuelBar,
        );
        const fuelFill = mesh(
          new THREE.PlaneGeometry(1.5, 0.12),
          new THREE.MeshBasicMaterial({ color: colors.gold }),
          fuelBar,
          0,
          0,
          0.01,
        );
        item = { group, core, roof, tears, light, base, fuelBar, fuelFill };
        this.lanterns.set(l.id, item);
      }
      item.group.position.fromArray(l.pos);
      const look = lanternAppearance(l.lit, game.fuel(l), time);
      item.core.scale.y = look.scaleY;
      item.roof.position.y = l.lit ? 3.85 : 3.76;
      item.tears.visible = look.torn;
      item.fuelBar.visible = look.showFuel;
      item.fuelBar.quaternion.copy(this.camera.quaternion);
      item.fuelFill.scale.x = Math.max(0.001, look.fuelFraction);
      item.fuelFill.position.x = -(1 - look.fuelFraction) * 0.75;
      item.fuelFill.material.color.set(look.low ? theme.warning : colors.gold);
      item.fuelFill.visible = look.blinkOn;
      item.core.material.color.set(l.lit ? colors.lit : colors.off);
      item.core.material.emissive.set(l.lit ? colors.lit : 0);
      item.core.material.emissiveIntensity = l.lit
        ? look.blinkOn
          ? 1
          : 0.15
        : 0;
      item.light.intensity = l.lit ? (look.blinkOn ? 22 : 3.3) : 0;
      item.base.material.color.set(l.lit ? colors.core : colors.off);
    }
    this.motes.count = Math.min(2048, game.motes.length);
    game.motes.slice(0, 2048).forEach((m, i) => {
      this.dummy.position.set(
        m.pos[0] + Math.sin(time * 1.2 + i) * 0.1,
        m.pos[1] + 0.6 + Math.sin(time * 2 + i) * 0.15,
        m.pos[2],
      );
      this.dummy.rotation.y = time + i;
      this.dummy.updateMatrix();
      this.motes.setMatrixAt(i, this.dummy.matrix);
    });
    this.motes.instanceMatrix.needsUpdate = true;
    for (const s of game.shades) {
      let model = this.shades.get(s.id);
      if (!model) {
        model = new THREE.Group();
        this.entities.add(model);
        const body = mesh(
          new THREE.IcosahedronGeometry(0.65, 1),
          material(colors.shade, {
            emissive: colors.rim,
            emissiveIntensity: 0.25,
          }),
          model,
        );
        model.userData.body = body;
        const outline = new THREE.LineSegments(
          new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(0.67, 1)),
          new THREE.LineBasicMaterial({ color: theme.shadeRim }),
        );
        model.add(outline);
        model.userData.outline = outline;
        model.userData.eyes = [];
        for (const x of [-0.2, 0.2]) {
          const eye = mesh(
            new THREE.SphereGeometry(0.07, 6, 4),
            new THREE.MeshBasicMaterial({ color: theme.shadeRim }),
            model,
            x,
            0.12,
            0.55,
          );
          model.userData.eyes.push(eye);
        }
        for (let i = 0; i < 4; i++)
          mesh(
            new THREE.ConeGeometry(0.15, 0.8, 5),
            material(colors.shade),
            model,
            Math.cos((i * Math.PI) / 2) * 0.4,
            -0.4,
            Math.sin((i * Math.PI) / 2) * 0.4,
          ).rotation.z = Math.PI;
        this.shades.set(s.id, model);
      }
      model.position.set(
        s.pos[0],
        s.pos[1] + Math.sin(time * 3) * 0.1,
        s.pos[2],
      );
      model.rotation.y = Math.atan2(
        game.player.pos[0] - s.pos[0],
        game.player.pos[2] - s.pos[2],
      );
      model.userData.body.material.color.set(
        s.state === "stunned" ? colors.stunned : colors.shade,
      );
      model.userData.body.material.emissive.set(theme.shadeRim);
      model.userData.outline.material.color.set(theme.shadeRim);
      for (const eye of model.userData.eyes)
        eye.material.color.set(theme.shadeRim);
      model.scale.setScalar(
        s.state === "spawning" ? 0.4 + Math.sin(time * 12) * 0.15 : 1,
      );
    }
    const live = new Set(game.drifters.map((d) => d.id));
    for (const [id, m] of this.drifters)
      if (!live.has(id)) {
        dispose(m);
        this.drifters.delete(id);
      }
    for (const d of game.drifters) {
      let m = this.drifters.get(d.id);
      if (!m) {
        m = new THREE.Group();
        this.entities.add(m);
        for (let i = 0; i < 7; i++) {
          const piece = mesh(
            new THREE.SphereGeometry(0.35, 6, 4),
            material(colors.drifter, {
              emissive: colors.drifter,
              emissiveIntensity: 0.15,
            }),
            m,
            0,
            0,
            -i * 0.3,
          );
          piece.scale.set(1 - i * 0.1, 0.2, 1);
        }
        this.drifters.set(d.id, m);
      }
      m.position.set(d.pos[0], d.pos[1] + Math.sin(time * 4) * 0.2, d.pos[2]);
      m.rotation.y = Math.atan2(d.dir[0], d.dir[1]);
    }
    for (const c of game.charms) {
      let m = this.charms.get(c.id);
      if (!m) {
        m = new THREE.Group();
        this.entities.add(m);
        mesh(new THREE.BoxGeometry(0.55, 0.8, 0.07), material(colors.gold), m);
        mesh(new THREE.BoxGeometry(0.44, 0.67, 0.09), material(colors.red), m);
        this.charms.set(c.id, m);
      }
      m.position.set(
        c.pos[0],
        c.pos[1] + 0.7 + Math.sin(time * 2) * 0.12,
        c.pos[2],
      );
      m.rotation.y = time * 0.7;
      m.visible = c.available;
    }
    this.ambient.intensity =
      0.15 +
      (0.55 * game.lanterns.filter((l) => l.lit).length) / game.lanterns.length;
    this.leaves.visible = game.wind.warning || game.wind.active;
    this.leaves.position.fromArray(game.player.pos);
    for (const m of this.leaves.children) {
      const i = m.userData.index;
      m.position.set(
        Math.sin(time + i) * 6,
        1 + (i % 4),
        Math.cos(time * 2 + i) * 6,
      );
      m.rotation.set(time, time + i, time);
    }
  }
  pulseAt(pos) {
    this.pulseAge = 0;
    this.pulse.position.set(pos[0], pos[1] + 0.1, pos[2]);
  }
  render(game, { time, dt, yaw, menu = false }) {
    this.sync(game, time);
    this.player.position.fromArray(game.player.pos);
    this.player.rotation.y = Math.atan2(...game.player.facing);
    this.player.visible =
      game.player.respawnLeft === 0 &&
      !(game.player.invuln > 0 && Math.floor(time * 12) % 2);
    if (menu) {
      const a = time * 0.025;
      this.camera.position.set(Math.sin(a) * 36, 24, -Math.cos(a) * 36);
      this.camera.lookAt(0, 1, 10);
    } else {
      const p = game.player.pos,
        target = new THREE.Vector3(
          p[0] - Math.sin(yaw) * 11,
          p[1] + 7,
          p[2] - Math.cos(yaw) * 11,
        );
      this.camera.position.lerp(target, 1 - Math.exp(-8 * dt));
      this.camera.lookAt(p[0], p[1] + 1, p[2]);
    }
    this.pulseAge += dt;
    this.pulse.scale.setScalar(
      Math.min(1, this.pulseAge / 0.5) * game.t.pulse_radius,
    );
    this.pulse.material.opacity = Math.max(0, 1 - this.pulseAge / 0.7) * 0.7;
    this.renderer.render(this.scene, this.camera);
  }
  project(pos) {
    return new THREE.Vector3(pos[0], pos[1] + 2, pos[2]).project(this.camera);
  }
}
