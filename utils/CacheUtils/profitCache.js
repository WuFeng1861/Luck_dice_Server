const { cache } = require('./cache');
const BattleRoyaleProfit = require('../../models/BattleRoyaleProfit');

class ProfitCache {
  static CACHE_KEY = 'battle-royale:top-profits';
  static MAX_RECORDS = 9;

  static async updateTopProfits(profit) {
    let profits = cache.get(this.CACHE_KEY) || [];

    // Add new profit record
    profits.push(profit);

    // Sort by roundId in descending order (most recent first)
    profits.sort((a, b) => b.roundId - a.roundId);

    // Keep only the most recent records
    if (profits.length > this.MAX_RECORDS) {
      profits = profits.slice(0, this.MAX_RECORDS);
    }

    // Update cache with 1 hour TTL
    cache.set(this.CACHE_KEY, profits, 3600);

    return profits;
  }

  static async getTopProfits() {
    let profits = cache.get(this.CACHE_KEY);

    if (!profits) {
      // Fetch from database if cache is empty
      profits = await BattleRoyaleProfit.findAll({
        order: [['roundId', 'DESC']],
        limit: this.MAX_RECORDS,
        attributes: ['roundId', 'userId', 'username', 'profit'],
        raw: true
      });
      console.log('Fetching from database: ', profits);
      // Update cache
      if (profits.length > 0) {
        cache.set(this.CACHE_KEY, profits, 3600);
      }
    }

    return profits || [];
  }

  static clearCache() {
    cache.delete(this.CACHE_KEY);
  }
}

module.exports = ProfitCache;