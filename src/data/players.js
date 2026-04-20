// ─────────────────────────────────────────────────────────────────────────────
// players.js  –  Noms, nationalités, rôles, personnalités
// ─────────────────────────────────────────────────────────────────────────────

// ── Pools de noms hérités (rétrocompatibilité) ────────────────────────────────

export const FIRST_NAMES = [
  'Noah','Elias','Malo','Ilan','Sacha','Nolan','Yanis','Tiago','Milan','Lenny',
  'Enzo','Rayan','Mathis','Loris','Nino','Adem','Ilyes','Tomas','Dario','Samir',
  'Nael','Hugo','Axel','Leo','Malik','Esteban','Aaron','Oscar','Noe','Isaac',
  'Ismael','Matis','Luca','Kassim','Wassim','Robin','Clement','Adrien','Basile',
  'Gael','Theo','Evan','Nassim','Younes','Mael','Anis','Kenny','Sofiane',
];

export const LAST_NAMES = [
  'Morel','Lacroix','Bertin','Garnier','Da Silva','Ferreira','Mendes','Ribeiro',
  'Navarro','Cortina','Ramos','Serrano','Costa','Pereira','Barbosa','Duarte',
  'Ndiaye','Traore','Camara','Ba','Diallo','Kone','Benali','Haddad','Aydin',
  'Yilmaz','Novak','Horvat','Kovac','Marin','Russo','Conti','Rinaldi','Bianchi',
  'Schneider','Keller','Vogel','Meier','Walker','Bennett','Cooper','Reed',
  'Murphy','Carter','Borges','Cardoso','Vieira','Santos',
];

// ── Pools par nationalité – étendus (~50 prénoms / ~50 noms par pays) ─────────

