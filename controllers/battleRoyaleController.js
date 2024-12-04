const { Op } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const BattleRoyale = require('../models/BattleRoyale');
const BattleRoyaleBet = require('../models/BattleRoyaleBet');
const Game = require('../models/Game');
const User = require('../models/User');
const { cache} = require('../utils/CacheUtils/cache');
const { getSecureRandomInt } = require('../utils/random');
const sequelize = require('../config/database');
const BigNumber = require('bignumber.js');
const BattleRoyaleCache = require('../utils/CacheUtils/battleRoyaleCache');
const {deleteUserCacheForUpdateBalance, getUserCache, setUserCache} = require("../utils/CacheUtils/userCache");

let gameInterval;

// 创建新游戏
const createNewGame = async () => {
  const now = new Date();
  const startTime = new Date(now.getTime() + 60000); // 1分钟后开始
  const endTime = new Date(startTime.getTime() + 300000); // 5分钟游戏时间

  const game = await BattleRoyale.create({
    gameId: uuidv4(),
    startTime,
    endTime,
    status: 'waiting'
  });
  console.log('New game created:', game.gameId, game.startTime, game.endTime);

  // 初始化游戏区域缓存
  BattleRoyaleCache.initGameZones(game.gameId);

  return game;
};

// 获取当前游戏所有区域的下注情况
const getZoneBets = async (req, res) => {
  try {
    const { gameId } = req.query;

    if (!gameId) {
      return res.status(404).json({
        error: {
          code: 'GAMEID_NOT_FOUND',
          message: '游戏数据不存在'
        }
      });
    }

    // 获取所有区域的下注金额
    const zoneBets = await BattleRoyaleCache.getGameZones(gameId);

    // 计算总下注金额
    const totalBets = Object.values(zoneBets).reduce(
      (sum, amount) => new BigNumber(sum).plus(amount).toString(),
      '0'
    );

    res.json({
      gameId: gameId,
      zoneBets,
      totalBets
    });
  } catch (error) {
    console.error('Get zone bets error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: '服务器内部错误'
      }
    });
  }
};

// 获取当前游戏
const getCurrentGame = async (req, res) => {
  try {
    const game = await BattleRoyale.findOne({
      where: {
        status: {
          [Op.in]: ['waiting', 'running']
        }
      },
      order: [['createdAt', 'DESC']]
    });

    if (!game) {
      const newGame = await createNewGame();
      return res.json(newGame);
    }

    // 获取用户在当前游戏的下注信息
    if (req.user) {
      const userBets = await BattleRoyaleBet.findAll({
        where: {
          gameId: game.gameId,
          userId: req.user.id
        },
        raw: true
      });
      let sumUserBets = [];
      for (const bet of userBets) {
        const { zone, amount } = bet;
        let item = sumUserBets.find(item => item.zone === zone);
        if(item) {
          item.amount = new BigNumber(item.amount).plus(amount).toString();
        } else {
          sumUserBets.push({...bet});
        }
      }
      game.dataValues.userBets = sumUserBets;
    }

    // 获取所有区域的下注金额
    const zoneBets = await BattleRoyaleCache.getGameZones(game.gameId);
    game.dataValues.zoneBets = zoneBets;

    res.json(game);
  } catch (error) {
    console.error('Get current game error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: '服务器内部错误'
      }
    });
  }
};

// 获取游戏详情
const getGameDetails = async (req, res) => {
  try {
    const { gameId } = req.params;
    const userId = req.user.id;

    const game = await BattleRoyale.findOne({
      where: { gameId }
    });

    if (!game) {
      return res.status(404).json({
        error: {
          code: 'GAME_NOT_FOUND',
          message: '游戏不存在'
        }
      });
    }

    // 获取用户在该游戏的所有下注
    const userBets = await BattleRoyaleBet.findAll({
      where: {
        gameId,
        userId
      }
    });

    // 获取所有区域的下注金额
    const zoneBets = await BattleRoyaleCache.getGameZones(gameId);

    // 如果游戏已结束，计算用户统计信息
    let userStats = null;
    if (game.status === 'finished') {
      const totalBetAmount = userBets.reduce(
        (sum, bet) => new BigNumber(sum).plus(bet.amount).toString(),
        '0'
      );
      const totalWinAmount = userBets.reduce(
        (sum, bet) => new BigNumber(sum).plus(bet.winAmount).toString(),
        '0'
      );
      const netProfit = new BigNumber(totalWinAmount).minus(totalBetAmount).toString();

      userStats = {
        totalBetAmount,
        totalWinAmount,
        netProfit
      };
    }

    res.json({
      ...game.toJSON(),
      userBets,
      zoneBets,
      userStats
    });
  } catch (error) {
    console.error('Get game details error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: '服务器内部错误'
      }
    });
  }
};

