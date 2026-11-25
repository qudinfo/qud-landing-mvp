(() => {
  const summaries = [
  [
    "Глубина стола. Экран можно отодвинуть на удобное расстояние, оставив перед клавиатурой место для рук и записей.",
    "Расположение экранов. Основной монитор удобнее держать прямо перед собой, а боковой поворачивать к себе.",
    "Крепление. Для кронштейна нужны доступ к краю столешницы снизу и запас места у стены для поворота.",
    "Регулировка высоты. Внешний монитор и экран ноутбука удобно выставлять на одном уровне.",
    "Смена задач. Поворот одного экрана в вертикальное положение упрощает работу с длинными таблицами."
  ],
  [
    "Доступ к зарядке. Часто используемые разъёмы и концы проводов удобнее держать у края стола.",
    "Замена техники. Маркировка кабелей и открывающийся лоток помогают заменить один провод, сохранив остальные подключения.",
    "Регулировка стола. Запас длины кабелей нужен по всему ходу столешницы, включая верхнее положение.",
    "Свободное место для ног. Блоки питания и лишнюю длину проводов удобнее убирать в лоток под столешницей."
  ],
  [
    "Опора для рук. Скруглённый передний край и место перед клавиатурой помогают удобно положить предплечья.",
    "Устойчивость. При наборе текста и движении мыши колебания столешницы передаются на экраны.",
    "Посадка. Высота столешницы и положение поперечины вместе определяют, можно ли придвинуть кресло и вытянуть ноги.",
    "Работа с бумагами. Для отчётов нужна свободная матовая поверхность рядом с клавиатурой."
  ],
  [
    "Совместный разбор. Соседям удобно видеть друг друга и разворачивать экран для обсуждения графика.",
    "Сменные места. Одинаковые разъёмы и доступное питание сокращают время подключения ноутбука за другим столом.",
    "Проходы. Расстояние между рядами стоит оценивать с отодвинутыми креслами, когда все места заняты.",
    "Освещение. Направленный свет на каждом столе позволяет читать документы без бликов на соседних экранах."
  ]
];
  const list = document.querySelector('#feed-list');
  const play = document.querySelector('#feed-play');
  const pause = document.querySelector('#feed-pause');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let paused = reduced.matches;
  let motion;

  function select(index) {
    motion?.cancel();
    topics.forEach((button, i) => button.setAttribute('aria-pressed', String(index === i)));
    list.replaceChildren();
    for (const copy of [false, true]) {
      for (const comment of summaries[index]) {
        const item = document.createElement('li');
        item.textContent = comment;
        if (copy) item.setAttribute('aria-hidden', 'true');
        list.append(item);
      }
    }
    motion = list.animate(
      [{transform: 'translateY(0)'}, {transform: 'translateY(-50%)'}],
      {duration: summaries[index].length * 6000, iterations: Infinity, easing: 'linear'}
    );
    updateControl();
  }

  function updateControl() {
    if (paused) motion.pause();
    else motion.play();
    play.setAttribute('aria-pressed', String(!paused));
    pause.setAttribute('aria-pressed', String(paused));
  }

  play.onclick = () => { paused = false; updateControl(); };
  pause.onclick = () => { paused = true; updateControl(); };
  topics.forEach((button, index) => button.onclick = () => select(index));
  select(0);
})();

for (const field of document.querySelectorAll('#role, #comment')) {
  const example = field.placeholder;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches || field.value) continue;
  let length = 0;
  field.placeholder = '';
  const timer = setInterval(() => {
    field.placeholder = example.slice(0, ++length);
    if (length >= example.length) clearInterval(timer);
  }, 60);
  field.addEventListener('focus', () => {
    clearInterval(timer);
    field.placeholder = example;
  }, {once:true});
}

const help = document.querySelector('.feedback-help');
const trigger = help.querySelector('button');
const note = help.querySelector('span');
let pinned = false;
function showNote(open) {
  note.hidden = !open;
  trigger.setAttribute('aria-expanded', String(open));
}
function closeNote() {
  pinned = false;
  showNote(false);
}
help.onpointerenter = event => { if (event.pointerType === 'mouse') showNote(true); };
help.onpointerleave = () => { if (!pinned) showNote(false); };
trigger.onfocus = () => showNote(true);
trigger.onblur = closeNote;
trigger.onclick = () => { pinned = !pinned; showNote(pinned); };
document.addEventListener('pointerdown', event => { if (!help.contains(event.target)) closeNote(); });
document.addEventListener('keydown', event => { if (event.key === 'Escape') closeNote(); });
