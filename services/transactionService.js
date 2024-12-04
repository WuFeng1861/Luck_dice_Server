const axios = require('axios');
const { Op, Sequelize} = require('sequelize');
const sequelize = require('../config/database');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const Recharge = require('../models/Recharge');
const { BigNumber } = require('bignumber.js');
const TransactionSync = require('../models/TransactionSync');
const {deleteCache} = require("../utils/CacheUtils/cache");
const {clearUserRechargeCache} = require("./rechargeService");
const {removeUserCache} = require("../utils/CacheUtils/userCache");

const finishList = [];

// 获取最后处理的交易ID
const getLastProcessedId = async (dbTransaction) => {
  const syncRecord = await TransactionSync.findOne({
    order: [['createdAt', 'DESC']],
    transaction: dbTransaction,
    lock: true
  });
  if (!syncRecord) {
    throw new Error('lastProcessedId not define');
  }
  return syncRecord.lastProcessedId;
};

// 更新最后处理的交易ID
const updateLastProcessedId = async (lastId, dbTransaction) => {
  await TransactionSync.create({
    lastProcessedId: lastId
  }, { transaction: dbTransaction });
};

// 获取交易记录
const fetchTransactions = async (startId) => {
  try {
    const response = await axios.post('https://mercnet.cn/mintApi/wallet/getTransferRecord', {
      id: "1",
      coinName: "MERC",
      startId: startId,
      pageSize: 10
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidHlwZSI6MCwiaWF0IjoxNzMyNzk4NzUyLCJleHAiOjQ4ODg1NTg3NTJ9.gSw5C-QItcpXWA6a9UpNP5qHemlut4A5JoKT9zTBMnc 1`
      }
    });
    // console.log(response.data);
    if (response.data.code === 200 && response.data.msg.result) {
      return response.data.msg.list;
    }
    if (response.data.code === 401) {
      throw new Error('token expired');
    }
    return [];
  } catch (error) {
    console.error('Fetch transactions error:', error.message);
    throw new Error('Failed to fetch transactions');
  }
};

// 验证交易数据
const validateTransaction = (tx) => {
  // console.log(tx);
  if (!tx.hash || !tx.id || !tx.amount || !tx.sender || !tx.receiver) {
    throw new Error('Invalid transaction data');
  }

  try {
    // 验证金额格式
    const amount = new BigNumber(tx.amount);
    if (!amount.isFinite() || amount.isLessThanOrEqualTo(0)) {
      throw new Error('Invalid transaction amount');
    }
  } catch (error) {
    throw new Error('Invalid transaction amount format');
  }
};

// 创建交易记录
const createTransaction = async (tx, dbTransaction) => {
  validateTransaction(tx);

  return await Transaction.create({
    chainId: tx.id,
    hash: tx.hash,
    coinName: tx.coin_name,
    type: tx.type,
    sender: tx.sender.toLowerCase(),
    receiver: tx.receiver.toLowerCase(),
    amount: tx.amount,
    createTime: tx.create_time,
    fee: tx.fee,
    remark: tx.remark,
    processed: false
  }, { transaction: dbTransaction });
};

// 创建充值记录
const createRecharge = async (userId, transactionId, amount, dbTransaction) => {
  return await Recharge.create({
    userId,
    transactionId,
    amount,
    status: 'completed'
  }, { transaction: dbTransaction });
};

// 处理单个交易
const processTransaction = async (tx, dbTransaction) => {
  try {

    if(tx.sender === '' || tx.sender === '0xbeb46a90895ea3302ae7c77f67a4f71c16bddec0' || tx.receiver === '' || tx.receiver !== '0xbeb46a90895ea3302ae7c77f67a4f71c16bddec0') {
      // 系统奖励或者发送的奖励
      return null;
    }

    // 查找发送地址对应的用户
    const user = await User.findOne({
      where: { address: tx.sender.toLowerCase() },
      transaction: dbTransaction,
      lock: true // 使用悲观锁防止并发更新
    });
    // console.log(tx.sender, user);
    if (!user) {
      return null;
    }
    // console.log(tx);
    let lastBalance = user.balance ;

    let transaction;
    if (user) {
      // 创建交易记录
      transaction= await createTransaction(tx, dbTransaction);

      // 创建充值记录
      await createRecharge(user.id, transaction.id, tx.amount, dbTransaction);

      // 更新用户余额
      await user.updateBalance(tx.amount, { transaction: dbTransaction });

      // 标记交易为已处理
      await transaction.update({ processed: true }, { transaction: dbTransaction });
    }
    let newBalance = user.balance;

    finishList.push({
      hash: tx.hash,
      amount: Number(tx.amount),
      sender: tx.sender.toLowerCase(),
      oldBalance: lastBalance,
      newBalance: newBalance,
      userId: user.id,
    });
    return transaction;
  } catch (error) {
    throw new Error(`Failed to process transaction: ${error.message}`);
  }
};

// 处理新交易
const processNewTransactions = async () => {
  const dbTransaction = await sequelize.transaction({
    isolationLevel: Sequelize.Transaction.ISOLATION_LEVELS.SERIALIZABLE
  });
  finishList.length = 0; // 清空已完成的交易列表
  try {
    const lastProcessedId = await getLastProcessedId(dbTransaction);
    let newLastProcessedId = lastProcessedId;
    let startId = 2147483648;
    let shouldContinue = true;
    let processedTransactions = new Set();
    console.log('start processNewTransactions:' + new Date().toLocaleString());
    console.log('lastProcessedId:'+lastProcessedId);

    while (shouldContinue) {
      const transactions = await fetchTransactions(startId);
      // console.log('transactions.length:'+transactions.length);
      if (transactions.length === 0) {
        break;
      }

      shouldContinue = false;

      for (const tx of transactions) {
        // console.log('tx.id:'+tx.id);
        // 如果交易ID小于等于上次处理的ID，停止处理
        if (tx.id <= lastProcessedId) {
          shouldContinue = false;
          break;
        }

        // 检查是否已处理过这笔交易
        if (processedTransactions.has(tx.hash)) {
          continue;
        }

        // 检查交易是否已存在于数据库
        const existingTx = await Transaction.findOne({
          where: { hash: tx.hash },
          transaction: dbTransaction,
          lock: true
        });

        if (existingTx) {
          shouldContinue = false;
          continue;
        }

        // 记录已处理的交易
        processedTransactions.add(tx.hash);

        // 处理交易
        await processTransaction(tx, dbTransaction);
        shouldContinue = true;

        // 更新最后处理的ID
        newLastProcessedId = Math.max(newLastProcessedId, tx.id);
      }

      // 更新startId为当前批次中最小的id
      if (transactions.length > 0) {
        const minId = Math.min(...transactions.map(tx => tx.id));
        startId = minId;
      }
    }

    // 如果处理了新交易，更新最后处理的ID
    if (newLastProcessedId > lastProcessedId) {
      await updateLastProcessedId(newLastProcessedId, dbTransaction);
    }

    await dbTransaction.commit();
    for (const tx of finishList) {
      // 删除缓存
      await clearUserRechargeCache(tx.userId);
      await removeUserCache(tx.userId);
      console.log(`${tx.userId} 用户:${tx.sender}地址， 充值了 ${tx.amount}，充值成功。交易hash:${tx.hash}，充值前余额:${tx.oldBalance}，充值后余额:${tx.newBalance}`)
    }
    finishList.length = 0; // 清空已完成的交易列表
    console.log('finish processNewTransactions:' + new Date().toLocaleString());
    return true;
  } catch (error) {
    await dbTransaction.rollback();
    console.error('Process transactions error:', error);
    throw error;
  }
};

module.exports = {
  processNewTransactions,
  fetchTransactions,
  validateTransaction, // 导出以便测试
  createTransaction,
  createRecharge,
  processTransaction
};