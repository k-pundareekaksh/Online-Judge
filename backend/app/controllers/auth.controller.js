const config = require("../config/auth.config");
const db = require("../models");
const User = db.user;
const Role = db.role;

const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const TOKEN_EXPIRY = 24 * 60 * 60; // 24 hours

exports.signup = async (req, res) => {
    try {
        const hashedPassword = bcrypt.hashSync(req.body.password, 10);

        const user = new User({
            username: req.body.username,
            email: req.body.email,
            password: hashedPassword,
        });

        let roles;
        if (req.body.roles) {
            roles = await Role.find({ name: { $in: req.body.roles } });
        } else {
            const defaultRole = await Role.findOne({ name: "user" });
            roles = [defaultRole];
        }

        user.roles = roles.map(role => role._id);
        await user.save();

        return res.send({ message: "User registered successfully." });

    } catch (err) {
        return res.status(500).send({ message: err.message || "Server error" });
    }
};

exports.signin = async (req, res) => {
    try {
        const user = await User.findOne({ username: req.body.username })
            .populate("roles", "-__v");

        if (!user) {
            return res.status(404).send({ message: "User not found." });
        }

        const passwordIsValid = bcrypt.compareSync(req.body.password, user.password);
        if (!passwordIsValid) {
            return res.status(401).send({
                accessToken: null,
                message: "Invalid Password!"
            });
        }

        const token = jwt.sign({ id: user.id }, config.secret, {
            algorithm: 'HS256',
            allowInsecureKeySizes: true,
            expiresIn: TOKEN_EXPIRY,
        });

        const authorities = user.roles.map(role => "ROLE_" + role.name.toUpperCase());

        return res.status(200).send({
            id: user._id,
            username: user.username,
            email: user.email,
            roles: authorities,
            accessToken: token
        });

    } catch (err) {
        return res.status(500).send({ message: err.message || "Server error" });
    }
};
