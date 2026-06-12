/* Stilte — inspiratiequotes (dagquote + willekeurig na afloop) */

const Quotes = (() => {
  const LIST = [
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
  ];

  function ofDay(date = new Date()) {
    const seed = date.getFullYear() * 372 + date.getMonth() * 31 + date.getDate();
    return LIST[seed % LIST.length];
  }

  function random() {
    return LIST[Math.floor(Math.random() * LIST.length)];
  }

  return { ofDay, random };
})();
