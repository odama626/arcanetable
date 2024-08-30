import { test, expect } from 'vitest';
import { card, deck } from './deckParser';

test('card', () => {
  expect.soft(card.run('1x Alela, Artful Provocateur (brc) 119 [Tokens]').result)
    .toMatchInlineSnapshot(`
      {
        "name": "Alela, Artful Provocateur",
        "qty": 1,
        "set": "brc",
      }
    `);

  expect.soft(card.run('1x Al')).toMatchInlineSnapshot(`
    {
      "data": null,
      "index": 5,
      "isError": false,
      "result": {
        "name": "Al",
        "qty": 1,
        "set": undefined,
      },
    }
  `);
});

test('deck', () => {
  expect
    .soft(
      deck.run(`
    
1x Alela, Artful Provocateur (brc) 119 [Tokens]
1x All That Glitters (cmm) 622 [Pump]
1x Angelic Destiny (woc) 60 [Evasion]
1x Anguished Unmaking (pip) 473 [Removal]
1x Arcane Sanctum (moc) 390 [Land]
1x Archangel of Thune (m14) 5 [Lifegain]
1x Ardenn, Intrepid Archaeologist (cmr) 10 [Ramp]
1x Athreos, God of Passage (plst) JOU-146 [Recursion]
1x Avacyn, Angel of Hope (avr) 6 [Protection]
1x Bojuka Bog (blc) 294 [Land]    `).result
    )
    .toMatchInlineSnapshot(`
      [
        {
          "name": "Alela, Artful Provocateur",
          "qty": 1,
          "set": "brc",
        },
        {
          "name": "All That Glitters",
          "qty": 1,
          "set": "cmm",
        },
        {
          "name": "Angelic Destiny",
          "qty": 1,
          "set": "woc",
        },
        {
          "name": "Anguished Unmaking",
          "qty": 1,
          "set": "pip",
        },
        {
          "name": "Arcane Sanctum",
          "qty": 1,
          "set": "moc",
        },
        {
          "name": "Archangel of Thune",
          "qty": 1,
          "set": "m14",
        },
        {
          "name": "Ardenn, Intrepid Archaeologist",
          "qty": 1,
          "set": "cmr",
        },
        {
          "name": "Athreos, God of Passage",
          "qty": 1,
          "set": "plst",
        },
        {
          "name": "Avacyn, Angel of Hope",
          "qty": 1,
          "set": "avr",
        },
        {
          "name": "Bojuka Bog",
          "qty": 1,
          "set": "blc",
        },
      ]
    `);
});
