const express = require('express');
const router = express.Router();
const gameController = require('../controllers/gameController');
const auth = require('../middleware/auth');

/**
 * @swagger
 * /api/game/bet/single:
 *   post:
 *     summary: 进行单骰子游戏下注
 *     tags: [游戏]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *               - selectedFace
 *             properties:
 *               amount:
 *                 type: number
 *                 description: 下注金额
 *               selectedFace:
 *                 type: number
 *                 description: 选择的骰子面数(1-6)
 *     responses:
 *       200:
 *         description: 游戏结果
 */
router.post('/bet/single', auth, gameController.placeBet);

/**
 * @swagger
 * /api/game/bet/triple:
 *   post:
 *     summary: 进行三骰子游戏下注
 *     tags: [游戏]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *               - selectedFace
 *             properties:
 *               amount:
 *                 type: number
 *                 description: 下注金额
 *               selectedFace:
 *                 type: number
 *                 description: 选择的骰子面数(1-6)
 *     responses:
 *       200:
 *         description: 游戏结果
 */
router.post('/bet/triple', auth, gameController.placeTripleBet);

/**
 * @swagger
 * /api/game/bet/dragon-tiger:
 *   post:
 *     summary: 进行龙虎斗游戏下注
 *     tags: [游戏]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *               - selectedFace
 *             properties:
 *               amount:
 *                 type: number
 *                 description: 下注金额
 *               selectedFace:
 *                 type: number
 *                 description: 选择的骰子面数(1-6)
 *     responses:
 *       200:
 *         description: 游戏结果
 */
router.post('/bet/dragon-tiger', auth, gameController.placeDragonTigerBet);

/**
 * @swagger
 * /api/game/history:
 *   get:
 *     summary: 获取游戏历史记录
 *     tags: [游戏]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 历史记录列表
 */
router.get('/history', auth, gameController.getHistory);

/**
 * @swagger
 * /api/game/history:
 *   post:
 *     summary: 添加游戏历史记录
 *     tags: [游戏]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *               - win
 *               - finalBalance
 *               - diceResult
 *               - selectedFace
 *             properties:
 *               amount:
 *                 type: number
 *               win:
 *                 type: boolean
 *               finalBalance:
 *                 type: number
 *               diceResult:
 *                 type: number
 *               selectedFace:
 *                 type: number
 *     responses:
 *       200:
 *         description: 创建的历史记录
 */
router.post('/history', auth, gameController.addHistory);

/**
 * @swagger
 * /api/game/balance:
 *   get:
 *     summary: 获取用户余额
 *     tags: [游戏]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 用户余额
 */
router.get('/balance', auth, gameController.getBalance);

/**
 * @swagger
 * /api/game/balance/update:
 *   post:
 *     summary: 更新用户余额
 *     tags: [游戏]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *             properties:
 *               amount:
 *                 type: number
 *     responses:
 *       200:
 *         description: 更新后的余额
 */
router.post('/balance/update', auth, gameController.updateBalance);

module.exports = router; 