// 游戏下注
const placeBet = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const { bets } = req.body;
    const userId = req.user.id;

    // 验证下注数据
    if (!Array.isArray(bets) || bets.length === 0) {
      return res.status(400).json({
        error: {
          code: 'INVALID_BETS',
          message: '无效的下注数据'
        }
      });
    }

    // 获取当前游戏
    const game = await BattleRoyale.findOne({
      where: {
        status: {
          [Op.in]: ['waiting', 'running']
        }
      },
      order: [['createdAt', 'DESC']],
      transaction: t,
      lock: true
    });

    if (!game) {
      return res.status(400).json({
        error: {
          code: 'NO_ACTIVE_GAME',
          message: '没有进行中的游戏'
        }
      });
    }

    // 计算总下注金额
    const totalAmount = bets.reduce(
      (sum, bet) => new BigNumber(sum).plus(bet.amount).toString(),
      '0'
    );

    // 检查用户余额
    const user = await User.findByPk(userId, { transaction: t, lock: true });
    if (new BigNumber(user.balance).isLessThan(totalAmount)) {
      return res.status(400).json({
        error: {
          code: 'INSUFFICIENT_BALANCE',
          message: '余额不足'
        }
      });
    }

    // 创建下注记录
    const createdBets = [];
    for (const bet of bets) {
      const { zone, amount } = bet;

      // 验证区域和金额
      if (!Number.isInteger(zone) || zone < 1 || zone > 8 || amount <= 0) {
        throw new Error('无效的下注数据');
      }

      // 创建下注记录
      const betRecord = await BattleRoyaleBet.create({
        gameId: game.gameId,
        userId,
        zone,
        amount: amount.toString(),
        status: 'pending'
      }, { transaction: t });

      // 更新区域下注缓存
      await BattleRoyaleCache.updateZoneBets(game.gameId, zone, amount);

      createdBets.push(betRecord);
    }

    // 更新用户余额
    await user.updateBalance(new BigNumber(totalAmount).negated().toString(), { transaction: t });

    // 更新游戏总下注金额
    await game.increment('totalBets', {
      by: totalAmount,
      transaction: t
    });

    await t.commit();
    deleteUserCacheForUpdateBalance(userId);
    res.json({
      message: '下注成功',
      bets: createdBets
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

// 获取游戏历史
const getGameHistory = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = 10;
    const userId = req.user.id;

    const { count, rows: games } = await BattleRoyale.findAndCountAll({
      where: {
        status: 'finished'
      },
      order: [['endTime', 'DESC']],
      limit: pageSize,
      offset: (page - 1) * pageSize
    });

    // 获取每个游戏的用户下注信息
    const gamesWithBets = await Promise.all(
      games.map(async (game) => {
        const bets = await BattleRoyaleBet.findAll({
          where: {
            gameId: game.gameId,
            userId
          }
        });

        return {
          ...game.toJSON(),
          bets
        };
      })
    );

    res.json({
      games: gamesWithBets,
      pagination: {
        currentPage: page,
        pageSize,
        totalItems: count,
        totalPages: Math.ceil(count / pageSize)
      }
    });
  } catch (error) {
    console.error('Get game history error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: '服务器内部错误'
      }
    });
  }
};

