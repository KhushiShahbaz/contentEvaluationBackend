// const nodemailer = require("nodemailer");
// const { engine } = require("express-handlebars");
// const hbs = require('nodemailer-express-handlebars');
// const path = require("path");

// // Configure transporter
// const transporter = nodemailer.createTransport({
//   service: "gmail",
//   port: 465,
//   secure: true,
//   auth: {
//     user: "khushishahbaz786@gmail.com",
//     pass: "Khushi3112",
//   },
// });

// // Handlebar options
// const handlebarOptions = {
//   viewEngine: {
//     extname: ".handlebars",
//     layoutsDir: path.resolve("./views/"),
//     defaultLayout: false,
//     partialsDir: path.resolve("./views/"),
//   },
//   viewPath: path.resolve("./views/"),
//   extName: ".handlebars",
// };

// // Register compile middleware
// transporter.use('compile', hbs(handlebarOptions));

// module.exports = { transporter };


const nodemailer = require("nodemailer")

const transporter = nodemailer.createTransport({
  service: "Gmail", // Or use 'Outlook', 'Yahoo', or SMTP config
  auth: {
    user: process.env.MAIL_USER || "khushishahbaz786@gmail.com", // Your email address
    pass: process.env.MAIL_PASS || "ulgx rxnb bshz jskl", // App password or email password
  },
})

module.exports = transporter