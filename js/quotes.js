/* Stilte — inspiratiequotes per taal (dagquote + willekeurig na afloop).
   Beide lijsten lopen gelijk op (zelfde volgorde/auteurs), zodat de
   dagquote in elke taal dezelfde gedachte toont. */

const Quotes = (() => {
  const LIST = {
    nl: [
      { t: "Adem in, en je weet dat je inademt. Adem uit, en je weet dat je uitademt.", a: "Thich Nhat Hanh" },
      { t: "Stilte is geen leegte, maar volheid die je nog niet kent.", a: "Onbekend" },
      { t: "Het gevoel dat je hebt wanneer je stil zit, is je thuis.", a: "Rumi" },
      { t: "Vrede komt van binnen. Zoek haar niet daarbuiten.", a: "Boeddha" },
      { t: "De natuur haast zich niet, en toch wordt alles volbracht.", a: "Lao Tze" },
      { t: "Je bent de lucht. Al het andere is slechts het weer.", a: "Pema Chödrön" },
      { t: "Wie naar buiten kijkt, droomt. Wie naar binnen kijkt, ontwaakt.", a: "Carl Jung" },
      { t: "Tussen prikkel en reactie ligt een ruimte. In die ruimte ligt onze vrijheid.", a: "Viktor Frankl" },
      { t: "Laat los, of word meegesleept.", a: "Zen-gezegde" },
      { t: "Het mooiste moment om te beginnen was gisteren. Het op één na mooiste is nu.", a: "Onbekend" },
      { t: "Een rustige geest hoort alles.", a: "Zen-gezegde" },
      { t: "Niet het vele is goed, maar het goede is veel.", a: "Onbekend" },
      { t: "Verleden en toekomst zijn gedachten. Alleen dit moment is leven.", a: "Thich Nhat Hanh" },
      { t: "Zoals water helder wordt door stil te staan, zo wordt de geest helder in rust.", a: "Taoïstische wijsheid" },
      { t: "Je hoeft de golven niet te stoppen, maar je kunt leren surfen.", a: "Jon Kabat-Zinn" },
      { t: "Meditatie is niet ontsnappen aan het leven, maar er volledig in aankomen.", a: "Onbekend" },
      { t: "Elke ochtend worden we opnieuw geboren. Wat we vandaag doen telt het meest.", a: "Boeddha" },
      { t: "Geluk is geen bestemming, maar een manier van reizen.", a: "Onbekend" },
      { t: "De stilte tussen twee gedachten is de deur naar jezelf.", a: "Onbekend" },
      { t: "Draag de stilte met je mee, ook als de wereld lawaai maakt.", a: "Onbekend" },
      { t: "Wees als een boom: geworteld in de aarde, reikend naar de hemel.", a: "Onbekend" },
      { t: "Wat je zoekt, zoekt jou.", a: "Rumi" },
      { t: "Rust is niet de afwezigheid van beweging, maar de aanwezigheid van aandacht.", a: "Onbekend" },
      { t: "Eén ademhaling met volle aandacht is waardevoller dan duizend in verstrooidheid.", a: "Onbekend" },
      { t: "De berg buigt niet voor de storm; hij laat de storm voorbijgaan.", a: "Onbekend" },
      { t: "Je gedachten zijn wolken. Jij bent de hemel waarin ze drijven.", a: "Onbekend" },
      { t: "Doe één ding tegelijk, en doe het met heel je hart.", a: "Zen-gezegde" },
      { t: "Zachtheid overwint wat kracht niet kan.", a: "Lao Tze" },
      { t: "Hoe stiller je wordt, hoe meer je kunt horen.", a: "Ram Dass" },
      { t: "Begin waar je bent. Gebruik wat je hebt. Doe wat je kunt.", a: "Arthur Ashe" },
      { t: "Het kleinste moment van aandacht is groter dan de grootste afleiding.", a: "Onbekend" },
      { t: "Vandaag is een goede dag om niets te hoeven.", a: "Onbekend" },
      { t: "Word stil, en de aarde draagt je.", a: "Onbekend" },
      { t: "Een dag zonder haast is een geschenk aan jezelf.", a: "Onbekend" },
      { t: "Alles wat je nodig hebt, is hier — in deze ene ademhaling.", a: "Onbekend" },
      { t: "De lotus bloeit in de modder.", a: "Boeddhistische wijsheid" }
    ],
    en: [
      { t: "Breathing in, you know you are breathing in. Breathing out, you know you are breathing out.", a: "Thich Nhat Hanh" },
      { t: "Silence is not emptiness, but a fullness you have yet to discover.", a: "Unknown" },
      { t: "The feeling you have when you sit in stillness is your home.", a: "Rumi" },
      { t: "Peace comes from within. Do not seek it without.", a: "Buddha" },
      { t: "Nature does not hurry, yet everything is accomplished.", a: "Lao Tzu" },
      { t: "You are the sky. Everything else is just the weather.", a: "Pema Chödrön" },
      { t: "Who looks outside, dreams; who looks inside, awakes.", a: "Carl Jung" },
      { t: "Between stimulus and response there is a space. In that space lies our freedom.", a: "Viktor Frankl" },
      { t: "Let go, or be dragged.", a: "Zen saying" },
      { t: "The best moment to begin was yesterday. The next best is now.", a: "Unknown" },
      { t: "A quiet mind hears everything.", a: "Zen saying" },
      { t: "More is not better; better is more.", a: "Unknown" },
      { t: "Past and future are thoughts. Only this moment is life.", a: "Thich Nhat Hanh" },
      { t: "As water grows clear by being still, the mind grows clear in rest.", a: "Taoist wisdom" },
      { t: "You can't stop the waves, but you can learn to surf.", a: "Jon Kabat-Zinn" },
      { t: "Meditation is not escaping life, but fully arriving in it.", a: "Unknown" },
      { t: "Each morning we are born again. What we do today matters most.", a: "Buddha" },
      { t: "Happiness is not a destination, but a way of travelling.", a: "Unknown" },
      { t: "The silence between two thoughts is the door to yourself.", a: "Unknown" },
      { t: "Carry the stillness with you, even when the world is loud.", a: "Unknown" },
      { t: "Be like a tree: rooted in the earth, reaching for the sky.", a: "Unknown" },
      { t: "What you seek is seeking you.", a: "Rumi" },
      { t: "Rest is not the absence of motion, but the presence of attention.", a: "Unknown" },
      { t: "One breath taken with full attention is worth more than a thousand in distraction.", a: "Unknown" },
      { t: "The mountain does not bow to the storm; it lets the storm pass.", a: "Unknown" },
      { t: "Your thoughts are clouds. You are the sky they drift in.", a: "Unknown" },
      { t: "Do one thing at a time, and do it with all your heart.", a: "Zen saying" },
      { t: "Softness overcomes what force cannot.", a: "Lao Tzu" },
      { t: "The quieter you become, the more you can hear.", a: "Ram Dass" },
      { t: "Start where you are. Use what you have. Do what you can.", a: "Arthur Ashe" },
      { t: "The smallest moment of attention is greater than the greatest distraction.", a: "Unknown" },
      { t: "Today is a good day to have nothing to do.", a: "Unknown" },
      { t: "Become still, and the earth will carry you.", a: "Unknown" },
      { t: "A day without hurry is a gift to yourself.", a: "Unknown" },
      { t: "Everything you need is here — in this one breath.", a: "Unknown" },
      { t: "The lotus blooms in the mud.", a: "Buddhist wisdom" }
    ]
  };

  function pool(lang) {
    return LIST[lang] || LIST.nl;
  }

  function ofDay(lang, date = new Date()) {
    const list = pool(lang);
    const seed = date.getFullYear() * 372 + date.getMonth() * 31 + date.getDate();
    return list[seed % list.length];
  }

  function random(lang) {
    const list = pool(lang);
    return list[Math.floor(Math.random() * list.length)];
  }

  return { ofDay, random };
})();
