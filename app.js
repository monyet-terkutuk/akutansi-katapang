const express = require("express");
const ErrorHandler = require("./middleware/error");
const app = express();
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const cors = require("cors");

// app.use(
//   cors(
//   )
// );

// app.use(
//   cors({
//     origin: "https://administrasi-kec-katapang.vercel.app", // Ganti dengan domain front-end Anda
//     methods: ["GET", "POST", "PUT", "DELETE"], // Metode HTTP yang diizinkan
//     credentials: true, // Mengizinkan cookie dikirim dalam permintaan lintas domain
//   })
// );


app.use(
  cors({
    origin: "*", // Mengizinkan semua origin
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"], // Mengizinkan semua metode
    credentials: true, // Jika Anda menggunakan cookie
  })
);


app.use(express.json());
app.use(cookieParser());

app.use(bodyParser.urlencoded({ extended: true, limit: "50mb" }));

// config
if (process.env.NODE_ENV !== "PRODUCTION") {
  require("dotenv").config({
    path: "config/.env",
  });
}

// import routes
const account = require("./controller/account");
const balance = require("./controller/Balance");
const user = require("./controller/user");
const transaction = require("./controller/transaction");
const product = require("./controller/product");
const comment = require("./controller/comment");
const category = require("./controller/category");
const dashboard = require("./controller/dasboard");
const journal = require("./controller/journal");

app.use("/users", user);
app.use("/products", product);
app.use("/transactions", transaction);
app.use("/comments", comment);
app.use("/categories", category);
app.use("/dashboard", dashboard);
app.use("/account", account);
app.use("/journal", journal);
app.use("/balance", balance);


// app.use("", welcome);

// it's for ErrorHandling
app.use(ErrorHandler);

module.exports = app;
