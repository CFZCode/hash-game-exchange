/* The remaining home game rows, all from the same captured response as BC Originals:
 * bc.game/bc.game/api/edge/game/home/recommend/batch/selections/index.html.
 *
 * Each entry is page 1 of its selection — ten games, except BC Exclusive, whose selection
 * only has eight in total. That matters: `go` appends the View All tile only above eight,
 * so BC Exclusive is the one row here that does not get one, exactly as on the live page.
 *
 * onlineUsers is live data on the real site; these are the captured values.
 */
import { withIcons } from './originals';

export const hotGames = withIcons([
  { slug: "crazy-time-by-evolution-gaming", fullName: "Crazy Time", onlineUsers: 50 },
  { slug: "diamond-style-by-onlyplay", fullName: "Diamond Style", onlineUsers: 18 },
  { slug: "speed-baccarat-a-by-evolution-gaming", fullName: "Speed Baccarat A", onlineUsers: 49 },
  { slug: "jumbo-joker-by-betsoft", fullName: "Jumbo Joker", onlineUsers: 89 },
  { slug: "symbiote-by-croco-gaming", fullName: "Symbiote", onlineUsers: 87 },
  { slug: "fortune-chests-by-endorphina", fullName: "Fortune Chests", onlineUsers: 98 },
  { slug: "rhino-robbery-by-croco-gaming", fullName: "Rhino Robbery", onlineUsers: 44 },
  { slug: "wukong-by-croco-gaming", fullName: "WUKONG", onlineUsers: 22 },
  { slug: "dragon-ball-destiny-by-funta-gaming", fullName: "Dragon Ball Destiny", onlineUsers: 91 },
  { slug: "super-elements-by-fa-chai", fullName: "SUPER ELEMENTS", onlineUsers: 20 },
]);
export const hotGamesLink = "/section/hot_games";

export const exclusive = withIcons([
  { slug: "bc-game-speed-baccarat-by-evolution-gaming", fullName: "BC.GAME Speed Baccarat", onlineUsers: 45 },
  { slug: "bcgame-roulette-by-evolution-gaming", fullName: "BCGAME Roulette", onlineUsers: 35 },
  { slug: "bc-game-ice-fishing-by-evolution-gaming", fullName: "BC.GAME ICE Fishing", onlineUsers: 22 },
  { slug: "bc-game-baccarat-by-evolution-gaming", fullName: "BC.GAME Baccarat", onlineUsers: 87 },
  { slug: "bc-game-japanese-speed-baccarat-by-evolution-gaming", fullName: "BC.GAME Japanese Speed Baccarat", onlineUsers: 54 },
  { slug: "bc-game-korean-speed-baccarat-by-evolution-gaming", fullName: "BC.GAME Korean Speed Baccarat", onlineUsers: 54 },
  { slug: "bc-game-xxxtreme-lightning-roulette-by-evolution-gaming", fullName: "BC.GAME XXXtreme Lightning Roulette", onlineUsers: 19 },
  { slug: "bc-game-korean-super-speed-baccarat-by-evolution-gaming", fullName: "BC.GAME Korean Super Speed Baccarat", onlineUsers: 78 },
]);
export const exclusiveLink = "/section/exclusive";

export const slots = withIcons([
  { slug: "queen-of-inca-by-fa-chai", fullName: "QUEEN OF INCA", onlineUsers: 34 },
  { slug: "sugar-bang-bang-2-by-fa-chai", fullName: "SUGAR BANG BANG 2", onlineUsers: 34 },
  { slug: "treasure-quest-by-tada", fullName: "Treasure Quest", onlineUsers: 81 },
  { slug: "lucky-fortunes-by-fa-chai", fullName: "LUCKY FORTUNES", onlineUsers: 31 },
  { slug: "fiery-sevens-exclusive-by-spadegaming", fullName: "Fiery Sevens Exclusive", onlineUsers: 20 },
  { slug: "crown-coins-by-endorphina", fullName: "Crown Coins", onlineUsers: 72 },
  { slug: "fortune-money-boom-by-fa-chai", fullName: "FORTUNE MONEY BOOM", onlineUsers: 33 },
  { slug: "crazy777-2-by-tada", fullName: "Crazy777 2", onlineUsers: 60 },
  { slug: "gold-panther-maxways-by-spadegaming", fullName: "Gold Panther Maxways", onlineUsers: 90 },
  { slug: "lucky-tiger-by-tada", fullName: "Lucky Tiger", onlineUsers: 87 },
]);
export const slotsLink = "/gamelist/slots";

export const liveCasino = withIcons([
  { slug: "baccarat-by-evolution-gaming", fullName: "Baccarat", onlineUsers: 10 },
  { slug: "roulette-by-evolution-gaming", fullName: "Roulette", onlineUsers: 55 },
  { slug: "blackjack-by-evolution-gaming", fullName: "Blackjack", onlineUsers: 58 },
  { slug: "evolution-game-shows-by-evolution-gaming", fullName: "Evolution Game Shows", onlineUsers: 25 },
  { slug: "dragon-tiger-by-evolution-gaming-17929", fullName: "DRAGON TIGER", onlineUsers: 21 },
  { slug: "poker-by-evolution-gaming", fullName: "Poker", onlineUsers: 39 },
  { slug: "tvbet-lobby-by-tvbet", fullName: "TVBET LOBBY", onlineUsers: 10 },
  { slug: "winfinity-lobby-by-winfinity", fullName: "Winfinity Lobby", onlineUsers: 11 },
  { slug: "fan-tan-by-evolution-gaming-17928", fullName: "FAN TAN", onlineUsers: 28 },
  { slug: "sicbo-by-evolution-gaming", fullName: "SICBO", onlineUsers: 29 },
]);
export const liveCasinoLink = "/gamelist/live";

export const bingo = withIcons([
  { slug: "bingo", fullName: "Bingo", onlineUsers: 24 },
  { slug: "super-bingo-by-tada", fullName: "Super Bingo", onlineUsers: 10 },
  { slug: "immortal-romance-video-bingo-by-neko-games", fullName: "Immortal Romance Video Bingo", onlineUsers: 75 },
  { slug: "irich-bingo-by-tada", fullName: "iRich Bingo", onlineUsers: 20 },
  { slug: "bingo-carnaval-by-tada", fullName: "Bingo Carnaval", onlineUsers: 100 },
  { slug: "jackpot-bingo-by-tada", fullName: "Jackpot Bingo", onlineUsers: 85 },
  { slug: "magic-lamp-bingo-by-tada", fullName: "Magic Lamp Bingo", onlineUsers: 41 },
  { slug: "fortune-bingo-by-tada", fullName: "Fortune Bingo", onlineUsers: 85 },
  { slug: "go-goal-bingo-by-tada", fullName: "Go Goal Bingo", onlineUsers: 66 },
  { slug: "halloween-bingo-by-belatra", fullName: "Halloween Bingo", onlineUsers: 47 },
]);
export const bingoLink = "/tagname/bingo?label=All%20Bingo%20Games";
