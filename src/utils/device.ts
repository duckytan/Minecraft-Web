/**
 * 设备检测工具
 */

const MOBILE_UA_PATTERNS: RegExp[] = [
  /Android/i,
  /webOS/i,
  /iPhone/i,
  /iPad/i,
  /iPod/i,
  /BlackBerry/i,
  /Windows Phone/i,
  /Opera Mini/i,
  /IEMobile/i
];

function getNavigator(): Navigator | undefined {
  return typeof navigator !== 'undefined' ? navigator : undefined;
}

function getWindow(): Window | undefined {
  return typeof window !== 'undefined' ? window : undefined;
}

function getUserAgent(): string {
  const nav = getNavigator();
  const win = getWindow() as typeof window & { opera?: string } | undefined;

  if (!nav && !win) {
    return '';
  }

  const userAgent = nav?.userAgent ?? '';
  const vendor = nav?.vendor ?? '';
  const opera = win?.opera ?? '';

  return `${userAgent} ${vendor} ${opera}`.trim();
}

function hasTouchSupport(nav: Navigator | undefined, win: Window | undefined): boolean {
  if (!win && !nav) {
    return false;
  }

  const ontouch = !!win && 'ontouchstart' in win;
  const maxTouchPoints = nav?.maxTouchPoints ?? 0;
  const msMaxTouchPoints = (nav as any)?.msMaxTouchPoints ?? 0;

  return ontouch || maxTouchPoints > 0 || msMaxTouchPoints > 0;
}

function hasCoarsePointer(win: Window | undefined): boolean {
  if (!win || typeof win.matchMedia !== 'function') {
    return false;
  }

  return win.matchMedia('(pointer: coarse)').matches;
}

/**
 * 检测当前设备是否为移动设备（手机或平板）
 * 使用多种方法综合判断以提高准确性
 */
export function isMobileDevice(): boolean {
  const win = getWindow();
  const nav = getNavigator();

  const userAgent = getUserAgent();
  const isMobileUA = MOBILE_UA_PATTERNS.some((pattern) => pattern.test(userAgent));

  const touchSupport = hasTouchSupport(nav, win);
  const coarsePointer = hasCoarsePointer(win);
  const screenWidth = win?.innerWidth ?? Number.MAX_SAFE_INTEGER;
  const isSmallScreen = screenWidth <= 768;

  if (isMobileUA) {
    return true;
  }

  return (touchSupport || coarsePointer) && isSmallScreen;
}

/**
 * 检测是否为平板设备
 */
export function isTablet(): boolean {
  const win = getWindow();
  const nav = getNavigator();

  if (!win || !nav) {
    return false;
  }

  const userAgent = getUserAgent();

  // iPad 检测
  if (/iPad/i.test(userAgent)) {
    return true;
  }

  // iPadOS 13+ 伪装成 Mac，需要特殊检测
  const isMacLike = /Macintosh/i.test(userAgent) && (nav.maxTouchPoints ?? 0) > 1;
  if (isMacLike) {
    return true;
  }

  // Android 平板（屏幕较大的触摸设备）
  const isAndroid = /Android/i.test(userAgent);
  const screenWidth = win.innerWidth;
  const isLargeScreen = screenWidth > 768 && screenWidth < 1024;
  const hasTouch = hasTouchSupport(nav, win);

  return isAndroid && isLargeScreen && hasTouch;
}

/**
 * 检测是否为手机（不包括平板）
 */
export function isPhone(): boolean {
  return isMobileDevice() && !isTablet();
}

/**
 * 获取设备类型
 */
export enum DeviceType {
  DESKTOP = 'desktop',
  TABLET = 'tablet',
  PHONE = 'phone'
}

export function getDeviceType(): DeviceType {
  if (isPhone()) {
    return DeviceType.PHONE;
  }
  if (isTablet()) {
    return DeviceType.TABLET;
  }
  return DeviceType.DESKTOP;
}
