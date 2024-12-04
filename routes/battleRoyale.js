const express = require('express');
const router = express.Router();
const battleRoyaleController = require('../controllers/battleRoyaleController');
const auth = require('../middleware/auth');

/**
 * @swagger
 * /api/battle-royale/current:
 *   get:
 *     summary: 获取当前游戏信息
 *     tags: [大逃杀]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 当前游戏信息
 */
router.get('/current', auth, battleRoyaleController.getCurrentGame);

/**
 * @swagger
 * /api/battle-royale/zone-bets:
 *   get:
 *     summary: 获取游戏所有区域的下注情况
 *     tags: [大逃杀]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: gameId
 *         schema:
 *           type: string
 *         description: 游戏ID（可选，不传则获取当前游戏）
 *     responses:
 *       200:
 *         description: 所有区域的下注金额
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 gameId:
 *                   type: string
 *                   description: 游戏ID
 *                 status:
 *                   type: string
 *                   description: 游戏状态
 *                 zoneBets:
 *                   type: object
 *                   additionalProperties:
 *                     type: string
 *                   example:
 *                     "1": "100.00"
 *                     "2": "200.00"
 *                 totalBets:
 *                   type: string
 *                   description: 总下注金额
 */
router.get('/zone-bets', auth, battleRoyaleController.getZoneBets);

/**
 * @swagger
 * /api/battle-royale/{gameId}:
 *   get:
 *     summary: 获取指定游戏详情
 *     tags: [大逃杀]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: gameId
 *         required: true
 *         schema:
 *           type: string
 *         description: 游戏ID
 *     responses:
 *       200:
 *         description: 游戏详情
 */
router.get('/:gameId', auth, battleRoyaleController.getGameDetails);

/**
 * @swagger
 * /api/battle-royale/bet:
 *   post:
 *     summary: 游戏下注（支持多区域下注）
 *     tags: [大逃杀]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - bets
 *             properties:
 *               bets:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - zone
 *                     - amount
 *                   properties:
 *                     zone:
 *                       type: integer
 *                       minimum: 1
 *                       maximum: 8
 *                       description: 下注区域
 *                     amount:
 *                       type: number
 *                       description: 下注金额
 *     responses:
 *       200:
 *         description: 下注成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 bets:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       gameId:
 *                         type: string
 *                       zone:
 *                         type: integer
 *                       amount:
 *                         type: string
 *                       status:
 *                         type: string
 */
router.post('/bet', auth, battleRoyaleController.placeBet);

/**
 * @swagger
 * /api/battle-royale/top-profits:
 *   get:
 *     summary: 获取最近9轮游戏的收益记录
 *     tags: [大逃杀]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 最近的收益记录
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 profits:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       roundId:
 *                         type: integer
 *                       userId:
 *                         type: integer
 *                       username:
 *                         type: string
 *                       profit:
 *                         type: string
 */
router.post('/top-profits', auth, battleRoyaleController.getTopProfits);

/**
 * @swagger
 * /api/battle-royale/history:
 *   get:
 *     summary: 获取游戏历史
 *     tags: [大逃杀]
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
 *         description: 游戏历史记录
 */
router.get('/history', auth, battleRoyaleController.getGameHistory);

module.exports = router;