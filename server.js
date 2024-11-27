require('./config/db');

const app = require('express')();
const port = process.env.PORT || 3001;

const UserRouter = require('./api/User');

const bodyParser = require('express').json;
app.use(bodyParser());

app.use('/user', UserRouter)

app.listen(port, () => {
    console.log('server is running on port ${port}');
})