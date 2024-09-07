import * as a from 'arcsecond';


export const cardCategories = a
  .sequenceOf([
    a.many1(
      a
        .sequenceOf([
          a.choice([a.char('['), a.char(',')]),
          a.everyCharUntil(a.choice([a.char(','), a.char(']')])),
        ])
        .map(r => r?.[1])
    ),
    a.char(']'),
  ])
  .map(r => r?.[0]);

export const card = a
  .sequenceOf([
    a.digits,
    a.possibly(a.char('x')),
    a.everyCharUntil(a.choice([a.char('('), a.char('\n'), a.endOfInput])),
    a.possibly(a.sequenceOf([a.char('('), a.everyCharUntil(a.char(')'))])).map(r => r?.[1]),
    a.everyCharUntil(a.choice([a.char('['), a.char('\n'), a.endOfInput])),
    a.possibly(cardCategories),
  ])
  .map(([qty, _, name, set, __, categories]) => {
    return { qty: parseInt(qty, 10), name: name.trim(), set, categories };
  });

export const deck = a.many(
  a
    .sequenceOf([
      a.optionalWhitespace,
      card,
      a.everyCharUntil(a.choice([a.char('\n'), a.endOfInput])),
    ])
    .map(r => r?.[1])
);
