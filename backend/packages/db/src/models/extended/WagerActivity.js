'use strict';

// HAND-WRITTEN model (not generated). Backed by migrations 071, 073 and 090.
// Domain: extended — owned by user-service.

const { Model, DataTypes } = require('sequelize');

/**
 * One stake that has been counted into `userwager` — in USD.
 *
 * `(source, ref)` is unique, so a settlement path that retries (a provider
 * callback, a requeued sports job) cannot count the same bet twice. `amount`
 * and `currency` are the stake as placed; `usd_amount` is what the VIP ladder,
 * the bonus gates and affiliate commission were moved by. See migration 071.
 */
class WagerActivity extends Model {}

module.exports = (sequelize) => {
  WagerActivity.init(
    {
      id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true, allowNull: false, field: 'id' },
      user_id: { type: DataTypes.BIGINT, allowNull: false, field: 'user_id' },
      /** The settlement path: `inhouse`, `gis`, `jsgames-v1`, `jsgames-v2`, `sports`. */
      source: { type: DataTypes.TEXT, allowNull: false, field: 'source' },
      /** That path's id for the bet. */
      ref: { type: DataTypes.TEXT, allowNull: false, field: 'ref' },
      currency: { type: DataTypes.TEXT, allowNull: false, field: 'currency' },
      amount: { type: DataTypes.DECIMAL(30, 8), allowNull: false, field: 'amount' },
      usd_amount: { type: DataTypes.DECIMAL(30, 8), allowNull: false, field: 'usd_amount' },
      /** Set when the bet was refunded / rolled back (migration 073); the stake no longer counts. */
      reversed_at: { type: DataTypes.DATE, allowNull: true, field: 'reversed_at' },
      /** Cumulative refunded stake, in `currency` (migration 090); `reversed_at` is set once it reaches `amount`. */
      reversed_amount: { type: DataTypes.DECIMAL(30, 8), allowNull: false, defaultValue: '0', field: 'reversed_amount' },
    },
    {
      sequelize,
      modelName: 'WagerActivity',
      tableName: 'wager_activity',
      schema: sequelize.options.schema || 'public',
      freezeTableName: true,
      underscored: false,
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: false,
    }
  );

  return WagerActivity;
};
