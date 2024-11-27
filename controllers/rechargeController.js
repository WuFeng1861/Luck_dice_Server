const rechargeService = require('../services/rechargeService');
const { processNewTransactions } = require('../services/transactionService');

// 获取用户充值历史
const getRechargeHistory = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;
    
    // 验证分页参数
    if (page < 1 || pageSize < 1 || pageSize > 100) {
      return res.status(400).json({
        error: {
          code: 'INVALID_PAGINATION',
          message: '无效的分页参数'
        }
      });
    }

    const userId = req.user.id;
    const result = await rechargeService.getRechargeHistory(userId, page, pageSize);
    
    res.json(result);
  } catch (error) {
    console.error('Get recharge history error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: '服务器内部错误'
      }
    });
  }
};

// 启动定时任务
let rechargeTaskInterval;

const startRechargeTask = () => {
  // 清理可能存在的旧定时器
  if (rechargeTaskInterval) {
    clearInterval(rechargeTaskInterval);
  }

  let isRunning = false;
  const fn = async () => {
    if (isRunning) {
      console.log('Recharge task is already running, skip this time');
      return;
    }
    isRunning = true;
    try {
      await processNewTransactions();
    } catch (error) {
      console.error('Recharge task error:', error);
    } finally {
      isRunning = false;
    }
  }
  // 创建新的定时任务
  fn();
  rechargeTaskInterval = setInterval(fn, 60000); // 每分钟检查一次
};

// 停止定时任务
const stopRechargeTask = () => {
  if (rechargeTaskInterval) {
    clearInterval(rechargeTaskInterval);
    rechargeTaskInterval = null;
  }
};

module.exports = {
  getRechargeHistory,
  startRechargeTask,
  stopRechargeTask
};