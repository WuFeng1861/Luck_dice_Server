const User = require('../models/User');
const Game = require('../models/Game');
const { validateBet } = require('../utils/validator');
const sequelize = require('../config/database');
const { cache, withCache, deleteCache } = require('../utils/cache');
const BigNumber = require('bignumber.js');

// 配置 BigNumber
BigNumber.config({ DECIMAL_PLACES: 2, ROUNDING_MODE: BigNumber.ROUND_DOWN });

// 获取余额
exports.getBalance = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    res.json({
      balance: user.balance
    });
  } catch (error) {
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: '服务器内部错误'
      }
    });
  }
};

// 更新余额
exports.updateBalance = async (req, res) => {
  try {
    const { amount } = req.body;
    const user = await User.findByPk(req.user.id);
    
    // 使用 BigNumber 进行计算和比较
    const currentBalance = new BigNumber(user.balance);
    const changeAmount = new BigNumber(amount);
    const newBalance = currentBalance.plus(changeAmount);
    
    // 检查余额是否足够（如果是减少余额的情况）
    if (changeAmount.isNegative() && newBalance.isLessThan(0)) {
      return res.status(400).json({
        error: {
          code: 'INSUFFICIENT_BALANCE',
          message: '余额不足'
        }
      });
    }

    // 更新用户余额
    try {
      await user.updateBalance(changeAmount.toString());
    } catch (error) {
      return res.status(400).json({
        error: {
          code: 'INSUFFICIENT_BALANCE',
          message: error.message
        }
      });
    }

    // 立即删除用户缓存
    await deleteCache(`user:${user.id}`);

    // 延迟双删
    setTimeout(async () => {
      await deleteCache(`user:${user.id}`);
    }, 500);

    res.json({
      balance: user.balance
    });
  } catch (error) {
    console.error('Update balance error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: '服务器内部错误'
      }
    });
  }
};

// 下注
exports.placeBet = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const { amount, selectedFace } = req.body;
    const user = req.user;
    const userId = user.id;
    
    // 转换为 BigNumber
    const betAmount = new BigNumber(amount);
    const userBalance = new BigNumber(user.balance);

    // 立即删除缓存
    await Promise.all([
      deleteCache(`user:${userId}`),
      deleteCache(`history:${userId}:*`)
    ]);

    // 验证输入
    if (!validateBet(amount, selectedFace)) {
      return res.status(400).json({
        error: {
          code: 'INVALID_INPUT',
          message: '无效的下注金额或选择面数'
        }
      });
    }

    // 检查余额
    if (userBalance.isLessThan(betAmount)) {
      return res.status(400).json({
        error: {
          code: 'INSUFFICIENT_BALANCE',
          message: '余额不足'
        }
      });
    }

    // 生成骰子结果
    const finalNumber = Math.floor(Math.random() * 6) + 1;
    const win = finalNumber === selectedFace;
    const multiplier = new BigNumber('5.5');
    const winAmount = win 
      ? betAmount.multipliedBy(multiplier) 
      : betAmount.negated();

    // 更新用户余额
    try {
      await user.updateBalance(winAmount.toString());
    } catch (error) {
      return res.status(400).json({
        error: {
          code: 'INSUFFICIENT_BALANCE',
          message: error.message
        }
      });
    }

    // 记录游戏
    await Game.create({
      userId: user.id,
      gameType: 'single',
      amount: betAmount.toString(),
      selectedOption: String(selectedFace),
      diceResults: [finalNumber],
      win,
      finalBalance: user.balance
    }, { transaction: t });

    await t.commit();

    // 延迟双删缓存
    setTimeout(async () => {
      await Promise.all([
        deleteCache(`user:${userId}`),
        deleteCache(`history:${userId}:*`)
      ]);
    }, 500);

    res.json({
      finalNumber,
      win,
      winAmount: win ? winAmount.toString() : '0',
      amount: betAmount.toString()
    });
  } catch (error) {
    await t.rollback();
    console.error('Place bet error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: '服务器内部错误'
      }
    });
  }
};

