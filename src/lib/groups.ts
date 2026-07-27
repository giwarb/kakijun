/**
 * もじえらび画面のタブ・グループ分けと、ステッカー判定に使う文字グループ定義。
 * すうじ = 0-9 の1グループ、ひらがな = 行ごとに10グループ。
 * strokes.json の全56文字をちょうど1グループずつに割り当てる (test/strokes.test.ts 等で数が変わったら要追従)。
 */

export interface CharGroup {
  /** グループ ID (storage のステッカー保存キーとしても使う) */
  id: string;
  tab: 'suuji' | 'hiragana';
  /** グループ見出し (例: 'あ行') */
  label: string;
  /** グループに属する文字。書字順ではなく表示順 */
  chars: string[];
  /**
   * ステッカーの見た目のプレースホルダー (絵文字1文字)。
   * T006 で本物の SVG イラストに差し替える想定なので、差し替え時はこのフィールドを
   * 画像参照 (例: sticker id) に変えるだけで済むよう、CharGroup 経由でのみ参照すること。
   */
  emoji: string;
}

export const GROUPS: CharGroup[] = [
  { id: 'suuji', tab: 'suuji', label: 'すうじ', chars: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'], emoji: '🔢' },
  { id: 'a', tab: 'hiragana', label: 'あ行', chars: ['あ', 'い', 'う', 'え', 'お'], emoji: '🐰' },
  { id: 'ka', tab: 'hiragana', label: 'か行', chars: ['か', 'き', 'く', 'け', 'こ'], emoji: '🐱' },
  { id: 'sa', tab: 'hiragana', label: 'さ行', chars: ['さ', 'し', 'す', 'せ', 'そ'], emoji: '🐶' },
  { id: 'ta', tab: 'hiragana', label: 'た行', chars: ['た', 'ち', 'つ', 'て', 'と'], emoji: '🐻' },
  { id: 'na', tab: 'hiragana', label: 'な行', chars: ['な', 'に', 'ぬ', 'ね', 'の'], emoji: '🐼' },
  { id: 'ha', tab: 'hiragana', label: 'は行', chars: ['は', 'ひ', 'ふ', 'へ', 'ほ'], emoji: '🐨' },
  { id: 'ma', tab: 'hiragana', label: 'ま行', chars: ['ま', 'み', 'む', 'め', 'も'], emoji: '🐵' },
  { id: 'ya', tab: 'hiragana', label: 'や行', chars: ['や', 'ゆ', 'よ'], emoji: '🦁' },
  { id: 'ra', tab: 'hiragana', label: 'ら行', chars: ['ら', 'り', 'る', 'れ', 'ろ'], emoji: '🐯' },
  { id: 'wa', tab: 'hiragana', label: 'わ行ん', chars: ['わ', 'を', 'ん'], emoji: '🐸' },
];

/** 文字が属するグループを返す。見つからなければ undefined */
export function findGroupByChar(char: string): CharGroup | undefined {
  return GROUPS.find((g) => g.chars.includes(char));
}
