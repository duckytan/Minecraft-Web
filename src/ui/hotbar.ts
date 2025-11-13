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
  { blockType: BlockType.GRASS, name: '草方块', color: '#7ec850' },
  { blockType: BlockType.DIRT, name: '泥土', color: '#9b7653' },
  { blockType: BlockType.STONE, name: '石头', color: '#999999' },
  { blockType: BlockType.WOOD, name: '木头', color: '#a0724e' },
  { blockType: BlockType.LEAVES, name: '树叶', color: '#4caf50' },
  { blockType: BlockType.SAND, name: '沙子', color: '#edc9af' },
  { blockType: BlockType.SNOW, name: '雪', color: '#ffffff' },
  { blockType: BlockType.GLASS, name: '玻璃', color: '#bfe7f5' },
  { blockType: BlockType.WATER, name: '水', color: '#4fc3f7' }
];

export function initHotbar(): Hotbar {
  const container = document.createElement('div');
  container.className = 'hotbar';

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

    slotElement.addEventListener('click', (e) => {
      setSelectedIndex(index);
      (e.target as HTMLElement).blur();
      const canvas = document.querySelector('canvas');
      if (canvas) {
        (canvas as HTMLCanvasElement).focus();
      }
    });

    container.appendChild(slotElement);
    slotElements.push(slotElement);
  });

  setSelectedIndex(selectedIndex);

  document.body.appendChild(container);

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

  const getSelectedBlock = (): BlockType => {
    return slots[selectedIndex].blockType;
  };

  const getSelectedIndex = (): number => {
    return selectedIndex;
  };

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
