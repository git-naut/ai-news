/**
 * package.json の dependencies を逆順に並べ替える。捕まえてはいけない変異。
 *
 * DEP-1 は区分ごとに名前の集合と specifier を突き合わせる。並び順は見ていない軸なので、
 * ここで反応したら検査が過敏。
 */

import { NotApplicable, type Mutation } from '../workspace.js';

export default {
  id: 'm_none_008',
  family: 'dep',
  expect: 'NONE',
  title: 'package.json の dependencies を逆順にする',
  touches: ['package.json'],
  async apply(ws) {
    const pkg = JSON.parse(await ws.read('package.json')) as Record<string, unknown>;
    const deps = pkg['dependencies'];
    if (typeof deps !== 'object' || deps === null || Object.keys(deps).length < 2) {
      throw new NotApplicable('dependencies が2件未満です');
    }
    pkg['dependencies'] = Object.fromEntries(Object.entries(deps).reverse());
    await ws.write('package.json', `${JSON.stringify(pkg, null, 2)}\n`);
  },
} satisfies Mutation;
