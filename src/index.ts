import fs from "fs";
import https, { ServerOptions } from "https";
import express from "express";
import helmet from "helmet";
import path from "path";
import dotenv from "dotenv";
import passport, { Profile } from "passport";
import googleOAuth2, {
  StrategyOptions,
  VerifyCallback,
} from "passport-google-oauth20";

dotenv.config();
const app = express();
const PORT = 3000;
const tlsArgs: ServerOptions = {
  key: fs.readFileSync("tls/key.pem"),
  cert: fs.readFileSync("tls/cert.pem"),
};

// * setup OAuth2 for passport
const { clientID, clientSecret } = process.env;
if (!clientID || !clientSecret)
  throw new Error("Provide Google OAuth2 info in .env file");
const authOptions: StrategyOptions = {
  callbackURL: "/auth/google/callback",
  clientID,
  clientSecret,
};
function verifyCallback(
  accessToken: string,
  refreshToken: string,
  profile: Profile,
  done: VerifyCallback
) {
  console.log("Google profile", profile);
  done(null, profile);
}
passport.use(new googleOAuth2.Strategy(authOptions, verifyCallback));

app.use(passport.initialize());

// function checkLoggedIn(req, res, next) {
//   const isLoggedIn = true; // TODO
//   if (!isLoggedIn) return res.status(401).json({ error: "You must log in" });
//   next();
// }

app.get("/auth/google", passport.authenticate("google", { scope: ["email"] }));
app.get(
  "/auth/google/callback",
  passport.authenticate("google", {
    failureRedirect: "/failure",
    successRedirect: "/",
    session: false,
  }),
  (req, res) => {
    console.log("Google called us back!");
    // return res.redirect("/");
  }
);
app.get("/auth/logout", (req, res) => {});

app.use(helmet());

app.get("/", (req, res) => {
  const index = `${path.resolve("public")}/index.html`;
  return res.sendFile(index);
});
app.get("/secret", (req, res) => {
  return res.send("This is your secret");
});
app.get("/failure", (req, res) => {
  return res.send("Failed to log in");
});

https.createServer(tlsArgs, app).listen(PORT, () => {
  console.log(`Listening on https://localhost:${PORT}`);
});