// 获取历史记录（使用缓存装饰器）
exports.getHistory = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = 10;
    const userId = req.user.id;
    
    const cacheKey = `history:${userId}:${page}`;
    
    // 尝试从缓存获取
    const cachedData = cache.get(cacheKey);
    if (cachedData) {
      return res.json(cachedData);
    }

    const { count, rows: history } = await Game.findAndCountAll({
      where: { userId },
      order: [['createdAt', 'DESC']],
      limit: pageSize,
      offset: (page - 1) * pageSize
    });

    const result = {
      history,
      pagination: {
        currentPage: page,
        pageSize,
        totalItems: count,
        totalPages: Math.ceil(count / pageSize)
      }
    };

    // 设置缓存
    cache.set(cacheKey, result, 300); // 缓存5分钟

    res.json(result);
  } catch (error) {
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: '服务器内部错误'
      }
    });
  }
};

// 添加游戏历史记录
exports.addHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { 
      gameType,
      amount,
      win,
      finalBalance,
      diceResults,
      selectedOption,
    } = req.body;

    // 创建游戏记录
    const game = await Game.create({
      userId,
      gameType,
      amount,
      win,
      finalBalance,
      diceResults: diceResults,
      selectedOption: selectedOption,
      createdAt: new Date()
    });

    // 删除该用户的所有历史记录缓存
    await deleteCache(`history:${userId}:*`);

    // 获取最新的历史记录
    const page = 1;
    const pageSize = 10;
    const offset = (page - 1) * pageSize;

    const { count, rows } = await Game.findAndCountAll({
      where: { userId },
      order: [['createdAt', 'DESC']],
      limit: pageSize,
      offset
    });

    const result = {
      history: rows,
      pagination: {
        currentPage: page,
        pageSize,
        totalItems: count,
        totalPages: Math.ceil(count / pageSize)
      }
    };

    // 设置新的缓存
    cache.set(`history:${userId}:${page}`, result, 300);

    res.json(result);

  } catch (error) {
    console.error('Add history error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: '服务器内部错误'
      }
    });
  }
};

// 三骰子游戏下注
exports.placeTripleBet = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const { amount, selectedOption } = req.body;
    const user = req.user;
    const userId = user.id;

    // 转换为 BigNumber
    const betAmount = new BigNumber(amount);
    const userBalance = new BigNumber(user.balance);

    // 立即删除缓存
    await Promise.all([
      deleteCache(`user:${userId}`),
      deleteCache(`history:${userId}:*`)
    ]);

    // 验证输入
    if (!['big', 'small', 'middle', 'triple', 'pair', 'straight'].includes(selectedOption)) {
      return res.status(400).json({
        error: {
          code: 'INVALID_INPUT',
          message: '无效的选择选项'
        }
      });
    }

    // 检查余额
    if (userBalance.isLessThan(betAmount)) {
      return res.status(400).json({
        error: {
          code: 'INSUFFICIENT_BALANCE',
          message: '余额不足'
        }
      });
    }

    // 生成三个骰子结果
    const diceResults = Array(3).fill(0).map(() => Math.floor(Math.random() * 6) + 1);
    const sum = diceResults.reduce((a, b) => a + b, 0);

    // 判断输赢和倍率
    let win = false;
    let winAmount = -amount;
    let multiplier = 0;

    // 基础玩法（保守玩法，小赔率）
    if (selectedOption === 'big' && sum > 11) {
      win = true;
      multiplier = 1.8; // 概率42.13%，赔率1.8倍
    } else if (selectedOption === 'small' && sum < 10) {
      win = true;
      multiplier = 1.8; // 概率42.13%，赔率1.8倍
    } else if (selectedOption === 'middle' && sum >= 10 && sum <= 11) {
      win = true;
      multiplier = 4; // 概率15.74%，赔率4倍
    }
    // 特殊玩法（激进玩法，高赔率）
    else if (selectedOption === 'triple' && diceResults.every(d => d === diceResults[0])) {
      // 豹子（三个相同）
      win = true;
      multiplier = 30; // 概率2.78%，赔率30倍
    }
    else if (selectedOption === 'pair' && (
      diceResults[0] === diceResults[1] ||
      diceResults[1] === diceResults[2] ||
      diceResults[0] === diceResults[2]
    )) {
      // 对子（任意两个相同）
      win = true;
      multiplier = 2; // 概率41.67%，赔率2倍
    }
    else if (selectedOption === 'straight' && (
      // 顺子（三个续数字）
      (diceResults.includes(1) && diceResults.includes(2) && diceResults.includes(3)) ||
      (diceResults.includes(2) && diceResults.includes(3) && diceResults.includes(4)) ||
      (diceResults.includes(3) && diceResults.includes(4) && diceResults.includes(5)) ||
      (diceResults.includes(4) && diceResults.includes(5) && diceResults.includes(6))
    )) {
      win = true;
      multiplier = 6; // 概率13.89%，赔率6倍
    }

    // 计算赢得金额
    const multipliers = {
      big: new BigNumber('1.8'),
      small: new BigNumber('1.8'),
      middle: new BigNumber('4'),
      triple: new BigNumber('30'),
      pair: new BigNumber('2'),
      straight: new BigNumber('6')
    };

    winAmount = win 
      ? betAmount.multipliedBy(multipliers[selectedOption]) 
      : betAmount.negated();

    // 更新用户余额
    try {
      await user.updateBalance(winAmount.toString());
    } catch (error) {
      return res.status(400).json({
        error: {
          code: 'INSUFFICIENT_BALANCE',
          message: error.message
        }
      });
    }

    // 记录游戏
    await Game.create({
      userId: user.id,
      gameType: 'triple',
      amount: betAmount.toString(),
      selectedOption,
      diceResults,
      win,
      finalBalance: user.balance
    }, { transaction: t });

    await t.commit();

    // 延迟双删缓存
    setTimeout(async () => {
      await Promise.all([
        deleteCache(`user:${userId}`),
        deleteCache(`history:${userId}:*`)
      ]);
    }, 500);

    res.json({
      diceResults,
      sum,
      win,
      winAmount: win ? winAmount.toString() : '0',
      amount: betAmount.toString()
    });
  } catch (error) {
    await t.rollback();
    console.error('Place triple bet error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: '服务器内部错误'
      }
    });
  }
};

