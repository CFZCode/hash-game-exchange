/* GENERATED — the USD price of every currency the site knows. Regenerate rather than hand-edit.
 *
 * Source: `GET https://hash.game/api/game/support/system/conf/usdPrice`, field `data` — a LIVE
 * answer, like `currencies.js` beside it. The path is read out of `index-BsFv7ByC.js`:
 *
 *   mt().get("/game/support/system/conf/usdPrice").then(s => {
 *     if (s) { const o = U({}, s); o.USD = "1", o.USDFIAT = "1", n(qg(o)) }
 *   })
 *
 * NOTE THE TWO KEYS IT OVERWRITES AFTER FETCHING. The response quotes USDFIAT at 1.00094 — a
 * real number, since the table is priced off a spot USD feed rather than off the dollar itself —
 * and the bundle throws it away and pins both USD and USDFIAT to exactly 1. That is what makes
 * "$" mean "$" rather than "$ plus nine basis points", and it is reproduced below rather than
 * left as the response sent it. USD is not in the response at all; it exists only because that
 * line puts it there, and `convertCurrency`'s default target is USD, so without it every
 * conversion would divide by zero and return 0.
 *
 * THIS IS A SNAPSHOT OF A MOVING NUMBER. Every crypto row is a spot price from the day it was
 * fetched and is already stale; nothing in this build re-fetches it. That is the same bargain
 * every other fixture here makes, but it is worth saying out loud for this one, because a rate
 * table is the one kind of data whose staleness is invisible — a wrong game cover looks wrong,
 * a wrong exchange rate just looks like a number. Point `services/` at the live path the day
 * there is a backend and delete this file.
 */
/* The response verbatim, USDFIAT's 1.00094 included, so the override below is visible as an
   override rather than baked in. */
