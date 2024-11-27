const svgCaptcha = require('svg-captcha');
const { cache } = require('./cache');

// 配置验证码选项
const captchaOptions = {
  size: 4, // 验证码长度
  noise: 4, // 干扰线条数
  color: true, // 随机颜色
  width: 120,
  height: 40,
  fontSize: 50,
  charPreset: '123456789ABCDEFGHIJKLMNPQRSTUVWXYZabcdefghjkmnopqrstuvwxyz' // 字符集
};

// 生成验证码
const generateCaptcha = () => {
  const captcha = svgCaptcha.create(captchaOptions);
  return {
    text: captcha.text,
    svg: captcha.data
  };
};

// 验证验证码
const validateCaptcha = (captchaId, userInput) => {
  const correctText = cache.get(`captcha:${captchaId}`);
  if (!correctText) {
    return false; // 验证码过期或不存在
  }
  
  // 验证后立即删除缓存
  cache.delete(`captcha:${captchaId}`);
  
  return userInput.toUpperCase() === correctText.toUpperCase();
};

module.exports = {
  generateCaptcha,
  validateCaptcha
};