/**
 * マスコット (しろねこ) の SVG 生成・表情/ポーズ切り替え。
 * 画像アセットは使わず、インライン SVG のみで組み立てる (PWA を軽く保つ)。
 * 色は style.css 側の .mascot-* クラス (CSS変数参照) で塗る。ここでは形状 (d 属性・配置) だけを持つ。
 *
 * viewBox は 0 0 120 132 固定。表情/ポーズは4種:
 * - normal: ふつう (常駐時のデフォルト)
 * - happy : よろこび (両手を上げて跳ねる。正解・完走・ごほうび画面で使用)
 * - cheer : おうえん (ポンポンを掲げる。フェーズ開始時に使用)
 * - sad   : こまり顔 (励まし用。泣かせない。ミス時に使用)
 */

const SVG_NS = 'http://www.w3.org/2000/svg';

export type MascotMood = 'normal' | 'happy' | 'cheer' | 'sad';

export interface MascotOptions {
  /** ルート svg に追加する class (配置・サイズ指定用) */
  className?: string;
}

/** 全ポーズ共通: 耳・頭・ひげ・ほっぺ (目と口以外) */
function headMarkup(): string {
  return `
    <path class="mascot-ear" d="M 30,34 L 36,6 L 55,30 Z" />
    <path class="mascot-ear-inner" d="M 34,27 L 38,14 L 48,26 Z" />
    <path class="mascot-ear" d="M 90,34 L 84,6 L 65,30 Z" />
    <path class="mascot-ear-inner" d="M 86,27 L 82,14 L 72,26 Z" />
    <circle class="mascot-head" cx="60" cy="46" r="31" />
    <path class="mascot-whisker" d="M 30,48 L 12,45" />
    <path class="mascot-whisker" d="M 30,54 L 12,55" />
    <path class="mascot-whisker" d="M 90,48 L 108,45" />
    <path class="mascot-whisker" d="M 90,54 L 108,55" />
  `;
}

/** 全ポーズ共通: しっぽ・後ろ足 (体より奥に描く) */
function backMarkup(): string {
  return `
    <path class="mascot-tail" d="M 88,100 Q 112,96 110,74 Q 109,64 100,66 Q 106,78 96,88 Q 92,94 88,100 Z" />
    <ellipse class="mascot-paw" cx="46" cy="118" rx="10" ry="8" />
    <ellipse class="mascot-paw" cx="74" cy="118" rx="10" ry="8" />
  `;
}

/** 体・おなか */
function bodyMarkup(): string {
  return `
    <ellipse class="mascot-body" cx="60" cy="92" rx="32" ry="29" />
    <ellipse class="mascot-belly" cx="60" cy="98" rx="18" ry="16" />
  `;
}

/** ポーズごとの腕 (体より手前) */
function armsMarkup(mood: MascotMood): string {
  switch (mood) {
    case 'happy':
      // 両手を大きく上げて跳ねる
      return `
        <path class="mascot-arm" d="M 30,92 Q 18,78 20,58" />
        <path class="mascot-arm" d="M 90,92 Q 102,78 100,58" />
        <ellipse class="mascot-paw" cx="20" cy="52" rx="9" ry="12" transform="rotate(-35 20 52)" />
        <ellipse class="mascot-paw" cx="100" cy="52" rx="9" ry="12" transform="rotate(35 100 52)" />
      `;
    case 'cheer':
      // ポンポンを斜め上に掲げる
      return `
        <ellipse class="mascot-paw" cx="24" cy="64" rx="9" ry="12" transform="rotate(-25 24 64)" />
        <ellipse class="mascot-paw" cx="96" cy="64" rx="9" ry="12" transform="rotate(25 96 64)" />
        <g class="mascot-pompom" transform="translate(14,44)">
          <circle r="4" cx="0" cy="0" />
          <circle r="4" cx="7" cy="-3" />
          <circle r="4" cx="-6" cy="-4" />
          <circle r="4" cx="1" cy="-8" />
          <circle r="4" cx="7" cy="5" />
        </g>
        <g class="mascot-pompom" transform="translate(106,44)">
          <circle r="4" cx="0" cy="0" />
          <circle r="4" cx="-7" cy="-3" />
          <circle r="4" cx="6" cy="-4" />
          <circle r="4" cx="-1" cy="-8" />
          <circle r="4" cx="-7" cy="5" />
        </g>
      `;
    case 'sad':
      // 励ますように前でぎゅっと手を組む
      return `
        <ellipse class="mascot-paw" cx="52" cy="90" rx="9" ry="11" transform="rotate(-15 52 90)" />
        <ellipse class="mascot-paw" cx="68" cy="90" rx="9" ry="11" transform="rotate(15 68 90)" />
      `;
    case 'normal':
    default:
      return `
        <ellipse class="mascot-paw" cx="30" cy="96" rx="9" ry="12" transform="rotate(-10 30 96)" />
        <ellipse class="mascot-paw" cx="90" cy="96" rx="9" ry="12" transform="rotate(10 90 96)" />
      `;
  }
}

