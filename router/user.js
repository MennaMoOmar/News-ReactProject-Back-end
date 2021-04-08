/* imports npm */
const express = require("express");
const router = express.Router();
const { body } = require("express-validator");

/* import models */
const User = require("../model/user");

/* import middleware */
const checkRequiredParams = require("../middleware/checkRequired");
const authenticationMiddleWare = require("../middleware/authentication");
const validateRequest = require("../middleware/validateRequest");

/* import helpers */
const CustomError = require("../helpers/customError");

//get all users
router.get("/", async (req, res, next) => {
  try {
    const users = await User.find({});
    res.send(users);
  } catch (err) {
    err.statusCode = 442;
    next(err);
  }
});

//register
router.post(
  "/",
  checkRequiredParams(["username", "password", "firstname", "lastname"]),
  validateRequest([
    body("username").isEmail(),
    body("password").isLength({ min: 5, max: 20 }),
    body("firstname").isLength({ min: 3, max: 10 }),
    body("lastname").isLength({ min: 3, max: 10 }),
  ]),
  async (req, res, next) => {
    const {username} = req.body
    let exists = await User.count({ username });
    if (exists) {
        return res.status(409).send({ error: "Email already exists", statusCode: 409 })
    }
    const createdUser = new User({
      username: req.body.username,
      password: req.body.password,
      firstname: req.body.firstname,
      lastname: req.body.lastname,
      phone: req.body.phone,
    });
    const user = await createdUser.save();
    res.status(200).send(user);
  }
);

//login
router.post(
  "/login",
  checkRequiredParams(["username", "password"]),
  async (req, res, next) => {
    const user = await User.findOne({ username: req.body.username });
    if (!user) {
      throw new CustomError("wrong username or password", 401);
    }
    const isMatch = await user.checkPassword(req.body.password);
    const token = await user.generateToken();
    console.log(isMatch);
    if (!isMatch) {
      throw new CustomError("wrong username or password", 401);
    }
    // const token = await user.generateToken();
    res.json({
      user,
      token,
      succsess: "true",
    });
  }
);

//profile
router.get("/profile", authenticationMiddleWare, async (req, res, next) => {
  res.send(req.user);
});

//get user by id
router.get("/:id", async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    res.send(user);
  } catch (err) {
    res.status(422).send({
      error: err,
      statusCode: 422,
    });
  }
});

//edit profile
router.patch(
  "/profile",
  authenticationMiddleWare,
  checkRequiredParams(["firstname", "lastname"]),
  validateRequest([
    body("firstname").isLength({ min: 3, max: 10 }),
    body("lastname").isLength({ min: 3, max: 10 }),
  ]),
  async (req, res, next) => {
    const id = req.user.id;
    let user = await User.findById(id);
    let updatedUser = await User.findOneAndUpdate(id, {
      firstname: req.body.firstname || user.firstname,
      lastname: req.body.lastname || user.lastname,
      phone: req.body.phone || user.phone,
    }).exec();
    res.send(updatedUser);
  }
);

//delete profile
router.delete("/profile", authenticationMiddleWare, async (req, res, next) => {
  await req.user.remove();
  res.status(200).send({message: "user removed succesfuly"})
});

module.exports = router;
