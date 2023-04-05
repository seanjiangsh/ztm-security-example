import fs from "fs";
import https, { ServerOptions } from "https";
import express, { Request, Response, NextFunction } from "express";
import helmet from "helmet";
import path from "path";
import dotenv from "dotenv";
import passport, { Profile } from "passport";
import googleOAuth2, {
  StrategyOptions,
  VerifyCallback,
} from "passport-google-oauth20";
import cookieSession from "cookie-session";

dotenv.config();

const app = express();
const PORT = 3000;
const tlsArgs: ServerOptions = {
  key: fs.readFileSync("tls/key.pem"),
  cert: fs.readFileSync("tls/cert.pem"),
};

// * get env vars
const { clientID, clientSecret, cookieKey1 } = process.env;
if (!clientID || !clientSecret || !cookieKey1)
  throw new Error("Provide required info in .env file");

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
  // console.log("Google profile", profile);
  done(null, profile);
}

function checkLoggedIn(req: Request, res: Response, next: NextFunction) {
  console.log("Current user is:", req.user);
  // * note "req.isAuthenticated()" is provided by passport
  const isLoggedIn = req.isAuthenticated() && req.user;
  if (!isLoggedIn) return res.status(401).json({ error: "You must log in" });
  next();
}

// * Helmet header middleware
app.use(helmet());

// * cookie sessions
app.use(
  cookieSession({
    name: "session",
    maxAge: 24 * 60 * 60 * 1000,
    keys: [cookieKey1],
  })
);
// * register regenerate & save after the cookieSession middleware initialization
// * https://github.com/jaredhanson/passport/issues/904
app.use(function (request, response, next) {
  if (request.session && !request.session.regenerate) {
    request.session.regenerate = (callback: () => {}) => callback();
  }
  if (request.session && !request.session.save) {
    request.session.save = (callback: () => {}) => callback();
  }
  next();
});

// * OAuth2 middlewares
passport.serializeUser((user, done) => {
  // * reduce session size by only get user.id property
  const usr = user as { id: string };
  done(null, usr.id);
});
passport.deserializeUser((obj, done) => {
  if (obj) done(null, obj);
});
passport.use(new googleOAuth2.Strategy(authOptions, verifyCallback));

app.use(passport.initialize());
app.use(passport.session());

app.get("/auth/google", passport.authenticate("google", { scope: ["email"] }));
app.get(
  "/auth/google/callback",
  passport.authenticate("google", {
    failureRedirect: "/failure",
    successRedirect: "/",
    session: true, // * default use session
  }),
  (req, res) => {
    console.log("Google called us back!");
    // return res.redirect("/");
  }
);
app.get("/auth/logout", (req, res) => {
  // * note "req.logout()" is provided by passport
  req.logout(() => {});
  return res.redirect("/");
});

// * application routes
app.get("/", (req, res) => {
  const index = `${path.resolve("public")}/index.html`;
  return res.sendFile(index);
});
app.get("/secret", checkLoggedIn, (req, res) => {
  return res.send("This is your secret");
});
app.get("/failure", (req, res) => {
  return res.send("Failed to log in");
});

https.createServer(tlsArgs, app).listen(PORT, () => {
  console.log(`Listening on https://localhost:${PORT}`);
});
