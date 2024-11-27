const express = require('express');
const router = express.Router();
const rechargeController = require('../controllers/rechargeController');
const auth = require('../middleware/auth');

/**
 * @swagger
 * /api/recharge/history:
 *   get:
 *     summary: 获取充值历史记录
 *     tags: [充值]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: 页码
 *     responses:
 *       200:
 *         description: 充值历史记录列表
 */
router.get('/history', auth, rechargeController.getRechargeHistory);

module.exports = router;