// 龙虎斗游戏下注
exports.placeDragonTigerBet = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const { amount, selectedOption } = req.body;
    const user = req.user;
    const userId = user.id;

    // 转换为 BigNumber
    const betAmount = new BigNumber(amount);
    const userBalance = new BigNumber(user.balance);

    // 立即删除缓存
    await Promise.all([
      deleteCache(`user:${userId}`),
      deleteCache(`history:${userId}:*`)
    ]);

    // 验证输入
    if (!['dragon', 'tiger', 'tie'].includes(selectedOption)) {
      return res.status(400).json({
        error: {
          code: 'INVALID_INPUT',
          message: '无效的选择选项'
        }
      });
    }

    // 检查余额
    if (userBalance.isLessThan(betAmount)) {
      return res.status(400).json({
        error: {
          code: 'INSUFFICIENT_BALANCE',
          message: '余额不足'
        }
      });
    }

    // 生成牌面点数（1-13）
    const dragonCard = Math.floor(Math.random() * 13) + 1;
    const tigerCard = Math.floor(Math.random() * 13) + 1;

    // 判断输赢和倍率
    let win = false;
    let multiplier = new BigNumber('0');

    if (selectedOption === 'dragon') {
      win = dragonCard > tigerCard;
      multiplier = new BigNumber('1');
    } else if (selectedOption === 'tiger') {
      win = tigerCard > dragonCard;
      multiplier = new BigNumber('1');
    } else if (selectedOption === 'tie') {
      win = dragonCard === tigerCard;
      multiplier = new BigNumber('8');
    }

    const winAmount = win 
      ? betAmount.multipliedBy(multiplier) 
      : betAmount.negated();

    // 更新用户余额
    try {
      await user.updateBalance(winAmount.toString());
    } catch (error) {
      return res.status(400).json({
        error: {
          code: 'INSUFFICIENT_BALANCE',
          message: error.message
        }
      });
    }

    // 记录游戏
    await Game.create({
      userId: user.id,
      gameType: 'dragon-tiger',
      amount: betAmount.toString(),
      selectedOption,
      diceResults: [dragonCard, tigerCard],  // 使用 diceResults 存储牌面点数
      win,
      finalBalance: user.balance
    }, { transaction: t });

    await t.commit();

    // 延迟双删缓存
    setTimeout(async () => {
      await Promise.all([
        deleteCache(`user:${userId}`),
        deleteCache(`history:${userId}:*`)
      ]);
    }, 500);

    res.json({
      dragonCard,
      tigerCard,
      win,
      winAmount: win ? winAmount.toString() : '0',
      amount: betAmount.toString()
    });
  } catch (error) {
    await t.rollback();
    console.error('Place dragon-tiger bet error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: '服务器内部错误'
      }
    });
  }
}; 