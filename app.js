const express = require("express");
const ErrorHandler = require("./middleware/error");
const app = express();
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const cors = require("cors");

app.use(
  cors(
  )
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
const user = require("./controller/user");
const transaction = require("./controller/transaction");
const product = require("./controller/product");
const comment = require("./controller/comment");
const category = require("./controller/category");
const dashboard = require("./controller/dasboard");

app.use("/users", user);
app.use("/products", product);
app.use("/transactions", transaction);
app.use("/comments", comment);
app.use("/categories", category);
app.use("/dashboard", dashboard);


// app.use("", welcome);

// it's for ErrorHandling
app.use(ErrorHandler);

module.exports = app;
