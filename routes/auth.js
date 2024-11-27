const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const auth = require('../middleware/auth');

/**
 * @swagger
 * /api/auth/captcha:
 *   get:
 *     summary: 获取验证码
 *     tags: [认证]
 *     responses:
 *       200:
 *         description: 验证码SVG和ID
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 captchaId:
 *                   type: string
 *                   description: 验证码ID，用于验证
 *                 svg:
 *                   type: string
 *                   description: SVG格式的验证码图片
 *       500:
 *         description: 服务器错误
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: object
 *                   properties:
 *                     code:
 *                       type: string
 *                     message:
 *                       type: string
 */
router.get('/captcha', authController.getCaptcha);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: 用户登录
 *     tags: [认证]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *               - captchaId
 *               - captchaText
 *             properties:
 *               username:
 *                 type: string
 *                 description: 用户名
 *               password:
 *                 type: string
 *                 description: 密码
 *               captchaId:
 *                 type: string
 *                 description: 验证码ID
 *               captchaText:
 *                 type: string
 *                 description: 用户输入的验证码
 *     responses:
 *       200:
 *         description: 登录成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                   description: JWT token
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     username:
 *                       type: string
 *                     balance:
 *                       type: number
 *       400:
 *         description: 验证码错误或输入无效
 *       401:
 *         description: 用户名或密码错误
 */
router.post('/login', authController.login);

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: 用户登出
 *     tags: [认证]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 登出成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 */
router.post('/logout', auth, authController.logout);

/**
 * @swagger
 * /api/auth/user:
 *   get:
 *     summary: 获取当前用户信息
 *     tags: [认证]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 用户信息
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 username:
 *                   type: string
 *                 balance:
 *                   type: number
 *       401:
 *         description: 未授权
 */
router.get('/user', auth, authController.getUser);

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: 用户注册
 *     tags: [认证]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *                 description: 用户名
 *               password:
 *                 type: string
 *                 description: 密码
 *     responses:
 *       200:
 *         description: 注册成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     username:
 *                       type: string
 *       400:
 *         description: 用户名已存在或输入无效
 */
router.post('/register', authController.register);

module.exports = router;