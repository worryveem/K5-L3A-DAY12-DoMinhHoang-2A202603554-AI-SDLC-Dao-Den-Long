const radians = (d) => (d * Math.PI) / 180;
const ring = (cx, cz, r, count, start = 0, y = 0) =>
  Array.from({ length: count }, (_, i) => [
    cx + r * Math.cos(radians(start + (i * 360) / count)),
    y,
    cz + r * Math.sin(radians(start + (i * 360) / count)),
  ]);
export function makeMap(night) {
  if (night === 1)
    return {
      name: "Đảo Bến",
      duration: 300,
      maxShades: 6,
      spawnInterval: 480,
      islands: [{ x: 0, z: 0, r: 40 }],
      lanterns: [
        [0, 0, 25],
        [23.8, 0, 7.7],
        [14.7, 0, -20.2],
        [-14.7, 0, -20.2],
        [-23.8, 0, 7.7],
      ],
      motePoints: [...ring(0, 0, 12, 8), ...ring(0, 0, 33, 16)],
      mistPoints: ring(0, 0, 37, 12, 15, 1),
      charms: [],
      pads: [],
    };
  if (night === 2)
    return {
      name: "Đảo Cau",
      duration: 330,
      maxShades: 8,
      spawnInterval: 420,
      islands: [
        { x: 0, z: 0, r: 28 },
        { x: 70, z: 0, r: 28 },
      ],
      bridge: { minX: 26, maxX: 44, minZ: -2, maxZ: 2 },
      lanterns: [
        [0, 0, 20],
        [17, 0, -10],
        [-17, 0, -10],
        [70, 0, 20],
        [87, 0, -10],
        [53, 0, -10],
      ],
      motePoints: [0, 70].flatMap((x) => [
        ...ring(x, 0, 10, 4),
        ...ring(x, 0, 22, 8),
      ]),
      mistPoints: [0, 70].flatMap((x) => ring(x, 0, 26, 8, 22.5, 1)),
      charms: [[35, 0, 0]],
      pads: [
        { pos: [20, 0, 18], vy: 14, speed: 24, target: [70, 0, 0] },
        { pos: [50, 0, -18], vy: 14, speed: 24, target: [0, 0, 0] },
      ],
    };
  return {
    name: "Đảo Chuông",
    duration: 360,
    maxShades: 10,
    spawnInterval: 360,
    islands: [{ x: 0, z: 0, r: 45 }],
    lanterns: [
      [0, 6, 6],
      [18, 3, 10],
      [-18, 3, 10],
      [35, 0, -10],
      [-35, 0, -10],
      [20, 0, -35],
      [-20, 0, -35],
    ],
    motePoints: [
      ...ring(0, 0, 34, 18),
      ...Array.from({ length: 8 }, (_, i) => [
        18 * Math.cos(radians(20 + i * 20)),
        3,
        18 * Math.sin(radians(20 + i * 20)),
      ]),
      ...ring(0, 0, 5, 4, 45, 6),
    ],
    mistPoints: ring(0, 0, 43, 16, 0, 1),
    charms: [
      [30, 0, 25],
      [-30, 0, 25],
    ],
    pads: [{ pos: [0, 3, 13], vy: 12, speed: 8, target: [0, 3, -100] }],
  };
}
export function groundHeight(map, x, z) {
  if (
    !map.islands.some((c) => Math.hypot(x - c.x, z - c.z) <= c.r + 1e-9) &&
    !(map.bridge && x >= 26 && x <= 44 && z >= -2 && z <= 2)
  )
    return null;
  if (map.name !== "Đảo Chuông") return 0;
  const r = Math.hypot(x, z);
  if (r <= 8) return 6;
  if (z > 0 && r >= 12 && r <= 24) return 3;
  for (const deg of [30, 150]) {
    const a = radians(deg),
      along = x * Math.cos(a) + z * Math.sin(a),
      across = -x * Math.sin(a) + z * Math.cos(a);
    if (along >= 24 && along <= 30 && Math.abs(across) <= 1.5)
      return (30 - along) / 2;
  }
  return 0;
}
export function isTower(map, x, z) {
  return map.name === "Đảo Chuông" && Math.hypot(x, z) < 2;
}