const RESPONSE = {
  '114514': "0.0001336",
  A: "0.061735",
  AAVE: "87.20083333",
  ADA: "0.18146115",
  AEDFIAT: "0.272535324819268",
  AFNFIAT: "0.0152945256643530732",
  ALGO: "0.078445",
  ALLFIAT: "0.0124017152329844182",
  AMDFIAT: "0.002740281435615298324",
  AMP: "0.00037615",
  AMPL: "1.226009143524654688",
  AMZNX: "265.687534482208103647",
  AOAFIAT: "0.001092422121726832694",
  APE: "0.122057919102728822",
  APT: "0.541075",
  ARB: "0.0751575",
  ARSFIAT: "0.0006270378730875",
  ASTER: "0.600525",
  ASTEROID: "0.000066040768582839",
  ATOM: "1.5236",
  AUDFIAT: "0.70774252417271556",
  AVAX: "6.38055",
  AWGFIAT: "0.556869665898",
  AXE: "0.000637820065389715",
  AXS: "0.85440333",
  AZNFIAT: "0.5893443334178",
  AZUKIMNFT: "3.92793794994912",
  B: "0",
  BAMFIAT: "0.59070388874263042",
  BANANO: "0.000389229958539717",
  BAT: "0.05608067",
  BAYCMNFT: "23.47425292",
  BB: "0",
  BBDFIAT: "0.4981882271478",
  BC: "0.02929451098",
  BCD: "1",
  BCG: "0",
  BCH: "205.40075",
  BCL: "0.1",
  BDTFIAT: "0.00813906818993121393",
  BEDN: "0",
  BGNFIAT: "0.58891250035693214",
  BHDFIAT: "2.65744765488",
  BIFFIAT: "0.00033481443736968900192",
  BIGTIME: "0.00480483",
  BIT: "0.455772727243557348",
  'BITWIRES-BTC': "0",
  BKBT: "0",
  BLUR: "0.01291",
  BMDFIAT: "1.00094",
  BNB: "606.632908",
  BNDFIAT: "0.78210368755247376",
  BOBFIAT: "0.0855351119079759922",
  BOME: "0.00075283",
  BONE: "0",
  BRLFIAT: "0.1931620916684308",
  BSDFIAT: "1.00105911186",
  BSV: "15.0555",
  BTC: "62789.835",
  BTCB: "62790.002",
  BTG: "0.3",
  BTNFIAT: "0.0104922316873967296",
  BTT: "0.000290132034890307",
  BUSD: "0.98",
  BWPFIAT: "0.0749704218791924232",
  BYNFIAT: "0.33166497409469482",
  BYRFIAT: "0.000051068359176",
  BZDFIAT: "0.498668107812",
  CADFIAT: "0.72050322776332192",
  CAKE: "1.4138",
  CARROT: "0",
  CASHCAT: "0.13672",
  CATI: "0.0476375",
  CBBTC: "62789.835",
  CBETH: "1870.4584",
  CCC: "0",
  CDFFIAT: "0.00044055474640642019412",
  CELO: "0.06012",
  CFX: "0.0421675",
  CHFFIAT: "1.230150864271896",
  CHZ: "0.01227775",
  CLFFIAT: "43.6221429460416",
  CLONEXMNFT: "0.60789898",
  CLPFIAT: "0.001094569515811817082",
  CMT: "0",
  CNN: "0",
  CNYFIAT: "0.14844792915499818",
  COINS3RD: "146",
  COINX: "152.593246638428854353",
  COPFIAT: "0.00032026373776182455434",
  CRCFIAT: "0.00222915985161764142",
  CRCLX: "74.35",
  CRO: "0.04867",
  CRV: "0.247897",
  CUCFIAT: "1.00094",
  CUP2022: "0",
  CUPFIAT: "0.0377754756",
  CVEFIAT: "0.0104701965005631122",
  CZKFIAT: "0.047755148627337783",
  DAI: "1.00065",
  DASH: "30.0789",
  DCC: "0",
  DCR: "11.993",
  DEAD: "3.6",
  DGB: "0.00408188",
  DGPMNFT: "1.8704584",
  DJCAT: "0.00003",
  DJFFIAT: "0.00562523911597558",
  DKKFIAT: "0.154684632353429",
  DOG: "0.000358295545888353",
  DOGE: "0.06959175",
  DOGS: "0.00003459",
  DOODLESMNFT: "1.963962615416",
  DOPFIAT: "0.0171072744369086862",
  DOT: "0.756022",
  DPN: "0",
  DZDFIAT: "0.007516023196283236",
  EGLD: "2.61023333",
  EGPFIAT: "0.0199074109191149288",
  ELON: "0.0000000262",
  ENA: "0.0852075",
  ENJ: "0.02368167",
  ENS: "4.0085",
  EOS: "0.061894166397567662",
  ERNFIAT: "0.066762698",
  ETBFIAT: "0.00625716788673871251",
  ETC: "6.1301",
  ETH: "1870.4584",
  EURC: "1.155775392605454158",
  EURFIAT: "1.156334348410006",
  EURS: "1.19720969021660752",
  FDUSD: "0.9979",
  FIL: "0.6682",
  FJDFIAT: "0.4504214291648016",
  FKPFIAT: "1.35157913725524",
  FLOKI: "0.00002021",
  FNKOS: "0",
  FT: "0",
  FUSDT: "0",
  FYC: "0",
  GALA: "0.001631",
  GB: "0",
  GBPFIAT: "1.353148805457694",
  GD: "0",
  GELFIAT: "0.3831802730765672",
  GEMS3RD: "1.46",
  GHSFIAT: "0.090563755999955322",
  GIPFIAT: "1.351579160376954",
  GMDFIAT: "0.01361802816438513",
  GMT: "0.006302774235807377",
  GMX: "6.666",
  GNFFIAT: "0.00011380596792503992458",
  GODS: "0.023679323381377277",
  GOM: "0",
  GOOGLX: "348.424175572081717971",
  GOSH_COIN: "0.001",
  GOSH_SILVER: "0.0001175",
  GOSH_VCOIN: "0.00117647",
  GST: "0.000961170230461353",
  GTC: "0",
  GTQFIAT: "0.13123672628683904",
  GVE: "0",
  GYDFIAT: "0.004787235342254137434",
  'Green Metaverse': "0",
  HBAR: "0.06504975",
  HD: "0",
  HEX: "0.001466086612860368",
  HKDFIAT: "0.1275617587304879",
  HMSTR: "0.00017682",
  HNLFIAT: "0.0372703152982968576",
  HNT: "0.1707",
  HOODX: "99.355046951864617186",
  HRKFIAT: "0.15347251953839994",
  HTGFIAT: "0.007611388933996855828",
  HUFFIAT: "0.003179915607366300294",
  HYPE: "56.759",
  ICP: "2.16475",
  ICX: "0.01841333",
  IDA: "0",
  IDRFIAT: "0.00005616516930140780988",
  ILSFIAT: "0.33912664550788208",
  INRFIAT: "0.010487634315285368",
  IOTX: "0.00254967",
  IQDFIAT: "0.0007636879850275486581",
  IRRFIAT: "0.000000728224641646788331",
  ISKFIAT: "0.00813176235233625035",
  JB: "0",
  JITOSOL: "97.920905272953343565",
  JLP: "3.623495588865323508",
  JMDFIAT: "0.006331033133991891702",
  JODFIAT: "1.41165170644",
  JOE: "0.02793",
  JPYFIAT: "0.006289023176822090214",
  JST: "0.1051621",
  JTO: "0.5599",
  JUP: "0.166215",
  KAS: "0.025185",
  KAVA: "0.0404875",
  KCS: "6.5833",
  KESFIAT: "0.00774204002297140448",
  KGSFIAT: "0.011445820226133601",
  KHRFIAT: "0.00024735398352441242656",
  KLAY: "0.025596641793844617",
  KMFFIAT: "0.002344121986028741926",
  KRWFIAT: "0.00070801865766389285052",
  KSM: "2.78446667",
  KUMA: "0.0000000010936232100754",
  KWDFIAT: "3.241903872684206",
  KYDFIAT: "1.20121508178",
  KZTFIAT: "0.002154012710065839604",
  LAKFIAT: "0.000044425269992190760256",
  LBPFIAT: "0.000011180846243460623024",
  LDO: "0.300125",
  LEND: "0",
  LINEA: "0.0021165",
  LINK: "8.727386",
  LKRFIAT: "0.003004843577300408654",
  LRDFIAT: "0.005513455184365790016",
  LSLFIAT: "0.0619671182334143",
  LTC: "44.4874",
  LUNA: "0.000049214",
  LUNANEW: "0.04343",
  LYDFIAT: "0.1571762925494499",
  MADFIAT: "0.1079312471838646",
  MAG: "0",
  MAGIC: "0.03948",
  MANA: "0.06344967",
  MATIC: "0.0731575",
  MDLFIAT: "0.0577993908070991208",
  'MEET.ONE': "0",
  MEKAMNFT: "0.12718350232056",
  METAX: "596.209176965718338753",
  MFERSMNFT: "1.10347693289295416",
  MGAFIAT: "0.0002324164632037097075",
  MKDFIAT: "0.018785268827872755",
  MMKFIAT: "0.00047675099030141717306",
  MNTFIAT: "0.00027822684651904706578",
  MON: "0.02117",
  MOODENG: "0.0357825",
  MOPFIAT: "0.123852924515374",
  MOTHER: "0.000743300195068154",
  MSTRX: "95.755423219604215256",
  MT: "0",
  MTC: "0",
  MURFIAT: "0.0212531297833868388",
  MVRFIAT: "0.0647708152099220878",
  MWKFIAT: "0.0005773369440408161091",
  MXNFIAT: "0.0587899090554225566",
  MYRFIAT: "0.24487815829766",
  MZNFIAT: "0.0156913478219884766",
  NADFIAT: "0.0620027785742447946",
  NANO: "0.369530496377299975",
  NEAR: "1.59732133",
  NEIRO: "0.0000653",
  NEWBTT: "0.0000002589",
  NEXO: "0.70874655",
  NFT: "0.0000002803",
  NGNFIAT: "0.00073461416491957003384",
  NIOFIAT: "0.02720423410747395",
  NOKFIAT: "0.10574617566755528",
  NOT: "0.00037703",
  NPRFIAT: "0.006558274813389944006",
  NVDAX: "225.638418272677764404",
  NZDFIAT: "0.58822421134085806",
  OKAY: "0.0001",
  OKB: "102.398",
  OM: "0.06683068128783488",
  OMRFIAT: "2.60177927324365",
  ONDO: "0.329608",
  ONE: "0.000653",
  OP: "0.085875",
  PABFIAT: "1.0010413858832298",
  PENFIAT: "0.29625613888045784",
  PENGU: "0.00619625",
  PEOPLE: "0.00772567",
  PEPE: "0.00000265225",
  PGKFIAT: "0.2286099869176196",
  PHPFIAT: "0.0162865696884187974",
  PKRFIAT: "0.0036034070086628317",
  PLNFIAT: "0.26845382703137198",
  POL: "0.0731575",
  PROMOTIONS: "0",
  PUMP: "0.00288624",
  PUNKSMNFT: "88.846774",
  PYGFIAT: "0.00016781165311060706046",
  PYTH: "0.039565",
  PYUSD: "1.00036666666666666667",
  QARFIAT: "0.27470673183300752",
  QQQX: "734.866932883694463972",
  QTUM: "0.66883267",
  RAY: "0.61485",
  RENDER: "1.25596667",
  RLUSD: "1.0011",
  RON: "0.04891667",
  RONFIAT: "0.2205400811800986",
  ROSE: "0.005284",
  RSDFIAT: "0.00985707393670391043",
  RUBFIAT: "0.0118962890499275154",
  RUNE: "0.421",
  RVN: "0.002608",
  RWFFIAT: "0.00068137825232994077416",
  S: "0.022305",
  SAMO: "0.000254220126084506",
  SAND: "0.03839033",
  SARFIAT: "0.26662703524372894",
  SATS: "0.00062789835",
  SBDFIAT: "0.12440186390180992",
  SC: "1",
  SCRFIAT: "0.072785356382256",
  SDGFIAT: "0.0016659246285222",
  SEKFIAT: "0.10493348988433384",
  SGDFIAT: "0.78249789210075712",
  SHIB: "0.0000044379",
  SNACK: "0.000372509079559222",
  SNX: "0.19475",
  SOL: "75.59165",
  SOSFIAT: "0.0017514727026776159",
  SPCXX: "142.57571682",
  SPYX: "782.928723560168285338",
  SRDFIAT: "0.0265442718155345688",
  STDFIAT: "0.000047835827559270943614",
  STEPN: "0",
  STRK: "0.0226675",
  SUI: "0.679325",
  SUN: "0",
  SUNNEW: "0.0182059",
  SUSHI: "0.15668",
  SVCFIAT: "0.1144114657788",
  SZLFIAT: "0.0619983023873805866",
  T: "0",
  TFUEL: "0.00708",
  THBFIAT: "0.0301636226980790726",
  THETA: "0.1319",
  TJSFIAT: "0.10824742345344702",
  TMTFIAT: "0.285568182",
  TNDFIAT: "0.34103444689403486",
  TOMO: "0.022428",
  TON: "1.325",
  TRUE: "0",
  TRUMP: "1.392",
  TRX: "0.33373156",
  TRYFIAT: "0.020902946499010892",
  TSLAX: "341.522516931065031443",
  TTDFIAT: "0.14813987104732148",
  TUSD: "0.9975444",
  TWDFIAT: "0.031257312270310412",
  TWT: "0.4048",
  TZSFIAT: "0.00037852628356213286764",
  UAHFIAT: "0.021427040926",
  UGXFIAT: "0.0002696879464551064448",
  UNI: "3.44457",
  USAT: "0.9997",
  USD1: "0.9998475",
  USDC: "1.00073989",
  'USDC.E': "1.001812255286965109",
  USDE: "1.000777942011079444",
  USDFIAT: "1.00094",
  USDS: "1.00065",
  USDT: "1",
  'USDT.E': "0.999941869848909372",
  UST: "0.00493475874486082",
  UYUFIAT: "0.0249169466305148228",
  UZSFIAT: "0.000083760663879659008012",
  VET: "0.00446215",
  VNDFIAT: "0.00003830961255036516288",
  VSYS: "0.000256966125601805",
  VTHO: "0.0003136",
  VUVFIAT: "0.00843762055289777452",
  WAVES: "0.1941",
  WAXP: "0.00363467",
  WBNB: "606.632908",
  WBTC: "62772.05333333",
  WETH: "1870.4584",
  WIF: "0.13585",
  WLD: "0.3379",
  WLFI: "0.056065",
  WSTFIAT: "0.36615160880154598",
  XAFFIAT: "0.001761285692900410024",
  XAUT: "4331.53",
  XCDFIAT: "0.370361713066",
  XDRFIAT: "1.399476295401714",
  XEN: "0.000000003910514895522148",
  XLM: "0.15850625",
  XMR: "393.45",
  XOFFIAT: "0.001761315623318781612",
  XPFFIAT: "0.00964049318805571106",
  XPL: "0.07373",
  XRP: "1.0044488",
  XTZ: "0.19451767",
  YEE: "0",
  YERFIAT: "0.004219902532322397428",
  YFI: "1916.32",
  YGG: "0.018415",
  ZARFIAT: "0.0618612871738327986",
  ZEC: "479.44858",
  ZIL: "0.00234425",
  ZK: "0.00723",
  ZMWFIAT: "0.0531995808666001746",
  ZWLFIAT: "0.00310851325535718",
};

