import { describe, it, expect } from 'vitest';
import { buildSubject } from '../../src/mail/sender.js';

const base = { html: '', text: '', totalCount: 12, deliveryDate: '2026年09月30日 09:00 JST' };

describe('buildSubject', () => {
  it('primary は印なし', () => {
    expect(buildSubject({ ...base, deliveryKind: 'primary' })).toBe(
      '[AI News] 2026年09月30日 09:00 JST の AI/テックニュース 12 件'
    );
  });

  it('backup は primary が届かなかったことが件名で分かる', () => {
    expect(buildSubject({ ...base, deliveryKind: 'backup' })).toBe(
      '[予備配信・primary 未着] [AI News] 2026年09月30日 09:00 JST の AI/テックニュース 12 件'
    );
  });

  it('manual は手動送信と分かる', () => {
    expect(buildSubject({ ...base, deliveryKind: 'manual' })).toBe(
      '[手動送信] [AI News] 2026年09月30日 09:00 JST の AI/テックニュース 12 件'
    );
  });
});
