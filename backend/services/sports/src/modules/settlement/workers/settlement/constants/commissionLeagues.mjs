// constants/commissionLeagues.js — mssports settlement worker, moved unchanged

var DEFAULT_LEAGUE_KEY = "default";
var DEFAULT_LEAGUE_LABEL = "All other leagues";
var COMMISSION_LEAGUES = {
  // Cricket
  4: [
    { key: "ecricket", label: "E-Cricket (Dim)", patterns: ["dim cricket league"], cid: 7526679, iscc: 4 },
    { key: "t10xi", label: "T10 XI", patterns: ["t10 xi"], cid: 56100513, iscc: 1 },
    { key: "t5xi", label: "T5 XI", patterns: ["t5 xi"], cid: 46201121, iscc: 1 },
    { key: "vcl", label: "Virtual Cricket League", patterns: ["virtual cricket league"], cid: 8590658, iscc: 2 }
  ],
  // Wrestling — one virtual league, same shape as cricket's VCL.
  69: [
    { key: "wwevirtual", label: "WWE Virtual", patterns: ["wwe virtual"], cid: 8524813, iscc: 2 }
  ]
};
var normaliseLeagueName = (name) => String(name || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
var leaguesForSport = (sportId) => COMMISSION_LEAGUES[Number(sportId)] || [];
var isValidLeagueKey = (sportId, leagueKey) => leagueKey === DEFAULT_LEAGUE_KEY || leaguesForSport(sportId).some((l) => l.key === leagueKey);
var leagueKeyFromName = (sportId, leagueName) => {
  const norm3 = normaliseLeagueName(leagueName);
  if (!norm3) return DEFAULT_LEAGUE_KEY;
  for (const league of leaguesForSport(sportId)) {
    if (league.patterns.some((p) => norm3.includes(p))) return league.key;
  }
  return DEFAULT_LEAGUE_KEY;
};
var leagueLabel = (sportId, leagueKey) => {
  if (leagueKey === DEFAULT_LEAGUE_KEY) return DEFAULT_LEAGUE_LABEL;
  const hit = leaguesForSport(sportId).find((l) => l.key === leagueKey);
  return hit ? hit.label : leagueKey;
};

export { DEFAULT_LEAGUE_KEY, isValidLeagueKey, leagueKeyFromName, leagueLabel };
