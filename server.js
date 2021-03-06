const uri = process.env.MONGODB_URI;
const express = require("express");
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
//Add sessions
const session = require('express-session');
const passport = require('passport');
const passportLocalMongoose = require('passport-local-mongoose');

//Configure body-parser and set static dir path.
const app = express();
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static(__dirname + "/public"));

//Initialize passport
app.use(session({
    secret: "MyLittleSecretThatIdontWantOthersToKnow",
    resave: false,
    saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());

//Configure Mongoose
mongoose.connect('mongodb://localhost:27017/', {useNewUrlParser: true, useUnifiedTopology: true});

const userSchema = new mongoose.Schema(
    {
        username: {
            type: String,
            unique: true,
            require: true,
            minlength: 0
        },
        password: {
            type: String,
            require: true,
            minLength: 5,

        },
        confirm: {
            type: String,
            require: true,
            minLength: 5,

        },
        fullname: {
            type: String,
        },
        profile: {
            type: String,
        },
        assoc: {
            type: String,
        },

        events_attended: [{
            event_name: String,
            event_description: String,
            url: String
        }]
    }
)

userSchema.plugin(passportLocalMongoose);

const User = mongoose.model('User', userSchema);
passport.use(User.createStrategy());
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.listen(3000, function () {
    console.log("server started at 3000");
});

app.get('/', function (req, res) {
    res.sendFile(__dirname + "/public/homepage.html");
});

app.get('/get_current_user', function (req, res) {
    if (req.isAuthenticated()) {
        res.send({
            message: "success",
            data: req.user
        })
    } else {
        res.send({
            message: "user not found",
            data: {}
        })
    }
});

app.get('/get_car_by_id', function (req, res) {
    cars.findOne({"_id": req.query.stock_num}, function (err, data) {
        if (err) {
            res.send({
                "message": "error",
                "data": {}
            });
        } else {
            res.send({
                "message": "success",
                "data": data
            })
        }
    });
});

app.get('/register', (req, res) => {
    if (req.query.error) {
        res.redirect("/register.html?error=" + req.query.error);
    } else {
        res.redirect("/register.html");
    }
});

app.post('/register', (req, res) => {
    const newUser = {
        username: req.body.username,
        fullname: req.body.fullname,
        password: req.body.password,
        confirm: req.body.confirm,
        profile: req.body.profile,
        assoc: req.body.assoc,
    }
    if(req.body.username === ""){
        const error = "Email cannot be empty";
        res.redirect('/register.html?error=' + error  + '&input=' + JSON.stringify(newUser));
    }
    else if(req.body.password === ""){
        const error = "Password cannot be empty";
        res.redirect('/register.html?error=' + error  + '&input=' + JSON.stringify(newUser));
    }
    else if(req.body.password !== req.body.confirm){
        const error = "Passwords do not match";
        res.redirect('/register.html?error=' + error  + '&input=' + JSON.stringify(newUser));
    }
    else if(req.body.fullname === ""){
        const error = "Full name cannot be empty";
        res.redirect('/register.html?error=' + error  + '&input=' + JSON.stringify(newUser));
    }
    else if(req.body.assoc === ""){
        const error = "Association cannot be empty";
        res.redirect('/register.html?error=' + error  + '&input=' + JSON.stringify(newUser));
    }
    else {
        User.register(newUser, req.body.password, function(err, user){
            if (err) {
                console.log(err);
                res.redirect("/register.html?error=" + err["message"] + "&input=" + JSON.stringify(newUser));
            } else {
                console.log(user);
                const authenticate = passport.authenticate('local');
                authenticate(req, res, () => {
                    res.redirect('/')
                })
            }
        });
    }
})
;

app.get('/login', (req, res) => {
    if (req.query.error) {
        res.redirect("/login.html?error=" + req.query.error);
    } else {
        res.redirect("/login.html");
    }
});

app.post('/login', (req, res) => {
    console.log(req.body.password);
    const user = new User({
        username: req.body.username,
        password: req.body.password
    });
    req.login(user, (err) => {
        if (err) {
            console.log(err);
            res.redirect("/login?error=Database error: Invalid username/password")
        } else {
            const authenticate = passport.authenticate('local', {
                successRedirect: "/",
                failureRedirect: "/login?error=user does not exist or user name and password do not match"
            })
            authenticate(req, res);
        }
        /*res.redirect("../src/account.html");*/
    })
});


app.get('/logout', (req, res) => {
    req.logout();
    res.redirect("/")
});

app.get("/account", (req, res) => {
    //A page can be viewed only after login
    if (req.isAuthenticated()) {
        res.sendFile(__dirname + "/public/src/account.html");
    } else {
        res.redirect("/login.html?error= You need to be logged in");
    }
});

app.post("/account", (req, res) => {
    const user = {
        username: req.body.username,
        fullname: req.body.fullname,
        profile: req.body.profile,
        assoc: req.body.assoc,
        events_attended: req.body.events_attended
    }
    if (req.isAuthenticated()) {
        res.send({
            message: "success",
            data: user
        })
    } else {
        res.send({
            message: "failed",
            data: {}
        })
    }
});

app.post('/attend_event', (req, res) => {
    //Users need to login to like a car
    if (req.isAuthenticated()) {
        //save car to the user
        const event = req.body.event;
        const user = {
            username: req.user.username,
            fullname: req.user.fullname,
            userId: req.user._id
        }
        console.log(event);
        console.log(user);
        User.updateOne(
            {
                _id: user.userId,
                'events_attended.event_name': {$ne: event.event_name}
            },
            {
                $push: {
                    events_attended: event
                }
            },
            (err) => {
                if (err) {
                    res.send({
                        message: "database error"
                    })
                } else {
                    res.send({
                        message: "success"
                    })
                }
            }
        )
    } else {
        //navigate to the login page
        res.send({
            message: "login required",
            redr: "/login"
        })
    }
});