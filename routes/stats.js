const express = require('express');
const router = express.Router();
const statsController = require('../controllers/statsController');
const auth = require('../middleware/auth');

/**
 * @swagger
 * /api/stats/daily:
 *   get:
 *     summary: 获取每日游戏统计
 *     tags: [统计]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 每日统计数据
 */
router.get('/daily', auth, statsController.getDailyStats);

/**
 * @swagger
 * /api/stats/weekly:
 *   get:
 *     summary: 获取每周游戏统计
 *     tags: [统计]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 每周统计数据
 */
router.get('/weekly', auth, statsController.getWeeklyStats);

/**
 * @swagger
 * /api/stats/monthly:
 *   get:
 *     summary: 获取每月游戏统计
 *     tags: [统计]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 每月统计数据
 */
router.get('/monthly', auth, statsController.getMonthlyStats);

/**
 * @swagger
 * /api/stats/custom:
 *   get:
 *     summary: 获取自定义时间范围的游戏统计
 *     tags: [统计]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: 开始日期
 *       - in: query
 *         name: endDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: 结束日期
 *     responses:
 *       200:
 *         description: 自定义时间范围的统计数据
 */
router.get('/custom', auth, statsController.getCustomStats);

module.exports = router; 