/* `const o = U({}, s); o.USD = "1", o.USDFIAT = "1"` — the two lines that run after the fetch.
 *
 * IT IS A MUTABLE TABLE NOW, and the reason is that `printCurrency` cannot await anything.
 * ----------------------------------------------------------------------------------------
 * That formatter is a pure function called during render from most of the shell, so a live rate
 * cannot reach it as a prop or a hook — it has to already be here when the render runs. Same
 * arrangement `services/bonus.js` has, and the original's own: `mt().get(...).then(s => n(qg(o)))`
 * fills a store that `getUsdPrice` reads synchronously for the rest of the page's life.
 *
 * So the object below is the STARTING table rather than the whole of it, and `setUsdPrices`
 * overlays whatever a backend answers with. Mutated in place rather than reassigned, so a module
 * holding a reference to `USD_PRICE` sees the update.
 */
export const USD_PRICE = { ...RESPONSE, USD: '1', USDFIAT: '1' };

/* Which codes came from a live read rather than from the snapshot above. Nothing branches on it;
   it exists so the mixture is inspectable — see the note in `services/exchangeRate.js` about why
   the table is a mixture at all during the wiring. */
export const LIVE_CODES = new Set();

/**
 * Overlay live rates onto the table.
 *
 * MERGE RATHER THAN REPLACE, and that is a decision with a reason rather than a default. Replacing
 * is the more honest shape — one table, one source, no silent mixing of a live rate with a stale
 * one — and it is what this should become. It cannot be that yet: `services/swap.js` and
 * `services/buyCrypto.js` price their fixtures through this same accessor, against catalogues of
 * 43 and 38 coins that the platform's 25 rows do not cover, so replacing would take every quote
 * on two unwired pages to zero. Revisit when those pages are wired.
 */
