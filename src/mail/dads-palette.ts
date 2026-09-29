/**
 * メールで使う色と字の値（デジタル庁デザインシステム DADS）。
 *
 * Gmail は CSS 変数も外部 CSS も読まないので、dads-design-system プラグイン（v0.2.0）の役割トークンを
 * 実際の値に置き換えてここに置く。既定のブランド層（brand-ops-hub.css、主色 #378BCA・本文 14px）の値で、
 * 独自に作った値は無い。テンプレートの色がこの表に無ければテストが落ちる（tests/mail/dads-template.test.ts）。
 *
 * a11y: ops-hub の --text-muted（#858b94）は白の背景で 4.5:1 に届かないので使わず、小さな字にも
 * --text-secondary（#52585f）を使う。
 */
export const DADS_COLORS = {
  /** --key 主色 */
  key: '#378bca',
  /** --key-ink 文字としてのキー（白背景で AA） */
  keyInk: '#1b4f7a',
  /** --key-weak 選択の淡い面 */
  keyWeak: '#d7e8f6',
  /** --key-weaker 最も淡い面 */
  keyWeaker: '#eaf3fb',
  /** --text 本文 */
  text: '#1a1c1f',
  /** --text-secondary 補助の文字 */
  textSecondary: '#52585f',
  /** --bg ページ背景 */
  bg: '#f3f5f8',
  /** --surface カード */
  surface: '#ffffff',
  /** --border 区切り */
  border: '#dde2e8',
  /** --border-subtle 淡い区切り */
  borderSubtle: '#eef1f5',
  /** --color-neutral-solid-gray-100（tone-neutral のバッジの面） */
  neutral100: '#e6e6e6',
  /** --warning-strong 注意の文字と枠 */
  warningStrong: '#9a6206',
  /** --warning-bg 注意の面 */
  warningBg: '#fbf0da',
  /** --link リンク */
  link: '#1b4f7a',
} as const;

/** 公式トークンの font-weight は 400 と 700 だけ */
export const DADS_FONT_WEIGHTS: readonly number[] = [400, 700];

/** --font-family-sans（Web フォントは読み込めないので、端末の書体に落ちる） */
export const DADS_FONT_FAMILY = "'Noto Sans JP', -apple-system, BlinkMacSystemFont, sans-serif";
