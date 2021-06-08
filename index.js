const express = require("express");
const bodyParser = require("body-parser");
const app = express();
app.use(bodyParser.json());
const port = process.env.port || 3000;

// Routes of the project
app.use(require("./routes"));

app.listen(process.env.PORT || 5000);
