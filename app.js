const express = require("express");
const app = express();
const dotenv = require('dotenv').config();

const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const randtoken = require("rand-token");
const nodemailer = require("nodemailer");

const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");

//MODELS
const User = require("./models/user.js");
const Reset = require("./models/reset.js");
const Receipe = require("./models/receipe.js");
const Ingredient = require("./models/ingredient.js");
const Favourite = require("./models/favourite.js");
const Schedule = require("./models/schedule.js");
//

//SESSION
app.use(session({
  secret: "mysecret",
  resave: false,
  saveUninitialized: false,
  
}));

//PASSPORT
app.use(passport.initialize());
app.use(passport.session());


main().catch(err => console.log(err));

async function main() {
  await mongoose.connect("mongodb+srv://Lalaina:g1ih1pQ3HvxA49IJ@cluster0.1p68zkk.mongodb.net/cooking?retryWrites=true&w=majority")};

//PASSPORT LOCAL MONGOOSE
passport.use(User.createStrategy());

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

//EJS
app.set("view engine","ejs");

//PUBLIC FOLDER
app.use(express.static("public"));

//BODY PARSER
app.use(bodyParser.urlencoded({extended:false}));



const methodOverride = require("method-override");
const flash = require("connect-flash");
app.use(flash());
app.use(methodOverride('_method'));
app.use(function(req,res,next){
    res.locals.currentUser= req.user;
    res.locals.error = req.flash("error");
    res.locals.success = req.flash("success");
    next();
});


app.get("/", function(req,res){
    
    res.render("index");
});
app.get("/signup", async(req,res)=>{
    res.render("signup")
});

app.post("/signup", async(req,res)=>{
  const newUser = new User({
      username: req.body.username
  });
    User.register(newUser,req.body.password, function(err,user){
        if(err){
            console.log(err);
            res.render("signup");
        }else{
            passport.authenticate("local")(req,res,function(){
                res.redirect("/dashboard");
            })
        }
    })
});



app.get("/login", function(req,res){
    res.render("login");
});

app.post("/login", async (req, res) => {
 const user = new User({
     username: req.body.username,
     password: req.body.password,
 });
    req.login(user,function(err){
        if(err){
            console.log(err)
        }else{
            passport.authenticate("local")(req,res,function(){
                
                res.redirect("dashboard");
            })
        }
    })
});

app.get("/dashboard",isLoggedIn, function(req, res) {
  const error = ""; // Replace this with your actual error message if available
  const success = ""; // Replace this with your actual success message if available
 console.log(req.user);
  res.render("dashboard", { error, success });
});


app.get("/logout", function(req, res) {
  req.logout(function(err) {
    if (err) {
      console.log(err);
      // Gérer l'erreur si nécessaire
    }
    req.flash("success","Thank you, you are now logged out");
    res.redirect("/login");
  });
});