/** ポーズごとの顔 (ほっぺ・眉・目・口) */
function faceMarkup(mood: MascotMood): string {
  switch (mood) {
    case 'happy':
      return `
        <ellipse class="mascot-cheek" cx="38" cy="58" rx="8" ry="6" />
        <ellipse class="mascot-cheek" cx="82" cy="58" rx="8" ry="6" />
        <path class="mascot-mouth" d="M 41,46 Q 47,38 53,46" />
        <path class="mascot-mouth" d="M 67,46 Q 73,38 79,46" />
        <path class="mascot-mouth-open" d="M 50,58 Q 60,72 70,58 Q 60,66 50,58 Z" />
        <path class="mascot-sparkle" d="M14,30 l2,5 l5,1 l-4,3 l1,5 l-4,-3 l-4,3 l1,-5 l-4,-3 l5,-1 z" />
        <path
          class="mascot-sparkle"
          d="M14,20 l1.4,3.5 l3.5,0.7 l-2.8,2.1 l0.7,3.5 l-2.8,-2.1 l-2.8,2.1 l0.7,-3.5 l-2.8,-2.1 l3.5,-0.7 z"
          transform="translate(92,-10)"
        />
      `;
    case 'cheer':
      return `
        <ellipse class="mascot-cheek" cx="40" cy="58" rx="7" ry="5" />
        <ellipse class="mascot-cheek" cx="80" cy="58" rx="7" ry="5" />
        <circle class="mascot-eye" cx="47" cy="46" r="6.5" />
        <circle class="mascot-eye" cx="73" cy="46" r="6.5" />
        <circle class="mascot-eye-highlight" cx="45" cy="43.5" r="2.2" />
        <circle class="mascot-eye-highlight" cx="71" cy="43.5" r="2.2" />
        <path class="mascot-mouth-open" d="M 50,58 Q 60,70 70,58 Q 60,65 50,58 Z" />
      `;
    case 'sad':
      return `
        <ellipse class="mascot-cheek" cx="40" cy="58" rx="7" ry="5" />
        <ellipse class="mascot-cheek" cx="80" cy="58" rx="7" ry="5" />
        <path class="mascot-eyebrow" d="M 42,36 Q 47,33 53,37" />
        <path class="mascot-eyebrow" d="M 67,37 Q 73,33 78,36" />
        <circle class="mascot-eye" cx="47" cy="47" r="6" />
        <circle class="mascot-eye" cx="73" cy="47" r="6" />
        <circle class="mascot-eye-highlight" cx="45.5" cy="44.5" r="1.8" />
        <circle class="mascot-eye-highlight" cx="71.5" cy="44.5" r="1.8" />
        <path class="mascot-mouth" d="M 54,61 Q 60,58 66,61" />
        <path class="mascot-sweat" d="M 86,32 Q 91,40 86,44 Q 81,40 86,32 Z" />
      `;
    case 'normal':
    default:
      return `
        <ellipse class="mascot-cheek" cx="40" cy="58" rx="7" ry="5" />
        <ellipse class="mascot-cheek" cx="80" cy="58" rx="7" ry="5" />
        <circle class="mascot-eye" cx="47" cy="46" r="6.5" />
        <circle class="mascot-eye" cx="73" cy="46" r="6.5" />
        <circle class="mascot-eye-highlight" cx="45" cy="43.5" r="2" />
        <circle class="mascot-eye-highlight" cx="71" cy="43.5" r="2" />
        <path class="mascot-mouth" d="M 52,60 Q 56,64 60,60 Q 64,64 68,60" />
      `;
  }
}

function mascotMarkup(mood: MascotMood): string {
  return `
    ${backMarkup()}
    ${armsMarkup(mood)}
    ${bodyMarkup()}
    <g class="mascot-head-group">
      ${headMarkup()}
      ${faceMarkup(mood)}
    </g>
  `;
}

/** マスコット (しろねこ) の SVG を新規生成する */
export function createMascot(mood: MascotMood = 'normal', options: MascotOptions = {}): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg') as SVGSVGElement;
  svg.setAttribute('viewBox', '0 0 120 132');
  svg.setAttribute('class', ['mascot', options.className].filter(Boolean).join(' '));
  svg.setAttribute('aria-hidden', 'true');
  svg.dataset.mood = mood;
  svg.innerHTML = mascotMarkup(mood);
  return svg;
}

/** 既存のマスコット svg の表情/ポーズだけを切り替える (要素の作り直しをせず中身を差し替える) */
export function setMascotMood(svg: SVGSVGElement, mood: MascotMood): void {
  if (svg.dataset.mood === mood) return;
  svg.dataset.mood = mood;
  svg.innerHTML = mascotMarkup(mood);
}
