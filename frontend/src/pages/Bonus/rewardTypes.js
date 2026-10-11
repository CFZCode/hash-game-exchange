/* `types-BTJHexAo.js`, which IS in the mirror — the reward-type enum, verbatim. Nineteen values,
   and the string on the right is the key the API's `rewards` map is actually keyed by, which is
   why they are spelt out rather than derived from the names. Kept in its own module so
   `bonus.js` can be a data file and the enum can be imported by a service too. */
export const RewardType = {
  INSTANT_BONUS: 'instant_bonus',
  INSTANT_BC: 'instant_bc',
  BC_ENGINE_GRANT: 'bc_engine_grant',
  DEPOSIT_RAKEBACK: 'rakeback',
  LEVEL_UP: 'level_up_bonus',
  EARLY_LEVEL_UP: 'early_level_up_bonus',
  VIP_GIVE_LEVEL_UP: 'vip_give_bonus',
  DAILY: 'daily_bet_back_bonus',
  WEEKLY: 'weekly_bonus',
  MONTHLY: 'month_bonus',
  WELCOME_BONUS: 'vip_bonus_welcome',
  LOSSBACK: 'vip_bonus_loss_back',
  RELOAD: 'motivation_bonus',
  TOP_PLAYER: 'top_player_bonus',
  GAMEPLAY_BONUS: 'game_play_bonus',
  WEEKLY_FREE_SPIN: 'vip_free_spin',
  WELCOME_SHIELD: 'new_user_lossback',
  DAILY_US_SITE: 'us_site_daily_bonus',
  RAFFLE_BONUS: 'raffle',
};

export default RewardType;