export function setUsdPrices(rates) {
  Object.assign(USD_PRICE, rates);
  for (const code of Object.keys(rates)) LIVE_CODES.add(code);
  /* Re-pinned after every overlay, because the fetch hook's own two lines run after ITS fetch
     too. A backend that quotes USD at anything but exactly 1 would otherwise make "$" mean "$
     plus a few basis points" — see the note at the top of this file. */
  USD_PRICE.USD = '1';
  USD_PRICE.USDFIAT = '1';
}

/**
 * Forget the snapshot's price for codes the live source did not quote.
 *
 * THIS EXISTS BECAUSE A TICKER IS NOT AN ASSET, and the merge above is unsound without it. The
 * snapshot describes bc.game's currencies and the live table describes another platform's; most
 * tickers mean the same thing in both, and some do not. `SC` is the caught case: it is a real row
 * in the snapshot at $1, and it is also a column on the other platform's wallet — a different
 * token entirely, which the merge would have silently priced at a dollar. NC and BJB are the same
 * shape and are only invisible because bc.game happens not to carry them.
 *
 * So a caller that knows which codes belong to the LIVE world passes them, and any of those the
 * live source did not quote loses its inherited price. `getUsdPrice` then answers 0 for them,
 * which is the original's own behaviour for a currency it has never heard of and reads on screen
 * as `$0.00` — "no rate", rather than another asset's rate wearing the same three letters.
 *
 * A no-op until something has actually been primed, so the fixture build is untouched: with no
 * live source there is no live world to be authoritative about.
 */
export function dropUnpricedCodes(codes) {
  if (!LIVE_CODES.size) return;

  for (const code of codes ?? []) {
    if (!code || LIVE_CODES.has(code)) continue;
    /* Never the dollar. It is not quoted by anyone — the fetch hook writes it in by hand — and
       it is `convertCurrency`'s default target, so dropping it would take every conversion in
       the shell to zero. */
    if (code === 'USD' || code === 'USDFIAT') continue;

    delete USD_PRICE[code];
    delete USD_PRICE[`${code}FIAT`];
  }
}

/* `getUsdPrice(t) { return WC[t] || Ju }`, where `Ju` is `new Big(0)` — an unknown currency
   prices at zero, and every caller is written to survive that. */
export const getUsdPrice = (currencyName) => Number(USD_PRICE[currencyName]) || 0;
