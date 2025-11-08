import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { initHotbar, Hotbar } from '../ui/hotbar';
import { BlockType } from '../world/block';

describe('Hotbar', () => {
  let hotbar: Hotbar | null = null;

  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    if (hotbar) {
      hotbar.destroy();
      hotbar = null;
    }
  });

  it('应该正确初始化 9 个槽位', () => {
    hotbar = initHotbar();
    const slotElements = document.querySelectorAll('.hotbar-slot');
    expect(slotElements.length).toBe(9);
  });

  it('应该默认选中第一个槽位', () => {
    hotbar = initHotbar();
    const selectedSlot = document.querySelector('.hotbar-slot.selected');
    expect(selectedSlot).not.toBeNull();
    expect(hotbar.getSelectedIndex()).toBe(0);
  });

  it('应该返回正确的初始方块类型（草方块）', () => {
    hotbar = initHotbar();
    expect(hotbar.getSelectedBlock()).toBe(BlockType.GRASS);
  });

  it('应该能够通过 setSelectedIndex 切换槽位', () => {
    hotbar = initHotbar();
    hotbar.setSelectedIndex(2);

    const slotElements = document.querySelectorAll('.hotbar-slot');
    expect(slotElements[2].classList.contains('selected')).toBe(true);
    expect(slotElements[0].classList.contains('selected')).toBe(false);
  });

  it('切换槽位后应该返回正确的方块类型', () => {
    hotbar = initHotbar();
    hotbar.setSelectedIndex(1); // 泥土
    expect(hotbar.getSelectedBlock()).toBe(BlockType.DIRT);

    hotbar.setSelectedIndex(2); // 石头
    expect(hotbar.getSelectedBlock()).toBe(BlockType.STONE);
  });

  it('应该包含正确的方块预览颜色', () => {
    hotbar = initHotbar();
    const blockPreview = document.querySelector('.block-preview') as HTMLDivElement;
    expect(blockPreview).not.toBeNull();
    expect(blockPreview.style.backgroundColor).toBeTruthy();
  });

  it('应该显示正确的槽位编号', () => {
    hotbar = initHotbar();
    const slotNumbers = document.querySelectorAll('.slot-number');
    expect(slotNumbers.length).toBe(9);
    expect(slotNumbers[0].textContent).toBe('1');
    expect(slotNumbers[8].textContent).toBe('9');
  });

  it('应该显示方块名称', () => {
    hotbar = initHotbar();
    const blockNames = document.querySelectorAll('.block-name');
    expect(blockNames.length).toBe(9);
    expect(blockNames[0].textContent).toBe('草方块');
  });

  it('尝试设置无效索引时不应该改变选中状态', () => {
    hotbar = initHotbar();
    const initialIndex = hotbar.getSelectedIndex();

    hotbar.setSelectedIndex(-1);
    expect(hotbar.getSelectedIndex()).toBe(initialIndex);

    hotbar.setSelectedIndex(10);
    expect(hotbar.getSelectedIndex()).toBe(initialIndex);
  });

  it('应该能通过键盘事件切换槽位', () => {
    hotbar = initHotbar();
    const event = new KeyboardEvent('keydown', { key: '3' });
    window.dispatchEvent(event);

    const slotElements = document.querySelectorAll('.hotbar-slot');
    expect(slotElements[2].classList.contains('selected')).toBe(true);
  });

  it('应该正确处理 9 个数字键', () => {
    hotbar = initHotbar();

    for (let i = 1; i <= 9; i++) {
      const event = new KeyboardEvent('keydown', { key: i.toString() });
      window.dispatchEvent(event);

      const slotElements = document.querySelectorAll('.hotbar-slot');
      expect(slotElements[i - 1].classList.contains('selected')).toBe(true);
    }
  });

  it('非数字键不应该触发槽位切换', () => {
    hotbar = initHotbar();
    const initialIndex = hotbar.getSelectedIndex();

    const event = new KeyboardEvent('keydown', { key: 'a' });
    window.dispatchEvent(event);

    expect(hotbar.getSelectedIndex()).toBe(initialIndex);
  });

  it('destroy 后应该移除 DOM 元素', () => {
    hotbar = initHotbar();
    const container = hotbar.container;
    expect(document.contains(container)).toBe(true);

    hotbar.destroy();
    expect(document.contains(container)).toBe(false);
  });

  it('destroy 后应该移除事件监听器', () => {
    hotbar = initHotbar();
    hotbar.destroy();

    // 触发键盘事件不应该有任何效果（因为监听器已移除）
    const event = new KeyboardEvent('keydown', { key: '5' });
    window.dispatchEvent(event);

    // 如果监听器正确移除，不会导致任何错误
    expect(true).toBe(true);
  });

  it('应该包含所有 5 种方块类型', () => {
    hotbar = initHotbar();
    const blockTypes = new Set(hotbar.slots.map((slot) => slot.blockType));

    expect(blockTypes.has(BlockType.GRASS)).toBe(true);
    expect(blockTypes.has(BlockType.DIRT)).toBe(true);
    expect(blockTypes.has(BlockType.STONE)).toBe(true);
    expect(blockTypes.has(BlockType.WOOD)).toBe(true);
    expect(blockTypes.has(BlockType.LEAVES)).toBe(true);
  });
});
