const {ethers, verifyMessage} = require("ethers");
exports.validateUsername = (username) => {
  return typeof username === 'string' &&
      username.length >= 3 &&
      username.length <= 20;
};

exports.validatePassword = (password) => {
  return typeof password === 'string' &&
      password.length >= 6 &&
      password.length <= 20;
};

exports.validateBet = (amount, selectedFace) => {
  return Number.isInteger(amount) &&
      amount > 0 &&
      Number.isInteger(selectedFace) &&
      selectedFace >= 1 &&
      selectedFace <= 6;
};

exports.validateAddress = (address) => {
  return typeof address === 'string' &&
      ethers.isAddress(address);
};

exports.validateSignBindAddress = (address, signRes) => {
  const message = 'bind Mercury Game Address';
  return typeof address === 'string' &&
      ethers.isAddress(address) &&
      verifyMessage(message, signRes);
}