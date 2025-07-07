import * as a from 'arcsecond';

const cardCategory = (open, close) =>
  a
    .sequenceOf([
      a.choice([a.char(open), a.char(',')]),
      a.everyCharUntil(a.choice([a.char(','), a.char(close)])),
    ])
    .map(r => r?.[1]);

export const cardCategories = (open, close) =>
  a.sequenceOf([a.many1(cardCategory(open, close)), a.char(close)]).map(r => r?.[0]);

export const card = a
  .sequenceOf([
    a.possibly(a.digits),
    a.possibly(a.char('x')),
    a.everyCharUntil(a.choice([a.char('('), a.char('\n'), a.char('['), a.char('<'), a.endOfInput])),
    a.possibly(a.sequenceOf([a.char('('), a.everyCharUntil(a.char(')'))])).map(r => r?.[1]),
    a.everyCharUntil(a.choice([a.char('['), a.char('\n'), a.char('<'), a.endOfInput])),

    a.possibly(cardCategories('<', '>')),
    a.everyCharUntil(a.choice([a.char('['), a.char('\n'), a.endOfInput])),
    a.possibly(cardCategories('[', ']')),
  ])
  .map(([rawQty, _, name, set, __, cats1, ___, categories]) => {
    if (categories?.length === 1 && !set) {
      set = categories[0];
      categories = cats1 || [];
    }
    if (set?.includes(':')) {
      set = set.split(':')[0];
    }
    let qty = parseInt(rawQty, 10);
    return { qty: isNaN(qty) ? 1 : qty, name: name.trim(), set, categories };
  });

const comment = a
  .sequenceOf([a.str('//'), a.everyCharUntil(a.choice([a.char('\n'), a.endOfInput]))])
  .map(r => null);

export const deck = a
  .many(
    a
      .sequenceOf([
        a.optionalWhitespace,
        a.choice([comment, card]),
        a.everyCharUntil(a.choice([a.char('\n'), a.endOfInput])),
        a.optionalWhitespace,
      ])
      .map(r => r?.[1]),
  )
  .map(r => r.filter(Boolean));
