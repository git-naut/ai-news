/**
 * resolveLink の try/catch を外し、壊れたリンクで例外を投げさせる。UNIT-1 が捕まえるはず。
 *
 * 直す前と同じ形。1 記事の例外を fetchFeed がフィード単位で受け止め、同じフィードの正常な記事まで捨てる。
 */

import { replaceOnce, type Mutation } from '../workspace.js';

export default {
  id: 'm_unit_101',
  family: 'unit',
  expect: 'UNIT-1',
  title: "壊れたリンクで normalizeItem が例外を投げる形に戻す",
  touches: ["src/feeds/normalizer.ts"],
  async apply(ws) {
    await replaceOnce(ws, "src/feeds/normalizer.ts", "  } catch {\n    return null;\n  }", "  } catch (error) {\n    throw error;\n  }");
  },
} satisfies Mutation;
