import { progress } from './progress.js';

// The campaign as a chain of jobs handed down over the radio. Оріон is the shift
// supervisor back at control; you are Сьомий, the only rover still rolling on that
// stretch. Each step has a briefing, an objective the game can actually see, and a
// sign-off — and the objectives only ever read state that already exists (scrap
// collected, modules delivered, upgrades bought, the Moon flashback), so the story
// can never claim you have done something the world disagrees with.

export const ORION = 'ОРІОН · керівник зміни';
export const SELF = 'СЬОМИЙ';
export const LIRA = 'ЛІРА · біолабораторія';

// ctx: { planet, scrap, delivered, upgradeLevels, flashbackDone, seeds }
const STEPS = [
  {
    id: 'scrap5',
    brief: [
      [ORION, 'Сьомий, це Оріон. Прокидайся, маємо халепу.'],
      [ORION, 'Транспортер розсипав вантаж уздовж траси АЛЬФА — БЕТА. Уламки скрізь, а до вечора нам звітувати.'],
      [ORION, 'Почни з малого: збери п’ять шматків мотлоху. Вони блимають синім, не проґавиш.'],
    ],
    objective: (c) => ({ text: `зібрати мотлох ${Math.min(c.scrap, 5)}/5`, done: c.scrap >= 5 }),
    outro: [[ORION, 'Бачу п’ять. Добре. Виявляється, ти ще вмієш працювати.']],
  },
  {
    id: 'deliver2',
    brief: [
      [ORION, 'Тепер серйозніше. У тому вантажі були модулі Гермес-3 — без них станція БЕТА не запуститься.'],
      [ORION, 'Підбери два і здай на БЕТІ. Модулі позначені на карті.'],
    ],
    objective: (c) => ({ text: `здати модулі ${Math.min(c.delivered, 2)}/2`, done: c.delivered >= 2 }),
    outro: [
      [ORION, 'Два прийнято. Дякую, Сьомий.'],
      [ORION, '...Слухай. Твій допуск щойно відкрив архів. Тобі варто це побачити.'],
    ],
  },
  {
    id: 'flashback',
    brief: [
      [ORION, 'Гермес-1. Місяць, дванадцять років тому. Той самий маршрут, той самий тип ровера — тільки голий, без жодної з твоїх іграшок.'],
      [ORION, 'Запис обривається за два кілометри до мети. Поїдь туди і подивись сам.'],
      [ORION, 'Меню → Налаштування → планета → Місяць.'],
    ],
    objective: (c) => ({
      text: c.planet === 'moon' ? 'знайти уламки Гермес-1' : 'вилетіти на Місяць (меню → планета)',
      done: c.flashbackDone,
    }),
    outro: [
      [ORION, 'Ось воно. Далі вони не доїхали.'],
      [ORION, 'Тепер ти розумієш, чому я стільки торгуюсь за кожен апгрейд. Повертайся на Марс.'],
    ],
  },
  {
    id: 'upgrade',
    brief: [
      [ORION, 'Мотлох — це не сміття, це запчастини. У майстерні на БЕТІ з нього роблять залізо.'],
      [ORION, 'Постав на ровер хоч щось. Одне покращення, будь-яке. Я наполягаю.'],
    ],
    objective: (c) => ({ text: 'купити будь-яке покращення (майстерня на БЕТІ)', done: c.upgradeLevels >= 1 }),
    outro: [[ORION, 'Оце інша розмова. Тепер ти не просто вантажівка.']],
  },
  {
    id: 'scrap10',
    brief: [
      [ORION, 'Поки ти там, добери мотлоху. Десять шматків — і в нас буде запас на дорогу.'],
    ],
    objective: (c) => ({ text: `зібрати мотлох ${Math.min(c.scrap, 10)}/10`, done: c.scrap >= 10 }),
    outro: [[ORION, 'Десять. Склад перестав на мене кричати.']],
  },
  {
    id: 'deliver4',
    brief: [
      [ORION, 'Лишились останні два модулі. Закриємо цю історію — і БЕТА нарешті вийде на живлення.'],
    ],
    objective: (c) => ({ text: `здати модулі ${Math.min(c.delivered, 4)}/4`, done: c.delivered >= 4 }),
    outro: [
      [ORION, 'БЕТА на живленні. Чотири з чотирьох, Сьомий.'],
      [ORION, 'І ось тепер у мене є для тебе дещо, за що начальство мене не похвалить.'],
    ],
  },
  {
    id: 'verdanta',
    brief: [
      [ORION, 'Зонд знайшов планету. Вода, зелень, тяжіння майже земне. Вона в каталозі під номером, але хлопці кличуть її Вердантою.'],
      [ORION, 'Твій ровер там уже чекає — з усім, що ти на нього поставив. Лети.'],
      [ORION, 'Меню → Налаштування → планета → Верданта.'],
    ],
    objective: (c) => ({
      text: c.planet === 'verdanta' ? 'оглянути Верданту' : 'вилетіти на Верданту (меню → планета)',
      done: c.planet === 'verdanta',
    }),
    outro: [
      [ORION, 'Сьомий, ти чуєш? Там тече вода. Справжня.'],
    ],
  },
  {
    id: 'seeds2',
    brief: [
      [LIRA, 'Сьомий? Це Ліра, біолабораторія. Я сиджу в модулі біля АЛЬФИ — зелений маяк, не проґавиш.'],
      [LIRA, 'Розвідувальний скид розкидав п’ять зондів-насіння: культури ґрунту, спори, водорості. Вони лежать уздовж річки і в лузі.'],
      [LIRA, 'Привези мені хоча б два. Вони на карті, світяться кожен своїм кольором.'],
    ],
    objective: (c) => ({
      text: c.planet === 'verdanta' ? `здати зонди в лабораторію ${Math.min(c.seeds, 2)}/2` : 'повернутися на Верданту (меню → планета)',
      done: c.seeds >= 2,
    }),
    outro: [
      [LIRA, 'Отримала. «Мох» уже прокинувся в чашці — тут, у цьому повітрі, він росте сам.'],
      [ORION, 'Ліра каже, ти їй подобаєшся. Не розслабляйся.'],
    ],
  },
  {
    id: 'seeds5',
    brief: [
      [LIRA, 'Решта три — далі від табору, один аж біля дальнього вигину річки. Без них я не складу повну картину.'],
      [LIRA, 'Бережи заряд: вода тягне колеса, а трава ховає каміння.'],
    ],
    objective: (c) => ({
      text: c.planet === 'verdanta' ? `здати всі зонди ${Math.min(c.seeds, 5)}/5` : 'повернутися на Верданту (меню → планета)',
      done: c.seeds >= 5,
    }),
    outro: [
      [LIRA, 'П’ять із п’яти. Сьомий... вони всі живі. Усі п’ять культур прийнялися.'],
      [ORION, 'Від Гермеса-1 на Місяці — до живого ґрунту на Верданті. Дванадцять років, Сьомий.'],
      [ORION, 'Станція БЕТА на живленні, лабораторія працює, на цій планеті вперше щось росте з нашої руки.'],
      [ORION, 'Наказів у мене більше немає. Дякую тобі. Кінець зміни.'],
    ],
  },
];

export function createStory() {
  return {
    // The current job, or null once the chain is finished.
    get step() { return STEPS[progress.step] || null; },
    get finished() { return progress.step >= STEPS.length; },
    get total() { return STEPS.length; },
    get index() { return Math.min(progress.step, STEPS.length); },

    // The line under the title: what to do right now.
    objective(ctx) {
      const s = STEPS[progress.step];
      return s ? s.objective(ctx) : { text: 'вільний політ', done: false };
    },

    // Messages owed to the player: the briefing for a step not yet briefed, then, once
    // its objective is met, the sign-off plus the next briefing. Returns [] most frames.
    poll(ctx) {
      const out = [];
      let s = STEPS[progress.step];
      if (!s) return out;
      if (progress.briefed < progress.step) {
        progress.briefed = progress.step;
        out.push(...s.brief);
      }
      if (s.objective(ctx).done) {
        out.push(...(s.outro || []));
        progress.step = progress.step + 1;
        s = STEPS[progress.step];
        if (s) {
          progress.briefed = progress.step;
          out.push(...s.brief);
        }
      }
      return out;
    },
  };
}
