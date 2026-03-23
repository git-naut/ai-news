/** ニュース記事のカテゴリ定義 */
export type Category = 'AI/LLM' | 'Development' | 'Tech' | 'Japan';

/** カテゴリ判定に使用するキーワードリスト（小文字） */
export const CATEGORY_KEYWORDS: Record<Category, string[]> = {
  'AI/LLM': [
    'llm', 'gpt', 'claude', 'gemini', 'transformer', 'diffusion',
    'fine-tuning', 'finetuning', 'rag', 'retrieval', 'agent', 'multimodal',
    'embedding', 'openai', 'anthropic', 'deepmind', 'mistral', 'llama',
    'stable diffusion', 'midjourney', 'chatgpt', 'copilot', 'sora',
    '生成ai', '大規模言語モデル', 'チャットgpt', '人工知能',
  ],
  'Development': [
    'typescript', 'javascript', 'python', 'rust', 'go', 'kubernetes',
    'docker', 'ci/cd', 'open source', 'github', 'npm', 'package',
    'framework', 'library', 'sdk', 'api', 'devops', 'testing',
    '開発', 'フレームワーク', 'ライブラリ', 'オープンソース',
  ],
  'Tech': [
    'startup', 'funding', 'acquisition', 'ipo', 'regulation', 'policy',
    'quantum', 'semiconductor', 'nvidia', 'cloud', 'aws', 'azure', 'gcp',
    'robotics', 'autonomous', 'electric vehicle', 'spacex',
    'テック', '規制', 'スタートアップ',
  ],
  'Japan': [
    'japan', 'japanese', '日本', '国内', 'ipa', '経産省', '総務省',
    'softbank', 'ntt', 'fujitsu', 'hitachi', 'sony', 'toyota',
  ],
};