export const COUNTRY_NAME_POOLS = {
  // ── France ──────────────────────────────────────────────────────────────────
  FR: {
    first: [
      'Noah','Malo','Ilan','Sacha','Nolan','Yanis','Lenny','Mathis','Loris','Nael',
      'Hugo','Axel','Noe','Matis','Robin','Clement','Adrien','Basile','Theo','Mael',
      'Sofiane','Anis','Lucas','Thomas','Antoine','Kevin','Rayan','Mehdi','Dylan',
      'Maxime','Julien','Baptiste','Florian','Quentin','Remi','Corentin','Alexis',
      'Etienne','Dorian','Gael','Enzo','Luca','Tom','Cyril','Yoann','Alexandre',
      'Pierrick','Samuel','Nicolas','Xavier',
    ],
    last: [
      'Morel','Lacroix','Bertin','Garnier','Marchand','Collet','Rouxel','Perrot',
      'Lemoine','Vasseur','Renard','Delmas','Le Goff','Bourdon','Besson','Charpentier',
      'Ndiaye','Traore','Diallo','Kone','Dembele','Cisse','Toure','Sylla','Sow',
      'Guirassy','Camara','Doumbia','Bakayoko','Sangare','Mendy','Diop','Ba','Fall',
      'Dupont','Lecomte','Fontaine','Chevalier','Aubert','Pires','Girard','Vidal',
      'Lambert','Colin','Laurent','Fabre','Jacquet','Lefebvre','Moulin','Texier',
    ],
  },

  // ── Espagne ──────────────────────────────────────────────────────────────────
  ES: {
    first: [
      'Mateo','Iker','Dario','Tomas','Unai','Nico','Hugo','Sergio','Pablo','Diego',
      'Adrian','Javi','Alvaro','Mario','Ruben','Ivan','Saul','Cesar','Carlos','Jorge',
      'Roberto','David','Marc','Pau','Ferran','Izan','Bruno','Ares','Yannick','Borja',
      'Alejandro','Liam','Iker','Mikel','Asier','Andoni','Jon','Julen','Aitor','Kepa',
      'Raul','Fernando','Hernan','Pedro','Victor','Marcos','Gonzalo','Miguel','Oscar','Juanmi',
    ],
    last: [
      'Navarro','Cortina','Ramos','Serrano','Molina','Ortega','Fuentes','Vega','Calvo','Paredes',
      'Iglesias','Soler','Campos','Arias','Rojas','Medina','Moreno','Garcia','Lopez','Martinez',
      'Fernandez','Torres','Rodriguez','Gonzalez','Sanchez','Perez','Gomez','Ruiz','Jimenez',
      'Diaz','Herrera','Flores','Castro','Reyes','Gutierrez','Romero','Vargas','Blanco',
      'Sanz','Pardo','Munoz','Gil','Moya','Llorente','Carvajal','Nadal','Valero','Prat',
    ],
  },

  // ── Angleterre / Royaume-Uni ─────────────────────────────────────────────────
  GB: {
    first: [
      'Oscar','Isaac','Aaron','Mason','Elliot','Noah','Archie','Harvey','Callum','Lewis',
      'Finley','Reece','Owen','Liam','Jayden','Corey','Jack','Harry','James','George',
      'Charlie','Oliver','William','Ethan','Tyler','Ben','Ryan','Sam','Alex','Tom',
      'Jake','Jamie','Luke','Scott','Jordan','Connor','Kyle','Adam','Josh','Nathan',
      'Kieran','Marcus','Rico','Trent','Declan','Phil','Curtis','Bailey','Cole','Emery',
    ],
    last: [
      'Walker','Bennett','Cooper','Reed','Murphy','Carter','Hughes','Watson','Morris','Parker',
      'Foster','Hayes','Mason','Webb','Ellis','Walsh','Shaw','Ward','Phillips','Henderson',
      'Maguire','Barker','Hugheson','Trippier','Sayer','Bramwell','Rice','Greaves','Moss',
      'Gallagher','Evans','Dier','Gomez','Stones','Coady','White','Ramsdale','Pope','Pickford',
      'Smith','Jones','Taylor','Brown','Wilson','Clarke','Hall','Davis','Thomas','Jackson',
    ],
  },

  // ── Allemagne ────────────────────────────────────────────────────────────────
  DE: {
    first: [
      'Lukas','Jonas','Finn','Mats','Timo','Niklas','Emil','Leon','Felix','Ben',
      'Anton','Moritz','Noel','Jannik','Lennart','Florian','Lars','Tom','Serge',
      'Robin','Joshua','Marco','Kai','Ilhan','Toni','Christopher','Noah','Nico','Luca',
      'Tobias','Christian','Sven','Stefan','Michael','Daniel','Kevin','Marcel','Simon',
      'Fabian','Dennis','Bastian','Lars','Jan','Rene','Patrick','Andre','Julian','Erik',
    ],
    last: [
      'Schneider','Keller','Vogel','Meier','Becker','Hoffmann','Kruger','Fischer','Brandt','Weber',
      'Hartmann','Kraus','Neumann','Seidel','Muller','Koch','Richter','Klein','Schulz','Schäfer',
      'Werner','Bruckner','Kasper','Kellermann','Hassler','Meyer','Wolff','Brandst','Gies',
      'Kaiser','Stein','Neumann','Hummel','Baer','Sule','Kehrer','Henrichs','Arnold',
      'Andrich','Sule','Tah','Anton','Pieper','Schlotterbeck','Raum','Mittelstadt','Undav',
    ],
  },

  // ── Italie ───────────────────────────────────────────────────────────────────
  IT: {
    first: [
      'Luca','Matteo','Gioele','Andrea','Elia','Riccardo','Davide','Simone','Nico','Fabio',
      'Marco','Alessio','Pietro','Samuele','Federico','Lorenzo','Nicolo','Giacomo','Mattia',
      'Domenico','Giovanni','Vincenzo','Luigi','Paolo','Filippo','Emanuele','Daniele','Cristian',
      'Gianluca','Stefano','Roberto','Carlo','Claudio','Massimo','Michele','Alessandro','Sergio',
      'Alberto','Enrico','Edoardo','Sebastiano','Salvatore','Antonio','Francesco','Christian',
    ],
    last: [
      'Russo','Conti','Rinaldi','Bianchi','Gallo','Romano','Ferrari','Marino','Greco','Ricci',
      'Lombardi','Fontana','Barone','Vitale','Esposito','Ferrara','Belardi','Sannino','Rossi',
      'Tonelli','Frattini','Pellegrino','Chiari','Zanetti','Locati','Bassi','Acerbi','Darmian',
      'Mancini','Cristiano','Giordano','Donati','Meret','Proietti','Scaletti','Fagioli',
      'Cambiasso','Gatti','Miretti','Casadei','Gnotti','Lucenti','Kayode','Nzola','Chukwueze',
    ],
  },

  // ── Pays-Bas ──────────────────────────────────────────────────────────────────
  NL: {
    first: [
      'Daan','Milan','Sem','Levi','Jens','Ties','Noud','Ruben','Mees','Bram',
      'Stijn','Joris','Frenk','Milo','Virgil','Daley','Stefan','Gino',
      'Denzel','Matthijs','Jurrien','Ryan','Nathan','Xavi','Cody','Wout','Brian',
      'Bart','Lars','Sander','Tim','Tom','Finn','Max','Noah','Luuk','Bas',
    ],
    last: [
      'De Vries','Van Dijk','Jansen','Bakker','Visser','Smit','Meijer','Bos','Vos','Peters',
      'Kuiper','Mulder','De Jong','Dumfries','Blind','Depay','Bergs','Gako','Timber',
      'Gravenberch','Malen','Weghorst','Janssen','Klaassen','Noppert','Flekken','Verbruggen',
      'Van den Berg','Schouten','Veerman','Reijnders','Wieffer','Geertruida','Hartman',
    ],
  },

  // ── Portugal ─────────────────────────────────────────────────────────────────
  PT: {
    first: [
      'Tiago','Dinis','Goncalo','Rafael','Nuno','Diogo','Andre','Tomas','Miguel','Fabio',
      'Ivo','Bruno','Joao','Bernardo','William','Ricardo','Cedric','Danilo','Ruben','Rafa',
      'Pedro','Nelson','Vitor','David','Renato','Matheus','Rodrigo','Jorge','Marco','Mario',
      'Eduardo','Francisco','Manuel','Luis','Simao','Hugo','Carlos','Sergio','Antonio','Paulo',
    ],
    last: [
      'Ferreira','Mendes','Ribeiro','Costa','Pereira','Barbosa','Duarte','Borges','Cardoso',
      'Vieira','Teixeira','Rocha','Silva','Santos','Sousa','Carvalho','Fernandes','Neves',
      'Canelas','Dias','Semedo','Guerreiro','Moutinho','Danilo','Neveso','Vitinha',
      'Bernal','Neto','Trincao','Jota','Lemos','Conceicao','Felix','Horta','Otavio',
    ],
  },

  // ── Brésil ───────────────────────────────────────────────────────────────────
  BR: {
    first: [
      'Caio','Joao','Rafael','Bruno','Felipe','Thiago','Renan','Igor','Lucas','Davi',
      'Kaique','Matheus','Wesley','Caua','Rodrigo','Vincent','Eden','Savio','Rafael',
      'Gabriel','Marcos','Casio','Fred','Fabio','Allan','Edson','Alex','Tito',
      'Anderson','Willian','Douglas','Roberto','Rodolfo','Natan','Malcom','Rian',
      'Firmino','Joel','Everton','Antoni','Andreas','Eder','Victor','Ruan','Talles',
    ],
    last: [
      'Borges','Cardoso','Vieira','Santos','Lima','Moura','Araujo','Batista','Rezende',
      'Tavares','Monteiro','Nogueira','Da Silva','Dos Santos','De Souza','Oliveira',
      'Rodrigues','Ferreira','Alves','Costa','Nunes','Militao','Dias','Eder','Mendes',
      'Gomes','Pereira','Barbosa','Xavier','Machado','Pinto','Ramos','Cruz','Melo',
    ],
  },

  // ── Argentine ────────────────────────────────────────────────────────────────
  AR: {
    first: [
      'Thiago','Tomas','Facundo','Lautaro','Nicolas','Franco','Bruno','Matias','Ezequiel',
      'Valentin','Agustin','Santino','Alejandro','Julian','Enzo','Rodrigo','Cristian',
      'Leandro','Gonzalo','Hernan','Diego','Pablo','Leonardo','Maximiliano','Sebastian',
      'Federico','Mariano','Martin','Ricardo','Carlos','Eduardo','Jorge','Ramon','Oscar',
    ],
    last: [
      'Sosa','Acosta','Ferreyra','Ponce','Molina','Vera','Cabrera','Pereyra','Luna','Correa',
      'Roldan','Benitez','Martinez','Mena','Del Valle','Macias','Fernandez','Almada',
      'Otamendi','Romero','Lisandro','Tagliafico','Acuna','Ledesma','Julio','Lautaro',
      'Dybala','Diaz','Paredes','Lo Celso','Paz','Exequiel','Nahuel','Guido',
    ],
  },

  // ── Sénégal ──────────────────────────────────────────────────────────────────
  SN: {
    first: [
      'Sadio','Idrissa','Kalidou','Ismaila','Moussa','Cheikhou','Pape','Abdou','Bamba',
      'Lamine','Iliman','Nicolas','Pathé','Habib','Saliou','Mamadou','Ibrahima','Seydou',
      'Diomaye','Aliou','Seny','Abdallah','Cheikh','Daouda','Papis','Modou','Amara',
    ],
    last: [
      'Mane','Gueye','Koulibaly','Sarr','Kouyate','Kouyate','Diagne','Sabaly','Diallo',
      'Sow','Ndiaye','Ba','Fall','Mendy','Badji','Camara','Cisse','Gassama','Paye',
      'Faye','Toure','Diouf','Mbaye','Diallo','Sylla','Deme','Sane','Traore',
    ],
  },

  // ── Cameroun ─────────────────────────────────────────────────────────────────
  CM: {
    first: [
      'Andre','Vincent','Samuel','Harold','Olivier','Nicolas','Jean','Maxime','Bryan',
      'Cedric','Christian','Patrice','Pierre','Stephane','Joel','Thierry','Franck',
      'Jean-Pierre','Karl','Collins','Gaetan','Arnaud','Axel','Sebastien',
    ],
    last: [
      'Onana','Zambo','Anguissa','Choupo','Moukandjo','Aboubakar','Tolo','Ngadeu','Fai',
      'Ntcham','Oyongo','Bassogog','Toko','Ekambi','Wooh','Mbacke','Lyle','Ebosse',
      'Lomb','Bengui','Trescos','Nkoudou','Biface','Djigui',
    ],
  },

  // ── Côte d'Ivoire ─────────────────────────────────────────────────────────────
  CI: {
    first: [
      'Franck','Wilfried','Nicolas','Serge','Gradel','Kessie','Pape','Zaha','Haller',
      'Deli','Oumar','Kouassi','Konan','Yao','Koffi','Eboue','Tiote','Bamba',
      'Gervais','Ismael','Lacina','Sylvain','Arouna','Cheick',
    ],
    last: [
      'Kessie','Zaha','Haller','Pepe','Gradel','Deli','Toure','Drogba','Kalou','Diomande',
      'Sangare','Kouame','Dao','Gbohouo','Mandjeck','Bamba','Konan','Fofana','Akpa',
      'Camara','Gbamin','Bayo','Djire','Yao',
    ],
  },

  // ── Maroc ─────────────────────────────────────────────────────────────────────
  MA: {
    first: [
      'Achraf','Hakim','Romain','Noussair','Sofyan','Youssef','Azzedine','Yahya','Amine',
      'Zakaria','Ilias','Said','Nayef','Adam','Anass','Mehdi','Brahim','Selim',
      'Imraan','Tarik','Abdel','Jawad','Hamza','Yassine',
    ],
    last: [
      'Hakimi','Ziyech','Saiss','Mazraoui','Amrabat','En-Nesyri','Boufal','Benoun',
      'Aguerd','Bono','Dari','Ounahi','Attiat-Allah','Benali','Rahimi','Adli','Chair',
      'Belkhir','Abde','Cheddira','Aoulad','Idrissi','Benrahma','El Kaabi',
    ],
  },

  // ── Nigeria ───────────────────────────────────────────────────────────────────
  NG: {
    first: [
      'Victor','Wilfried','Emmanuel','Kelechi','Alex','Moses','Oghenekaro','Ayo','Odion',
      'Ahmed','Taiwo','Kenneth','Chukwuemeka','Cyriel','Chidera','Samson','Paul',
      'Chisom','Blessing','Terem','Fisayo','Ola','Emeka','Ebere',
    ],
    last: [
      'Osimhen','Iheanacho','Lookman','Musa','Simon','Aina','Etebo','Troost-Ekong',
      'Ndidi','Onyekuru','Chukwueze','Awoniyi','Aribo','Balogun','Eze','Maja',
      'Okonkwo','Ajayi','Uzoho','Obi','Nwakali','Onuachu','Ejuke','Naiby',
    ],
  },

  // ── Ghana ─────────────────────────────────────────────────────────────────────
  GH: {
    first: [
      'Mohammed','Thomas','Andre','Jordan','Baba','Christian','Kamaldeen','Antoine',
      'Joseph','Daniel','Emmanuel','Inaki','Nicholas','Foster','Osman','Ransford',
      'Elisha','Iddrisu','Tariq','Majeed',
    ],
    last: [
      'Salisu','Partey','Ayew','Kudus','Balogun','Djiku','Mensah','Kyereh','Sarfo',
      'Semenyo','Sulemana','Nuamah','Paintsil','Asante','Owusu','Owusu-Oduro','Amartey',
      'Lamptey','Baba','Acheampong',
    ],
  },

  // ── Turquie ───────────────────────────────────────────────────────────────────
  TR: {
    first: [
      'Hakan','Kenan','Baris','Arda','Ozan','Zeki','Caglar','Merih','Berkan','Yunus',
      'Abdülkadir','Samet','Halil','Orkun','Dogukan','Emre','Cenk','Yusuf','Taylan',
    ],
    last: [
      'Calhanoglu','Yildiz','Kocak','Guler','Kabak','Celik','Demiral','Soyuncu','Karatas',
      'Akturkoglu','Omur','Aydin','Tosun','Turuc','Bayram','Yilmaz','Ayhan','Sanli',
    ],
  },

  // ── Ukraine ───────────────────────────────────────────────────────────────────
  UA: {
    first: [
      'Oleksandr','Mykhailo','Viktor','Andriy','Ruslan','Sergiy','Maksym','Artem','Yevhen',
      'Bohdan','Oleh','Vitaliy','Vladyslav','Daniil','Oleksiy','Pavlo',
    ],
    last: [
      'Mudryk','Zinchenko','Shevchenko','Malinovsky','Malinovskyi','Dovbyk','Tsygankov',
      'Buyalskiy','Sydorchuk','Shaparenko','Matvienko','Zabarny','Stepanenko','Luchkevych',
      'Konoplia','Lunin','Trubin',
    ],
  },
};

