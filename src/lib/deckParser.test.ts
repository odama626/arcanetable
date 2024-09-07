import { test, expect } from 'vitest';
import { card, deck } from './deckParser';

test('card', () => {
  let run =  card.run('1x Alela, Artful Provocateur (brc) 119 [Tokens]')

  expect(run.isError).toBe(false)

    expect.soft(run.result).toMatchInlineSnapshot(`
      {
        "categories": [
          "Tokens",
        ],
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
        "categories": null,
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
          "categories": [
            "Tokens",
          ],
          "name": "Alela, Artful Provocateur",
          "qty": 1,
          "set": "brc",
        },
        {
          "categories": [
            "Pump",
          ],
          "name": "All That Glitters",
          "qty": 1,
          "set": "cmm",
        },
        {
          "categories": [
            "Evasion",
          ],
          "name": "Angelic Destiny",
          "qty": 1,
          "set": "woc",
        },
        {
          "categories": [
            "Removal",
          ],
          "name": "Anguished Unmaking",
          "qty": 1,
          "set": "pip",
        },
        {
          "categories": [
            "Land",
          ],
          "name": "Arcane Sanctum",
          "qty": 1,
          "set": "moc",
        },
        {
          "categories": [
            "Lifegain",
          ],
          "name": "Archangel of Thune",
          "qty": 1,
          "set": "m14",
        },
        {
          "categories": [
            "Ramp",
          ],
          "name": "Ardenn, Intrepid Archaeologist",
          "qty": 1,
          "set": "cmr",
        },
        {
          "categories": [
            "Recursion",
          ],
          "name": "Athreos, God of Passage",
          "qty": 1,
          "set": "plst",
        },
        {
          "categories": [
            "Protection",
          ],
          "name": "Avacyn, Angel of Hope",
          "qty": 1,
          "set": "avr",
        },
        {
          "categories": [
            "Land",
          ],
          "name": "Bojuka Bog",
          "qty": 1,
          "set": "blc",
        },
      ]
    `);
});

test('deck', () => {
  expect
    .soft(
      deck.run(`
1x Underworld Coinsmith (jou) 157 [Maybeboard{noDeck}{noPrice},Lifegain]
1x Vampiric Link (plc) 92 [Lifegain]
1x Vow of Duty (c21) 110 [Removal]
1x Winds of Rath (mkc) 93 [Removal]
1x Zur the Enchanter (dmr) 206 [Commander{top}] `).result
    )
    .toMatchInlineSnapshot(`
      [
        {
          "categories": [
            "Maybeboard{noDeck}{noPrice}",
            "Lifegain",
          ],
          "name": "Underworld Coinsmith",
          "qty": 1,
          "set": "jou",
        },
        {
          "categories": [
            "Lifegain",
          ],
          "name": "Vampiric Link",
          "qty": 1,
          "set": "plc",
        },
        {
          "categories": [
            "Removal",
          ],
          "name": "Vow of Duty",
          "qty": 1,
          "set": "c21",
        },
        {
          "categories": [
            "Removal",
          ],
          "name": "Winds of Rath",
          "qty": 1,
          "set": "mkc",
        },
        {
          "categories": [
            "Commander{top}",
          ],
          "name": "Zur the Enchanter",
          "qty": 1,
          "set": "dmr",
        },
      ]
    `)
  })


