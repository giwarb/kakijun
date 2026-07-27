import './style.css';
import strokesData from './data/strokes.json';
import type { StrokeData } from './data/types.ts';
import { mountPracticeScreen } from './screens/practice.ts';

// 画面遷移・文字選択は T005 で実装する。ここでは「あ」固定でれんしゅう画面を仮マウントする。
const app = document.querySelector<HTMLDivElement>('#app');

if (app) {
  const data = strokesData as unknown as StrokeData;
  const char = 'あ';
  const strokeData = data.chars[char];

  if (strokeData) {
    mountPracticeScreen(app, {
      char,
      strokeData,
      onComplete: (result) => {
        console.debug('[practice] complete', result);
      },
    });
  }
}
