import type { SaveManager } from '../save/saveManager';

export interface SaveControls {
  container: HTMLDivElement;
  show: () => void;
  hide: () => void;
  destroy: () => void;
}

export function initSaveControls(saveManager: SaveManager): SaveControls {
  const container = document.createElement('div');
  container.className = 'save-controls';

  const saveButton = document.createElement('button');
  saveButton.className = 'save-button';
  saveButton.textContent = '💾 保存 (F5)';
  saveButton.title = '保存当前游戏';

  const loadButton = document.createElement('button');
  loadButton.className = 'load-button';
  loadButton.textContent = '📂 加载 (F9)';
  loadButton.title = '加载已保存的游戏';

  const deleteButton = document.createElement('button');
  deleteButton.className = 'delete-button';
  deleteButton.textContent = '🗑️ 删除存档';
  deleteButton.title = '删除当前存档';

  const statusMessage = document.createElement('div');
  statusMessage.className = 'save-status';

  container.appendChild(saveButton);
  container.appendChild(loadButton);
  container.appendChild(deleteButton);
  container.appendChild(statusMessage);

  document.body.appendChild(container);

  const showMessage = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    statusMessage.textContent = message;
    statusMessage.className = `save-status ${type}`;
    statusMessage.style.display = 'block';

    setTimeout(() => {
      statusMessage.style.display = 'none';
    }, 3000);
  };

  const handleSave = () => {
    const success = saveManager.save();
    if (success) {
      showMessage('✅ 游戏已保存', 'success');
    } else {
      showMessage('❌ 保存失败', 'error');
    }
  };

  const handleLoad = () => {
    const success = saveManager.load();
    if (success) {
      showMessage('✅ 存档已加载', 'success');
    } else {
      showMessage('❌ 未找到存档或加载失败', 'error');
    }
  };

  const handleDelete = () => {
    if (!saveManager.hasSave()) {
      showMessage('⚠️ 没有存档可删除', 'info');
      return;
    }

    if (confirm('确定要删除当前存档吗？此操作不可撤销！')) {
      const success = saveManager.deleteSave();
      if (success) {
        showMessage('✅ 存档已删除', 'success');
      } else {
        showMessage('❌ 删除存档失败', 'error');
      }
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.code === 'F5') {
      e.preventDefault();
      handleSave();
    } else if (e.code === 'F9') {
      e.preventDefault();
      handleLoad();
    }
  };

  saveButton.addEventListener('click', handleSave);
  loadButton.addEventListener('click', handleLoad);
  deleteButton.addEventListener('click', handleDelete);
  window.addEventListener('keydown', handleKeyDown);

  // 更新按钮状态
  const updateButtonStates = () => {
    const hasSave = saveManager.hasSave();
    loadButton.disabled = !hasSave;
    deleteButton.disabled = !hasSave;
  };

  updateButtonStates();

  const show = () => {
    container.style.display = 'flex';
    updateButtonStates();
  };

  const hide = () => {
    container.style.display = 'none';
  };

  const destroy = () => {
    saveButton.removeEventListener('click', handleSave);
    loadButton.removeEventListener('click', handleLoad);
    deleteButton.removeEventListener('click', handleDelete);
    window.removeEventListener('keydown', handleKeyDown);
    container.remove();
  };

  return {
    container,
    show,
    hide,
    destroy
  };
}