// Alias : EN utilisé dans clubs.js pour England → même pool que GB
COUNTRY_NAME_POOLS.EN = COUNTRY_NAME_POOLS.GB;

// ── Positions et rôles ────────────────────────────────────────────────────────

export const POSITIONS = ['ATT', 'MIL', 'DEF', 'GK'];

export const POSITION_ROLES = {
  GK: [
    { id: 'goalkeeper',     label: 'Gardien de but',  short: 'GB',  family: 'GK'  },
    { id: 'sweeper_keeper', label: 'Gardien libéro',  short: 'GL',  family: 'GK'  },
  ],
  DEF: [
    { id: 'center_back',      label: 'Défenseur central', short: 'DC',  family: 'DEF' },
    { id: 'libero',           label: 'Libéro',            short: 'LIB', family: 'DEF' },
    { id: 'right_back',       label: 'Latéral droit',     short: 'LD',  family: 'DEF' },
    { id: 'left_back',        label: 'Latéral gauche',    short: 'LG',  family: 'DEF' },
    { id: 'right_wing_back',  label: 'Piston droit',      short: 'PD',  family: 'DEF' },
    { id: 'left_wing_back',   label: 'Piston gauche',     short: 'PG',  family: 'DEF' },
  ],
  MIL: [
    { id: 'defensive_mid',  label: 'Milieu défensif',  short: 'MDC', family: 'MIL' },
    { id: 'box_to_box',     label: 'Box-to-box',       short: 'B2B', family: 'MIL' },
    { id: 'central_mid',    label: 'Milieu central',   short: 'MC',  family: 'MIL' },
    { id: 'playmaker',      label: 'Meneur de jeu',    short: 'MJ',  family: 'MIL' },
    { id: 'attacking_mid',  label: 'Milieu offensif',  short: 'MO',  family: 'MIL' },
    { id: 'right_winger',   label: 'Ailier droit',     short: 'AD',  family: 'MIL' },
    { id: 'left_winger',    label: 'Ailier gauche',    short: 'AG',  family: 'MIL' },
  ],
  ATT: [
    { id: 'striker',         label: 'Avant-centre',        short: 'AC', family: 'ATT' },
    { id: 'target_man',      label: 'Attaquant de pointe', short: 'AP', family: 'ATT' },
    { id: 'second_striker',  label: 'Deuxième attaquant',  short: 'DA', family: 'ATT' },
    { id: 'false_9',         label: 'Faux 9',              short: 'F9', family: 'ATT' },
    { id: 'winger_forward',  label: 'Ailier offensif',     short: 'AO', family: 'ATT' },
  ],
};

