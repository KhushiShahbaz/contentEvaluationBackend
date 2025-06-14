const crypto = require("crypto");

const generateTeamCode = () => {
  return crypto.randomBytes(3).toString("hex"); // generates something like '1a2b3c'
};

module.exports = generateTeamCode;
