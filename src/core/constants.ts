/**
 * 性能优化常量配置
 */

// Chunk 更新间隔
export const CHUNK_UPDATE_INTERVAL = 0.5; // 秒

// 视锥剔除更新间隔
export const FRUSTUM_CULLING_INTERVAL = 0.2; // 秒

// 性能监视器更新间隔（帧数）
export const PERFORMANCE_MONITOR_UPDATE_FRAMES = 10;

// Chunk 加载队列配置
export const MAX_CHUNKS_LOAD_PER_FRAME = 2;

// 方块物理系统更新间隔
export const BLOCK_PHYSICS_UPDATE_INTERVAL = 1.0; // 秒

// 水流、沙掉落等物理效果的采样率
export const WATER_CHUNK_SAMPLE_COUNT = 3;
export const SAND_CHUNK_SAMPLE_COUNT = 3;
export const SOIL_CHUNK_SAMPLE_COUNT = 2;
export const SNOW_CHUNK_SAMPLE_COUNT = 2;

// 物理效果的最大更新数量（每步）
export const MAX_WATER_UPDATES_PER_STEP = 25;
export const MAX_SAND_UPDATES_PER_STEP = 25;
export const MAX_NEW_TIMERS_PER_STEP = 30;

// 天空系统配置
export const SKY_CLOUD_COUNT = 6;
export const SKY_CLOUD_SPEED = 0.3;

// 默认渲染距离（根据设备性能调整）
export const DEFAULT_RENDER_DISTANCE_PC = 3;
export const DEFAULT_RENDER_DISTANCE_MOBILE = 2;