// Legacy role IDs kept for save compatibility
export const LEGACY_ROLE_MAP = {
  number_9:    { label: 'Numéro 9',   short: '9',   family: 'ATT' },
  full_back:   { label: 'Latéral',    short: 'LAT', family: 'DEF' },
  holding_mid: { label: 'Sentinelle', short: 'MDC', family: 'MIL' },
  winger:      { label: 'Ailier',     short: 'AIL', family: 'MIL' },
};

export const ALL_POSITION_ROLES = Object.values(POSITION_ROLES).flat();

export const getRoleForPosition = (position, roleId) => {
  const fallback = POSITION_ROLES[position]?.[0] ?? POSITION_ROLES.ATT[0];
  const found = ALL_POSITION_ROLES.find((role) => role.id === roleId);
  if (found) return found;
  if (LEGACY_ROLE_MAP[roleId]) return { id: roleId, ...LEGACY_ROLE_MAP[roleId] };
  return fallback;
};

// ── Personnalités ─────────────────────────────────────────────────────────────

export const PERSONALITIES = [
  'fetard','professionnel','ambitieux','loyal','instable','leader','mercenaire',
];

export const PERSONALITY_LABELS = {
  fetard: 'fêtard',
  professionnel: 'professionnel',
  ambitieux: 'ambitieux',
  loyal: 'loyal',
  instable: 'instable',
  leader: 'leader',
  mercenaire: 'mercenaire',
};

