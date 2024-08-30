import * as a from 'arcsecond';

export const card = a
  .sequenceOf([
    a.digits,
    a.possibly(a.char('x')),
    a.everyCharUntil(a.choice([a.char('('), a.char('\n'), a.endOfInput])),
    a.possibly(a.sequenceOf([a.char('('), a.everyCharUntil(a.char(')'))])).map(r => r?.[1]),
  ])
  .map(([qty, _, name, set]) => {
    return { qty: parseInt(qty, 10), name: name.trim(), set };
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
