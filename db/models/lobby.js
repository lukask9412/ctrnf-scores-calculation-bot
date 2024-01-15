
const LOBBY_MODE_STANDARD = 'standard';
const LOBBY_MODE_TOURNAMENT = 'tournament';

const RACE_ITEMS_FFA = 'race_ffa';
const RACE_ITEMS_DUOS = 'race_duos';
const RACE_ITEMS_3V3 = 'race_3v3';
const RACE_ITEMS_4V4 = 'race_4v4';
const RACE_SURVIVAL = 'race_survival';
const RACE_ITEMLESS_1V1 = 'race_itemless_1v1';
const RACE_ITEMLESS_FFA = 'race_itemless_ffa';
const RACE_ITEMLESS_DUOS = 'race_itemless_duos';
const RACE_ITEMLESS_3V3 = 'race_itemless_3v3';
const RACE_ITEMLESS_4V4 = 'race_itemless_4v4';
const BATTLE_1V1 = 'battle_1v1';
const BATTLE_FFA = 'battle_ffa';
const BATTLE_DUOS = 'battle_duos';
const BATTLE_3V3 = 'battle_3v3';
const BATTLE_4V4 = 'battle_4v4';
const INSTA_DUOS = 'insta_duos';
const INSTA_3V3 = 'insta_3v3';
const INSTA_4V4 = 'insta_4v4';

const DUO_MODES = [RACE_ITEMS_DUOS, RACE_ITEMLESS_DUOS, BATTLE_DUOS];
const _3V3_MODES = [RACE_ITEMS_3V3, RACE_ITEMLESS_3V3, BATTLE_3V3];
const _4V4_MODES = [RACE_ITEMS_4V4, RACE_ITEMLESS_4V4, BATTLE_4V4];

const LEADERBOARD_URLS = {
  'solos': '8-jFwF',
  'itemless': 'Yg67aT',
  'teams': '9ur6s5',
  'insta_teams': '3NM8MD',
  'battle': '2pgqJQ',
};

const LEADERBOARDS = {
  [RACE_ITEMS_FFA]: LEADERBOARD_URLS.solos,
  [RACE_ITEMS_DUOS]: LEADERBOARD_URLS.teams,
  [RACE_ITEMS_3V3]: LEADERBOARD_URLS.teams,
  [RACE_ITEMS_4V4]: LEADERBOARD_URLS.teams,
  [RACE_SURVIVAL]: null,
  [RACE_ITEMLESS_1V1]: null,
  [RACE_ITEMLESS_FFA]: LEADERBOARD_URLS.itemless,
  [RACE_ITEMLESS_DUOS]: LEADERBOARD_URLS.itemless,
  [RACE_ITEMLESS_3V3]: LEADERBOARD_URLS.itemless,
  [RACE_ITEMLESS_4V4]: LEADERBOARD_URLS.itemless,
  [BATTLE_1V1]: null,
  [BATTLE_FFA]: LEADERBOARD_URLS.battle,
  [BATTLE_DUOS]: LEADERBOARD_URLS.battle,
  [BATTLE_3V3]: LEADERBOARD_URLS.battle,
  [BATTLE_4V4]: LEADERBOARD_URLS.battle,
  [INSTA_DUOS]: LEADERBOARD_URLS.insta_teams,
  [INSTA_3V3]: LEADERBOARD_URLS.insta_teams,
  [INSTA_4V4]: LEADERBOARD_URLS.insta_teams,
};

const RATING_SCHEME_ELO = "elo";
const RATING_SCHEMES_MMR = "mk8dx_mmr";

module.exports.RACE_ITEMS_FFA = RACE_ITEMS_FFA;
module.exports.RACE_ITEMS_DUOS = RACE_ITEMS_DUOS;
module.exports.RACE_ITEMS_3V3 = RACE_ITEMS_3V3;
module.exports.RACE_ITEMS_4V4 = RACE_ITEMS_4V4;
module.exports.RACE_SURVIVAL = RACE_SURVIVAL;
module.exports.RACE_ITEMLESS_1V1 = RACE_ITEMLESS_1V1;
module.exports.RACE_ITEMLESS_FFA = RACE_ITEMLESS_FFA;
module.exports.RACE_ITEMLESS_DUOS = RACE_ITEMLESS_DUOS;
module.exports.RACE_ITEMLESS_3V3 = RACE_ITEMLESS_3V3;
module.exports.RACE_ITEMLESS_4V4 = RACE_ITEMLESS_4V4;
module.exports.BATTLE_1V1 = BATTLE_1V1;
module.exports.BATTLE_FFA = BATTLE_FFA;
module.exports.BATTLE_DUOS = BATTLE_DUOS;
module.exports.BATTLE_3V3 = BATTLE_3V3;
module.exports.BATTLE_4V4 = BATTLE_4V4;
module.exports.INSTA_DUOS = INSTA_DUOS;
module.exports.INSTA_3V3 = INSTA_3V3;
module.exports.INSTA_4V4 = INSTA_4V4;

module.exports.LEADERBOARDS = LEADERBOARDS;
module.exports.LEADERBOARD_URLS = LEADERBOARD_URLS;

module.exports.LOBBY_MODE_STANDARD = LOBBY_MODE_STANDARD;
module.exports.LOBBY_MODE_TOURNAMENT = LOBBY_MODE_TOURNAMENT;

module.exports.DUO_MODES = DUO_MODES;
module.exports._3V3_MODES = _3V3_MODES;
module.exports._4V4_MODES = _4V4_MODES;

module.exports.RATING_SCHEME_ELO = RATING_SCHEME_ELO;
module.exports.RATING_SCHEME_MMR = RATING_SCHEMES_MMR;