export const HIDDEN_TRAITS = {
  clutch_player:        { label: 'Joueur clutch',       desc: 'Irremplaçable dans les grands matchs.',       icon: '⚡' },
  locker_room_leader:   { label: 'Leader vestiaire',     desc: 'Sa présence booste le moral du groupe.',       icon: '🦁' },
  silent_perfectionist: { label: 'Perfectionniste',      desc: 'Rarement instable, confiance très solide.',    icon: '🧊' },
  social_media_magnet:  { label: 'Star des réseaux',     desc: 'Sa valeur de marque grandit très vite.',       icon: '📱' },
  late_bloomer:         { label: 'Révélation tardive',   desc: 'Le meilleur est à venir après 28 ans.',        icon: '🌱' },
  glass_cannon:         { label: 'Verre et feu',         desc: 'Immense niveau mais très fragile.',            icon: '💥' },
  mentality_monster:    { label: 'Mentale de champion',  desc: 'Ne lâche jamais, forme toujours solide.',      icon: '🔥' },
  tactical_genius:      { label: 'Génie tactique',       desc: "S'adapte à tous les rôles et systèmes.",       icon: '🧠' },
};

// ── Joueurs légendaires (apparaissent rarement dans le marché) ────────────────

export const LEGENDARY_PLAYERS = [
  {
    id: 'legend_joao',
    firstName: 'João', lastName: 'Ferreira',
    position: 'ATT', roleId: 'striker', roleLabel: 'Avant-centre', roleShort: 'AC',
    countryCode: 'BR', countryLabel: 'Brésil', countryFlag: '🇧🇷',
    age: 26, rating: 97, potential: 97, value: 220000000,
    weeklySalary: 420000, signingCost: 2800000,
    club: 'Real de Madrid', clubTier: 1, clubCountry: '🇪🇸', clubCountryCode: 'ES', clubCity: 'Madrid',
    personality: 'professionnel', moral: 88, trust: 60, form: 90, fatigue: 22,
    injured: 0, contractWeeksLeft: 52, contractStartWeek: 0, commission: 0.1, brandValue: 98,
    freeAgent: false, rarity: 'legendary', isLegendary: true, hiddenTrait: 'clutch_player',
    recentResults: [], previousRating: null, timeline: [],
    seasonStats: { appearances: 0, goals: 0, assists: 0, saves: 0, tackles: 0, keyPasses: 0, xg: 0, injuries: 0, ratings: [], averageRating: null },
    publicRep: null, agentContract: null, careerGoal: null, scoutReport: null,
    physique: 'rapide', playStyle: 'buteur', foot: 'D',
  },
  {
    id: 'legend_lamine',
    firstName: 'Lamine', lastName: 'Diallo',
    position: 'MIL', roleId: 'attacking_mid', roleLabel: 'Milieu offensif', roleShort: 'MO',
    countryCode: 'SN', countryLabel: 'Sénégal', countryFlag: '🇸🇳',
    age: 24, rating: 95, potential: 98, value: 180000000,
    weeklySalary: 360000, signingCost: 2400000,
    club: 'Paris Saint-Germain', clubTier: 1, clubCountry: '🇫🇷', clubCountryCode: 'FR', clubCity: 'Paris',
    personality: 'ambitieux', moral: 82, trust: 55, form: 92, fatigue: 18,
    injured: 0, contractWeeksLeft: 78, contractStartWeek: 0, commission: 0.1, brandValue: 95,
    freeAgent: false, rarity: 'legendary', isLegendary: true, hiddenTrait: 'mentality_monster',
    recentResults: [], previousRating: null, timeline: [],
    seasonStats: { appearances: 0, goals: 0, assists: 0, saves: 0, tackles: 0, keyPasses: 0, xg: 0, injuries: 0, ratings: [], averageRating: null },
    publicRep: null, agentContract: null, careerGoal: null, scoutReport: null,
    physique: 'technique', playStyle: 'créateur', foot: 'G',
  },
];

