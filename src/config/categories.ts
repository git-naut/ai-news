/** ニュース記事のカテゴリ定義 */
export type Category = 'AI/LLM' | 'Development' | 'Tech' | 'Japan';

/** カテゴリ判定に使用するキーワードリスト（小文字） */
export const CATEGORY_KEYWORDS: Record<Category, string[]> = {
  'AI/LLM': [
    // 一般用語
    'llm', 'large language model', 'foundation model', 'transformer',
    'diffusion', 'fine-tuning', 'finetuning', 'rag', 'retrieval',
    'agent', 'multimodal', 'embedding', 'reasoning model',
    // Anthropic: Claude Opus 4.6 / Claude Sonnet 4.6 / Claude Haiku 4.5
    'anthropic', 'claude',
    // OpenAI: GPT-5.4 / GPT-5.3 / o3
    'openai', 'gpt', 'gpt-5', 'o3', 'chatgpt', 'sora', 'copilot',
    // Google: Gemini 3.1 Pro / Gemini 3.1 Flash / Gemini 3
    'deepmind', 'google deepmind', 'gemini',
    // Meta: Llama 4 Scout / Llama 4 Maverick
    'meta ai', 'llama', 'llama 4',
    // Mistral AI: Mistral Large 3 / Mistral Small 4 / Devstral
    'mistral', 'devstral',
    // xAI: Grok 3 / Grok 4
    'grok', 'xai',
    // DeepSeek: DeepSeek-V3 / DeepSeek-R1
    'deepseek', 'deepseek-r1', 'deepseek-v3',
    // Microsoft: Phi-4 / Phi-4-reasoning / Phi-4-multimodal
    'phi-4', 'microsoft phi',
    // 日本語
    '生成ai', '大規模言語モデル', 'チャットgpt', '人工知能', 'llm',
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