app.get("/forgot", function(req,res){
    res.render("forgot");
});
/*app.post("/forgot", async function(req, res) {
    try {
    const userFound = await User.findOne({ username: req.body.username });

        if (!userFound) {
            // L'utilisateur n'a pas été trouvé, gérer cela en conséquence
            res.redirect("/login");
            return;
        }

        const token = randtoken.generate(16);
        const expirationTime = Date.now() + 3600000; // Expiration d'une heure en millisecondes

        const resetRecord = await Reset.create({
            username: userFound.username,
            resetPasswordToken: token,
            resetPasswordExpires: expirationTime
        });
        const transporteur = nodemailer.createTransport({
        service:'gmail',
        auth:{
            user:'lalayna.music@gmail.com',
            pass:'1234'
        }
    });
    const mailOptions = {
        from:'lalayna.music@gmail.com',
        to:req.body.username,
        subject:'link to reset your password',
        text:'click on this link to reset your password: http://localhost:3000/reset'+token
    }
    console.log("the mail is ready");
    transporteur.sendMail(mailOptions, function(err,response){
        if(err){
            console.log(err);
        }else{
            res.redirect("/login");
        }
    })
      
       // res.status(200).send("Token generated successfully: " + token);
    } catch (err) {
        console.log(err);
        res.redirect("/login");
    };
    
});*/
//RECEIPE ROUTE
app.get("/dashboard/myreceipes", isLoggedIn, async function (req, res) {
    try {
        const receipes = await Receipe.find({
            user: req.user.id
        }).exec();

        res.render("receipe", {
            receipe: receipes
        });
    } catch (err) {
        console.error(err);
        // Gérez l'erreur ici (par exemple, renvoyez une réponse d'erreur au client)
    }
});
app.get("/dashboard/newreceipe",isLoggedIn,function(req,res){
    res.render("newreceipe")
});
app.post("/dashboard/newreceipe", async function (req, res) {
  try {
    const newReceipe = await Receipe.create({
      name: req.body.receipe,
      image: req.body.logo,
      user: req.user.id
    });

    req.flash("success", "New receipe added!"); // Ajout d'un message de succès flash
    res.redirect("/dashboard/myreceipes");
  } catch (err) {
    console.log(err);
  }
});
app.get("/dashboard/myreceipes/:id", async function (req, res) {
  try {
    const receipeFound = await Receipe.findOne({
      user: req.user.id,
      _id: req.params.id
    }).exec();

    if (!receipeFound) {
      // Gérer le cas où la recette n'a pas été trouvée
      return res.status(404).send("Recipe not found");
    }

    const ingredientFound = await Ingredient.find({
      user: req.user.id,
      receipe: req.params.id
    }).exec();

    res.render("ingredients", {
      ingredient: ingredientFound,
      receipe: receipeFound
    });
  } catch (err) {
    console.error(err);
    // Gérer l'erreur ici (par exemple, renvoyer une réponse d'erreur au client)
    res.status(500).send("Internal Server Error");
  }
});
app.delete("/dashboard/myreceipes/:id", isLoggedIn, async (req, res) => {
    try {
        await Receipe.deleteOne({ _id: req.params.id });
        req.flash("success", "The recipe has been deleted");
        res.redirect("/dashboard/myreceipes");
    } catch (err) {
        console.error(err);
        // Gérer l'erreur ici (par exemple, renvoyer une réponse d'erreur au client)
        req.flash("error", "An error occurred while deleting the recipe");
        res.redirect("/dashboard/myreceipes");
    }
});

//INGREDIENT ROUTES

app.get("/dashboard/myreceipes/:id/newingredient", async function (req, res) {
  try {
    const found = await Receipe.findById(req.params.id).exec();

    if (!found) {
      // Gérer le cas où la recette n'a pas été trouvée
      return res.status(404).send("Recipe not found");
    }

    res.render("newingredient", { receipe: found });
  } catch (err) {
   
    console.log(err);
    // Gérer l'erreur ici (par exemple, renvoyer une réponse d'erreur au client)
    res.status(500).send("Internal Server Error");
  }
});
app.post("/dashboard/myreceipes/:id", async function (req, res) {
  try {
    const newIngredient = {
      name: req.body.name,
      bestDish: req.body.dish,
      quantity: req.body.quantity,
      user: req.user.id,
      receipe: req.params.id
    };

    const createdIngredient = await Ingredient.create(newIngredient);

    req.flash("success", "Your ingredient has been added");
    res.redirect("/dashboard/myreceipes/" + req.params.id);
  } catch (err) {
    console.error(err);
    // Gérer l'erreur ici (par exemple, renvoyer une réponse d'erreur au client)
    req.flash("error", "An error occurred while adding the ingredient");
    res.redirect("/dashboard/myreceipes/" + req.params.id);
  }
});
app.delete("/dashboard/myreceipes/:id/:ingredientid", isLoggedIn, async (req, res) => {
    try {
        await Ingredient.deleteOne({ _id: req.params.ingredientid });
        req.flash("success", "Your ingredient has been deleted!");
        res.redirect("/dashboard/myreceipes/" + req.params.id);
    } catch (err) {
        console.error(err);
        req.flash("error", "An error occurred while deleting the ingredient");
        res.redirect("/dashboard/myreceipes/" + req.params.id);
    }
});
app.post("/dashboard/myreceipes/:id/:ingredientid/edit", isLoggedIn, async (req, res) => {
    try {
        const receipeFound = await Receipe.findOne({ user: req.user.id, _id: req.params.id });
        if (!receipeFound) {
            // Gérer le cas où la recette n'a pas été trouvée
            return res.status(404).send("Recipe not found");
        }

        const ingredientFound = await Ingredient.findOne({
            _id: req.params.ingredientid,
            receipe: req.params.id,
        });

        if (!ingredientFound) {
            // Gérer le cas où l'ingrédient n'a pas été trouvé
            return res.status(404).send("Ingredient not found");
        }

        res.render("edit", {
            ingredient: ingredientFound,
            receipe: receipeFound
        });
    } catch (err) {
        console.error(err);
        // Gérer l'erreur ici (par exemple, renvoyer une réponse d'erreur au client)
        res.status(500).send("Internal Server Error");
    }
});