// ── Profils de personnalité ───────────────────────────────────────────────────

export const PERSONALITY_PROFILES = {
  fetard: {
    trustStart: -4,
    eventBias: { scandal: 1.45, performance: 0.95, fans: 1.1 },
    negotiationBias: -4,
    messageBias: 1.25,
  },
  professionnel: {
    trustStart: 6,
    eventBias: { scandal: 0.65, performance: 1.2, media: 1.05 },
    negotiationBias: 5,
    messageBias: 0.8,
  },
  ambitieux: {
    trustStart: 0,
    eventBias: { performance: 1.1, transfert: 1.3 },
    negotiationBias: 3,
    messageBias: 1.1,
  },
  loyal: {
    trustStart: 9,
    eventBias: { scandal: 0.55, performance: 1.05 },
    negotiationBias: 7,
    messageBias: 0.7,
  },
  instable: {
    trustStart: -7,
    eventBias: { scandal: 1.6, crisis: 1.4, performance: 0.85 },
    negotiationBias: -8,
    messageBias: 1.5,
  },
  leader: {
    trustStart: 5,
    eventBias: { scandal: 0.7, performance: 1.15, media: 1.2 },
    negotiationBias: 4,
    messageBias: 0.9,
  },
  mercenaire: {
    trustStart: -2,
    eventBias: { transfert: 1.5, performance: 1.0 },
    negotiationBias: -5,
    messageBias: 1.2,
  },
};
