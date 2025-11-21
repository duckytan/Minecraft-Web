/**
 * 经典 Perlin 噪声实现
 * 基于 Ken Perlin 的原始算法（1985）
 * 支持 2D 和 3D 噪声生成
 */

/**
 * 置换表（Permutation table）
 * 256 个随机值的排列，用于生成伪随机梯度
 */
const PERMUTATION = [
  151, 160, 137, 91, 90, 15, 131, 13, 201, 95, 96, 53, 194, 233, 7, 225, 140, 36, 103, 30, 69, 142,
  8, 99, 37, 240, 21, 10, 23, 190, 6, 148, 247, 120, 234, 75, 0, 26, 197, 62, 94, 252, 219, 203,
  117, 35, 11, 32, 57, 177, 33, 88, 237, 149, 56, 87, 174, 20, 125, 136, 171, 168, 68, 175, 74,
  165, 71, 134, 139, 48, 27, 166, 77, 146, 158, 231, 83, 111, 229, 122, 60, 211, 133, 230, 220,
  105, 92, 41, 55, 46, 245, 40, 244, 102, 143, 54, 65, 25, 63, 161, 1, 216, 80, 73, 209, 76, 132,
  187, 208, 89, 18, 169, 200, 196, 135, 130, 116, 188, 159, 86, 164, 100, 109, 198, 173, 186, 3,
  64, 52, 217, 226, 250, 124, 123, 5, 202, 38, 147, 118, 126, 255, 82, 85, 212, 207, 206, 59, 227,
  47, 16, 58, 17, 182, 189, 28, 42, 223, 183, 170, 213, 119, 248, 152, 2, 44, 154, 163, 70, 221,
  153, 101, 155, 167, 43, 172, 9, 129, 22, 39, 253, 19, 98, 108, 110, 79, 113, 224, 232, 178, 185,
  112, 104, 218, 246, 97, 228, 251, 34, 242, 193, 238, 210, 144, 12, 191, 179, 162, 241, 81, 51,
  145, 235, 249, 14, 239, 107, 49, 192, 214, 31, 181, 199, 106, 157, 184, 84, 204, 176, 115, 121,
  50, 45, 127, 4, 150, 254, 138, 236, 205, 93, 222, 114, 67, 29, 24, 72, 243, 141, 128, 195, 78,
  66, 215, 61, 156, 180
];

/**
 * 扩展置换表（512 个元素，避免索引溢出）
 */
const P = new Array(512);
for (let i = 0; i < 512; i++) {
  P[i] = PERMUTATION[i % 256];
}

/**
 * 淡入函数（Fade function）
 * 使用 6t^5 - 15t^4 + 10t^3 平滑插值
 */
function fade(t: number): number {
  return t * t * t * (t * (t * 6 - 15) + 10);
}

/**
 * 线性插值
 */
function lerp(t: number, a: number, b: number): number {
  return a + t * (b - a);
}

/**
 * 梯度函数（Gradient function）
 * 计算梯度向量与距离向量的点积
 */
function grad2D(hash: number, x: number, y: number): number {
  const h = hash & 3;
  const u = h < 2 ? x : y;
  const v = h < 2 ? y : x;
  return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
}

function grad3D(hash: number, x: number, y: number, z: number): number {
  const h = hash & 15;
  const u = h < 8 ? x : y;
  const v = h < 4 ? y : h === 12 || h === 14 ? x : z;
  return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
}

/**
 * 2D Perlin 噪声
 * @param x X 坐标
 * @param y Y 坐标
 * @returns 噪声值，范围 [-1, 1]
 */