app.put("/dashboard/myreceipes/:id/:ingredientid/", isLoggedIn, async (req, res) => {
    const ingredientUpdate = {
        name: req.body.name,
        bestDish: req.body.dish,
        user: req.user.id,
        quantity: req.body.quantity,
        receipe: req.params.id
    };

    try {
        const updateIngredient = await Ingredient.findByIdAndUpdate({ _id: req.params.ingredientid }, ingredientUpdate);
        if (updateIngredient) {
            req.flash("success", "Successfully updated your ingredient");
            res.redirect("/dashboard/myreceipes/" + req.params.id);
        } else {
            req.flash("error", "Ingredient not found");
            res.redirect("/dashboard/myreceipes/" + req.params.id);
        }
    } catch (err) {
        console.error(err);
        req.flash("error", "An error occurred while updating the ingredient");
        res.redirect("/dashboard/myreceipes/" + req.params.id);
    }
});

//FAVOURITE ROUTE
app.get("/dashboard/favourites", isLoggedIn, async (req, res) => {
    try {
        const favourite = await Favourite.find({ user: req.user.id }).exec();
        res.render("favourites", { favourite });
    } catch (err) {
        console.error(err);
        // Gérer l'erreur ici (par exemple, renvoyer une réponse d'erreur au client)
        res.status(500).send("Internal Server Error");
    }
});
app.get("/dashboard/favourites/newfavourite",isLoggedIn,function(req,res){
    res.render("newfavourite");
});
app.post("/dashboard/favourites", isLoggedIn, async (req, res) => {
    try {
        const newFavourite = {
            image: req.body.image,
            title: req.body.title,
            description: req.body.description,
            user: req.user.id,
        };

        const createdFavourite = await Favourite.create(newFavourite);
        if (createdFavourite) {
            req.flash("success", "You just added a new favorite!");
            res.redirect("/dashboard/favourites");
        } else {
            req.flash("error", "An error occurred while adding the favorite");
            res.redirect("/dashboard/favourites");
        }
    } catch (err) {
        console.error(err);
        req.flash("error", "An error occurred while adding the favorite");
        res.redirect("/dashboard/favourites");
    }
});
app.delete("/dashboard/favourites/:id", isLoggedIn, async (req, res) => {
    try {
        const result = await Favourite.deleteOne({ _id: req.params.id });
        if (result.deletedCount > 0) {
            req.flash("success", "Your favorite has been deleted");
        } else {
            req.flash("error", "An error occurred while deleting the favorite");
        }
    } catch (err) {
        console.error(err);
        req.flash("error", "An error occurred while deleting the favorite");
    } finally {
        res.redirect("/dashboard/favourites");
    }
});

//SCHEDULE ROUTES
app.get("/dashboard/schedule", isLoggedIn, async (req, res) => {
    try {
        const schedule = await Schedule.find({ user: req.user.id }).exec();
        res.render("schedule", { schedule: schedule });
    } catch (err) {
        console.error(err);
        // Gérez l'erreur ici, par exemple en renvoyant une réponse d'erreur au client
    }
});
app.get("/dashboard/schedule/newschedule",isLoggedIn,function(req,res){
    res.render("newSchedule");
});
app.post("/dashboard/schedule", isLoggedIn, async function (req, res) {
    try {
        const newSchedule = {
            ReceipeName: req.body.receipename,
            scheduleDate: req.body.scheduleDate,
            user: req.user.id,
            time: req.body.time
        };

        const createdSchedule = await Schedule.create(newSchedule);
        
        req.flash("success", "You just added a new schedule");
        res.redirect("/dashboard/schedule");
    } catch (err) {
        console.log(err);
        // Gérez l'erreur ici
    }
});
app.delete("/dashboard/schedule/:id", isLoggedIn, async (req, res) => {
    try {
        await Schedule.deleteOne({ _id: req.params.id });
        req.flash("success", "The schedule has been deleted");
        res.redirect("/dashboard/schedule");
    } catch (err) {
        console.error(err);
        // Gérer l'erreur ici (par exemple, renvoyer une réponse d'erreur au client)
        req.flash("error", "An error occurred while deleting the recipe");
        res.redirect("/dashboard/schedule");
    }
});





//FONCTION DE CONNEXION
function isLoggedIn(req,res,next){
    if(req.isAuthenticated()){
        return next();
    }else{
        req.flash("error","Please login first!");
        res.redirect("/login");
    }
};


app.listen(3000,function(req,res){
           console.log("Serveur en port 3000")
    });
