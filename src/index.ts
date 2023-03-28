import fs from "fs";
import https, { ServerOptions } from "https";
import express from "express";
import helmet from "helmet";
import path from "path";

const app = express();
const PORT = 3000;
const tlsArgs: ServerOptions = {
  key: fs.readFileSync("tls/key.pem"),
  cert: fs.readFileSync("tls/cert.pem"),
};

app.use(helmet());

// function checkLoggedIn(req, res, next) {
//   const isLoggedIn = true; // TODO
//   if (!isLoggedIn) return res.status(401).json({ error: "You must log in" });
//   next();
// }

app.get("/auth/google", (req, res) => {});
app.get("/auth/google/callback", (req, res) => {});
app.get("/auth/logout", (req, res) => {});
app.get("/secret", (req, res) => {
  res.send("This is your secret");
});
app.get("/", (req, res) => {
  const index = `${path.resolve("public")}/index.html`;
  res.sendFile(index);
});

https.createServer(tlsArgs, app).listen(PORT, () => {
  console.log(`Listening on ${PORT}`);
});