// 启动游戏任务
const startGameTask = () => {
  if (gameInterval) {
    clearInterval(gameInterval);
  }
  let lastIntervalTime = 0;
  let isRunning = false;
  const checkAndUpdateGame = async () => {
    let now = new Date();

    if(now.getTime() - lastIntervalTime < 1000 || isRunning) {
      return;
    }
    isRunning = true;
    const t = await sequelize.transaction();
    console.log('Checking and updating game...');
    let needCreateNewGame = false;
    try {
      // 查找当前游戏
      const currentGame = await BattleRoyale.findOne({
        where: {
          status: {
            [Op.in]: ['waiting', 'running']
          }
        },
        order: [['createdAt', 'DESC']],
        transaction: t,
        lock: true
      });

      console.log('Current game:', currentGame && currentGame.gameId);

      if (!currentGame) {
        await t.commit();
        needCreateNewGame = true;
        return;
      }

      // 更新游戏状态
      if (currentGame.status === 'waiting' && now >= new Date(currentGame.startTime)) {
        await currentGame.update({ status: 'running' }, { transaction: t });
      } else if (currentGame.status === 'running' && now >= new Date(currentGame.endTime)) {
        // 开始结算
        let newGameNeed = await settleGame(currentGame, t);
        if(newGameNeed) {
          needCreateNewGame = true;
        }
      }

      await t.commit();
    } catch (error) {
      await t.rollback();
      console.error('Game task error:', error);
    } finally {
      isRunning = false;
      lastIntervalTime = new Date().getTime();
      if(needCreateNewGame) {
        console.log('Creating new game...');
        await createNewGame();
      }
    }
  };

  // 立即执行一次
  checkAndUpdateGame();
  // 每秒检查一次
  gameInterval = setInterval(checkAndUpdateGame, 1000);
};

// 停止游戏任务
const stopGameTask = () => {
  if (gameInterval) {
    clearInterval(gameInterval);
    gameInterval = null;
  }
};

// 结算游戏
const settleGame = async (game, transaction) => {
  try {
    // 更新游戏状态为结算中
    await game.update({ status: 'settling' }, { transaction });

    // 获取所有区域的下注情况
    const zoneBets = await BattleRoyaleCache.getGameZones(game.gameId);
    
    // 统计有效下注区域数量
    const validZones = Object.entries(zoneBets)
      .filter(([_, amount]) => new BigNumber(amount).isGreaterThan(0))
      .map(([zone]) => parseInt(zone));

    // 如果有效下注区域小于3个，游戏无效
    if (validZones.length < 3) {
      return await invalidateGame(game, transaction);
    }

    // 随机选择2个安全区域
    const safeZones = [];
    while (safeZones.length < 2) {
      const zone = getSecureRandomInt(1, 8);
      if (!safeZones.includes(zone)) {
        safeZones.push(zone);
      }
    }

    // 更新游戏安全区域
    await game.update({ safeZones }, { transaction });

    // 获取所有下注记录
    const bets = await BattleRoyaleBet.findAll({
      where: {
        gameId: game.gameId,
        status: 'pending'
      },
      transaction,
      lock: true
    });

    const betUsers = new Map();
    // 计算总奖池（90%）
    const totalPool = new BigNumber(game.totalBets).multipliedBy(0.9);

    // 计算安全区域的总下注额
    const safeZoneTotalBets = bets
      .filter(bet => safeZones.includes(bet.zone))
      .reduce((sum, bet) => sum.plus(bet.amount), new BigNumber(0));

    // 更新每个下注的状态和奖金
    for (const bet of bets) {
      const isWin = safeZones.includes(bet.zone);
      const status = isWin ? 'win' : 'lose';
      let winAmount = '0';

      if (isWin && !safeZoneTotalBets.isZero()) {
        // 按比例分配奖池
        winAmount = totalPool
          .multipliedBy(bet.amount)
          .dividedBy(safeZoneTotalBets)
          .toFixed(2);
      }

      await bet.update({
        status,
        winAmount
      }, { transaction });

      // 更新用户余额
      if (isWin) {
        const user = await User.findByPk(bet.userId, { transaction, lock: true });
        await user.updateBalance(winAmount, { transaction });
        betUsers.set(bet.userId, {
          isWin: betUsers.get(bet.userId)?.isWin || isWin,
          amount: new BigNumber(betUsers.get(bet.userId)?.amount || 0).plus(bet.amount).toString(),
          selectedOption: (betUsers.get(bet.userId)?.selectedOption || []).includes(bet.zone)? betUsers.get(bet.userId)?.selectedOption : [...betUsers.get(bet.userId)?.selectedOption || [], bet.zone],
          diceResults: safeZones,
          finalBalance: user.balance
        });
      } else {
        betUsers.set(bet.userId, {
          ...betUsers.get(bet.userId),
          isWin: betUsers.get(bet.userId)?.isWin || isWin,
          amount: new BigNumber(betUsers.get(bet.userId)?.amount || 0).plus(bet.amount).toString(),
          selectedOption: (betUsers.get(bet.userId)?.selectedOption || []).includes(bet.zone)? betUsers.get(bet.userId)?.selectedOption : [...betUsers.get(bet.userId)?.selectedOption || [], bet.zone],
          diceResults: safeZones,
        });
      }

      // 获取用户余额
      // let cachedUser = getUserCache(bet.userId);
      // if (!cachedUser) {
      //   const user = await User.findByPk(bet.userId);
      //   const userData = {
      //     id: user.id,
      //     username: user.username,
      //     balance: user.balance,
      //     address: user.address || ''
      //   };
      //   setUserCache(bet.userId, userData);
      //   cachedUser = userData;
      // }

      // 记录游戏历史
      // await Game.create({
      //   userId: bet.userId,
      //   gameType: 'battle-royale',
      //   amount: bet.amount,
      //   selectedOption: JSON.stringify([bet.zone]),
      //   diceResults: safeZones,
      //   win: isWin,
      //   finalBalance: cachedUser.balance
      // }, { transaction });
    }

    // 记录游戏历史 betUsers
    for (const [userId, betUser] of betUsers) {
      let {isWin, amount, selectedOption, diceResults, finalBalance} = betUser;
      if(!isWin) {
        let cachedUser = getUserCache(userId);
        if (!cachedUser) {
          const user = await User.findByPk(userId, { transaction, lock: true });
          const userData = {
            id: userId,
            username: user.username,
            balance: user.balance,
            address: user.address || ''
          };
          setUserCache(userId, userData);
          cachedUser = userData;
        }
        finalBalance = cachedUser.balance;
      }
      await Game.create({
        userId: userId,
        gameType: 'battle-royale',
        amount: amount,
        selectedOption: JSON.stringify(selectedOption),
        diceResults: diceResults,
        win: isWin,
        finalBalance: finalBalance
      }, { transaction });
      // 清除用户缓存
      deleteUserCacheForUpdateBalance(userId);
    }

    // 清除游戏缓存
    BattleRoyaleCache.clearGameCache(game.gameId);

    // 更新游戏状态为已完成
    await game.update({ status: 'finished' }, { transaction });

    // 创建新游戏
    return true;
  } catch (error) {
    console.error('Settle game error:', error);
    throw error;
  }
};

