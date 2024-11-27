const { Op } = require('sequelize');
const { Recharge, Transaction } = require('../models');
const { cache } = require('../utils/cache');

const getRechargeHistory = async (userId, page = 1, pageSize = 10) => {
  const cacheKey = `recharge:history:${userId}:${page}`;

  // 尝试从缓存获取
  const cachedResult = cache.get(cacheKey);
  if (cachedResult) {
    return cachedResult;
  }

  try {
    const { count, rows: history } = await Recharge.findAndCountAll({
      where: {
        userId,
        status: 'completed' // 只返回完成的充值记录
      },
      include: [{
        model: Transaction,
        as: 'transactionDetails',
        required: true,
        attributes: ['hash', 'createTime', 'amount', 'coinName']
      }],
      order: [['createdAt', 'DESC']],
      limit: pageSize,
      offset: (page - 1) * pageSize
    });

    const result = {
      history: history.map(record => ({
        id: record.id,
        amount: Number(record.amount),
        status: record.status,
        hash: record.transactionDetails.hash,
        coinName: record.transactionDetails.coinName,
        createTime: record.transactionDetails.createTime,
        createdAt: record.createdAt
      })),
      pagination: {
        currentPage: page,
        pageSize,
        totalItems: count,
        totalPages: Math.ceil(count / pageSize)
      }
    };

    // 设置缓存，有效期5分钟
    cache.set(cacheKey, result, 300);

    return result;
  } catch (error) {
    console.error('Get recharge history error:', error);
    throw new Error('获取充值记录失败');
  }
};

// 清除用户充值历史缓存
const clearUserRechargeCache = async (userId) => {
  const cachePattern = `recharge:history:${userId}:*`;
  await cache.delete(cachePattern);
};

module.exports = {
  getRechargeHistory,
  clearUserRechargeCache
};