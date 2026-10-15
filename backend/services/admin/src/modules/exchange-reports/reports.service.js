'use strict';

const { AppError } = require('@ibitplay/common');

const { treeOf, searchClients } = require('./reportScope');
const { statement, betDetail, betExport } = require('./accountStatement');
const { partyWinLoss, userWinLoss, totalProfitLoss, turnover } = require('./winLossReports');

const noBets = () => new AppError('No bets found for this entry', 404, 'EXCHANGE_NO_BETS');

/**
 * Sports Exchange ke Reports (zip msadmin `reports/*`).
 * Har report login wale ke tree tak simit — owner = poori site + direct users.
 */
class ExchangeReportsService {
  constructor({ models, logger }) {
    this.models = models;
    this.logger = logger;
  }

  get sequelize() {
    return this.models.Credits.sequelize;
  }

  #tree(actor) {
    return treeOf(this.models, actor, this.logger);
  }

  /** "Search By Client Name" ke suggestions. */
  async clients({ actor, search }) {
    return searchClients(this.sequelize, await this.#tree(actor), search);
  }

  /** Account Statement (zip statementv2). */
  async statement({ actor, ...filters }) {
    return statement(this.sequelize, await this.#tree(actor), actor, filters);
  }

  /** Game row par click — Details modal. */
  async statementBetDetail({ actor, betId }) {
    const detail = await betDetail(this.sequelize, await this.#tree(actor), { betId });
    if (!detail) throw noBets();
    return detail;
  }

  /** Game row ka Excel icon — 13-column CSV. */
  async statementBetExport({ actor, betId }) {
    const sheet = await betExport(this.sequelize, await this.#tree(actor), { betId });
    if (!sheet) throw noBets();
    return sheet;
  }

  async partyWinLoss({ actor, type, search }) {
    return partyWinLoss(this.sequelize, await this.#tree(actor), { type, search });
  }

  async userWinLoss({ actor, ...filters }) {
    return userWinLoss(this.sequelize, await this.#tree(actor), filters);
  }

  async totalProfitLoss({ actor, ...filters }) {
    return totalProfitLoss(this.sequelize, await this.#tree(actor), filters);
  }

  async turnover({ actor, ...filters }) {
    return turnover(this.sequelize, await this.#tree(actor), filters);
  }

  /**
   * SportBook Report — zip me iska backend tha hi nahi (provider list khaali).
   * Hamare paas bhi koi sportbook provider nahi, isliye hamesha khaali list.
   */
  async sportbookReport() {
    return [];
  }
}

module.exports = { ExchangeReportsService };