export function perlin2D(x: number, y: number): number {
  // 找到单位网格的左上角
  const X = Math.floor(x) & 255;
  const Y = Math.floor(y) & 255;

  // 计算网格内的相对坐标
  x -= Math.floor(x);
  y -= Math.floor(y);

  // 计算淡入曲线
  const u = fade(x);
  const v = fade(y);

  // 计算哈希坐标
  const a = P[X] + Y;
  const aa = P[a];
  const ab = P[a + 1];
  const b = P[X + 1] + Y;
  const ba = P[b];
  const bb = P[b + 1];

  // 混合结果
  return lerp(
    v,
    lerp(u, grad2D(P[aa], x, y), grad2D(P[ba], x - 1, y)),
    lerp(u, grad2D(P[ab], x, y - 1), grad2D(P[bb], x - 1, y - 1))
  );
}

/**
 * 3D Perlin 噪声
 * @param x X 坐标
 * @param y Y 坐标
 * @param z Z 坐标
 * @returns 噪声值，范围 [-1, 1]
 */
export function perlin3D(x: number, y: number, z: number): number {
  // 找到单位立方体的左下角
  const X = Math.floor(x) & 255;
  const Y = Math.floor(y) & 255;
  const Z = Math.floor(z) & 255;

  // 计算立方体内的相对坐标
  x -= Math.floor(x);
  y -= Math.floor(y);
  z -= Math.floor(z);

  // 计算淡入曲线
  const u = fade(x);
  const v = fade(y);
  const w = fade(z);

  // 计算哈希坐标
  const a = P[X] + Y;
  const aa = P[a] + Z;
  const ab = P[a + 1] + Z;
  const b = P[X + 1] + Y;
  const ba = P[b] + Z;
  const bb = P[b + 1] + Z;

  // 混合结果
  return lerp(
    w,
    lerp(
      v,
      lerp(u, grad3D(P[aa], x, y, z), grad3D(P[ba], x - 1, y, z)),
      lerp(u, grad3D(P[ab], x, y - 1, z), grad3D(P[bb], x - 1, y - 1, z))
    ),
    lerp(
      v,
      lerp(u, grad3D(P[aa + 1], x, y, z - 1), grad3D(P[ba + 1], x - 1, y, z - 1)),
      lerp(u, grad3D(P[ab + 1], x, y - 1, z - 1), grad3D(P[bb + 1], x - 1, y - 1, z - 1))
    )
  );
}

/**
 * 多倍频 Perlin 噪声（Octave Perlin Noise）
 * 叠加多个不同频率和振幅的噪声，生成更自然的地形
 * @param x X 坐标
 * @param y Y 坐标
 * @param octaves 倍频数量（层数）
 * @param persistence 持续度（每层振幅衰减系数，推荐 0.5）
 * @param lacunarity 间隙度（每层频率增长系数，推荐 2.0）
 * @returns 噪声值，范围近似 [-1, 1]
 */
export function octavePerlin2D(
  x: number,
  y: number,
  octaves: number = 4,
  persistence: number = 0.5,
  lacunarity: number = 2.0
): number {
  let total = 0;
  let frequency = 1;
  let amplitude = 1;
  let maxValue = 0;

  for (let i = 0; i < octaves; i++) {
    total += perlin2D(x * frequency, y * frequency) * amplitude;
    maxValue += amplitude;
    amplitude *= persistence;
    frequency *= lacunarity;
  }

  return total / maxValue;
}

/**
 * 多倍频 3D Perlin 噪声
 * @param x X 坐标
 * @param y Y 坐标
 * @param z Z 坐标
 * @param octaves 倍频数量（层数）
 * @param persistence 持续度（每层振幅衰减系数，推荐 0.5）
 * @param lacunarity 间隙度（每层频率增长系数，推荐 2.0）
 * @returns 噪声值，范围近似 [-1, 1]
 */
export function octavePerlin3D(
  x: number,
  y: number,
  z: number,
  octaves: number = 4,
  persistence: number = 0.5,
  lacunarity: number = 2.0
): number {
  let total = 0;
  let frequency = 1;
  let amplitude = 1;
  let maxValue = 0;

  for (let i = 0; i < octaves; i++) {
    total += perlin3D(x * frequency, y * frequency, z * frequency) * amplitude;
    maxValue += amplitude;
    amplitude *= persistence;
    frequency *= lacunarity;
  }

  return total / maxValue;
}