// 游戏无效处理
const invalidateGame = async (game, transaction) => {
  try {
    // 更新游戏状态
    await game.update({
      status: 'finished',
      isValid: false
    }, { transaction });

    // 获取所有待处理的下注
    const bets = await BattleRoyaleBet.findAll({
      where: {
        gameId: game.gameId,
        status: 'pending'
      },
      transaction,
      lock: true
    });

    // 记录所有下注的用户
    const betUsers = new Set();
    // 退还所有下注
    for (const bet of bets) {
      // 更新下注状态
      await bet.update({
        status: 'refunded',
        winAmount: bet.amount
      }, { transaction });

      // 退还用户余额
      const user = await User.findByPk(bet.userId, { transaction, lock: true });
      await user.updateBalance(bet.amount, { transaction });
      // 记录用户
      betUsers.add(bet.userId);
      // 记录游戏历史
      // await Game.create({
      //   userId: bet.userId,
      //   gameType: 'battle-royale',
      //   amount: '0',
      //   selectedOption: JSON.stringify([bet.zone]),
      //   diceResults: [],
      //   win: false,
      //   finalBalance: user.balance
      // }, { transaction });
    }

    // 清除游戏缓存
    BattleRoyaleCache.clearGameCache(game.gameId);
    // 清除用户缓存
    for (const userId of betUsers) {
      deleteUserCacheForUpdateBalance(userId);
    }
    // 创建新游戏
    return true;
  } catch (error) {
    console.error('Invalidate game error:', error);
    throw error;
  }
};

module.exports = {
  getCurrentGame,
  getGameDetails,
  placeBet,
  getGameHistory,
  startGameTask,
  stopGameTask,
  getZoneBets
};