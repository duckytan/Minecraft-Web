import { BlockType } from '../world/block';

export interface HotbarSlot {
  blockType: BlockType;
  name: string;
  color: string;
}

export interface Hotbar {
  container: HTMLDivElement;
  slots: HotbarSlot[];
  getSelectedBlock: () => BlockType;
  getSelectedIndex: () => number;
  setSelectedIndex: (index: number) => void;
  destroy: () => void;
}

const HOTBAR_SLOTS: HotbarSlot[] = [
  { blockType: BlockType.GRASS, name: '草方块', color: '#5a9e3d' },
  { blockType: BlockType.DIRT, name: '泥土', color: '#8b6f47' },
  { blockType: BlockType.STONE, name: '石头', color: '#7a7a7a' },
  { blockType: BlockType.WOOD, name: '木头', color: '#8b5a2b' },
  { blockType: BlockType.LEAVES, name: '树叶', color: '#3d8b3d' },
  { blockType: BlockType.STONE, name: '石头', color: '#7a7a7a' },
  { blockType: BlockType.WOOD, name: '木头', color: '#8b5a2b' },
  { blockType: BlockType.DIRT, name: '泥土', color: '#8b6f47' },
  { blockType: BlockType.GRASS, name: '草方块', color: '#5a9e3d' }
];

export function initHotbar(): Hotbar {
  // 创建主容器
  const container = document.createElement('div');
  container.className = 'hotbar';

  // 创建槽位
  const slots: HotbarSlot[] = [...HOTBAR_SLOTS];
  const slotElements: HTMLDivElement[] = [];
  let selectedIndex = 0;

  const setSelectedIndex = (index: number) => {
    if (index < 0 || index >= slots.length) {
      return;
    }

    const previous = slotElements[selectedIndex];
    const next = slotElements[index];
    if (!next) {
      return;
    }

    previous?.classList.remove('selected');
    selectedIndex = index;
    next.classList.add('selected');

    console.log(`✅ 选中方块: ${slots[selectedIndex].name} (槽位 ${index + 1})`);
  };

  // 渲染槽位
  slots.forEach((slot, index) => {
    const slotElement = document.createElement('div');
    slotElement.className = 'hotbar-slot';

    const blockPreview = document.createElement('div');
    blockPreview.className = 'block-preview';
    blockPreview.style.backgroundColor = slot.color;

    const slotNumber = document.createElement('div');
    slotNumber.className = 'slot-number';
    slotNumber.textContent = `${index + 1}`;

    const blockName = document.createElement('div');
    blockName.className = 'block-name';
    blockName.textContent = slot.name;

    slotElement.appendChild(blockPreview);
    slotElement.appendChild(slotNumber);
    slotElement.appendChild(blockName);

    slotElement.addEventListener('click', () => setSelectedIndex(index));

    container.appendChild(slotElement);
    slotElements.push(slotElement);
  });

  // 默认选中第一个槽位
  setSelectedIndex(selectedIndex);

  // 添加到 DOM
  document.body.appendChild(container);

  // 监听键盘事件（1-9 键）
  const handleKeyDown = (event: KeyboardEvent) => {
    const key = parseInt(event.key, 10);
    if (Number.isNaN(key)) {
      return;
    }

    if (key >= 1 && key <= 9) {
      setSelectedIndex(key - 1);
    }
  };

  window.addEventListener('keydown', handleKeyDown);

  // 获取当前选中的方块类型
  const getSelectedBlock = (): BlockType => {
    return slots[selectedIndex].blockType;
  };

  // 获取当前选中的索引
  const getSelectedIndex = (): number => {
    return selectedIndex;
  };

  // 清理函数
  const destroy = () => {
    window.removeEventListener('keydown', handleKeyDown);
    container.remove();
  };

  return {
    container,
    slots,
    getSelectedBlock,
    getSelectedIndex,
    setSelectedIndex,
    destroy
  };
}
