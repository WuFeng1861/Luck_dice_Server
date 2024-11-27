const { Op } = require('sequelize');
const Game = require('../models/Game');
const sequelize = require('../config/database');

// 获取指定时间范围内的游戏统计
const getGameStats = async (startDate, endDate) => {
  const stats = await Game.findAll({
    attributes: [
      'gameType',
      [sequelize.fn('COUNT', sequelize.col('id')), 'totalGames'],
      [sequelize.fn('SUM', sequelize.col('amount')), 'totalBets'],
      [
        sequelize.literal(`SUM(CASE WHEN win = true THEN amount * 
          CASE 
            WHEN gameType = 'single' THEN 5.5
            WHEN gameType = 'triple' AND selectedOption = 'big' THEN 1.8
            WHEN gameType = 'triple' AND selectedOption = 'small' THEN 1.8
            WHEN gameType = 'triple' AND selectedOption = 'middle' THEN 4
            WHEN gameType = 'triple' AND selectedOption = 'triple' THEN 30
            WHEN gameType = 'triple' AND selectedOption = 'pair' THEN 2
            WHEN gameType = 'triple' AND selectedOption = 'straight' THEN 6
            WHEN gameType = 'dragon-tiger' AND selectedOption IN ('dragon', 'tiger') THEN 1
            WHEN gameType = 'dragon-tiger' AND selectedOption = 'tie' THEN 8
            ELSE 0
          END
        ELSE 0 END)`),
        'totalPayouts'
      ],
      [sequelize.fn('COUNT', sequelize.literal('CASE WHEN win = true THEN 1 END')), 'totalWins'],
      [sequelize.fn('COUNT', sequelize.literal('CASE WHEN win = false THEN 1 END')), 'totalLosses'],
      // 添加游戏类型统计
      [
        sequelize.literal(`
          CASE gameType
            WHEN 'dragon-tiger' THEN
              JSON_OBJECT(
                'dragon', CAST(COUNT(CASE WHEN selectedOption = 'dragon' THEN 1 END) AS CHAR),
                'tiger', CAST(COUNT(CASE WHEN selectedOption = 'tiger' THEN 1 END) AS CHAR),
                'tie', CAST(COUNT(CASE WHEN selectedOption = 'tie' THEN 1 END) AS CHAR),
                'dragonWins', CAST(COUNT(CASE WHEN selectedOption = 'dragon' AND win = true THEN 1 END) AS CHAR),
                'tigerWins', CAST(COUNT(CASE WHEN selectedOption = 'tiger' AND win = true THEN 1 END) AS CHAR),
                'tieWins', CAST(COUNT(CASE WHEN selectedOption = 'tie' AND win = true THEN 1 END) AS CHAR)
              )
            ELSE NULL
          END
        `),
        'typeStats'
      ]
    ],
    where: {
      createdAt: {
        [Op.between]: [startDate, endDate]
      }
    },
    group: ['gameType'],
    raw: true
  });

  // 计算每个游戏的盈利和胜率
  return stats.map(stat => {
    // 解析 typeStats，如果是字符串则解析，否则保持原样
    let parsedTypeStats = null;
    if (stat.typeStats) {
      try {
        parsedTypeStats = typeof stat.typeStats === 'string' 
          ? JSON.parse(stat.typeStats) 
          : stat.typeStats;
        
        // 将字符串数字转换为数字
        Object.keys(parsedTypeStats).forEach(key => {
          parsedTypeStats[key] = Number(parsedTypeStats[key]);
        });
      } catch (error) {
        console.error('Error parsing typeStats:', error);
        parsedTypeStats = null;
      }
    }

    return {
      ...stat,
      totalBets: Number(stat.totalBets),
      totalPayouts: Number(stat.totalPayouts),
      profit: Number(stat.totalBets) - Number(stat.totalPayouts),
      winRate: (stat.totalWins / (Number(stat.totalWins) + Number(stat.totalLosses)) * 100).toFixed(2) + '%',
      houseEdge: ((Number(stat.totalBets) - Number(stat.totalPayouts)) / Number(stat.totalBets) * 100).toFixed(2) + '%',
      typeStats: parsedTypeStats,
      gameTypeName: {
        'single': '幸运骰子',
        'triple': '三倍幸运骰子',
        'dragon-tiger': '龙虎斗'
      }[stat.gameType]
    };
  });
};

// 获取每日统计
exports.getDailyStats = async (req, res) => {
  try {
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));
    
    const stats = await getGameStats(startOfDay, endOfDay);
    
    res.json({ stats, period: 'daily' });
  } catch (error) {
    console.error('Get daily stats error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: '服务器内部错误'
      }
    });
  }
};

// 获取每周统计
exports.getWeeklyStats = async (req, res) => {
  try {
    const today = new Date();
    const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay()));
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(today.setDate(today.getDate() - today.getDay() + 6));
    endOfWeek.setHours(23, 59, 59, 999);
    
    const stats = await getGameStats(startOfWeek, endOfWeek);
    
    res.json({ stats, period: 'weekly' });
  } catch (error) {
    console.error('Get weekly stats error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: '服务器内部错误'
      }
    });
  }
};

// 获取每月统计
exports.getMonthlyStats = async (req, res) => {
  try {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
    
    const stats = await getGameStats(startOfMonth, endOfMonth);
    
    res.json({ stats, period: 'monthly' });
  } catch (error) {
    console.error('Get monthly stats error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: '服务器内部错误'
      }
    });
  }
};

// 获取自定义时间范围的统计
exports.getCustomStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({
        error: {
          code: 'INVALID_INPUT',
          message: '请提供开始和结束日期'
        }
      });
    }
    
    const stats = await getGameStats(new Date(startDate), new Date(endDate));
    
    res.json({ stats, period: 'custom' });
  } catch (error) {
    console.error('Get custom stats error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: '服务器内部错误'
      }
    });
  }
}; 