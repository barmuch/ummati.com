import ejsMate from 'ejs-mate'
import express from 'express';
import session from 'express-session';
import flash from 'connect-flash';
import methodOverride from 'method-override';
import mongoose from 'mongoose';
import path from 'path';
import passport from 'passport'
import LocalStrategy from 'passport-local'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'

//module
import ExpressError from './utils/ExpressError.js';
import wrapAsync from "./utils/wrapAsync.js"
import Campaign from './models/campaign.js'
import routerUser from './routes/user.js';
import routerCampaign from './routes/campaign.js';
import User from './models/user.js';

dotenv.config()

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const port = process.env.PORT
const db_URI = process.env.DB_URI
// connect to mongodb
mongoose.connect(db_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log('Connected to the database...')
  })
  .catch((error) => {
    console.error('Connection error:', error)
  })
// middleware
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride('_method'));
app.use(express.json())
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
	secret: 'this-is-a-secret-key',
	resave: false,
	saveUninitialized: false,
	cookie: {
		httpOnly: true,
		expires: Date.now() + 1000 * 60 * 60 * 24 * 7,
		maxAge: 1000 * 60 * 60 * 24 * 7
	}
}))
app.use(flash());
app.use(passport.initialize());
app.use(passport.session());

passport.use(new LocalStrategy(User.authenticate()))
passport.serializeUser(User.serializeUser())
passport.deserializeUser(User.deserializeUser())

app.use((req, res, next) => {
	res.locals.currentUser = req.user;
	res.locals.success_msg = req.flash('success_msg');
	res.locals.error_msg = req.flash('error_msg');
	res.locals.error = req.flash('error');
	res.locals.currentPage = req.path
	next();
})

// view engine
app.engine('ejs', ejsMate)
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));



app.get('/', wrapAsync(async (req, res) => {
    const campaigns = await Campaign.find()
	res.render('home', {campaigns,})
}))

app.get('/contact', (req, res) => {
	res.render('contact')
})

// places routes
app.use('/', routerUser)
app.use('/campaigns', routerCampaign);




app.all('*', (req, res, next) => {
	next(new ExpressError('Page not found', 404));
})

app.use((err, req, res, next) => {
	const { statusCode = 500 } = err;
	if (!err.message) err.message = 'Oh No, Something Went Wrong!'
	res.status(statusCode).render('error', { err });
})

app.listen(port, () => {
	console.log(`server is running on http://127.0.0.1:3000`);
});
