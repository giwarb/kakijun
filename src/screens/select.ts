/**
 * もじえらび画面。上部タブ (すうじ/ひらがな) + グループ見出し付きの文字グリッド + 獲得ステッカー棚。
 * どの文字も最初から選択可能 (ロックなし)。
 */

import { GROUPS, type CharGroup } from '../lib/groups.ts';
import { getAllStars, getStickers } from '../lib/storage.ts';

export interface SelectScreenProps {
  onSelect: (char: string) => void;
  onBack: () => void;
}

type TabId = CharGroup['tab'];

const TABS: { id: TabId; label: string }[] = [
  { id: 'suuji', label: 'すうじ' },
  { id: 'hiragana', label: 'ひらがな' },
];

function starLabel(stars: number): string {
  const clamped = Math.max(0, Math.min(3, stars));
  return '★'.repeat(clamped) + '☆'.repeat(3 - clamped);
}

/**
 * 直近に表示していたタブ (モジュールスコープで記憶)。
 * もじえらび画面はれんしゅう→ごほうびのたびに unmount/再mount されるため、
 * インスタンス変数ではなくモジュール変数で保持しないと毎回「すうじ」に戻ってしまう。
 */
let rememberedTab: TabId = 'suuji';

export function mountSelectScreen(container: HTMLElement, props: SelectScreenProps): () => void {
  container.innerHTML = '';
  container.classList.add('select-screen');

  let activeTab: TabId = rememberedTab;

  const header = document.createElement('div');
  header.className = 'select-header';

  const backBtn = document.createElement('button');
  backBtn.type = 'button';
  backBtn.className = 'back-btn';
  backBtn.textContent = '← もどる';
  backBtn.addEventListener('click', () => props.onBack());

  const tabBar = document.createElement('div');
  tabBar.className = 'tab-bar';

  header.append(backBtn, tabBar);

  const gridWrap = document.createElement('div');
  gridWrap.className = 'select-body';

  const stickerShelf = document.createElement('div');
  stickerShelf.className = 'sticker-shelf';

  container.append(header, gridWrap, stickerShelf);

  const tabButtons = new Map<TabId, HTMLButtonElement>();
  TABS.forEach((tab) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'tab-btn';
    btn.textContent = tab.label;
    btn.dataset.tab = tab.id;
    btn.addEventListener('click', () => {
      if (activeTab === tab.id) return;
      activeTab = tab.id;
      rememberedTab = tab.id;
      renderAll();
    });
    tabBar.appendChild(btn);
    tabButtons.set(tab.id, btn);
  });

  function renderTabsActive(): void {
    tabButtons.forEach((btn, id) => btn.classList.toggle('active', id === activeTab));
  }

  function renderGrid(): void {
    gridWrap.innerHTML = '';
    const stars = getAllStars();
    GROUPS.filter((g) => g.tab === activeTab).forEach((group) => {
      const section = document.createElement('div');
      section.className = 'char-group';

      const heading = document.createElement('div');
      heading.className = 'char-group-heading';
      heading.textContent = group.label;

      const grid = document.createElement('div');
      grid.className = 'char-grid';

      group.chars.forEach((char) => {
        const card = document.createElement('button');
        card.type = 'button';
        card.className = 'char-card';
        card.dataset.char = char;

        const charEl = document.createElement('div');
        charEl.className = 'char-card-char';
        charEl.textContent = char;

        const starsEl = document.createElement('div');
        starsEl.className = 'char-card-stars';
        starsEl.textContent = starLabel(stars[char] ?? 0);

        card.append(charEl, starsEl);
        card.addEventListener('click', () => props.onSelect(char));
        grid.appendChild(card);
      });

      section.append(heading, grid);
      gridWrap.appendChild(section);
    });
  }

  function renderStickers(): void {
    stickerShelf.innerHTML = '';
    const earnedIds = getStickers();
    if (earnedIds.length === 0) return;

    const title = document.createElement('div');
    title.className = 'sticker-shelf-title';
    title.textContent = 'あつめた ステッカー';
    stickerShelf.appendChild(title);

    const row = document.createElement('div');
    row.className = 'sticker-row';
    earnedIds.forEach((id) => {
      const group = GROUPS.find((g) => g.id === id);
      const item = document.createElement('div');
      item.className = 'sticker-item';
      item.textContent = group?.emoji ?? '⭐';
      item.title = group?.label ?? id;
      row.appendChild(item);
    });
    stickerShelf.appendChild(row);
  }

  function renderAll(): void {
    renderTabsActive();
    renderGrid();
    renderStickers();
  }

  renderAll();

  return function unmount(): void {
    container.innerHTML = '';
    container.classList.remove('select-screen');
  };
}
