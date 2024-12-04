const { cache } = require('./cache');
const BattleRoyaleBet = require('../../models/BattleRoyaleBet');
const { Op } = require('sequelize');
const sequelize = require('../../config/database');

class BattleRoyaleCache {
  // 获取区域下注缓存key
  static getZoneBetsKey(gameId, zone) {
    return `battle-royale:${gameId}:zone:${zone}`;
  }

  // 获取游戏所有区域下注缓存key
  static getGameZonesKey(gameId) {
    return `battle-royale:${gameId}:zones`;
  }

  // 从数据库获取区域下注金额
  static async getZoneBetsFromDB(gameId) {
    const zones = {};
    
    // 初始化所有区域为0
    for (let i = 1; i <= 8; i++) {
      zones[i] = '0';
    }

    // 从数据库获取每个区域的下注总额
    const zoneBets = await BattleRoyaleBet.findAll({
      where: { 
        gameId,
        status: {
          [Op.in]: ['pending', 'win', 'lose'] // 不包括已退款的下注
        }
      },
      attributes: [
        'zone',
        [sequelize.fn('SUM', sequelize.col('amount')), 'totalAmount']
      ],
      group: ['zone']
    });

    // 更新每个区域的下注金额
    zoneBets.forEach(bet => {
      zones[bet.zone] = bet.getDataValue('totalAmount') || '0';
    });

    return zones;
  }

  // 初始化游戏区域缓存
  static async initGameZones(gameId) {
    // 从数据库获取现有下注
    const zones = await this.getZoneBetsFromDB(gameId);
    
    // 设置缓存
    for (let i = 1; i <= 8; i++) {
      cache.set(this.getZoneBetsKey(gameId, i), zones[i], 7200); // 2小时过期
    }
    cache.set(this.getGameZonesKey(gameId), zones, 7200);
    
    return zones;
  }

  // 更新区域下注金额
  static async updateZoneBets(gameId, zone, amount) {
    const key = this.getZoneBetsKey(gameId, zone);
    const zonesKey = this.getGameZonesKey(gameId);

    try {
      await cache.getLock(key);
      
      // 获取当前区域下注金额
      let currentAmount = cache.get(key);
      
      // 如果缓存不存在，从数据库获取
      if (currentAmount === null) {
        const zones = await this.getZoneBetsFromDB(gameId);
        currentAmount = zones[zone];
      }

      let newAmount = (parseFloat(currentAmount) + parseFloat(amount)).toFixed(2);
      
      // 更新区域下注金额
      cache.set(key, newAmount);

      // 更新游戏所有区域缓存
      let zones = cache.get(zonesKey);
      if (!zones) {
        zones = await this.getZoneBetsFromDB(gameId);
      }
      zones[zone] = newAmount;
      cache.set(zonesKey, zones);

      return newAmount;
    } finally {
      cache.releaseLock(key);
    }
  }

  // 获取游戏所有区域下注金额
  static async getGameZones(gameId) {
    let zones = cache.get(this.getGameZonesKey(gameId));
    
    // 如果缓存不存在，从数据库获取并设置缓存
    if (!zones) {
      zones = await this.getZoneBetsFromDB(gameId);
      await this.initGameZones(gameId);
    }
    
    return zones;
  }

  // 清除游戏缓存
  static clearGameCache(gameId) {
    for (let i = 1; i <= 8; i++) {
      cache.delete(this.getZoneBetsKey(gameId, i));
    }
    cache.delete(this.getGameZonesKey(gameId));
  }
}

module.exports = BattleRoyaleCache;